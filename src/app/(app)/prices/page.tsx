"use client";

import { FormEvent, useEffect, useState } from "react";
import { WholeNumberField } from "@/components/FormField";
import { PageHeader } from "@/components/ux/PageHeader";
import type { PricingConfig } from "@/lib/pricing-config";
import { DEFAULT_PRICING_CONFIG } from "@/lib/pricing-config";
import { validateWholeNumberString } from "@/lib/validate-numbers";

type FormState = Record<keyof PricingConfig, string>;

const FIELD_LABELS: Record<keyof PricingConfig, string> = {
  chairRentalPerDay: "Chair rental per day",
  coverAddonPerDay: "Cover add-on per day",
  table4ftRentalPerDay: "4 ft table rental per day",
  table6ftRentalPerDay: "6 ft table rental per day",
  table10ftRentalPerDay: "10 ft table rental per day",
  chairReplacement: "Chair replacement cost",
  table4ftReplacement: "4 ft table replacement cost",
  table6ftReplacement: "6 ft table replacement cost",
  table10ftReplacement: "10 ft table replacement cost",
};

const OPTIONAL_EMPTY: (keyof PricingConfig)[] = [
  "table10ftRentalPerDay",
  "table10ftReplacement",
];

function configToForm(config: PricingConfig): FormState {
  return {
    chairRentalPerDay: String(config.chairRentalPerDay),
    coverAddonPerDay: String(config.coverAddonPerDay),
    table4ftRentalPerDay: String(config.table4ftRentalPerDay),
    table6ftRentalPerDay: String(config.table6ftRentalPerDay),
    table10ftRentalPerDay:
      config.table10ftRentalPerDay != null ? String(config.table10ftRentalPerDay) : "",
    chairReplacement: String(config.chairReplacement),
    table4ftReplacement: String(config.table4ftReplacement),
    table6ftReplacement: String(config.table6ftReplacement),
    table10ftReplacement:
      config.table10ftReplacement != null ? String(config.table10ftReplacement) : "",
  };
}

export default function PricesPage() {
  const [form, setForm] = useState<FormState>(configToForm(DEFAULT_PRICING_CONFIG));
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof PricingConfig, string>>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/settings/pricing")
      .then((r) => r.json())
      .then((data: PricingConfig) => {
        setForm(configToForm(data));
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load prices");
        setLoading(false);
      });
  }, []);

  function setField(key: keyof PricingConfig, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function validateForm(): boolean {
    const errors: Partial<Record<keyof PricingConfig, string>> = {};
    for (const key of Object.keys(form) as (keyof PricingConfig)[]) {
      const optional = OPTIONAL_EMPTY.includes(key);
      const err = validateWholeNumberString(form[key], {
        label: FIELD_LABELS[key],
        allowEmpty: optional,
        max: 99_999_999,
      });
      if (err) errors[key] = err;
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError("Please fix the invalid numbers below.");
      return false;
    }
    return true;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!validateForm()) return;

    setSaving(true);

    const body: Record<string, string | null> = {};
    for (const key of Object.keys(form) as (keyof PricingConfig)[]) {
      body[key] = form[key].trim() === "" ? null : form[key];
    }

    const res = await fetch("/api/settings/pricing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Could not save");
      return;
    }

    setForm(configToForm(data));
    setMessage("Prices saved. New rentals will use these amounts.");
  }

  if (loading) return <p className="text-muted">Loading prices…</p>;

  return (
    <div className="page-stack">
      <PageHeader title="Default prices" description="Rental and replacement defaults." />

      <form onSubmit={onSubmit} className="page-stack">
        <section className="card-accent space-y-2">
          <h2 className="section-title">Rental / day</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <WholeNumberField
              label="Chair (no cover)"
              value={form.chairRentalPerDay}
              onValueChange={(v) => setField("chairRentalPerDay", v)}
              error={fieldErrors.chairRentalPerDay}
            />
            <WholeNumberField
              label="Cover add-on"
              value={form.coverAddonPerDay}
              onValueChange={(v) => setField("coverAddonPerDay", v)}
              error={fieldErrors.coverAddonPerDay}
            />
            <WholeNumberField
              label="4 ft table"
              value={form.table4ftRentalPerDay}
              onValueChange={(v) => setField("table4ftRentalPerDay", v)}
              error={fieldErrors.table4ftRentalPerDay}
            />
            <WholeNumberField
              label="6 ft table"
              value={form.table6ftRentalPerDay}
              onValueChange={(v) => setField("table6ftRentalPerDay", v)}
              error={fieldErrors.table6ftRentalPerDay}
            />
            <WholeNumberField
              label="10 ft table (leave empty if not used)"
              allowEmpty
              value={form.table10ftRentalPerDay}
              onValueChange={(v) => setField("table10ftRentalPerDay", v)}
              error={fieldErrors.table10ftRentalPerDay}
            />
          </div>
          <p className="text-sm text-muted">
            Chair with cover = chair + cover add-on (e.g. ₱{form.chairRentalPerDay || "0"} + ₱
            {form.coverAddonPerDay || "0"})
          </p>
        </section>

        <section className="rounded-xl border border-orange-200 bg-orange-50/50 p-3 space-y-2 sm:p-4">
          <h2 className="section-title">Replacement</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <WholeNumberField
              label="Chair"
              value={form.chairReplacement}
              onValueChange={(v) => setField("chairReplacement", v)}
              error={fieldErrors.chairReplacement}
            />
            <WholeNumberField
              label="4 ft table"
              value={form.table4ftReplacement}
              onValueChange={(v) => setField("table4ftReplacement", v)}
              error={fieldErrors.table4ftReplacement}
            />
            <WholeNumberField
              label="6 ft table"
              value={form.table6ftReplacement}
              onValueChange={(v) => setField("table6ftReplacement", v)}
              error={fieldErrors.table6ftReplacement}
            />
            <WholeNumberField
              label="10 ft table (optional)"
              allowEmpty
              value={form.table10ftReplacement}
              onValueChange={(v) => setField("table10ftReplacement", v)}
              error={fieldErrors.table10ftReplacement}
            />
          </div>
        </section>

        {error && (
          <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-red-400">{error}</p>
        )}
        {message && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="btn-block"
        >
          {saving ? "Saving…" : "Save default prices"}
        </button>
      </form>
    </div>
  );
}
