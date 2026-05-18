/**
 * Wipes the local SQLite database and reapplies prisma/schema.prisma.
 * For development / testing only.
 */
import { execSync } from "node:child_process";

const root = process.cwd();

console.log("Resetting database (all data will be deleted)…\n");

try {
  execSync("npx prisma db push --force-reset --accept-data-loss", {
    stdio: "inherit",
    cwd: root,
  });
  execSync("npx prisma generate", { stdio: "inherit", cwd: root });
  console.log("\nDatabase reset complete. All orders and inventory are empty.");
} catch {
  console.error(
    "\nCould not reset. Stop the dev server first (Ctrl+C on npm run dev), then run:\n  npm run db:reset\n",
  );
  process.exit(1);
}
