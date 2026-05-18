import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getEarningsSummary } from "@/lib/earnings";
import { getReplacementSummary } from "@/lib/replacements";
import { getPricingSettings } from "@/lib/pricing-settings";

export async function GET() {
  const pricing = await getPricingSettings(prisma);
  const earnings = await getEarningsSummary(prisma);
  const replacements = await getReplacementSummary(prisma, pricing);

  const inWarehouse = await prisma.equipmentItem.count({
    where: { status: "IN_WAREHOUSE" },
  });
  const out = await prisma.equipmentItem.count({ where: { status: "OUT" } });

  const outOrders = await prisma.rentalOrder.findMany({
    where: { status: "OUT" },
    include: { lines: true },
  });
  const bookedOnDeliveries = outOrders.reduce(
    (sum, order) => sum + order.lines.reduce((s, line) => s + line.quantity, 0),
    0,
  );

  const recentOrders = await prisma.rentalOrder.findMany({
    where: { status: { in: ["PENDING", "OUT"] } },
    orderBy: { createdAt: "desc" },
    take: 3,
    include: { lines: true },
  });

  return NextResponse.json({
    earnings,
    replacements,
    pricing,
    inWarehouse,
    out,
    bookedOnDeliveries,
    stockNotLinked: bookedOnDeliveries > out,
    recentOrders,
    isNew: earnings.orderCount === 0 && inWarehouse === 0,
  });
}
