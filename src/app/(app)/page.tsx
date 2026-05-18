import Link from "next/link";
import { prisma } from "@/lib/db";
import { QuickAction } from "@/components/ux/QuickAction";
import { HelpTip } from "@/components/ux/HelpTip";
import { PageHeader } from "@/components/ux/PageHeader";
import { ReplacementPanel } from "@/components/ReplacementPanel";
import { getEarningsSummary } from "@/lib/earnings";
import { formatPeso, orderBalance } from "@/lib/money";
import { orderLinesSummary } from "@/lib/item-display";
import { getReplacementSummary } from "@/lib/replacements";
import { getPricingSettings } from "@/lib/pricing-settings";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const pricing = await getPricingSettings(prisma);
  const earnings = await getEarningsSummary(prisma);
  const replacements = await getReplacementSummary(prisma, pricing);

  const inWarehouse = await prisma.equipmentItem.count({
    where: { status: "IN_WAREHOUSE" },
  });
  const out = await prisma.equipmentItem.count({ where: { status: "OUT" } });

  const outOrders = await prisma.rentalOrder.findMany({
    where: { status: "OUT" },
    include: { lines: true },
  });
  const bookedOnDeliveries = outOrders.reduce(
    (sum, order) => sum + order.lines.reduce((s, line) => s + line.quantity, 0),
    0,
  );
  const stockNotLinked = bookedOnDeliveries > out;

  const recentOrders = await prisma.rentalOrder.findMany({
    where: { status: { in: ["PENDING", "OUT"] } },
    orderBy: { createdAt: "desc" },
    take: 3,
    include: { lines: true },
  });

  const isNew = earnings.orderCount === 0 && inWarehouse === 0;

  return (
    <div className="page-stack">
      <PageHeader title="Welcome" description="Rentals, stock, and payments in one place." />

      {isNew ? (
        <HelpTip title="First time here?" variant="info">
          <ol className="list-decimal space-y-1 pl-4">
            <li>
              <strong>Add your stock</strong> — tell the app how many chairs and tables you own.
            </li>
            <li>
              <strong>Create a rental</strong> — when someone books, write what they need and the price.
            </li>
            <li>
              <strong>Check Money</strong> — see how much you have collected.
            </li>
          </ol>
        </HelpTip>
      ) : null}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-2">
        <QuickAction
          href="/orders/new"
          title="New rental"
          description="Someone booked chairs or tables? Tap here to save the order and payment."
          accent="amber"
        />
        <QuickAction
          href="/earnings"
          title="Money collected"
          description="See how much customers have paid you and what they still owe."
          accent="emerald"
        />
        <QuickAction
          href="/inventory"
          title="My stock"
          description="See all your chairs and tables. Mark items when they leave or come back."
          accent="sky"
        />
        <QuickAction
          href="/add"
          title="Add chairs / tables"
          description="First time setup: add how many items you have in your warehouse."
          accent="stone"
        />
        <QuickAction
          href="/prices"
          title="Default prices"
          description="Change rental rates (e.g. chair ₱130) and replacement costs."
          accent="stone"
        />
      </section>

      <ReplacementPanel
        rows={replacements.rows}
        totalOwed={replacements.totalOwed}
        unknownCount={replacements.unknownCount}
        config={pricing}
        compact
      />

      <section className="card-highlight">
        <p className="text-sm font-semibold text-emerald-900">Money in your pocket</p>
        <p className="stat-value mt-1 text-emerald-700">
          {formatPeso(earnings.totalCollected)}
        </p>
        <p className="mt-2 text-sm text-stone-600">
          {earnings.outstanding > 0
            ? `${formatPeso(earnings.outstanding)} still waiting to be paid by customers.`
            : "Great — no unpaid balances on your active rentals."}
        </p>
        <Link
          href="/earnings"
          className="mt-2 inline-block text-sm font-semibold text-emerald-800 underline"
        >
          Open full money report →
        </Link>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="card">
          <p className="text-xs text-stone-500">In storage</p>
          <p className="stat-value mt-1 text-emerald-700">{inWarehouse}</p>
          <p className="mt-1 text-xs text-stone-500">In warehouse</p>
        </div>
        <div className="card">
          <p className="text-xs text-stone-500">At events now</p>
          <p className="stat-value mt-1 text-sky-700">{out}</p>
          <p className="mt-1 text-xs text-stone-500">
            {bookedOnDeliveries > 0
              ? `${bookedOnDeliveries} on delivered rentals`
              : "Linked in stock"}
          </p>
        </div>
      </section>

      {stockNotLinked && (
        <HelpTip variant="info" title="Stock not fully linked">
          Your rentals list {bookedOnDeliveries} items out, but only {out}{" "}
          {out === 1 ? "is" : "are"} marked in stock. Open the rental and tap{" "}
          <strong>Link stock now</strong> so home counts match what you delivered.
        </HelpTip>
      )}

      {recentOrders.length > 0 && (
        <section className="card">
          <h2 className="section-title">Rentals in progress</h2>
          <ul className="mt-3 space-y-2">
            {recentOrders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/orders/${order.orderNumber}`}
                  className="block rounded-lg border border-stone-100 px-4 py-3 hover:bg-stone-50"
                >
                  <p className="font-semibold text-stone-900">
                    {order.eventName || order.customerName || "Rental"}
                  </p>
                  <p className="text-sm text-stone-600">{orderLinesSummary(order.lines)}</p>
                  {order.offerTotal > 0 && (
                    <p className="mt-1 text-sm text-stone-500">
                      Price {formatPeso(order.offerTotal)} · Paid {formatPeso(order.amountPaid)}
                      {orderBalance(order.offerTotal, order.amountPaid) > 0 && (
                        <span className="font-medium text-red-600">
                          {" "}
                          · Still owes {formatPeso(orderBalance(order.offerTotal, order.amountPaid))}
                        </span>
                      )}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/orders" className="mt-2 inline-block text-sm font-semibold text-amber-800">
            See all rentals →
          </Link>
        </section>
      )}
    </div>
  );
}
