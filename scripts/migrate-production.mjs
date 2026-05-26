/**
 * Applies Prisma migrations on Turso during Vercel build.
 * Skipped for local file:./dev.db (use npm run db:migrate or db:push locally).
 */
import { execSync } from "node:child_process";

const url = process.env.DATABASE_URL ?? "";

if (url.startsWith("libsql:")) {
  console.log("Setting up Turso schema…");
  execSync("node scripts/deploy-turso.mjs", { stdio: "inherit" });
} else {
  console.log("Local SQLite — syncing schema…");
  execSync("npx prisma db push", { stdio: "inherit" });
}
