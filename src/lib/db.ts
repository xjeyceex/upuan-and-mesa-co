import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function isTursoUrl(url: string): boolean {
  return url.startsWith("libsql:");
}

function createPrisma() {
  const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";

  if (isTursoUrl(databaseUrl)) {
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!authToken) {
      throw new Error(
        "TURSO_AUTH_TOKEN is required when DATABASE_URL uses libsql (Turso).",
      );
    }
    const adapter = new PrismaLibSql({
      url: databaseUrl,
      authToken,
    });
    return new PrismaClient({ adapter });
  }

  const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
