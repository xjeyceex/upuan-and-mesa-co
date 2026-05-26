"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { StockAdjustPanel } from "@/components/StockAdjustPanel";
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
  const [total, setTotal] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<string>("");
  const [status, setStatus] = useState<string>(searchParams.get("status") ?? "");
  const [tableSize, setTableSize] = useState<string>("");
  const [q, setQ] = useState("");
  const [showList, setShowList] = useState(false);
  const [listKey, setListKey] = useState(0);

  const hasFilters = Boolean(type || status || tableSize || q.trim());
  const shouldLoadList = showList || hasFilters;

  const load = useCallback(async () => {
    if (!shouldLoadList) {
      setItems([]);
      setTotal(0);
      setTruncated(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (status) params.set("status", status);
    if (tableSize) params.set("tableSize", tableSize);
    if (q) params.set("q", q);
    params.set("limit", "80");
    const res = await fetch(`/api/items?${params}`);
    const data = await res.json();
    setItems(data.items ?? data);
    setTotal(data.total ?? data.items?.length ?? 0);
    setTruncated(Boolean(data.truncated));
    setLoading(false);
  }, [type, status, tableSize, q, shouldLoadList]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load, listKey]);

  return (
    <div className="page-stack">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <PageHeader title="My stock" description="Set counts above. Browse items when you need to." />
        <PrimaryLink href="/add">+ Add</PrimaryLink>
      </div>

      <StockAdjustPanel onUpdated={() => setListKey((k) => k + 1)} />

      <section className="space-y-2">
        {!showList && !hasFilters ? (
          <button
            type="button"
            onClick={() => setShowList(true)}
            className="w-full rounded-xl border border-border bg-surface-elevated px-4 py-3 text-sm font-semibold text-foreground hover:bg-surface"
          >
            Browse individual items
          </button>
        ) : null}

        <div className="flex flex-col gap-2">
          <label className="block">
            <span className="mb-0.5 block text-xs font-semibold text-subtle">Search</span>
            <input
              type="search"
              placeholder="e.g. CHAIR-0001"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="field-input w-full rounded-lg border border-border px-2.5 py-2 text-sm"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <select
              value={type}
              onChange={(e) => {
                const next = e.target.value;
                setType(next);
                if (next !== "TABLE") setTableSize("");
              }}
              className="field-input rounded-lg border border-border px-2.5 py-2 text-sm"
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
                className="field-input rounded-lg border border-border px-2.5 py-2 text-sm"
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
              className="field-input rounded-lg border border-border px-2.5 py-2 text-sm"
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

        {!shouldLoadList ? null : loading ? (
          <p className="text-base text-muted">Loading items…</p>
        ) : items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted">
            No items match.{" "}
            <Link href="/add" className="font-semibold text-accent hover:underline">
              Add stock
            </Link>
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/inventory/${item.code}`}
                  className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 hover:border-accent-border"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-bold text-foreground">{item.code}</p>
                    <p className="text-sm text-muted">
                      {config ? formatItemDescription(item, config) : formatItemDescription(item)}
                    </p>
                    {item.rentalOrder && (
                      <p className="text-xs font-medium text-accent">
                        {item.rentalOrder.orderNumber}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <StatusBadge status={item.status} />
                    {config &&
                      (item.status === "DAMAGED" || item.status === "MISSING") &&
                      !item.replacementSettled && (
                        <p className="mt-1 text-xs font-semibold text-orange-400">
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

        {shouldLoadList && !loading && (
          <p className="text-sm text-muted">
            Showing {items.length} of {total} item{total === 1 ? "" : "s"}
            {truncated ? " — use search to narrow down" : ""}
          </p>
        )}
      </section>
    </div>
  );
}

export default function InventoryPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <InventoryContent />
    </Suspense>
  );
}
