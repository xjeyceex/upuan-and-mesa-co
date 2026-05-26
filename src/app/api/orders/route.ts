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
  const rentDate =
    typeof body.rentDate === "string" && body.rentDate
      ? new Date(body.rentDate)
      : null;
  const returnDate =
    typeof body.returnDate === "string" && body.returnDate
      ? new Date(body.returnDate)
      : null;
  const notes = typeof body.notes === "string" ? body.notes.trim() || null : null;

  if (rentDate && Number.isNaN(rentDate.getTime())) {
    return NextResponse.json({ error: "Rent date is invalid" }, { status: 400 });
  }
  if (returnDate && Number.isNaN(returnDate.getTime())) {
    return NextResponse.json({ error: "Return date is invalid" }, { status: 400 });
  }
  if (returnDate && !rentDate) {
    return NextResponse.json({ error: "Rent date is required if return date is set" }, { status: 400 });
  }
  if (rentDate && returnDate && returnDate.getTime() < rentDate.getTime()) {
    return NextResponse.json({ error: "Return date cannot be earlier than rent date" }, { status: 400 });
  }

  const orderNumber = await getNextOrderNumber();

  const order = await prisma.rentalOrder.create({
    data: {
      orderNumber,
      customerName,
      eventName: null,
      eventDate: rentDate,
      returnDate,
      offerTotal: offerResult.value,
      amountPaid: paidResult.value,
      notes,
      lines: { create: lineInputToCreateData(linesResult) },
    },
    include: { lines: true },
  });

  return NextResponse.json(order);
}
