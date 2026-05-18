"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { PaymentSummary } from "@/components/PaymentSummary";
import { WholeNumberField } from "@/components/FormField";
import { BackLink } from "@/components/ux/BackLink";
import { PrimaryLink } from "@/components/ux/PrimaryButton";
import { HelpTip } from "@/components/ux/HelpTip";
import { LinePriceHint, OrderPriceReference } from "@/components/RentalPriceHint";
import { usePricingConfig } from "@/hooks/usePricingConfig";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import { formatOrderLine, orderLineGroupKey } from "@/lib/item-display";
import {
  formatPeso,
  orderBalance,
  parsePesoInputStrict,
  validatePesoInput,
} from "@/lib/money";
import type { OrderStatus, TableSize } from "@/generated/prisma/client";

type OrderLine = {
  id: string;
  itemType: "CHAIR" | "TABLE";
  tableSize: TableSize | null;
  hasCover: boolean;
  quantity: number;
  unitPrice?: number | null;
  availableCount?: number;
  allocatedCount?: number;
  allocatedCodes?: string[];
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
  notes: string | null;
  lines: OrderLine[];
  allocatedItemCodes?: string[];
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [offerInput, setOfferInput] = useState("");
  const [paidInput, setPaidInput] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [moneyErrors, setMoneyErrors] = useState<{
    offerTotal?: string;
    amountPaid?: string;
  }>({});
  const [deleting, setDeleting] = useState(false);
  const { config, loading: pricesLoading } = usePricingConfig();

  const load = useCallback(async () => {
    setLoading(true);
    setStatusError("");
    const res = await fetch(`/api/orders/${encodeURIComponent(id)}`);
    if (!res.ok) {
      setOrder(null);
      setLoading(false);
      return;
    }
    const data: Order = await res.json();
    setOrder(data);
    setOfferInput(String(data.offerTotal || ""));
    setPaidInput(String(data.amountPaid || ""));
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function patchOrder(body: Record<string, unknown>): Promise<boolean> {
    const res = await fetch(`/api/orders/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      const shortageText =
        Array.isArray(data.shortages) && data.shortages.length > 0
          ? ` ${data.shortages.map((s: { line: string; needed: number; found: number }) => `${s.line}: need ${s.needed}, only ${s.found} available`).join("; ")}`
          : "";
      setStatusError((data.error ?? "Could not update rental") + shortageText);
      return false;
    }
    setOrder(data);
    setStatusError("");
    return true;
  }

  async function updateStatus(status: OrderStatus) {
    await patchOrder({ status });
  }

  async function syncStock() {
    setSyncing(true);
    await patchOrder({ syncStock: true });
    setSyncing(false);
  }

  async function savePayment() {
    const offerErr = validatePesoInput(offerInput, "Total price");
    const paidErr = validatePesoInput(paidInput, "Amount paid");
    setMoneyErrors({ offerTotal: offerErr ?? undefined, amountPaid: paidErr ?? undefined });
    if (offerErr || paidErr) {
      setStatusError("Please fix the invalid amounts below.");
      return;
    }

    const offer = parsePesoInputStrict(offerInput, "Total price");
    const paid = parsePesoInputStrict(paidInput, "Amount paid");
    if (!offer.ok || !paid.ok) return;

    setSavingPayment(true);
    setStatusError("");
    const ok = await patchOrder({
      offerTotal: offer.value,
      amountPaid: paid.value,
    });
    setSavingPayment(false);
    if (!ok) return;
    setMoneyErrors({});
  }

  async function deleteOrder() {
    if (
      !window.confirm(
        `Delete rental ${order?.orderNumber ?? ""}? This cannot be undone.`,
      )
    ) {
      return;
    }

    setDeleting(true);
    setStatusError("");
    const res = await fetch(`/api/orders/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    setDeleting(false);

    if (!res.ok) {
      const data = await res.json();
      setStatusError(data.error ?? "Could not delete rental");
      return;
    }

    router.push("/orders");
    router.refresh();
  }

  async function settleBalance() {
    const offerErr = validatePesoInput(offerInput, "Total price");
    if (offerErr) {
      setMoneyErrors({ offerTotal: offerErr });
      setStatusError("Enter a valid total price before settling.");
      return;
    }

    const offer = parsePesoInputStrict(offerInput, "Total price");
    if (!offer.ok || offer.value <= 0) {
      setStatusError("Enter a total price before settling the balance.");
      return;
    }

    setSavingPayment(true);
    setStatusError("");
    setMoneyErrors({});
    const ok = await patchOrder({
      offerTotal: offer.value,
      amountPaid: offer.value,
    });
    setSavingPayment(false);
    if (!ok) return;
    setOfferInput(String(offer.value));
    setPaidInput(String(offer.value));
  }

  if (loading || pricesLoading || !config) return <p className="text-stone-500">Loading…</p>;
  if (!order) {
    return (
      <p className="text-base text-stone-600">
        Rental not found. <BackLink href="/orders">Back to rentals</BackLink>
      </p>
    );
  }

  const offerPreview = parsePesoInputStrict(offerInput, "Total price");
  const paidPreview = parsePesoInputStrict(paidInput, "Amount paid");
  const previewOffer = offerPreview.ok ? offerPreview.value : 0;
  const previewPaid = paidPreview.ok ? paidPreview.value : 0;
  const previewBalance = orderBalance(previewOffer, previewPaid);
  const canSettleBalance =
    previewBalance > 0 && offerPreview.ok && !moneyErrors.offerTotal && !moneyErrors.amountPaid;

  const stockOutOfSync =
    order.status === "OUT" &&
    (() => {
      const groups = new Map<string, { need: number; linked: number }>();
      for (const line of order.lines) {
        const key = orderLineGroupKey(line);
        const g = groups.get(key) ?? { need: 0, linked: 0 };
        g.need += line.quantity;
        g.linked += line.allocatedCount ?? 0;
        groups.set(key, g);
      }
      return [...groups.values()].some((g) => g.linked < g.need);
    })();

  return (
    <div className="page-stack">
      <BackLink href="/orders">Back to rentals</BackLink>

      <HelpTip>
        Tap <strong>Delivered to event</strong> to mark stock out, and <strong>Everything returned</strong> when items come back.
      </HelpTip>

      {statusError && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{statusError}</p>
      )}

      {stockOutOfSync && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-900">
            Stock is not fully linked to this rental yet.
          </p>
          <button
            type="button"
            onClick={syncStock}
            disabled={syncing}
            className="mt-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {syncing ? "Linking…" : "Link stock now"}
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <PrimaryLink href={`/orders/${order.orderNumber}/edit`} variant="secondary">
          Edit rental
        </PrimaryLink>
        <button
          type="button"
          onClick={deleteOrder}
          disabled={deleting}
          className="rounded-xl border-2 border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Delete rental"}
        </button>
      </div>

      <div className="card">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="font-mono text-lg font-bold sm:text-xl">{order.orderNumber}</h1>
            <p className="mt-0.5 truncate text-base font-medium text-stone-800">
              {order.eventName || order.customerName || "Unnamed event"}
            </p>
            {order.customerName && order.eventName && (
              <p className="text-sm text-stone-500">{order.customerName}</p>
            )}
            {order.eventDate && (
              <p className="mt-1 text-sm text-stone-500">
                {new Date(order.eventDate).toLocaleDateString(undefined, {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            )}
          </div>
          <OrderStatusBadge status={order.status} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => updateStatus("OUT")}
            disabled={order.status === "OUT"}
            className="btn-action bg-sky-600 text-white hover:bg-sky-700"
          >
            Delivered to event
          </button>
          <button
            type="button"
            onClick={() => updateStatus("RETURNED")}
            disabled={order.status === "RETURNED"}
            className="btn-action bg-emerald-600 text-white hover:bg-emerald-700"
          >
            Everything returned
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {(["PENDING", "CANCELLED"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => updateStatus(s)}
              disabled={order.status === s}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-800 disabled:opacity-50"
            >
              {ORDER_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <section className="card-accent space-y-4">
        <h2 className="section-title">Money</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <WholeNumberField
            label="Total price (your offer)"
            allowEmpty
            value={offerInput}
            onValueChange={setOfferInput}
            error={moneyErrors.offerTotal}
          />
          <WholeNumberField
            label="How much they paid already"
            allowEmpty
            value={paidInput}
            onValueChange={setPaidInput}
            error={moneyErrors.amountPaid}
          />
        </div>
        <PaymentSummary offerTotal={previewOffer} amountPaid={previewPaid} size="lg" />
        <div className="flex flex-wrap gap-2">
          {canSettleBalance && (
            <button
              type="button"
              onClick={settleBalance}
              disabled={savingPayment}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {savingPayment ? "Saving…" : `Settle balance (${formatPeso(previewBalance)})`}
            </button>
          )}
          <button
            type="button"
            onClick={savePayment}
            disabled={savingPayment}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {savingPayment ? "Saving…" : "Save money changes"}
          </button>
        </div>
      </section>

      <OrderPriceReference lines={order.lines} config={config} />

      <section className="card">
        <h2 className="section-title">What they rented</h2>
        <ul className="mt-3 space-y-2">
          {order.lines.map((line) => {
            const allocated = line.allocatedCount ?? 0;
            const short =
              order.status === "PENDING" &&
              (line.availableCount ?? 0) < line.quantity;
            const partialOut =
              order.status === "OUT" && allocated < line.quantity;

            return (
              <li
                key={line.id}
                className="rounded-lg border border-stone-100 bg-stone-50 px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-stone-900">{formatOrderLine(line)}</p>
                    <LinePriceHint line={line} config={config} />
                  </div>
                  <p
                    className={`text-sm ${short || partialOut ? "font-medium text-red-600" : "text-stone-500"}`}
                  >
                    {order.status === "OUT" || order.status === "RETURNED"
                      ? partialOut
                        ? `${allocated} of ${line.quantity} linked`
                        : `${allocated} piece${allocated === 1 ? "" : "s"} linked`
                      : short
                        ? `Only ${line.availableCount} available in storage`
                        : `${line.availableCount ?? "—"} available in storage`}
                  </p>
                </div>
                {line.allocatedCodes && line.allocatedCodes.length > 0 && (
                  <p className="mt-2 font-mono text-xs text-stone-500">
                    {line.allocatedCodes.join(", ")}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {order.notes && (
        <section className="rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-600">
          <span className="font-medium text-stone-800">Notes: </span>
          {order.notes}
        </section>
      )}
    </div>
  );
}
