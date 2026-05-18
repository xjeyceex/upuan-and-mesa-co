import type { ItemType } from "@/generated/prisma/client";
import { prisma } from "./db";

const CODE_PREFIX: Record<ItemType, string> = {
  CHAIR: "CHAIR",
  TABLE: "TABLE",
};

export async function getNextCode(type: ItemType): Promise<string> {
  const prefix = CODE_PREFIX[type];
  const items = await prisma.equipmentItem.findMany({
    where: { type },
    select: { code: true },
    orderBy: { code: "desc" },
  });

  let max = 0;
  for (const item of items) {
    const match = item.code.match(new RegExp(`^${prefix}-(\\d+)$`));
    if (match) {
      max = Math.max(max, parseInt(match[1], 10));
    }
  }

  return `${prefix}-${String(max + 1).padStart(4, "0")}`;
}

export async function getNextCodes(type: ItemType, count: number): Promise<string[]> {
  const prefix = CODE_PREFIX[type];
  const items = await prisma.equipmentItem.findMany({
    where: { type },
    select: { code: true },
  });

  let max = 0;
  for (const item of items) {
    const match = item.code.match(new RegExp(`^${prefix}-(\\d+)$`));
    if (match) {
      max = Math.max(max, parseInt(match[1], 10));
    }
  }

  return Array.from({ length: count }, (_, i) =>
    `${prefix}-${String(max + 1 + i).padStart(4, "0")}`,
  );
}
