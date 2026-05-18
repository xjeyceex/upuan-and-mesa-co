"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { BackLink } from "@/components/ux/BackLink";
import { HelpTip } from "@/components/ux/HelpTip";
import { PageHeader } from "@/components/ux/PageHeader";
import { WholeNumberField } from "@/components/FormField";
import { TABLE_SIZE_LABELS } from "@/lib/constants";
import {
  parseWholeNumberString,
  validateWholeNumberString,
} from "@/lib/validate-numbers";

export default function AddItemsPage() {
  const [type, setType] = useState<"CHAIR" | "TABLE">("CHAIR");
  const [tableSize, setTableSize] = useState<"FT_4" | "FT_6" | "FT_10">("FT_6");
  const [count, setCount] = useState("10");
  const [countError, setCountError] = useState("");
  const [hasCover, setHasCover] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ codes: string[] } | null>(null);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);

    const countErr = validateWholeNumberString(count, {
      label: "How many",
      allowEmpty: false,
      min: 1,
      max: 500,
    });
    setCountError(countErr ?? "");
    if (countErr) {
      setError("Please enter a valid number of items.");
      return;
    }

    const countResult = parseWholeNumberString(count, {
      label: "How many",
      min: 1,
      max: 500,
    });
    if (!countResult.ok) return;

    setLoading(true);

    const res = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        count: countResult.value,
        tableSize: type === "TABLE" ? tableSize : undefined,
        hasCover: type === "CHAIR" ? hasCover : false,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Could not add items. Please try again.");
      return;
    }

    setResult({ codes: data.created.map((c: { code: string }) => c.code) });
  }

  return (
    <div className="page-stack">
      <BackLink href="/inventory">Back to stock</BackLink>

      <PageHeader title="Add stock" description="Add extra items, or set exact counts on stock page." />

      <p className="text-sm text-muted">
        To set totals like 30 or 40 chairs, use{" "}
        <Link href="/inventory#adjust-stock" className="font-semibold text-accent hover:underline">
          adjust counts on My stock
        </Link>
        .
      </p>

      <form onSubmit={onSubmit} className="card space-y-3">
        <fieldset className="space-y-2">
          <legend className="section-title">Type</legend>
          <div className="flex gap-3">
            {(["CHAIR", "TABLE"] as const).map((t) => (
              <label
                key={t}
                className={`flex-1 cursor-pointer rounded-lg border px-2 py-2 text-center text-sm font-semibold ${
                  type === t
                    ? "border-amber-500 bg-accent-soft text-accent"
                    : "border-border text-muted"
                }`}
              >
                <input
                  type="radio"
                  name="type"
                  value={t}
                  checked={type === t}
                  onChange={() => setType(t)}
                  className="sr-only"
                />
                {t === "CHAIR" ? "Chairs" : "Tables"}
              </label>
            ))}
          </div>
        </fieldset>

        {type === "TABLE" && (
          <fieldset className="space-y-2">
            <legend className="section-title">Size</legend>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(TABLE_SIZE_LABELS) as Array<keyof typeof TABLE_SIZE_LABELS>).map(
                (key) => (
                  <label
                    key={key}
                    className={`cursor-pointer rounded-lg border px-3 py-2.5 text-center text-sm font-medium ${
                      tableSize === key
                        ? "border-amber-500 bg-accent-soft text-accent"
                        : "border-border text-muted"
                    }`}
                  >
                    <input
                      type="radio"
                      name="tableSize"
                      value={key}
                      checked={tableSize === key}
                      onChange={() => setTableSize(key)}
                      className="sr-only"
                    />
                    {TABLE_SIZE_LABELS[key]}
                  </label>
                ),
              )}
            </div>
          </fieldset>
        )}

        <WholeNumberField
          label="How many?"
          hint="Between 1 and 500 at a time"
          value={count}
          onValueChange={(v) => {
            setCount(v);
            setCountError("");
          }}
          error={countError}
        />

        {type === "CHAIR" && (
          <label className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm">
            <input
              type="checkbox"
              checked={hasCover}
              onChange={(e) => setHasCover(e.target.checked)}
              className="h-4 w-4 rounded border-border text-amber-600"
            />
            <span className="font-medium text-foreground">Has cover (+₱10/day)</span>
          </label>
        )}

        {error && (
          <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-block"
        >
          {loading
            ? "Adding…"
            : `Add ${count || "0"} ${type === "CHAIR" ? "chair" : "table"}${count === "1" ? "" : "s"}`}
        </button>
      </form>

      {result && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-sm font-semibold text-emerald-900">
            Done! Added {result.codes.length} item{result.codes.length === 1 ? "" : "s"}:{" "}
            {result.codes[0]}
            {result.codes.length > 1 ? ` … ${result.codes[result.codes.length - 1]}` : ""}
          </p>
          <Link
            href="/inventory"
            className="mt-4 inline-block rounded-xl bg-emerald-700 px-5 py-3 text-base font-semibold text-white hover:bg-emerald-800"
          >
            View my stock
          </Link>
        </div>
      )}
    </div>
  );
}
