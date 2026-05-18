"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { HelpTip } from "@/components/ux/HelpTip";
import { PageHeader } from "@/components/ux/PageHeader";
import { PrimaryLink } from "@/components/ux/PrimaryButton";
import { usePricingConfig } from "@/hooks/usePricingConfig";
import { STATUS_LABELS, TABLE_SIZE_LABELS } from "@/lib/constants";
import { formatItemDescription } from "@/lib/item-display";
import { formatPeso } from "@/lib/money";
import { replacementCostForItem } from "@/lib/pricing";
import type { ItemStatus, ItemType, TableSize } from "@/generated/prisma/client";

type Item = {
  id: string;
  code: string;
  type: ItemType;
  tableSize: TableSize | null;
  hasCover: boolean;
  status: ItemStatus;
  notes: string | null;
  replacementSettled: boolean;
  rentalOrder?: { orderNumber: string } | null;
};

function InventoryContent() {
  const searchParams = useSearchParams();
  const { config } = usePricingConfig();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<string>("");
  const [status, setStatus] = useState<string>(searchParams.get("status") ?? "");
  const [tableSize, setTableSize] = useState<string>("");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (status) params.set("status", status);
    if (tableSize) params.set("tableSize", tableSize);
    if (q) params.set("q", q);
    const res = await fetch(`/api/items?${params}`);
    const data = await res.json();
    setItems(data);
    setLoading(false);
  }, [type, status, tableSize, q]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    if (type !== "TABLE") setTableSize("");
  }, [type]);

  return (
    <div className="page-stack">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <PageHeader title="My stock" description="Tap an item to update location." />
        <PrimaryLink href="/add">+ Add</PrimaryLink>
      </div>

      <div className="flex flex-col gap-2">
        <label className="block">
          <span className="mb-0.5 block text-xs font-semibold text-stone-700">Search</span>
          <input
            type="search"
            placeholder="e.g. CHAIR-0001"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="field-input w-full rounded-lg border border-stone-300 px-2.5 py-2 text-sm"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="field-input rounded-lg border border-stone-300 px-2.5 py-2 text-sm"
            aria-label="Type"
          >
            <option value="">Chairs and tables</option>
            <option value="CHAIR">Chairs only</option>
            <option value="TABLE">Tables only</option>
          </select>
          {type === "TABLE" && (
            <select
              value={tableSize}
              onChange={(e) => setTableSize(e.target.value)}
              className="field-input rounded-lg border border-stone-300 px-2.5 py-2 text-sm"
              aria-label="Table size"
            >
              <option value="">All sizes</option>
              {(Object.keys(TABLE_SIZE_LABELS) as Array<keyof typeof TABLE_SIZE_LABELS>).map(
                (key) => (
                  <option key={key} value={key}>
                    {TABLE_SIZE_LABELS[key]}
                  </option>
                ),
              )}
            </select>
          )}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="field-input rounded-lg border border-stone-300 px-2.5 py-2 text-sm"
            aria-label="Where is it"
          >
            <option value="">Any location</option>
            {(Object.keys(STATUS_LABELS) as ItemStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-base text-stone-500">Loading your stock…</p>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 p-4 text-center text-sm text-stone-600">
          Nothing here yet.{" "}
          <Link href="/add" className="font-semibold text-amber-800 hover:underline">
            Add your chairs and tables
          </Link>
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/inventory/${item.code}`}
                className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3 hover:border-amber-300"
              >
                <div className="min-w-0">
                  <p className="font-mono text-sm font-bold text-stone-900">{item.code}</p>
                  <p className="text-sm text-stone-500">
                    {config ? formatItemDescription(item, config) : formatItemDescription(item)}
                  </p>
                  {item.rentalOrder && (
                    <p className="text-xs font-medium text-amber-800">
                      {item.rentalOrder.orderNumber}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <StatusBadge status={item.status} />
                  {config &&
                    (item.status === "DAMAGED" || item.status === "MISSING") &&
                    !item.replacementSettled && (
                      <p className="mt-1 text-xs font-semibold text-orange-800">
                        {(() => {
                          const cost = replacementCostForItem(config, item);
                          return cost != null
                            ? `Owe ${formatPeso(cost)}`
                            : "Replacement due";
                        })()}
                      </p>
                    )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="text-sm text-stone-500">
        Showing {items.length} item{items.length === 1 ? "" : "s"}
      </p>
    </div>
  );
}

export default function InventoryPage() {
  return (
    <Suspense fallback={<p className="text-stone-500">Loading…</p>}>
      <InventoryContent />
    </Suspense>
  );
}
