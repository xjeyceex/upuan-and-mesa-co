import type { ItemType, Prisma, TableSize } from "@/generated/prisma/client";
import { TABLE_SIZE_LABELS } from "@/lib/constants";

export type StockGroupKey = {
  itemType: ItemType;
  tableSize: TableSize | null;
  hasCover: boolean;
};

export const STOCK_GROUP_DEFINITIONS: StockGroupKey[] = [
  { itemType: "CHAIR", tableSize: null, hasCover: false },
  { itemType: "CHAIR", tableSize: null, hasCover: true },
  { itemType: "TABLE", tableSize: "FT_4", hasCover: false },
  { itemType: "TABLE", tableSize: "FT_6", hasCover: false },
  { itemType: "TABLE", tableSize: "FT_10", hasCover: false },
];

export function stockGroupLabel(group: StockGroupKey): string {
  if (group.itemType === "CHAIR") {
    return group.hasCover ? "Chairs with cover" : "Chairs (no cover)";
  }
  const size = group.tableSize ? TABLE_SIZE_LABELS[group.tableSize] : "Table";
  return `${size} tables`;
}

export function stockGroupWhere(group: StockGroupKey): Prisma.EquipmentItemWhereInput {
  return {
    type: group.itemType,
    ...(group.itemType === "TABLE" && group.tableSize
      ? { tableSize: group.tableSize }
      : {}),
    ...(group.itemType === "CHAIR" ? { hasCover: group.hasCover } : {}),
    status: { not: "RETIRED" },
  };
}

export function stockGroupKeyString(group: StockGroupKey): string {
  return [
    group.itemType,
    group.itemType === "TABLE" ? group.tableSize ?? "" : "",
    group.itemType === "CHAIR" ? (group.hasCover ? "1" : "0") : "",
  ].join("|");
}
