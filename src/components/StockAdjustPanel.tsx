"use client";

import { useCallback, useEffect, useState } from "react";
import {
  parseWholeNumberString,
  validateWholeNumberString,
} from "@/lib/validate-numbers";

type StockGroup = {
  key: string;
  itemType: "CHAIR" | "TABLE";
  tableSize: "FT_4" | "FT_6" | "FT_10" | null;
  hasCover: boolean;
  label: string;
  total: number;
  inWarehouse: number;
  out: number;
  locked: number;
  removable: number;
};

export function StockAdjustPanel({ onUpdated }: { onUpdated?: () => void }) {
  const [groups, setGroups] = useState<StockGroup[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/items/summary");
    const data: StockGroup[] = await res.json();
    setGroups(data);
    setDrafts(Object.fromEntries(data.map((g) => [g.key, String(g.total)])));
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(t);
  }, [load]);

  async function save(group: StockGroup) {
    setError("");
    const draft = drafts[group.key] ?? "";
    const err = validateWholeNumberString(draft, {
      label: group.label,
      allowEmpty: false,
      min: 0,
      max: 500,
    });
    if (err) {
      setError(err);
      return;
    }

    const parsed = parseWholeNumberString(draft, {
      label: group.label,
      min: 0,
      max: 500,
    });
    if (!parsed.ok) return;

    if (parsed.value === group.total) return;

    setSavingKey(group.key);

    try {
      const res = await fetch("/api/items/adjust", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemType: group.itemType,
          tableSize: group.itemType === "TABLE" ? group.tableSize : undefined,
          hasCover: group.itemType === "CHAIR" ? group.hasCover : false,
          targetCount: parsed.value,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Could not update count");
        return;
      }

      setGroups((prev) =>
        prev.map((g) =>
          g.key === group.key ? { ...g, total: parsed.value } : g,
        ),
      );
      setDrafts((d) => ({ ...d, [group.key]: String(parsed.value) }));
      onUpdated?.();
    } finally {
      setSavingKey(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">Loading stock counts…</p>;
  }

  const busy = savingKey !== null;

  return (
    <section className="card space-y-3" id="adjust-stock" aria-busy={busy}>
      <div>
        <h2 className="section-title">How many you own</h2>
        <p className="mt-1 text-sm text-muted">
          Set the real count (e.g. 30 chairs). One quick save — no need to add one-by-one.
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-red-400">{error}</p>
      )}

      {busy && (
        <p className="text-sm font-medium text-accent">Saving…</p>
      )}

      <ul className="space-y-2">
        {groups.map((group) => {
          const draft = drafts[group.key] ?? String(group.total);
          const dirty = draft !== String(group.total);
          const parsed = parseWholeNumberString(draft, { min: 0, max: 500 });
          const target = parsed.ok ? parsed.value : null;
          const willRemove = target != null && target < group.total ? group.total - target : 0;
          const cannotRemoveEnough =
            willRemove > 0 && willRemove > group.removable;

          return (
            <li
              key={group.key}
              className="rounded-xl border border-border bg-surface-elevated p-3 sm:p-4"
            >
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{group.label}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    Now {group.total}
                    {group.total > 0 && (
                      <>
                        {" "}
                        · {group.inWarehouse} in storage
                        {group.out > 0 ? ` · ${group.out} out` : ""}
                      </>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="sr-only" htmlFor={`stock-${group.key}`}>
                    Total {group.label}
                  </label>
                  <input
                    id={`stock-${group.key}`}
                    type="text"
                    inputMode="numeric"
                    value={draft}
                    disabled={busy}
                    onChange={(e) => {
                      setDrafts((d) => ({
                        ...d,
                        [group.key]: e.target.value.replace(/[^\d,]/g, ""),
                      }));
                      setError("");
                    }}
                    className="field-input w-16 rounded-lg border border-border px-2 py-2 text-center text-sm font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => save(group)}
                    disabled={
                      busy ||
                      !dirty ||
                      savingKey === group.key ||
                      cannotRemoveEnough ||
                      !parsed.ok
                    }
                    className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-stone-950 hover:opacity-90 disabled:opacity-50"
                  >
                    {savingKey === group.key ? "…" : "Set"}
                  </button>
                </div>
              </div>
              {cannotRemoveEnough && (
                <p className="mt-2 text-xs text-red-400">
                  Only {group.removable} in storage can be removed — some are out or damaged.
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
