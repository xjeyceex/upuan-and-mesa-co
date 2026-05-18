import type { EquipmentItem, OrderLine, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { formatOrderLine, orderLineGroupKey } from "@/lib/item-display";

export class StockAllocationError extends Error {
  constructor(
    message: string,
    public details: { line: string; needed: number; found: number }[],
  ) {
    super(message);
    this.name = "StockAllocationError";
  }
}

type LineLike = Pick<OrderLine, "itemType" | "tableSize" | "hasCover" | "quantity">;

type LineGroup = {
  key: string;
  filter: Prisma.EquipmentItemWhereInput;
  totalQuantity: number;
  lineIds: string[];
};

/** Same chair/table type on one rental is allocated once (avoids double-counting). */
export function groupOrderLines(
  lines: Pick<OrderLine, "id" | "itemType" | "tableSize" | "hasCover" | "quantity">[],
): LineGroup[] {
  const map = new Map<string, LineGroup>();

  for (const line of lines) {
    const key = orderLineGroupKey(line);
    const existing = map.get(key);
    if (existing) {
      existing.totalQuantity += line.quantity;
      existing.lineIds.push(line.id);
    } else {
      map.set(key, {
        key,
        filter: lineItemFilter(line),
        totalQuantity: line.quantity,
        lineIds: [line.id],
      });
    }
  }

  return [...map.values()];
}

export function lineItemFilter(line: LineLike): Prisma.EquipmentItemWhereInput {
  return {
    type: line.itemType,
    ...(line.itemType === "TABLE" && line.tableSize
      ? { tableSize: line.tableSize }
      : {}),
    ...(line.itemType === "CHAIR" ? { hasCover: line.hasCover } : {}),
  };
}

export function matchesLine(
  item: Pick<EquipmentItem, "type" | "tableSize" | "hasCover">,
  line: LineLike,
): boolean {
  if (item.type !== line.itemType) return false;
  if (line.itemType === "TABLE") return item.tableSize === line.tableSize;
  if (line.itemType === "CHAIR") return item.hasCover === line.hasCover;
  return true;
}

/** Items free in storage or already tied to this rental */
export async function countAvailableForLine(
  orderId: string | null,
  line: LineLike,
): Promise<number> {
  return prisma.equipmentItem.count({
    where: {
      ...lineItemFilter(line),
      status: { notIn: ["DAMAGED", "MISSING", "RETIRED"] },
      OR: orderId
        ? [
            { status: "IN_WAREHOUSE", rentalOrderId: null },
            { rentalOrderId: orderId },
          ]
        : [{ status: "IN_WAREHOUSE", rentalOrderId: null }],
    },
  });
}

export async function releaseOrderItems(orderId: string) {
  await prisma.equipmentItem.updateMany({
    where: { rentalOrderId: orderId },
    data: { status: "IN_WAREHOUSE", rentalOrderId: null },
  });
}

export async function allocateOrderItems(orderId: string) {
  const order = await prisma.rentalOrder.findUnique({
    where: { id: orderId },
    include: { lines: true },
  });

  if (!order) throw new Error("Order not found");

  const groups = groupOrderLines(order.lines);

  await prisma.$transaction(async (tx) => {
    const shortages: { line: string; needed: number; found: number }[] = [];

    for (const group of groups) {
      const sampleLine = order.lines.find((l) => orderLineGroupKey(l) === group.key)!;
      const alreadyOnOrder = await tx.equipmentItem.findMany({
        where: { rentalOrderId: orderId, ...group.filter },
        orderBy: { code: "asc" },
      });

      const need = group.totalQuantity;
      let assigned = alreadyOnOrder;

      if (assigned.length > need) {
        const extras = assigned.slice(need);
        await tx.equipmentItem.updateMany({
          where: { id: { in: extras.map((i) => i.id) } },
          data: { status: "IN_WAREHOUSE", rentalOrderId: null },
        });
        assigned = assigned.slice(0, need);
      }

      const shortfall = need - assigned.length;
      if (shortfall > 0) {
        const pool = await tx.equipmentItem.findMany({
          where: {
            ...group.filter,
            status: "IN_WAREHOUSE",
            rentalOrderId: null,
          },
          orderBy: { code: "asc" },
          take: shortfall,
        });

        if (pool.length < shortfall) {
          shortages.push({
            line: formatOrderLine(sampleLine),
            needed: need,
            found: assigned.length + pool.length,
          });
          continue;
        }

        await tx.equipmentItem.updateMany({
          where: { id: { in: pool.map((i) => i.id) } },
          data: { rentalOrderId: orderId },
        });
        assigned = [...assigned, ...pool];
      }

      if (assigned.length > 0) {
        await tx.equipmentItem.updateMany({
          where: { id: { in: assigned.map((i) => i.id) } },
          data: { status: "OUT", rentalOrderId: orderId },
        });
      }
    }

    if (shortages.length > 0) {
      throw new StockAllocationError(
        "Not enough items in storage for this rental.",
        shortages,
      );
    }
  });
}

export type LineStockInfo = {
  id: string;
  itemType: OrderLine["itemType"];
  tableSize: OrderLine["tableSize"];
  hasCover: boolean;
  quantity: number;
  availableCount: number;
  allocatedCount: number;
  allocatedCodes: string[];
};

export async function getOrderStockSummary(orderId: string, lines: OrderLine[]) {
  const allocated = await prisma.equipmentItem.findMany({
    where: { rentalOrderId: orderId },
    orderBy: { code: "asc" },
    select: { code: true, type: true, tableSize: true, hasCover: true },
  });

  const groups = groupOrderLines(lines);
  const groupAllocated = new Map<
    string,
    { count: number; codes: string[] }
  >();

  for (const group of groups) {
    const sample = lines.find((l) => orderLineGroupKey(l) === group.key)!;
    const items = allocated.filter((item) => matchesLine(item, sample));
    groupAllocated.set(group.key, {
      count: items.length,
      codes: items.map((i) => i.code),
    });
  }

  const enrichedLines: LineStockInfo[] = await Promise.all(
    lines.map(async (line) => {
      const key = orderLineGroupKey(line);
      const group = groupAllocated.get(key)!;
      let remaining = group.count;
      let lineAllocated = 0;
      for (const sibling of lines) {
        if (orderLineGroupKey(sibling) !== key) continue;
        if (sibling.id === line.id) {
          lineAllocated = Math.min(line.quantity, remaining);
          break;
        }
        remaining = Math.max(0, remaining - sibling.quantity);
      }

      const availableCount = await countAvailableForLine(orderId, line);
      let codesOffset = 0;
      for (const sibling of lines) {
        if (orderLineGroupKey(sibling) !== key) continue;
        if (sibling.id === line.id) break;
        codesOffset += sibling.quantity;
      }
      const allocatedCodes = group.codes.slice(
        codesOffset,
        codesOffset + lineAllocated,
      );

      return {
        id: line.id,
        itemType: line.itemType,
        tableSize: line.tableSize,
        hasCover: line.hasCover,
        quantity: line.quantity,
        availableCount,
        allocatedCount: lineAllocated,
        allocatedCodes,
      };
    }),
  );

  return {
    allocatedItems: allocated.map((i) => i.code),
    lines: enrichedLines,
  };
}

export async function applyOrderStatusStock(
  orderId: string,
  previousStatus: string,
  newStatus: string,
) {
  const needsRelease =
    newStatus === "RETURNED" ||
    newStatus === "CANCELLED" ||
    (newStatus === "PENDING" && previousStatus === "OUT");

  const needsAllocate = newStatus === "OUT";

  if (needsRelease) {
    await releaseOrderItems(orderId);
    return;
  }

  if (needsAllocate) {
    await allocateOrderItems(orderId);
  }
}
