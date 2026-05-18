import { prisma } from "./db";

export async function getNextOrderNumber(): Promise<string> {
  const orders = await prisma.rentalOrder.findMany({
    select: { orderNumber: true },
    orderBy: { orderNumber: "desc" },
    take: 1,
  });

  let max = 0;
  for (const order of orders) {
    const match = order.orderNumber.match(/^ORD-(\d+)$/);
    if (match) {
      max = Math.max(max, parseInt(match[1], 10));
    }
  }

  return `ORD-${String(max + 1).padStart(4, "0")}`;
}
