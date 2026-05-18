import type { ItemType, Prisma, TableSize } from "@/generated/prisma/client";
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

function parseCodeNumber(prefix: string, code: string): number {
  const match = code.match(new RegExp(`^${prefix}-(\\d+)$`));
  return match ? parseInt(match[1], 10) : 0;
}

export async function getNextCode(type: ItemType): Promise<string> {
  const codes = await getNextCodes(type, 1);
  return codes[0]!;
}

export async function getNextCodes(type: ItemType, count: number): Promise<string[]> {
  const prefix = CODE_PREFIX[type];
  const last = await prisma.equipmentItem.findFirst({
    where: { type, code: { startsWith: `${prefix}-` } },
    orderBy: { code: "desc" },
    select: { code: true },
  });

  const max = last ? parseCodeNumber(prefix, last.code) : 0;

  return Array.from({ length: count }, (_, i) =>
    `${prefix}-${String(max + 1 + i).padStart(4, "0")}`,
  );
}

function summaryKey(
  type: ItemType,
  tableSize: TableSize | null,
  hasCover: boolean,
): string {
  return [
    type,
    type === "TABLE" ? tableSize ?? "" : "",
    type === "CHAIR" ? (hasCover ? "1" : "0") : "",
  ].join("|");
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
  const [byStatus, removableGroups, lockedGroups] = await Promise.all([
    prisma.equipmentItem.groupBy({
      by: ["type", "tableSize", "hasCover", "status"],
      where: { status: { not: "RETIRED" } },
      _count: { _all: true },
    }),
    prisma.equipmentItem.groupBy({
      by: ["type", "tableSize", "hasCover"],
      where: {
        status: "IN_WAREHOUSE",
        rentalOrderId: null,
      },
      _count: { _all: true },
    }),
    prisma.equipmentItem.groupBy({
      by: ["type", "tableSize", "hasCover"],
      where: {
        status: { not: "RETIRED" },
        OR: [
          { status: { in: ["DAMAGED", "MISSING"] } },
          { rentalOrderId: { not: null } },
        ],
      },
      _count: { _all: true },
    }),
  ]);

  const buckets = new Map<
    string,
    { total: number; inWarehouse: number; out: number; removable: number; locked: number }
  >();

  for (const row of byStatus) {
    const key = summaryKey(row.type, row.tableSize, row.hasCover);
    const bucket = buckets.get(key) ?? {
      total: 0,
      inWarehouse: 0,
      out: 0,
      removable: 0,
      locked: 0,
    };
    const n = row._count._all;
    bucket.total += n;
    if (row.status === "IN_WAREHOUSE") bucket.inWarehouse += n;
    if (row.status === "OUT") bucket.out += n;
    buckets.set(key, bucket);
  }

  for (const row of removableGroups) {
    const key = summaryKey(row.type, row.tableSize, row.hasCover);
    const bucket = buckets.get(key);
    if (bucket) bucket.removable = row._count._all;
  }

  for (const row of lockedGroups) {
    const key = summaryKey(row.type, row.tableSize, row.hasCover);
    const bucket = buckets.get(key);
    if (bucket) bucket.locked = row._count._all;
  }

  return STOCK_GROUP_DEFINITIONS.map((group) => {
    const key = summaryKey(group.itemType, group.tableSize, group.hasCover);
    const bucket = buckets.get(key) ?? {
      total: 0,
      inWarehouse: 0,
      out: 0,
      removable: 0,
      locked: 0,
    };
    return {
      key: stockGroupKeyString(group),
      itemType: group.itemType,
      tableSize: group.tableSize,
      hasCover: group.hasCover,
      label: stockGroupLabel(group),
      ...bucket,
    };
  });
}

export async function createEquipmentItems(
  type: ItemType,
  count: number,
  options: { tableSize?: TableSize | null; hasCover?: boolean },
): Promise<{ count: number; codes: string[] }> {
  const codes = await getNextCodes(type, count);
  const data: Prisma.EquipmentItemCreateManyInput[] = codes.map((code) => ({
    code,
    type,
    tableSize: type === "TABLE" ? options.tableSize ?? null : null,
    hasCover: type === "CHAIR" ? Boolean(options.hasCover) : false,
  }));

  await prisma.equipmentItem.createMany({ data });
  return { count: codes.length, codes };
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
    await createEquipmentItems(group.itemType, toAdd, {
      tableSize: group.tableSize,
      hasCover: group.hasCover,
    });
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
