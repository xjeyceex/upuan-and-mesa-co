import type { ItemType, TableSize } from "@/generated/prisma/client";
import { TABLE_SIZE_LABELS } from "./constants";
import type { OrderLineLike } from "./item-display";
import {
  type PricingConfig,
  tableRentalRate,
  tableReplacementCost,
} from "./pricing-config";

export type { PricingConfig } from "./pricing-config";
export { DEFAULT_PRICING_CONFIG, pricingConfigSummary } from "./pricing-config";

export type ItemForReplacement = {
  type: ItemType;
  tableSize: TableSize | null;
  status: string;
};

function formatPesoSimple(amount: number): string {
  return `₱${amount.toLocaleString("en-PH")}`;
}

export function replacementCostForItem(
  config: PricingConfig,
  item: ItemForReplacement,
): number | null {
  if (item.type === "CHAIR") return config.chairReplacement;
  if (!item.tableSize) return null;
  return tableReplacementCost(config, item.tableSize);
}

export function needsReplacementCharge(status: string): boolean {
  return status === "DAMAGED" || status === "MISSING";
}

export function replacementCostLabel(
  config: PricingConfig,
  item: ItemForReplacement,
): string {
  const cost = replacementCostForItem(config, item);
  if (cost == null) return "Set amount in notes (no default for this size)";
  return `Replace the item or pay ${formatPesoSimple(cost)} (what we paid for it)`;
}

export function dailyRate(
  config: PricingConfig,
  itemType: ItemType,
  opts: { hasCover?: boolean; tableSize?: TableSize | null },
): number | null {
  if (itemType === "CHAIR") {
    return config.chairRentalPerDay + (opts.hasCover ? config.coverAddonPerDay : 0);
  }

  if (!opts.tableSize) return null;
  const base = tableRentalRate(config, opts.tableSize);
  if (base == null) return null;

  return base + (opts.hasCover ? config.coverAddonPerDay : 0);
}

export function effectiveLineRate(
  config: PricingConfig,
  line: OrderLineLike,
): number | null {
  if (line.unitPrice != null && line.unitPrice >= 0) {
    return line.unitPrice;
  }
  return dailyRate(config, line.itemType, {
    hasCover: line.hasCover,
    tableSize: line.tableSize,
  });
}

export function lineDailyTotal(
  config: PricingConfig,
  line: OrderLineLike,
): number | null {
  const rate = effectiveLineRate(config, line);
  if (rate == null) return null;
  return rate * line.quantity;
}

export function orderReferenceTotal(
  config: PricingConfig,
  lines: OrderLineLike[],
): number | null {
  let sum = 0;
  for (const line of lines) {
    const lineTotal = lineDailyTotal(config, line);
    if (lineTotal == null) return null;
    sum += lineTotal;
  }
  return sum;
}

export function formatLineRateText(
  config: PricingConfig,
  line: OrderLineLike,
): string | null {
  const rate = effectiveLineRate(config, line);
  const total = lineDailyTotal(config, line);
  if (rate == null || total == null) {
    if (line.itemType === "TABLE" && line.tableSize === "FT_10") {
      return "10 ft table — set a custom price below or in default prices";
    }
    return null;
  }

  const unit = line.quantity === 1 ? "piece" : "pieces";
  const discount =
    line.unitPrice != null
      ? " (special price for this rental)"
      : "";

  if (line.itemType === "CHAIR") {
    const coverNote = line.hasCover
      ? `₱${config.chairRentalPerDay} + ₱${config.coverAddonPerDay} cover`
      : `no cover`;
    return `₱${rate}/day${discount} (${coverNote}) × ${line.quantity} ${unit} = ₱${total}/day`;
  }

  const size = line.tableSize ? TABLE_SIZE_LABELS[line.tableSize] : "table";
  return `${size} · ₱${rate}/day${discount} × ${line.quantity} ${unit} = ₱${total}/day`;
}

export function tableSizeButtonLabel(
  config: PricingConfig,
  size: TableSize,
): string {
  const base = tableRentalRate(config, size);
  const label = TABLE_SIZE_LABELS[size];
  if (base == null) return label;
  return `${label} · ₱${base}`;
}

export function chairCoverLabel(config: PricingConfig): string {
  return `Chair has cover (+₱${config.coverAddonPerDay}/day → ₱${config.chairRentalPerDay + config.coverAddonPerDay}/day)`;
}

export function problemStatusButtonLabel(
  config: PricingConfig,
  status: "DAMAGED" | "MISSING",
  item: ItemForReplacement,
): string {
  const cost = replacementCostForItem(config, item);
  const base = status === "DAMAGED" ? "Damaged" : "Missing";
  if (cost == null) return base;
  return `${base} · ${formatPesoSimple(cost)}`;
}
