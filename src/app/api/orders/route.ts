import { NextResponse } from "next/server";
import type { OrderStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { getNextOrderNumber } from "@/lib/orders";
import { lineInputToCreateData, validateOrderLines } from "@/lib/order-lines";
import { parsePesoFromUnknown } from "@/lib/validate-numbers";

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
  const linesResult = validateOrderLines(body.lines);

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
      lines: { create: lineInputToCreateData(linesResult) },
    },
    include: { lines: true },
  });

  return NextResponse.json(order);
}
