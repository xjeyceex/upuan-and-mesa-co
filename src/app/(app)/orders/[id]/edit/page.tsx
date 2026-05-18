"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { PaymentSummary } from "@/components/PaymentSummary";
import { TextAreaField, TextField, WholeNumberField } from "@/components/FormField";
import { BackLink } from "@/components/ux/BackLink";
import { HelpTip } from "@/components/ux/HelpTip";
import { PageHeader } from "@/components/ux/PageHeader";
import { LinePriceHint, OrderPriceReference } from "@/components/RentalPriceHint";
import { usePricingConfig } from "@/hooks/usePricingConfig";
import {
  formatPeso,
  parseOptionalPesoInput,
  parsePesoInputStrict,
  validatePesoInput,
} from "@/lib/money";
import { chairCoverLabel, orderReferenceTotal, tableSizeButtonLabel } from "@/lib/pricing";
import {
  parseWholeNumberString,
  validateWholeNumberString,
} from "@/lib/validate-numbers";

type LineDraft = {
  id: string;
  itemType: "CHAIR" | "TABLE";
  tableSize: "FT_4" | "FT_6" | "FT_10";
  hasCover: boolean;
  quantity: string;
  unitPrice: string;
};

function newLine(itemType: "CHAIR" | "TABLE" = "CHAIR"): LineDraft {
  return {
    id: crypto.randomUUID(),
    itemType,
    tableSize: "FT_4",
    hasCover: false,
    quantity: "1",
    unitPrice: "",
  };
}

