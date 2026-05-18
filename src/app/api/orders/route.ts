import { NextResponse } from "next/server";
import type { ItemType, OrderStatus, TableSize } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { getNextOrderNumber } from "@/lib/orders";
import { parsePesoFromUnknown, parseQuantityFromUnknown } from "@/lib/validate-numbers";

type LineInput = {
  itemType: ItemType;
  tableSize?: TableSize;
  hasCover?: boolean;
  quantity: number;
  unitPrice?: number | null;
};

const TABLE_SIZES: TableSize[] = ["FT_4", "FT_6", "FT_10"];

function validateLines(lines: unknown): LineInput[] | string {
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as OrderStatus | null;

  const orders = await prisma.rentalOrder.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: "desc" },
    include: { lines: true },
  });

  return NextResponse.json(orders);
}

export async function POST(request: Request) {
  const body = await request.json();
  const linesResult = validateLines(body.lines);

  if (typeof linesResult === "string") {
    return NextResponse.json({ error: linesResult }, { status: 400 });
  }

  const offerResult = parsePesoFromUnknown(body.offerTotal, "Total price");
  if (!offerResult.ok) {
    return NextResponse.json({ error: offerResult.error }, { status: 400 });
  }

  const paidResult = parsePesoFromUnknown(body.amountPaid, "Amount paid");
  if (!paidResult.ok) {
    return NextResponse.json({ error: paidResult.error }, { status: 400 });
  }

  const customerName =
    typeof body.customerName === "string" ? body.customerName.trim() || null : null;
  const eventName =
    typeof body.eventName === "string" ? body.eventName.trim() || null : null;
  const eventDate =
    typeof body.eventDate === "string" && body.eventDate
      ? new Date(body.eventDate)
      : null;
  const notes = typeof body.notes === "string" ? body.notes.trim() || null : null;

  const orderNumber = await getNextOrderNumber();

  const order = await prisma.rentalOrder.create({
    data: {
      orderNumber,
      customerName,
      eventName,
      eventDate,
      offerTotal: offerResult.value,
      amountPaid: paidResult.value,
      notes,
      lines: {
        create: linesResult.map((line) => ({
          itemType: line.itemType,
          tableSize: line.itemType === "TABLE" ? line.tableSize : null,
          hasCover: line.itemType === "CHAIR" ? Boolean(line.hasCover) : false,
          quantity: line.quantity,
          unitPrice: line.unitPrice ?? null,
        })),
      },
    },
    include: { lines: true },
  });

  return NextResponse.json(order);
}
