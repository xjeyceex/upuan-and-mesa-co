import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getEarningsSummary } from "@/lib/earnings";
import { getReplacementSummary } from "@/lib/replacements";
import { getPricingSettings } from "@/lib/pricing-settings";

export async function GET() {
  const pricing = await getPricingSettings(prisma);
  const summary = await getEarningsSummary(prisma);
  const replacements = await getReplacementSummary(prisma, pricing);

  const orders = await prisma.rentalOrder.findMany({
    where: { status: { not: "CANCELLED" } },
    orderBy: { createdAt: "desc" },
    include: { lines: true },
  });

  return NextResponse.json({
    summary,
    replacements,
    pricing,
    orders,
  });
}
