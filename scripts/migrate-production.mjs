/**
 * Applies Prisma migrations on Turso during Vercel build.
 * Skipped for local file:./dev.db (use npm run db:migrate or db:push locally).
 */
import { execSync } from "node:child_process";

const url = process.env.DATABASE_URL ?? "";

if (url.startsWith("libsql:")) {
  console.log("Applying migrations to Turso…");
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
} else {
  console.log("Skipping migrate deploy (local SQLite — not Turso).");
}
