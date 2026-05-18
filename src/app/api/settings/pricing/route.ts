import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPricingSettings, updatePricingSettings } from "@/lib/pricing-settings";

export async function GET() {
  const config = await getPricingSettings(prisma);
  return NextResponse.json(config);
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const config = await updatePricingSettings(prisma, body);
    return NextResponse.json(config);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid prices";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
