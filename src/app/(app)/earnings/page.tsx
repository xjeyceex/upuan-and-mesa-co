"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { ReplacementPanel } from "@/components/ReplacementPanel";
import { HelpTip } from "@/components/ux/HelpTip";
import { PageHeader } from "@/components/ux/PageHeader";
import { formatPeso, orderBalance } from "@/lib/money";
import type { PricingConfig } from "@/lib/pricing-config";
import type { ReplacementRow } from "@/lib/replacements";
import type { OrderStatus } from "@/generated/prisma/client";

type EarningsSummary = {
  totalCollected: number;
  outstanding: number;
  totalQuoted: number;
  thisMonthCollected: number;
  thisMonthQuoted: number;
  collectedFromReturned: number;
  quotedFromReturned: number;
  orderCount: number;
  paidInFullCount: number;
  cancelledCount: number;
};

type Order = {
  id: string;
  orderNumber: string;
  customerName: string | null;
  eventName: string | null;
  status: OrderStatus;
  offerTotal: number;
  amountPaid: number;
};

type EarningsData = {
  summary: EarningsSummary;
  replacements: {
    rows: ReplacementRow[];
    totalOwed: number;
    unknownCount: number;
  };
  pricing: PricingConfig;
  orders: Order[];
};

export default function EarningsPage() {
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/earnings");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Could not load money report");
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load money report");
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
    return <p className="text-muted">Loading money report…</p>;
  }

  if (error || !data) {
    return (
      <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-red-400">
        {error || "Could not load money report"}
      </p>
    );
  }

  const { summary, replacements, pricing, orders } = data;

  return (
    <div className="page-stack">
      <PageHeader
        title="Money"
        description="How much customers have paid you, and what they still owe."
      />

      <HelpTip>Payments from all rentals are totaled here.</HelpTip>

      <ReplacementPanel
        rows={replacements.rows}
        totalOwed={replacements.totalOwed}
        unknownCount={replacements.unknownCount}
        config={pricing}
      />

      <section className="card-highlight">
        <p className="text-sm font-semibold text-emerald-300">Total collected</p>
        <p className="stat-value mt-1 text-emerald-400">
          {formatPeso(summary.totalCollected)}
        </p>
        <p className="mt-2 text-base text-muted">
          Every payment you recorded on your rentals, added together.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Customers still owe you" value={formatPeso(summary.outstanding)} tone="red" />
        <StatCard label="Total prices you quoted" value={formatPeso(summary.totalQuoted)} />
        <StatCard
          label="Collected this month"
          value={formatPeso(summary.thisMonthCollected)}
          tone="emerald"
        />
        <StatCard label="Quoted this month" value={formatPeso(summary.thisMonthQuoted)} />
      </section>

      <section className="grid gap-2 sm:grid-cols-2">
        <div className="card">
          <h2 className="section-title">Finished rentals</h2>
          <p className="mt-1 text-lg font-semibold text-foreground sm:text-xl">
            {formatPeso(summary.collectedFromReturned)}
          </p>
          <p className="text-sm text-muted">
            collected of {formatPeso(summary.quotedFromReturned)} total price
          </p>
        </div>
        <div className="card">
          <h2 className="section-title">Quick counts</h2>
          <ul className="mt-1 space-y-0.5 text-xs text-muted sm:text-sm">
            <li>{summary.orderCount} active rentals</li>
            <li>{summary.paidInFullCount} fully paid</li>
            <li>{summary.cancelledCount} cancelled (not counted in totals)</li>
          </ul>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="border-b border-border/60 px-3 py-2">
          <h2 className="section-title">Each rental</h2>
        </div>
        {orders.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted">No rentals yet.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {orders.map((order) => {
              const balance = orderBalance(order.offerTotal, order.amountPaid);
              return (
                <li key={order.id}>
                  <Link
                    href={`/orders/${order.orderNumber}`}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-surface-elevated"
                  >
                    <div>
                      <p className="font-mono text-sm font-semibold">{order.orderNumber}</p>
                      <p className="text-sm text-muted">
                        {order.eventName || order.customerName || "—"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <span className="text-muted">
                        Price {formatPeso(order.offerTotal)}
                      </span>
                      <span className="font-medium text-emerald-400">
                        Paid {formatPeso(order.amountPaid)}
                      </span>
                      {balance > 0 && (
                        <span className="font-medium text-red-400">
                          Owes {formatPeso(balance)}
                        </span>
                      )}
                      <OrderStatusBadge status={order.status} />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "emerald" | "red";
}) {
  const valueClass =
    tone === "emerald"
      ? "text-emerald-400"
      : tone === "red"
        ? "text-red-400"
        : "text-foreground";

  return (
    <div className="card">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className={`mt-0.5 text-base font-semibold sm:text-lg ${valueClass}`}>{value}</p>
    </div>
  );
}
