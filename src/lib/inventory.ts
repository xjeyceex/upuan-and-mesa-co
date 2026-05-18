import type { ItemType, TableSize } from "@/generated/prisma/client";
import { prisma } from "./db";
import {
  STOCK_GROUP_DEFINITIONS,
  stockGroupKeyString,
  stockGroupLabel,
  stockGroupWhere,
  type StockGroupKey,
} from "./stock-groups";

const CODE_PREFIX: Record<ItemType, string> = {
  CHAIR: "CHAIR",
  TABLE: "TABLE",
};

export async function getNextCode(type: ItemType): Promise<string> {
  const prefix = CODE_PREFIX[type];
  const items = await prisma.equipmentItem.findMany({
    where: { type },
    select: { code: true },
    orderBy: { code: "desc" },
  });

  let max = 0;
  for (const item of items) {
    const match = item.code.match(new RegExp(`^${prefix}-(\\d+)$`));
    if (match) {
      max = Math.max(max, parseInt(match[1], 10));
    }
  }

  return `${prefix}-${String(max + 1).padStart(4, "0")}`;
}

export async function getNextCodes(type: ItemType, count: number): Promise<string[]> {
  const prefix = CODE_PREFIX[type];
  const items = await prisma.equipmentItem.findMany({
    where: { type },
    select: { code: true },
  });

  let max = 0;
  for (const item of items) {
    const match = item.code.match(new RegExp(`^${prefix}-(\\d+)$`));
    if (match) {
      max = Math.max(max, parseInt(match[1], 10));
    }
  }

  return Array.from({ length: count }, (_, i) =>
    `${prefix}-${String(max + 1 + i).padStart(4, "0")}`,
  );
}

export type StockGroupSummary = {
  key: string;
  itemType: ItemType;
  tableSize: TableSize | null;
  hasCover: boolean;
  label: string;
  total: number;
  inWarehouse: number;
  out: number;
  locked: number;
  removable: number;
};

export async function getStockGroupSummaries(): Promise<StockGroupSummary[]> {
  return Promise.all(
    STOCK_GROUP_DEFINITIONS.map(async (group) => {
      const base = stockGroupWhere(group);
      const [total, inWarehouse, out, locked, removable] = await Promise.all([
        prisma.equipmentItem.count({ where: base }),
        prisma.equipmentItem.count({
          where: { ...base, status: "IN_WAREHOUSE" },
        }),
        prisma.equipmentItem.count({ where: { ...base, status: "OUT" } }),
        prisma.equipmentItem.count({
          where: {
            ...base,
            OR: [
              { status: { in: ["DAMAGED", "MISSING"] } },
              { rentalOrderId: { not: null } },
            ],
          },
        }),
        prisma.equipmentItem.count({
          where: {
            ...base,
            status: "IN_WAREHOUSE",
            rentalOrderId: null,
          },
        }),
      ]);

      return {
        key: stockGroupKeyString(group),
        itemType: group.itemType,
        tableSize: group.tableSize,
        hasCover: group.hasCover,
        label: stockGroupLabel(group),
        total,
        inWarehouse,
        out,
        locked: locked,
        removable,
      };
    }),
  );
}

export async function adjustStockGroup(
  group: StockGroupKey,
  targetCount: number,
): Promise<{ total: number; added: number; removed: number }> {
  if (targetCount < 0 || targetCount > 500) {
    throw new Error("Count must be between 0 and 500");
  }

  const base = stockGroupWhere(group);
  const current = await prisma.equipmentItem.count({ where: base });

  if (targetCount === current) {
    return { total: current, added: 0, removed: 0 };
  }

  if (targetCount > current) {
    const toAdd = targetCount - current;
    const codes = await getNextCodes(group.itemType, toAdd);
    await prisma.$transaction(
      codes.map((code) =>
        prisma.equipmentItem.create({
          data: {
            code,
            type: group.itemType,
            tableSize: group.itemType === "TABLE" ? group.tableSize : null,
            hasCover: group.itemType === "CHAIR" ? group.hasCover : false,
          },
        }),
      ),
    );
    return { total: targetCount, added: toAdd, removed: 0 };
  }

  const toRemove = current - targetCount;
  const removable = await prisma.equipmentItem.findMany({
    where: {
      ...base,
      status: "IN_WAREHOUSE",
      rentalOrderId: null,
    },
    orderBy: { code: "desc" },
    take: toRemove,
    select: { id: true },
  });

  if (removable.length < toRemove) {
    const blocked = current - removable.length;
    throw new Error(
      `Cannot lower to ${targetCount}. You have ${current} in this group and ${blocked} are out on rentals, damaged, or missing — only ${removable.length} in storage can be removed.`,
    );
  }

  await prisma.equipmentItem.deleteMany({
    where: { id: { in: removable.map((i) => i.id) } },
  });

  return { total: targetCount, added: 0, removed: toRemove };
}
