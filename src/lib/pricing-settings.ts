import type { PricingSettings, PrismaClient } from "@/generated/prisma/client";
import {
  DEFAULT_PRICING_CONFIG,
  type PricingConfig,
  parsePricingField,
} from "@/lib/pricing-config";

const SETTINGS_ID = "default";

export function rowToConfig(row: PricingSettings): PricingConfig {
  return {
    chairRentalPerDay: row.chairRentalPerDay,
    coverAddonPerDay: row.coverAddonPerDay,
    table4ftRentalPerDay: row.table4ftRentalPerDay,
    table6ftRentalPerDay: row.table6ftRentalPerDay,
    table10ftRentalPerDay: row.table10ftRentalPerDay,
    chairReplacement: row.chairReplacement,
    table4ftReplacement: row.table4ftReplacement,
    table6ftReplacement: row.table6ftReplacement,
    table10ftReplacement: row.table10ftReplacement,
  };
}

export async function getPricingSettings(db: PrismaClient): Promise<PricingConfig> {
  let row = await db.pricingSettings.findUnique({ where: { id: SETTINGS_ID } });

  if (!row) {
    row = await db.pricingSettings.create({
      data: {
        id: SETTINGS_ID,
        ...DEFAULT_PRICING_CONFIG,
      },
    });
  }

  return rowToConfig(row);
}

export async function updatePricingSettings(
  db: PrismaClient,
  patch: Partial<Record<keyof PricingConfig, unknown>>,
): Promise<PricingConfig> {
  const data: Record<string, number | null> = {};

  const fields: (keyof PricingConfig)[] = [
    "chairRentalPerDay",
    "coverAddonPerDay",
    "table4ftRentalPerDay",
    "table6ftRentalPerDay",
    "table10ftRentalPerDay",
    "chairReplacement",
    "table4ftReplacement",
    "table6ftReplacement",
    "table10ftReplacement",
  ];

  for (const key of fields) {
    if (patch[key] === undefined) continue;
    const parsed = parsePricingField(patch[key]);
    if (parsed === "invalid") {
      throw new Error(`Invalid number for ${key}. Use whole numbers only (0 or higher).`);
    }
    if (parsed === undefined) {
      throw new Error(`Invalid value for ${key}`);
    }
    data[key] = parsed;
  }

  const row = await db.pricingSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, ...DEFAULT_PRICING_CONFIG, ...data },
    update: data,
  });

  return rowToConfig(row);
}
