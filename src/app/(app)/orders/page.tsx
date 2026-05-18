"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { HelpTip } from "@/components/ux/HelpTip";
import { PageHeader } from "@/components/ux/PageHeader";
import { PrimaryLink } from "@/components/ux/PrimaryButton";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import { orderLinesSummary } from "@/lib/item-display";
import { formatPeso, orderBalance } from "@/lib/money";
import type { OrderStatus, TableSize } from "@/generated/prisma/client";

type OrderLine = {
  itemType: "CHAIR" | "TABLE";
  tableSize: TableSize | null;
  hasCover: boolean;
  quantity: number;
};

type Order = {
  id: string;
  orderNumber: string;
  customerName: string | null;
  eventName: string | null;
  eventDate: string | null;
  status: OrderStatus;
  offerTotal: number;
  amountPaid: number;
  lines: OrderLine[];
  createdAt: string;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = status ? `?status=${status}` : "";
    const res = await fetch(`/api/orders${params}`);
    setOrders(await res.json());
    setLoading(false);
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="page-stack">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <PageHeader title="Rentals" description="What they rented, price, and payment." />
        <PrimaryLink href="/orders/new">+ New</PrimaryLink>
      </div>

      <HelpTip>Tap a rental to update payment or mark delivered / returned.</HelpTip>

      <label className="block max-w-xs">
        <span className="mb-0.5 block text-xs font-semibold text-stone-700">Show only</span>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="field-input w-full rounded-lg border border-stone-300 px-2.5 py-2 text-sm"
        >
          <option value="">All rentals</option>
          {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </label>

      {loading ? (
        <p className="text-base text-stone-500">Loading your rentals…</p>
      ) : orders.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 p-4 text-center text-sm text-stone-600">
          No rentals yet.{" "}
          <Link href="/orders/new" className="font-semibold text-amber-800 hover:underline">
            Create your first rental
          </Link>
        </p>
      ) : (
        <ul className="space-y-2">
          {orders.map((order) => (
            <li key={order.id}>
              <Link href={`/orders/${order.orderNumber}`} className="list-row">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-bold text-stone-900">
                      {order.orderNumber}
                    </p>
                    <p className="mt-0.5 truncate text-sm font-medium text-stone-800">
                      {order.eventName || order.customerName || "No name yet"}
                    </p>
                    <p className="mt-1 text-sm text-stone-500">
                      {orderLinesSummary(order.lines)}
                    </p>
                    {order.offerTotal > 0 && (
                      <p className="mt-1 text-sm font-medium text-stone-700">
                        Price {formatPeso(order.offerTotal)} · Paid {formatPeso(order.amountPaid)}
                        {orderBalance(order.offerTotal, order.amountPaid) > 0 && (
                          <span className="text-red-600">
                            {" "}
                            · Still owes{" "}
                            {formatPeso(orderBalance(order.offerTotal, order.amountPaid))}
                          </span>
                        )}
                      </p>
                    )}
                    {order.eventDate && (
                      <p className="mt-1 text-xs text-stone-400">
                        {new Date(order.eventDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
