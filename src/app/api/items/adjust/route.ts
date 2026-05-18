import { NextResponse } from "next/server";
import type { ItemType, TableSize } from "@/generated/prisma/client";
import { adjustStockGroup } from "@/lib/inventory";
import { stockGroupKeyString, type StockGroupKey } from "@/lib/stock-groups";
import { parseQuantityFromUnknown } from "@/lib/validate-numbers";

const TABLE_SIZES: TableSize[] = ["FT_4", "FT_6", "FT_10"];

function parseGroup(body: unknown): StockGroupKey | string {
  const raw = body as Record<string, unknown>;
  const itemType = raw.itemType as ItemType;

  if (itemType !== "CHAIR" && itemType !== "TABLE") {
    return "Invalid item type";
  }

  if (itemType === "TABLE") {
    const tableSize = raw.tableSize as TableSize;
    if (!tableSize || !TABLE_SIZES.includes(tableSize)) {
      return "Pick a table size";
    }
    return { itemType, tableSize, hasCover: false };
  }

  return {
    itemType: "CHAIR",
    tableSize: null,
    hasCover: Boolean(raw.hasCover),
  };
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const group = parseGroup(body);

  if (typeof group === "string") {
    return NextResponse.json({ error: group }, { status: 400 });
  }

  const targetResult = parseQuantityFromUnknown(body.targetCount, "How many you own");
  if (!targetResult.ok) {
    return NextResponse.json({ error: targetResult.error }, { status: 400 });
  }

  if (targetResult.value > 500) {
    return NextResponse.json(
      { error: "You can set at most 500 items per type" },
      { status: 400 },
    );
  }

  try {
    const result = await adjustStockGroup(group, targetResult.value);
    return NextResponse.json({
      key: stockGroupKeyString(group),
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not adjust stock";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
