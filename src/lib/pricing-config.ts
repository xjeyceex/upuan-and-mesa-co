import type { TableSize } from "@/generated/prisma/client";

export type PricingConfig = {
  chairRentalPerDay: number;
  coverAddonPerDay: number;
  table4ftRentalPerDay: number;
  table6ftRentalPerDay: number;
  table10ftRentalPerDay: number | null;
  chairReplacement: number;
  table4ftReplacement: number;
  table6ftReplacement: number;
  table10ftReplacement: number | null;
};

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  chairRentalPerDay: 150,
  coverAddonPerDay: 10,
  table4ftRentalPerDay: 150,
  table6ftRentalPerDay: 230,
  table10ftRentalPerDay: null,
  chairReplacement: 430,
  table4ftReplacement: 1100,
  table6ftReplacement: 2100,
  table10ftReplacement: null,
};

export function tableRentalRate(
  config: PricingConfig,
  size: TableSize,
): number | null {
  switch (size) {
    case "FT_4":
      return config.table4ftRentalPerDay;
    case "FT_6":
      return config.table6ftRentalPerDay;
    case "FT_10":
      return config.table10ftRentalPerDay;
    default:
      return null;
  }
}

export function tableReplacementCost(
  config: PricingConfig,
  size: TableSize,
): number | null {
  switch (size) {
    case "FT_4":
      return config.table4ftReplacement;
    case "FT_6":
      return config.table6ftReplacement;
    case "FT_10":
      return config.table10ftReplacement;
    default:
      return null;
  }
}

export function pricingConfigSummary(config: PricingConfig): string {
  return `Chairs ₱${config.chairRentalPerDay}/day · cover +₱${config.coverAddonPerDay} · 4 ft ₱${config.table4ftRentalPerDay} · 6 ft ₱${config.table6ftRentalPerDay}`;
}

export function parsePricingField(
  value: unknown,
): number | null | undefined | "invalid" {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;

  if (typeof value === "number") {
    if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
      return "invalid";
    }
    if (value > 99_999_999) return "invalid";
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return null;
    if (!/^[\d,]+$/.test(trimmed)) return "invalid";
    const n = Number(trimmed.replace(/,/g, ""));
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > 99_999_999) {
      return "invalid";
    }
    return n;
  }

  return "invalid";
}
