import { NextResponse } from "next/server";
import type { ItemStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { enrichItemWithReplacement } from "@/lib/replacements";
import { needsReplacementCharge, replacementCostLabel } from "@/lib/pricing";
import { getPricingSettings } from "@/lib/pricing-settings";

type RouteContext = { params: Promise<{ code: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { code } = await context.params;
  const item = await prisma.equipmentItem.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      rentalOrder: { select: { orderNumber: true } },
    },
  });

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const config = await getPricingSettings(prisma);
  return NextResponse.json(enrichItemWithReplacement(config, item));
}

export async function PATCH(request: Request, context: RouteContext) {
  const { code } = await context.params;
  const body = await request.json();

  const status = body.status as ItemStatus | undefined;
  const notes = body.notes as string | undefined;
  const hasCover = body.hasCover as boolean | undefined;
  const replacementSettled = body.replacementSettled as boolean | undefined;

  const validStatuses: ItemStatus[] = [
    "IN_WAREHOUSE",
    "OUT",
    "DAMAGED",
    "MISSING",
    "RETIRED",
  ];

  if (status && !validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const existing = await prisma.equipmentItem.findUnique({
    where: { code: code.toUpperCase() },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const releasing =
    status === "IN_WAREHOUSE" ||
    status === "RETIRED" ||
    status === "DAMAGED" ||
    status === "MISSING";

  const markingProblem = status === "DAMAGED" || status === "MISSING";

  if (
    replacementSettled === true &&
    !needsReplacementCharge(existing.status)
  ) {
    return NextResponse.json(
      { error: "Only damaged or missing items can be marked settled" },
      { status: 400 },
    );
  }

  const config = await getPricingSettings(prisma);

  const item = await prisma.equipmentItem.update({
    where: { code: code.toUpperCase() },
    data: {
      ...(status ? { status } : {}),
      ...(status && releasing ? { rentalOrderId: null } : {}),
      ...(markingProblem ? { replacementSettled: false } : {}),
      ...(status === "IN_WAREHOUSE" || status === "RETIRED"
        ? { replacementSettled: false }
        : {}),
      ...(replacementSettled !== undefined ? { replacementSettled } : {}),
      ...(notes !== undefined ? { notes: notes || null } : {}),
      ...(hasCover !== undefined && existing.type === "CHAIR" ? { hasCover } : {}),
    },
    include: {
      rentalOrder: { select: { orderNumber: true } },
    },
  });

  return NextResponse.json({
    ...enrichItemWithReplacement(config, item),
    ...(markingProblem
      ? { replacementMessage: replacementCostLabel(config, item) }
      : {}),
  });
}
