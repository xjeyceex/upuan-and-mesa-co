import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getEarningsSummary } from "@/lib/earnings";

export async function GET() {
  const summary = await getEarningsSummary(prisma);
  return NextResponse.json(summary);
}
