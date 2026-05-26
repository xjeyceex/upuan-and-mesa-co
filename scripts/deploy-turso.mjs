/**
 * Creates schema on Turso (libsql). Prisma CLI does not accept libsql:// URLs.
 */
import "dotenv/config";
import { execSync } from "node:child_process";
import { createClient } from "@libsql/client";

const url = process.env.DATABASE_URL ?? "";
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url.startsWith("libsql:")) {
  console.error(
    "DATABASE_URL must start with libsql:// for Turso deploy.\n" +
      'Example: $env:DATABASE_URL = "libsql://your-db.turso.io"',
  );
  process.exit(1);
}

if (!authToken) {
  console.error("TURSO_AUTH_TOKEN is required.");
  process.exit(1);
}

const client = createClient({ url, authToken });

const existing = await client.execute(
  "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'RentalOrder'",
);

if (existing.rows.length > 0) {
  const cols = await client.execute("PRAGMA table_info('RentalOrder')");
  const colNames = new Set(cols.rows.map((r) => String(r.name)));

  if (!colNames.has("returnDate")) {
    console.log("Adding RentalOrder.returnDate…");
    await client.execute("ALTER TABLE RentalOrder ADD COLUMN returnDate DATETIME");
  }

  console.log("Turso schema is up to date.");
  process.exit(0);
}

console.log("Creating tables on Turso from prisma/schema.prisma…");

let sql = execSync(
  "npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script",
  { encoding: "utf8" },
);

sql = `PRAGMA foreign_keys=OFF;\n${sql}\nPRAGMA foreign_keys=ON;`;

await client.executeMultiple(sql);

console.log("Done. Turso is ready for the app.");
