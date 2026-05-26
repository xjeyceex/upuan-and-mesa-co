"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { PaymentSummary } from "@/components/PaymentSummary";
import { TextAreaField, TextField, WholeNumberField } from "@/components/FormField";
import { BackLink } from "@/components/ux/BackLink";
import { HelpTip } from "@/components/ux/HelpTip";
import { PageHeader } from "@/components/ux/PageHeader";
import { LineSpecialPriceToggle } from "@/components/LineSpecialPriceToggle";
import { LinePriceHint, OrderPriceReference } from "@/components/RentalPriceHint";
import { useAutoOfferTotal } from "@/hooks/useAutoOfferTotal";
import { usePricingConfig } from "@/hooks/usePricingConfig";
import {
  formatPeso,
  parseOptionalPesoInput,
  parsePesoInputStrict,
  validatePesoInput,
} from "@/lib/money";
import {
  parseWholeNumberString,
  validateWholeNumberString,
} from "@/lib/validate-numbers";
import { chairCoverLabel, dailyRate, orderReferenceTotal, tableSizeButtonLabel } from "@/lib/pricing";
import Link from "next/link";

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

export default function NewOrderPage() {
  const router = useRouter();
  const { config, loading: pricesLoading } = usePricingConfig();
  const [customerName, setCustomerName] = useState("");
  const [rentDate, setRentDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [amountPaid, setAmountPaid] = useState("0");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([newLine("CHAIR")]);
  const [showMoney, setShowMoney] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    offerTotal?: string;
    amountPaid?: string;
    lines?: Record<string, { quantity?: string; unitPrice?: string }>;
  }>({});

  const pricingLines = useMemo(() => lines.map(lineForPricing), [lines]);
  const suggestedDaily = useMemo(
    () => (config ? orderReferenceTotal(config, pricingLines) : null),
    [config, pricingLines],
  );

  const {
    offerTotal,
    setOfferTotal,
    resetToSuggested,
    unlockOfferTotal,
    setOfferToZero,
    offerTotalLocked,
  } = useAutoOfferTotal(suggestedDaily);

  function openBorrow() {
    setShowMoney(true);
    setAmountPaid("0");
    unlockOfferTotal();
  }

  function cancelBorrow() {
    setShowMoney(false);
    setAmountPaid("0");
    setOfferToZero();
  }

  const offerParsed = parsePesoInputStrict(offerTotal, "Total price");
  const paidParsed = parsePesoInputStrict(amountPaid, "Amount paid");
  const offerNum = offerParsed.ok ? offerParsed.value : 0;
  const paidNum = paidParsed.ok ? paidParsed.value : 0;

  const balancePreview = useMemo(
    () => ({ offerTotal: offerNum, amountPaid: paidNum }),
    [offerNum, paidNum],
  );

  function defaultUnitPricePlaceholder(line: LineDraft) {
    if (!config) return "Default price";
    const rate = dailyRate(config, line.itemType, {
      hasCover: line.itemType === "CHAIR" ? line.hasCover : false,
      tableSize: line.itemType === "TABLE" ? line.tableSize : null,
    });
    return rate != null ? `Default ₱${rate}/day` : "Default price";
  }

  function updateLine(id: string, patch: Partial<LineDraft>) {
    setLines((prev) =>
      prev.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    );
  }

  function removeLine(id: string) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.id !== id)));
  }

  function validateForm(): boolean {
    const errors: typeof fieldErrors = { lines: {} };
    if (showMoney) {
      const offerErr = validatePesoInput(offerTotal, "Total price");
      if (offerErr) errors.offerTotal = offerErr;
      const paidErr = validatePesoInput(amountPaid, "Amount paid");
      if (paidErr) errors.amountPaid = paidErr;
    }

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

    if (returnDate && !rentDate) {
      setError("Rent date is required if return date is set.");
      return false;
    }
    if (rentDate && returnDate) {
      const r = new Date(rentDate);
      const ret = new Date(returnDate);
      if (!Number.isNaN(r.getTime()) && !Number.isNaN(ret.getTime()) && ret.getTime() < r.getTime()) {
        setError("Return date cannot be earlier than rent date.");
        return false;
      }
    }
    return true;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!validateForm()) return;

    const offer = showMoney
      ? parsePesoInputStrict(offerTotal, "Total price")
      : ({ ok: true as const, value: 0 });
    const paid = showMoney
      ? parsePesoInputStrict(amountPaid, "Amount paid")
      : ({ ok: true as const, value: 0 });
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

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName,
        rentDate: rentDate || null,
        returnDate: returnDate || null,
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
      setError(data.error ?? "Could not save order");
      return;
    }

    router.push(`/orders/${data.orderNumber}`);
    router.refresh();
  }

  if (pricesLoading || !config) {
    return <p className="text-muted">Loading prices…</p>;
  }

  return (
    <div className="page-stack">
      <BackLink href="/orders">Back to rentals</BackLink>

      <PageHeader title="New rental" description="Items, price, and payment." />

      <HelpTip>
        One row per item type.{" "}
        <Link href="/prices" className="font-semibold underline">
          Default prices
        </Link>{" "}
        or a special price on one line.
      </HelpTip>

      <form onSubmit={onSubmit} className="page-stack">
        <div className="card space-y-4">
          <h2 className="section-title">Who and dates</h2>
          <TextField
            label="Customer name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Optional"
          />
          <div className="grid grid-cols-2 gap-2">
            <TextField
              label="Rent date"
              type="date"
              value={rentDate}
              onChange={(e) => setRentDate(e.target.value)}
            />
            <TextField
              label="Return date"
              type="date"
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
            />
          </div>
        </div>

        <div className="card space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="section-title">Items</h2>
            <button
              type="button"
              onClick={() => setLines((p) => [...p, newLine("CHAIR")])}
              className="text-xs font-semibold text-accent hover:underline sm:text-sm"
            >
              + Add item
            </button>
          </div>

          {lines.map((line, index) => (
            <div
              key={line.id}
              className="space-y-2 rounded-lg border border-border bg-surface-elevated p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-muted">
                  Item {index + 1}
                </span>
                {lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLine(line.id)}
                    className="text-xs text-red-400 hover:underline"
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
                      ? "bg-accent-soft text-accent ring-1 ring-amber-400"
                      : "bg-surface text-muted"
                  }`}
                >
                  Chairs
                </button>
                <button
                  type="button"
                  onClick={() => updateLine(line.id, { itemType: "TABLE" })}
                  className={`rounded-lg py-2 text-sm font-medium ${
                    line.itemType === "TABLE"
                      ? "bg-accent-soft text-accent ring-1 ring-amber-400"
                      : "bg-surface text-muted"
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
                          ? "bg-accent-soft text-accent"
                          : "bg-surface text-muted"
                      }`}
                    >
                      {tableSizeButtonLabel(config, size)}
                    </button>
                  ))}
                </div>
              ) : (
                <label className="flex items-center gap-2 text-sm text-foreground">
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

              <div className="grid grid-cols-2 gap-2">
                <LineSpecialPriceToggle
                  value={line.unitPrice}
                  onValueChange={(v) => updateLine(line.id, { unitPrice: v })}
                  error={fieldErrors.lines?.[line.id]?.unitPrice}
                  placeholder={defaultUnitPricePlaceholder(line)}
                  defaultHint={defaultUnitPricePlaceholder(line)}
                />
                <WholeNumberField
                  label="Qty"
                  value={line.quantity}
                  onValueChange={(v) => updateLine(line.id, { quantity: v })}
                  error={fieldErrors.lines?.[line.id]?.quantity}
                  className="[&_input]:mt-1 [&_input]:rounded-lg [&_input]:py-2 [&_input]:text-sm"
                />
              </div>
            </div>
          ))}
        </div>

        <OrderPriceReference lines={pricingLines} config={config} />

        {!showMoney ? (
          <button
            type="button"
            onClick={openBorrow}
            className="w-full rounded-xl border border-border bg-surface-elevated px-4 py-3 text-sm font-semibold text-foreground hover:bg-surface"
          >
            Will borrow
          </button>
        ) : (
          <div className="card-accent space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="section-title">Money</h2>
              <button
                type="button"
                onClick={cancelBorrow}
                className="shrink-0 text-sm font-medium text-muted underline hover:text-foreground"
              >
                Cancel borrow
              </button>
            </div>
            <p className="text-sm text-muted">
              Total price vs paid today — balance is what they still owe.
            </p>
            <p className="text-xs text-muted">
              {offerTotalLocked
                ? "You set a custom total. Recalculate if items changed."
                : suggestedDaily != null
                  ? `Total price follows items (${formatPeso(suggestedDaily)} at default rates).`
                  : "Total price updates from items when quantities are valid."}
            </p>
            {offerTotalLocked && suggestedDaily != null && (
              <button
                type="button"
                onClick={resetToSuggested}
                className="text-sm font-semibold text-accent underline hover:text-accent-hover"
              >
                Recalculate {formatPeso(suggestedDaily)} from items
              </button>
            )}
            <div className="grid gap-2 sm:grid-cols-2">
              <WholeNumberField
                label="Total price (your offer)"
                allowEmpty
                value={offerTotal}
                onValueChange={setOfferTotal}
                error={fieldErrors.offerTotal}
                placeholder={suggestedDaily != null ? String(suggestedDaily) : "1100"}
              />
              <WholeNumberField
                label="How much they paid already"
                allowEmpty
                value={amountPaid}
                onValueChange={setAmountPaid}
                error={fieldErrors.amountPaid}
                placeholder="0"
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
        )}

        <TextAreaField
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />

        {error && (
          <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-block"
        >
          {loading ? "Saving…" : "Save rental"}
        </button>
      </form>
    </div>
  );
}
