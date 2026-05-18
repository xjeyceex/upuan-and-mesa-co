# Upuan and Mesa Co.

Manual inventory and orders for chairs and tables.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — password in `.env` (`APP_PASSWORD`).

Copy `.env.example` to `.env` for local dev. Data is stored in `dev.db` on your computer.

## Deploy free on Vercel + Turso

**Vercel** hosts the app (free tier). **Turso** hosts the database (free tier, SQLite-compatible). Easiest path for this small app.

### 1. Turso (database, ~5 minutes)

1. Sign up at [turso.tech](https://turso.tech) (free).
2. Create a database (e.g. `upuan-mesa`).
3. Open the database → **Connect** → copy:
   - **Database URL** (`libsql://….turso.io`)
   - **Auth token**

### 2. Create tables (once)

On your PC, in this project folder (with Turso URL and token set):

```bash
# PowerShell — use your real values
$env:DATABASE_URL="libsql://YOUR-DB.turso.io"
$env:TURSO_AUTH_TOKEN="your-token"
npm run db:deploy
```

That applies the schema to Turso. You only repeat this when the schema changes.

### 3. Vercel (app)

1. Push this repo to GitHub.
2. [vercel.com](https://vercel.com) → **Add New Project** → import the repo.
3. **Environment variables** (Settings → Environment Variables):

| Name | Value |
|------|--------|
| `DATABASE_URL` | `libsql://….turso.io` (same as Turso) |
| `TURSO_AUTH_TOKEN` | token from Turso |
| `APP_PASSWORD` | password you use to sign in |
| `SESSION_TOKEN` | long random string (e.g. 32+ chars) |

4. Deploy. Vercel runs `npm run build`, which runs migrations on Turso automatically.

Your app URL will look like `https://your-project.vercel.app`. Use that on your phone to install the PWA.

**Local dev stays the same** — `DATABASE_URL=file:./dev.db` in `.env`, no Turso needed on your laptop.

## Install on Android (PWA)

The app can be installed like a phone app (Progressive Web App).

1. Deploy or open the site on your phone with **HTTPS** (Chrome requires this for install).
2. Sign in, then either tap **Install** when the banner appears, or use Chrome **⋮** → **Install app** / **Add to Home screen**.
3. Icons are generated on `npm install` (`npm run icons`).

Local dev on a phone: use a tunnel (e.g. Cloudflare Tunnel, ngrok) or deploy to Vercel/your host — `http://192.168.x.x:3000` usually cannot install.

## Orders

Record what a customer rented:

- **12 chairs** (with or without cover)
- **2 tables · 4 ft** (or 6 ft / 10 ft)
- Mix multiple lines on one order

**Orders → New order** — add event name, date, and line items.

Statuses: **Pending → Out on event → Returned**

Each line shows how many are **available in warehouse** vs ordered.

## Inventory (physical stock)

**Add stock** — one code per real chair/table (`CHAIR-0001`, etc.).

**Inventory** — tap an item to mark **out**, **in warehouse**, damaged, etc.

Chairs are one type (Uratex / Monobloc treated the same). Optional **with cover** (₱160 vs ₱150/day).

## Nav

Home · Orders · Inventory · Add stock

## Reset database (testing)

Deletes **all** orders and inventory, then rebuilds empty tables:

```bash
npm run db:reset
```

Alias: `npm run reset:db`

Stop `npm run dev` first if you see a database lock error, then run reset and start dev again.

## Backup

- **Local:** copy `dev.db` in the project folder.
- **Turso (production):** Turso dashboard → your database → backups / export, or use [Turso CLI](https://docs.turso.tech/cli).
