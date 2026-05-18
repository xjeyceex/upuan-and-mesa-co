import { NextResponse } from "next/server";
import type { ItemStatus, ItemType, TableSize } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { createEquipmentItems } from "@/lib/inventory";
import { parseCountFromUnknown } from "@/lib/validate-numbers";

const TABLE_SIZES: TableSize[] = ["FT_4", "FT_6", "FT_10"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") as ItemType | null;
  const status = searchParams.get("status") as ItemStatus | null;
  const tableSize = searchParams.get("tableSize") as TableSize | null;
  const hasCover = searchParams.get("hasCover");
  const q = searchParams.get("q")?.trim();

  const unassigned = searchParams.get("unassigned") === "true";
  const list = searchParams.get("list") !== "0";
  const limitRaw = parseInt(searchParams.get("limit") ?? "80", 10);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(limitRaw, 1), 200)
    : 80;

  const where = {
    ...(type ? { type } : {}),
    ...(status ? { status } : {}),
    ...(tableSize ? { tableSize } : {}),
    ...(hasCover === "true"
      ? { hasCover: true }
      : hasCover === "false"
        ? { hasCover: false }
        : {}),
    ...(unassigned ? { rentalOrderId: null } : {}),
    ...(q
      ? {
          OR: [{ code: { contains: q } }, { notes: { contains: q } }],
        }
      : {}),
  };

  if (!list) {
    const total = await prisma.equipmentItem.count({ where });
    return NextResponse.json({ items: [], total, truncated: false });
  }

  const [items, total] = await Promise.all([
    prisma.equipmentItem.findMany({
      where,
      orderBy: { code: "asc" },
      take: limit,
      include: {
        rentalOrder: { select: { orderNumber: true, eventName: true } },
      },
    }),
    prisma.equipmentItem.count({ where }),
  ]);

  return NextResponse.json({
    items,
    total,
    truncated: total > items.length,
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const type = body.type as ItemType;
  const countResult = parseCountFromUnknown(body.count);
  if (!countResult.ok) {
    return NextResponse.json({ error: countResult.error }, { status: 400 });
  }
  if (countResult.value > 500) {
    return NextResponse.json(
      { error: "You can add at most 500 items at once" },
      { status: 400 },
    );
  }
  const count = countResult.value;
  const hasCover = Boolean(body.hasCover);
  const tableSize = body.tableSize as TableSize | undefined;

  if (type !== "CHAIR" && type !== "TABLE") {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  if (type === "TABLE") {
    if (!tableSize || !TABLE_SIZES.includes(tableSize)) {
      return NextResponse.json({ error: "Pick a table size" }, { status: 400 });
    }
  }

  const created = await createEquipmentItems(type, count, {
    tableSize: type === "TABLE" ? tableSize : null,
    hasCover,
  });

  return NextResponse.json({
    created: created.codes.map((code) => ({ code })),
    count: created.count,
  });
}
