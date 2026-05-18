/**
 * db:deploy — Turso (libsql) or local SQLite file.
 */
import "dotenv/config";
import { execSync } from "node:child_process";

const url = process.env.DATABASE_URL ?? "";

if (url.startsWith("libsql:")) {
  execSync("node scripts/deploy-turso.mjs", { stdio: "inherit" });
} else {
  console.log("Local SQLite — syncing schema with prisma db push…");
  execSync("npx prisma db push", { stdio: "inherit" });
}
