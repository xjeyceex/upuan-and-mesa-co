import { NextResponse } from "next/server";
import { getStockGroupSummaries } from "@/lib/inventory";

export async function GET() {
  const groups = await getStockGroupSummaries();
  return NextResponse.json(groups);
}
