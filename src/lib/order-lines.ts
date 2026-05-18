import type { ItemType, TableSize } from "@/generated/prisma/client";
import { parsePesoFromUnknown, parseQuantityFromUnknown } from "@/lib/validate-numbers";

export type LineInput = {
  itemType: ItemType;
  tableSize?: TableSize;
  hasCover?: boolean;
  quantity: number;
  unitPrice?: number | null;
};

const TABLE_SIZES: TableSize[] = ["FT_4", "FT_6", "FT_10"];

export function validateOrderLines(lines: unknown): LineInput[] | string {
  if (!Array.isArray(lines) || lines.length === 0) {
    return "Add at least one line (e.g. 12 chairs)";
  }

  const parsed: LineInput[] = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const itemType = raw?.itemType as ItemType;
    const lineLabel = `Item ${i + 1}`;

    if (itemType !== "CHAIR" && itemType !== "TABLE") {
      return "Invalid line type";
    }

    const qtyResult = parseQuantityFromUnknown(raw?.quantity, `${lineLabel} quantity`);
    if (!qtyResult.ok) return qtyResult.error;
    const quantity = qtyResult.value;

    const unitPriceRaw = raw?.unitPrice;
    let unitPrice: number | null = null;
    if (unitPriceRaw !== undefined && unitPriceRaw !== null && unitPriceRaw !== "") {
      const upResult = parsePesoFromUnknown(unitPriceRaw, `${lineLabel} special price`);
      if (!upResult.ok) return upResult.error;
      unitPrice = upResult.value;
    }

    if (itemType === "TABLE") {
      const tableSize = raw?.tableSize as TableSize;
      if (!tableSize || !TABLE_SIZES.includes(tableSize)) {
        return "Pick a table size for each table line";
      }
      parsed.push({ itemType, tableSize, quantity, unitPrice });
    } else {
      parsed.push({
        itemType,
        hasCover: Boolean(raw?.hasCover),
        quantity,
        unitPrice,
      });
    }
  }

  return parsed;
}

export function lineInputToCreateData(lines: LineInput[]) {
  return lines.map((line) => ({
    itemType: line.itemType,
    tableSize: line.itemType === "TABLE" ? line.tableSize! : null,
    hasCover: line.itemType === "CHAIR" ? Boolean(line.hasCover) : false,
    quantity: line.quantity,
    unitPrice: line.unitPrice ?? null,
  }));
}
