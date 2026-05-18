import type { PrismaClient } from "@/generated/prisma/client";
import { orderBalance } from "./money";

export type EarningsSummary = {
  /** Cash received from customers (sum of amount paid) */
  totalCollected: number;
  /** Total you quoted on active orders (not cancelled) */
  totalQuoted: number;
  /** Still owed by customers */
  outstanding: number;
  /** Collected from returned (finished) events */
  collectedFromReturned: number;
  /** Quoted value of returned events */
  quotedFromReturned: number;
  orderCount: number;
  cancelledCount: number;
  paidInFullCount: number;
  thisMonthCollected: number;
  thisMonthQuoted: number;
};

export async function getEarningsSummary(
  prisma: PrismaClient,
): Promise<EarningsSummary> {
  const orders = await prisma.rentalOrder.findMany({
    select: {
      status: true,
      offerTotal: true,
      amountPaid: true,
      createdAt: true,
    },
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let totalCollected = 0;
  let totalQuoted = 0;
  let outstanding = 0;
  let collectedFromReturned = 0;
  let quotedFromReturned = 0;
  let orderCount = 0;
  let cancelledCount = 0;
  let paidInFullCount = 0;
  let thisMonthCollected = 0;
  let thisMonthQuoted = 0;

  for (const order of orders) {
    if (order.status === "CANCELLED") {
      cancelledCount++;
      continue;
    }

    orderCount++;
    totalCollected += order.amountPaid;
    totalQuoted += order.offerTotal;
    outstanding += orderBalance(order.offerTotal, order.amountPaid);

    if (order.amountPaid >= order.offerTotal && order.offerTotal > 0) {
      paidInFullCount++;
    }

    if (order.status === "RETURNED") {
      collectedFromReturned += order.amountPaid;
      quotedFromReturned += order.offerTotal;
    }

    if (order.createdAt >= monthStart) {
      thisMonthCollected += order.amountPaid;
      thisMonthQuoted += order.offerTotal;
    }
  }

  return {
    totalCollected,
    totalQuoted,
    outstanding,
    collectedFromReturned,
    quotedFromReturned,
    orderCount,
    cancelledCount,
    paidInFullCount,
    thisMonthCollected,
    thisMonthQuoted,
  };
}
