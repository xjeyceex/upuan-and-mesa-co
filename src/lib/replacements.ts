import type { ItemType, PrismaClient, TableSize } from "@/generated/prisma/client";
import { formatItemDescription } from "@/lib/item-display";
import type { PricingConfig } from "@/lib/pricing-config";
import {
  needsReplacementCharge,
  replacementCostForItem,
} from "@/lib/pricing";

export type ReplacementRow = {
  code: string;
  description: string;
  status: "DAMAGED" | "MISSING";
  cost: number | null;
  rentalOrderNumber: string | null;
  eventName: string | null;
};

type ItemShape = {
  type: ItemType;
  tableSize: TableSize | null;
  status: string;
  replacementSettled: boolean;
};

export async function getReplacementSummary(
  db: PrismaClient,
  config: PricingConfig,
) {
  const items = await db.equipmentItem.findMany({
    where: {
      status: { in: ["DAMAGED", "MISSING"] },
      replacementSettled: false,
    },
    orderBy: { updatedAt: "desc" },
    include: {
      rentalOrder: { select: { orderNumber: true, eventName: true } },
    },
  });

  const rows: ReplacementRow[] = items.map((item) => ({
    code: item.code,
    description: formatItemDescription(item, config),
    status: item.status as "DAMAGED" | "MISSING",
    cost: replacementCostForItem(config, item),
    rentalOrderNumber: item.rentalOrder?.orderNumber ?? null,
    eventName: item.rentalOrder?.eventName ?? null,
  }));

  const totalOwed = rows.reduce((sum, row) => sum + (row.cost ?? 0), 0);
  const unknownCount = rows.filter((row) => row.cost == null).length;

  return {
    rows,
    count: rows.length,
    totalOwed,
    unknownCount,
  };
}

export function enrichItemWithReplacement<T extends ItemShape>(
  config: PricingConfig,
  item: T,
) {
  const chargeable =
    needsReplacementCharge(item.status) && !item.replacementSettled;
  return {
    ...item,
    replacementCost: replacementCostForItem(config, item),
    replacementDue: chargeable,
  };
}