function lineForPricing(line: LineDraft) {
  const qty = parseWholeNumberString(line.quantity, {
    label: "Quantity",
    allowEmpty: false,
    min: 1,
    max: 9999,
  });
  const unit = line.unitPrice.trim();
  const unitParsed =
    unit === ""
      ? { ok: true as const, value: null }
      : parsePesoInputStrict(unit, "Special price");
  return {
    itemType: line.itemType,
    tableSize: line.tableSize,
    hasCover: line.hasCover,
    quantity: qty.ok ? qty.value : 0,
    unitPrice: unitParsed.ok ? unitParsed.value : null,
  };
}

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default function EditOrderPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);
  const { config, loading: pricesLoading } = usePricingConfig();
  const [orderNumber, setOrderNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [offerTotal, setOfferTotal] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([newLine("CHAIR")]);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    offerTotal?: string;
    amountPaid?: string;
    lines?: Record<string, { quantity?: string; unitPrice?: string }>;
  }>({});

  const load = useCallback(async () => {
    setLoadingOrder(true);
    const res = await fetch(`/api/orders/${encodeURIComponent(id)}`);
    if (!res.ok) {
      setLoadingOrder(false);
      return;
    }
    const data = await res.json();
    setOrderNumber(data.orderNumber);
    setCustomerName(data.customerName ?? "");
    setEventName(data.eventName ?? "");
    setEventDate(toDateInputValue(data.eventDate));
    setOfferTotal(String(data.offerTotal || ""));
    setAmountPaid(String(data.amountPaid || ""));
    setNotes(data.notes ?? "");
    setLines(
      data.lines.length > 0
        ? data.lines.map(
            (line: {
              itemType: "CHAIR" | "TABLE";
              tableSize: "FT_4" | "FT_6" | "FT_10" | null;
              hasCover: boolean;
              quantity: number;
              unitPrice: number | null;
            }) => ({
              id: crypto.randomUUID(),
              itemType: line.itemType,
              tableSize: line.tableSize ?? "FT_4",
              hasCover: line.hasCover,
              quantity: String(line.quantity),
              unitPrice: line.unitPrice != null ? String(line.unitPrice) : "",
            }),
          )
        : [newLine("CHAIR")],
    );
    setLoadingOrder(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const offerParsed = parsePesoInputStrict(offerTotal, "Total price");
  const paidParsed = parsePesoInputStrict(amountPaid, "Amount paid");
  const offerNum = offerParsed.ok ? offerParsed.value : 0;
  const paidNum = paidParsed.ok ? paidParsed.value : 0;

  const balancePreview = useMemo(
    () => ({ offerTotal: offerNum, amountPaid: paidNum }),
    [offerNum, paidNum],
  );

  const pricingLines = useMemo(() => lines.map(lineForPricing), [lines]);
  const suggestedDaily = useMemo(
    () => (config ? orderReferenceTotal(config, pricingLines) : null),
    [config, pricingLines],
  );

  function updateLine(lineId: string, patch: Partial<LineDraft>) {
    setLines((prev) =>
      prev.map((line) => (line.id === lineId ? { ...line, ...patch } : line)),
    );
  }

  function removeLine(lineId: string) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.id !== lineId)));
  }

  function validateForm(): boolean {
    const errors: typeof fieldErrors = { lines: {} };
    const offerErr = validatePesoInput(offerTotal, "Total price");
    if (offerErr) errors.offerTotal = offerErr;
    const paidErr = validatePesoInput(amountPaid, "Amount paid");
    if (paidErr) errors.amountPaid = paidErr;

    lines.forEach((line, index) => {
      const key = line.id;
      const qtyErr = validateWholeNumberString(line.quantity, {
        label: `Item ${index + 1} quantity`,
        allowEmpty: false,
        min: 1,
        max: 9999,
      });
      if (qtyErr) errors.lines![key] = { ...errors.lines![key], quantity: qtyErr };

      if (line.unitPrice.trim() !== "") {
        const unitErr = validatePesoInput(line.unitPrice, "Special price per day");
        if (unitErr) errors.lines![key] = { ...errors.lines![key], unitPrice: unitErr };
      }
    });

    setFieldErrors(errors);
    const hasErrors =
      Boolean(errors.offerTotal || errors.amountPaid) ||
      Object.values(errors.lines ?? {}).some((e) => e.quantity || e.unitPrice);
    if (hasErrors) {
      setError("Please fix the invalid numbers below.");
      return false;
    }
    return true;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!validateForm()) return;

    const offer = parsePesoInputStrict(offerTotal, "Total price");
    const paid = parsePesoInputStrict(amountPaid, "Amount paid");
    if (!offer.ok || !paid.ok) return;

    const validatedLines = lines.map((line, index) => {
      const qty = parseWholeNumberString(line.quantity, {
        label: `Item ${index + 1} quantity`,
        min: 1,
        max: 9999,
      });
      const unit = parseOptionalPesoInput(line.unitPrice, "Special price");
      return { line, qty, unit };
    });
    if (validatedLines.some((v) => !v.qty.ok || !v.unit.ok)) return;

    setLoading(true);

    const res = await fetch(`/api/orders/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName,
        eventName,
        eventDate: eventDate || null,
        offerTotal: offer.value,
        amountPaid: paid.value,
        notes,
        lines: validatedLines.map(({ line, qty, unit }) => ({
          itemType: line.itemType,
          tableSize: line.itemType === "TABLE" ? line.tableSize : undefined,
          hasCover: line.itemType === "CHAIR" ? line.hasCover : false,
          quantity: qty.ok ? qty.value : 1,
          unitPrice: unit.ok ? unit.value : null,
        })),
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      const shortageText =
        Array.isArray(data.shortages) && data.shortages.length > 0
          ? ` ${data.shortages.map((s: { line: string; needed: number; found: number }) => `${s.line}: need ${s.needed}, only ${s.found} available`).join("; ")}`
          : "";
      setError((data.error ?? "Could not save changes") + shortageText);
      return;
    }

    router.push(`/orders/${data.orderNumber}`);
    router.refresh();
  }

  if (loadingOrder || pricesLoading || !config) {
    return <p className="text-stone-500">Loading…</p>;
  }

  if (!orderNumber) {
    return (
      <p className="text-base text-stone-600">
        Rental not found. <BackLink href="/orders">Back to rentals</BackLink>
      </p>
    );
  }

  return (
    <div className="page-stack">
      <BackLink href={`/orders/${orderNumber}`}>Back to rental</BackLink>

      <PageHeader
        title="Edit rental"
        description={`Update ${orderNumber} — who, items, and money.`}
      />

      <HelpTip>
        Changing items on a delivered rental will re-link stock.{" "}
        <Link href="/prices" className="font-semibold underline">
          Default prices
        </Link>
      </HelpTip>

      <form onSubmit={onSubmit} className="page-stack">
        <div className="card space-y-4">
          <h2 className="section-title">Who and when</h2>
          <TextField
            label="Customer name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Optional"
          />
          <TextField
            label="Event name"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            placeholder="e.g. Santos wedding"
          />
          <TextField
            label="Event date"
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
          />
        </div>

        <div className="card space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="section-title">Items</h2>
            <button
              type="button"
              onClick={() => setLines((p) => [...p, newLine("CHAIR")])}
              className="text-xs font-semibold text-amber-800 hover:underline sm:text-sm"
            >
              + Add item
            </button>
          </div>

          {lines.map((line, index) => (
            <div
              key={line.id}
              className="space-y-3 rounded-lg border border-stone-200 bg-stone-50 p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-stone-600">
                  Item {index + 1}
                </span>
                {lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLine(line.id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateLine(line.id, { itemType: "CHAIR" })}
                  className={`rounded-lg py-2 text-sm font-medium ${
                    line.itemType === "CHAIR"
                      ? "bg-amber-100 text-amber-900 ring-1 ring-amber-400"
                      : "bg-white text-stone-600"
                  }`}
                >
                  Chairs
                </button>
                <button
                  type="button"
                  onClick={() => updateLine(line.id, { itemType: "TABLE" })}
                  className={`rounded-lg py-2 text-sm font-medium ${
                    line.itemType === "TABLE"
                      ? "bg-amber-100 text-amber-900 ring-1 ring-amber-400"
                      : "bg-white text-stone-600"
                  }`}
                >
                  Tables
                </button>
              </div>

              {line.itemType === "TABLE" ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {(["FT_4", "FT_6", "FT_10"] as const).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => updateLine(line.id, { tableSize: size })}
                      className={`rounded-lg px-2 py-2 text-sm font-medium ${
                        line.tableSize === size
                          ? "bg-amber-100 text-amber-900"
                          : "bg-white text-stone-600"
                      }`}
                    >
                      {tableSizeButtonLabel(config, size)}
                    </button>
                  ))}
                </div>
              ) : (
                <label className="flex items-center gap-2 text-sm text-stone-800">
                  <input
                    type="checkbox"
                    checked={line.hasCover}
                    onChange={(e) =>
                      updateLine(line.id, { hasCover: e.target.checked })
                    }
                    className="h-4 w-4 rounded"
                  />
                  {chairCoverLabel(config)}
                </label>
              )}

              <LinePriceHint line={lineForPricing(line)} config={config} />

              <WholeNumberField
                label="Special price / day (optional)"
                hint="Empty = default price"
                allowEmpty
                value={line.unitPrice}
                onValueChange={(v) => updateLine(line.id, { unitPrice: v })}
                error={fieldErrors.lines?.[line.id]?.unitPrice}
                placeholder={`Default e.g. ${config.chairRentalPerDay}`}
              />

              <WholeNumberField
                label="Quantity"
                value={line.quantity}
                onValueChange={(v) => updateLine(line.id, { quantity: v })}
                error={fieldErrors.lines?.[line.id]?.quantity}
              />
            </div>
          ))}
        </div>

        <OrderPriceReference lines={pricingLines} config={config} />

        <div className="card-accent space-y-4">
          <h2 className="section-title">Money</h2>
          {suggestedDaily != null && (
            <button
              type="button"
              onClick={() => setOfferTotal(String(suggestedDaily))}
              className="text-sm font-semibold text-amber-800 underline hover:text-amber-950"
            >
              Use suggested {formatPeso(suggestedDaily)} as total price
            </button>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            <WholeNumberField
              label="Total price (your offer)"
              allowEmpty
              value={offerTotal}
              onValueChange={setOfferTotal}
              error={fieldErrors.offerTotal}
            />
            <WholeNumberField
              label="How much they paid already"
              allowEmpty
              value={amountPaid}
              onValueChange={setAmountPaid}
              error={fieldErrors.amountPaid}
            />
          </div>
          {(offerNum > 0 || paidNum > 0) && (
            <PaymentSummary
              offerTotal={balancePreview.offerTotal}
              amountPaid={balancePreview.amountPaid}
              size="lg"
            />
          )}
        </div>

        <TextAreaField
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <button type="submit" disabled={loading} className="btn-block">
          {loading ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
