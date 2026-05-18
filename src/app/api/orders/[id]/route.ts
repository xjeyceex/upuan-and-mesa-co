import { NextResponse } from "next/server";
import type { OrderStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import {
  StockAllocationError,
  applyOrderStatusStock,
  allocateOrderItems,
  getOrderStockSummary,
  releaseOrderItems,
  replaceOrderLines,
} from "@/lib/stock-allocation";
import {
  type LineInput,
  lineInputToCreateData,
  validateOrderLines,
} from "@/lib/order-lines";
import { parsePesoFromUnknown } from "@/lib/validate-numbers";

type RouteContext = { params: Promise<{ id: string }> };

const VALID_STATUSES: OrderStatus[] = [
  "PENDING",
  "OUT",
  "RETURNED",
  "CANCELLED",
];

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const order = await prisma.rentalOrder.findFirst({
    where: { OR: [{ id }, { orderNumber: id.toUpperCase() }] },
    include: { lines: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const stock = await getOrderStockSummary(order.id, order.lines);

  return NextResponse.json({
    ...order,
    lines: order.lines.map((line) => {
      const info = stock.lines.find((l) => l.id === line.id);
      return info ? { ...line, ...info } : line;
    }),
    allocatedItemCodes: stock.allocatedItems,
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json();

  const existing = await prisma.rentalOrder.findFirst({
    where: { OR: [{ id }, { orderNumber: id.toUpperCase() }] },
    include: { lines: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const status = body.status as OrderStatus | undefined;
  const syncStock = Boolean(body.syncStock);
  const notes = body.notes as string | undefined;
  const customerName = body.customerName as string | undefined;
  const eventName = body.eventName as string | undefined;
  const eventDate =
    body.eventDate === null || body.eventDate === ""
      ? null
      : typeof body.eventDate === "string"
        ? new Date(body.eventDate)
        : undefined;
  let offerTotal: number | undefined;
  let amountPaid: number | undefined;

  if (body.offerTotal !== undefined) {
    const offerResult = parsePesoFromUnknown(body.offerTotal, "Total price");
    if (!offerResult.ok) {
      return NextResponse.json({ error: offerResult.error }, { status: 400 });
    }
    offerTotal = offerResult.value;
  }

  if (body.amountPaid !== undefined) {
    const paidResult = parsePesoFromUnknown(body.amountPaid, "Amount paid");
    if (!paidResult.ok) {
      return NextResponse.json({ error: paidResult.error }, { status: 400 });
    }
    amountPaid = paidResult.value;
  }

  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  let lineUpdates: LineInput[] | undefined;
  if (body.lines !== undefined) {
    const parsed = validateOrderLines(body.lines);
    if (typeof parsed === "string") {
      return NextResponse.json({ error: parsed }, { status: 400 });
    }
    lineUpdates = parsed;
  }

  try {
    if (lineUpdates) {
      await replaceOrderLines(
        existing.id,
        existing.status,
        lineInputToCreateData(lineUpdates).map((line) => ({
          ...line,
          orderId: existing.id,
        })),
      );
    }

    if (syncStock) {
      if (existing.status === "OUT") {
        await allocateOrderItems(existing.id);
      } else {
        await releaseOrderItems(existing.id);
      }
    } else if (status && status !== existing.status) {
      await applyOrderStatusStock(existing.id, existing.status, status);
    }

    const order = await prisma.rentalOrder.update({
      where: { id: existing.id },
      data: {
        ...(status ? { status } : {}),
        ...(notes !== undefined ? { notes: notes || null } : {}),
        ...(customerName !== undefined ? { customerName: customerName || null } : {}),
        ...(eventName !== undefined ? { eventName: eventName || null } : {}),
        ...(eventDate !== undefined ? { eventDate } : {}),
        ...(offerTotal !== undefined ? { offerTotal } : {}),
        ...(amountPaid !== undefined ? { amountPaid } : {}),
      },
      include: { lines: true },
    });

    const stock = await getOrderStockSummary(order.id, order.lines);

    return NextResponse.json({
      ...order,
      lines: order.lines.map((line) => {
        const info = stock.lines.find((l) => l.id === line.id);
        return info ? { ...line, ...info } : line;
      }),
      allocatedItemCodes: stock.allocatedItems,
    });
  } catch (err) {
    if (err instanceof StockAllocationError) {
      return NextResponse.json(
        { error: err.message, shortages: err.details },
        { status: 409 },
      );
    }
    throw err;
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const existing = await prisma.rentalOrder.findFirst({
    where: { OR: [{ id }, { orderNumber: id.toUpperCase() }] },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await releaseOrderItems(existing.id);
  await prisma.rentalOrder.delete({ where: { id: existing.id } });

  return NextResponse.json({ ok: true });
}
