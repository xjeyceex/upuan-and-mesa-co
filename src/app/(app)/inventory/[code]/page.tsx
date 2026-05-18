"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { BackLink } from "@/components/ux/BackLink";
import { HelpTip } from "@/components/ux/HelpTip";
import { STATUS_LABELS, TABLE_SIZE_LABELS } from "@/lib/constants";
import { usePricingConfig } from "@/hooks/usePricingConfig";
import { formatPeso } from "@/lib/money";
import {
  problemStatusButtonLabel,
  replacementCostForItem,
  replacementCostLabel,
} from "@/lib/pricing";
import { formatItemDescription } from "@/lib/item-display";
import type { ItemStatus, ItemType, TableSize } from "@/generated/prisma/client";

type Item = {
  code: string;
  type: ItemType;
  tableSize: TableSize | null;
  hasCover: boolean;
  status: ItemStatus;
  notes: string | null;
  replacementSettled: boolean;
  replacementCost: number | null;
  replacementDue: boolean;
  rentalOrder?: { orderNumber: string; eventName: string | null } | null;
};

const PROBLEM_STATUSES: Array<"DAMAGED" | "MISSING"> = ["DAMAGED", "MISSING"];

export default function ItemDetailPage() {
  const params = useParams();
  const code = String(params.code).toUpperCase();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [settling, setSettling] = useState(false);
  const { config, loading: pricesLoading } = usePricingConfig();

  const load = useCallback(async () => {
    const res = await fetch(`/api/items/${code}`);
    if (!res.ok) {
      setItem(null);
      setLoading(false);
      return;
    }
    const data: Item = await res.json();
    setItem(data);
    setNotes(data.notes ?? "");
    setLoading(false);
  }, [code]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(status: ItemStatus) {
    if (!item || !config) return;

    if (status === "DAMAGED" || status === "MISSING") {
      const cost = replacementCostForItem(config, item);
      const costText =
        cost != null
          ? formatPeso(cost)
          : "the replacement cost (set in notes if needed)";
      const ok = window.confirm(
        `Mark as ${STATUS_LABELS[status].toLowerCase()}?\n\n` +
          `The customer must either replace this item or pay ${costText} — what you paid to buy it.`,
      );
      if (!ok) return;
    }

    await fetch(`/api/items/${code}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function markSettled() {
    if (!item) return;
    const ok = window.confirm(
      "Mark as settled?\n\nUse this after the customer paid you or gave you a replacement item.",
    );
    if (!ok) return;

    setSettling(true);
    await fetch(`/api/items/${code}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ replacementSettled: true }),
    });
    setSettling(false);
    load();
  }

  async function saveNotes() {
    setSavingNotes(true);
    await fetch(`/api/items/${code}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    setSavingNotes(false);
    load();
  }

  async function toggleCover() {
    if (!item || item.type !== "CHAIR") return;
    await fetch(`/api/items/${code}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hasCover: !item.hasCover }),
    });
    load();
  }

  if (loading || pricesLoading || !config) return <p className="text-stone-500">Loading…</p>;
  if (!item) {
    return (
      <p className="text-base text-stone-600">
        Item not found. <BackLink href="/inventory">Back to my stock</BackLink>
      </p>
    );
  }

  const isProblem = item.status === "DAMAGED" || item.status === "MISSING";

  return (
    <div className="page-stack">
      <BackLink href="/inventory">Back to stock</BackLink>

      {item.replacementDue && (
        <section className="rounded-xl border-2 border-orange-300 bg-orange-50 p-3">
          <h2 className="section-title text-orange-950">Replacement needed</h2>
          <p className="mt-1 text-sm text-orange-900">{replacementCostLabel(config, item)}</p>
          {item.rentalOrder && (
            <p className="mt-2 text-sm text-orange-800">
              Linked rental:{" "}
              <Link
                href={`/orders/${item.rentalOrder.orderNumber}`}
                className="font-semibold underline"
              >
                {item.rentalOrder.orderNumber}
              </Link>
            </p>
          )}
          <button
            type="button"
            onClick={markSettled}
            disabled={settling}
            className="btn-block mt-2 bg-orange-600 hover:bg-orange-700"
          >
            {settling ? "Saving…" : "Mark settled"}
          </button>
        </section>
      )}

      {isProblem && item.replacementSettled && (
        <p className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
          Settled — no longer counted as money owed. You can mark as{" "}
          <strong>Not in use</strong> if this piece is gone for good.
        </p>
      )}

      <div className="card">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="font-mono text-lg font-bold sm:text-xl">{item.code}</h1>
            <p className="mt-1 text-stone-600">{formatItemDescription(item, config)}</p>
            {item.rentalOrder && !item.replacementDue && (
              <Link
                href={`/orders/${item.rentalOrder.orderNumber}`}
                className="mt-2 inline-block text-sm font-semibold text-amber-800 hover:underline"
              >
                On rental {item.rentalOrder.orderNumber}
                {item.rentalOrder.eventName ? ` · ${item.rentalOrder.eventName}` : ""}
              </Link>
            )}
          </div>
          <StatusBadge status={item.status} />
        </div>

        {!isProblem && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => updateStatus("OUT")}
              disabled={item.status === "OUT"}
              className="btn-action bg-sky-600 text-white hover:bg-sky-700"
            >
              At the event
            </button>
            <button
              type="button"
              onClick={() => updateStatus("IN_WAREHOUSE")}
              disabled={item.status === "IN_WAREHOUSE"}
              className="btn-action bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Back in storage
            </button>
          </div>
        )}

        {item.type === "CHAIR" && !isProblem && (
          <button
            type="button"
            onClick={toggleCover}
            className="mt-4 text-sm font-medium text-amber-700 hover:underline"
          >
            Switch to{" "}
            {item.hasCover
              ? `no cover (₱${config.chairRentalPerDay}/day)`
              : `with cover (₱${config.chairRentalPerDay + config.coverAddonPerDay}/day)`}
          </button>
        )}

        <div className="mt-3">
          <p className="text-sm font-semibold text-stone-800">Something wrong?</p>
          <p className="mt-1 text-sm text-stone-500">
            Chair {formatPeso(config.chairReplacement)} · 4 ft{" "}
            {formatPeso(config.table4ftReplacement)} · 6 ft{" "}
            {formatPeso(config.table6ftReplacement)} to replace or pay ·{" "}
            <Link href="/prices" className="underline">
              edit prices
            </Link>
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {PROBLEM_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => updateStatus(s)}
                disabled={item.status === s}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  item.status === s
                    ? "bg-orange-100 text-orange-900 ring-1 ring-orange-400"
                    : "border border-stone-300 text-stone-700 hover:bg-stone-50"
                }`}
              >
                {problemStatusButtonLabel(config, s, item)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => updateStatus("RETIRED")}
              disabled={item.status === "RETIRED"}
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
            >
              {STATUS_LABELS.RETIRED}
            </button>
          </div>
        </div>

        {item.type === "TABLE" && item.tableSize != null && (
          <p className="mt-4 text-sm text-stone-500">
            Size: {TABLE_SIZE_LABELS[item.tableSize]}
          </p>
        )}

        <label className="mt-3 block">
          <span className="text-sm font-medium text-stone-700">Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="e.g. customer will pay next week"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={saveNotes}
            disabled={savingNotes}
            className="mt-2 rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium hover:bg-stone-50 disabled:opacity-50"
          >
            {savingNotes ? "Saving…" : "Save notes"}
          </button>
        </label>
      </div>
    </div>
  );
}
