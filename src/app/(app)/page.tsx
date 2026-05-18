"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { QuickAction } from "@/components/ux/QuickAction";
import { HelpTip } from "@/components/ux/HelpTip";
import { PageHeader } from "@/components/ux/PageHeader";
import { ReplacementPanel } from "@/components/ReplacementPanel";
import { formatPeso, orderBalance } from "@/lib/money";
import { orderLinesSummary } from "@/lib/item-display";
import type { PricingConfig } from "@/lib/pricing-config";
import type { ReplacementRow } from "@/lib/replacements";
import type { ItemType, TableSize } from "@/generated/prisma/client";

type OrderLine = {
  itemType: ItemType;
  tableSize: TableSize | null;
  hasCover: boolean;
  quantity: number;
};

type RecentOrder = {
  id: string;
  orderNumber: string;
  customerName: string | null;
  eventName: string | null;
  offerTotal: number;
  amountPaid: number;
  lines: OrderLine[];
};

type HomeData = {
  earnings: {
    totalCollected: number;
    outstanding: number;
    orderCount: number;
  };
  replacements: {
    rows: ReplacementRow[];
    totalOwed: number;
    unknownCount: number;
  };
  pricing: PricingConfig;
  inWarehouse: number;
  out: number;
  bookedOnDeliveries: number;
  stockNotLinked: boolean;
  recentOrders: RecentOrder[];
  isNew: boolean;
};

export default function HomePage() {
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/home");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Could not load home");
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load home");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className="text-muted">Loading…</p>;
  }

  if (error || !data) {
    return (
      <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-red-400">
        {error || "Could not load home"}
      </p>
    );
  }

  const { earnings, replacements, pricing } = data;

  return (
    <div className="page-stack">
      <PageHeader title="Welcome" description="Rentals, stock, and payments in one place." />

      {data.isNew ? (
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

      <section className="grid grid-cols-2 gap-2">
        <QuickAction href="/orders/new" title="New rental" accent="amber" />
        <QuickAction href="/earnings" title="Money collected" accent="emerald" />
        <QuickAction href="/inventory" title="My stock" accent="sky" />
        <QuickAction href="/add" title="Add chairs / tables" accent="stone" />
        <QuickAction href="/prices" title="Default prices" accent="stone" className="col-span-2" />
      </section>

      <ReplacementPanel
        rows={replacements.rows}
        totalOwed={replacements.totalOwed}
        unknownCount={replacements.unknownCount}
        config={pricing}
        compact
      />

      <section className="card-highlight">
        <p className="text-sm font-semibold text-emerald-300">Money in your pocket</p>
        <p className="stat-value mt-1 text-emerald-400">
          {formatPeso(earnings.totalCollected)}
        </p>
        <p className="mt-2 text-sm text-muted">
          {earnings.outstanding > 0
            ? `${formatPeso(earnings.outstanding)} still waiting to be paid by customers.`
            : "Great — no unpaid balances on your active rentals."}
        </p>
        <Link
          href="/earnings"
          className="mt-2 inline-block text-sm font-semibold text-emerald-400 underline"
        >
          Open full money report →
        </Link>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="card">
          <p className="text-xs text-muted">In storage</p>
          <p className="stat-value mt-1 text-emerald-400">{data.inWarehouse}</p>
          <p className="mt-1 text-xs text-muted">In warehouse</p>
        </div>
        <div className="card">
          <p className="text-xs text-muted">At events now</p>
          <p className="stat-value mt-1 text-sky-400">{data.out}</p>
          <p className="mt-1 text-xs text-muted">
            {data.bookedOnDeliveries > 0
              ? `${data.bookedOnDeliveries} on delivered rentals`
              : "Linked in stock"}
          </p>
        </div>
      </section>

      {data.stockNotLinked && (
        <HelpTip variant="info" title="Stock not fully linked">
          Your rentals list {data.bookedOnDeliveries} items out, but only {data.out}{" "}
          {data.out === 1 ? "is" : "are"} marked in stock. Open the rental and tap{" "}
          <strong>Link stock now</strong> so home counts match what you delivered.
        </HelpTip>
      )}

      {data.recentOrders.length > 0 && (
        <section className="card">
          <h2 className="section-title">Rentals in progress</h2>
          <ul className="mt-3 space-y-2">
            {data.recentOrders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/orders/${order.orderNumber}`}
                  className="block rounded-lg border border-border/60 px-4 py-3 hover:bg-surface-elevated"
                >
                  <p className="font-semibold text-foreground">
                    {order.eventName || order.customerName || "Rental"}
                  </p>
                  <p className="text-sm text-muted">{orderLinesSummary(order.lines)}</p>
                  {order.offerTotal > 0 && (
                    <p className="mt-1 text-sm text-muted">
                      Price {formatPeso(order.offerTotal)} · Paid {formatPeso(order.amountPaid)}
                      {orderBalance(order.offerTotal, order.amountPaid) > 0 && (
                        <span className="font-medium text-red-400">
                          {" "}
                          · Still owes{" "}
                          {formatPeso(orderBalance(order.offerTotal, order.amountPaid))}
                        </span>
                      )}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/orders" className="mt-2 inline-block text-sm font-semibold text-accent">
            See all rentals →
          </Link>
        </section>
      )}
    </div>
  );
}
