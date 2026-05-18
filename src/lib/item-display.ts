import type { ItemType, TableSize } from "@/generated/prisma/client";
import { TABLE_SIZE_LABELS } from "./constants";
import type { PricingConfig } from "./pricing-config";
import { dailyRate } from "./pricing";

export type ItemLike = {
  type: ItemType;
  tableSize: TableSize | null;
  hasCover: boolean;
};

export function formatItemDescription(
  item: ItemLike,
  config?: PricingConfig,
): string {
  if (item.type === "CHAIR") {
    const cover = item.hasCover ? "with cover" : "no cover";
    if (!config) return `Chair · ${cover}`;
    const rate = dailyRate(config, "CHAIR", { hasCover: item.hasCover });
    return `Chair · ${cover} · ₱${rate}/day`;
  }

  const size =
    item.tableSize != null ? TABLE_SIZE_LABELS[item.tableSize] : "Table";
  if (!config) return `${size} table`;
  const rate = dailyRate(config, "TABLE", { tableSize: item.tableSize });
  return rate != null ? `${size} table · ₱${rate}/day` : `${size} table`;
}

export type OrderLineLike = {
  itemType: ItemType;
  tableSize: TableSize | null;
  hasCover: boolean;
  quantity: number;
  unitPrice?: number | null;
};

/** Groups identical chair/table lines on the same rental (e.g. 6 + 1 chairs no cover). */
export function orderLineGroupKey(line: OrderLineLike): string {
  return [
    line.itemType,
    line.itemType === "TABLE" ? line.tableSize ?? "" : "",
    line.itemType === "CHAIR" ? (line.hasCover ? "1" : "0") : "",
  ].join("|");
}

export function formatOrderLine(line: OrderLineLike): string {
  if (line.itemType === "CHAIR") {
    const cover = line.hasCover ? "with cover" : "no cover";
    return `${line.quantity} chair${line.quantity === 1 ? "" : "s"} (${cover})`;
  }
  const size = line.tableSize ? TABLE_SIZE_LABELS[line.tableSize] : "";
  return `${line.quantity} table${line.quantity === 1 ? "" : "s"}${size ? ` · ${size}` : ""}`;
}

export function orderLinesSummary(
  lines: OrderLineLike[],
): string {
  return lines.map(formatOrderLine).join(" · ");
}
