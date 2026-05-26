"use client";

import { useEffect, useState } from "react";
import { formatPeso } from "@/lib/money";

const compactInputClass =
  "field-input mt-1 w-full rounded-lg border px-3 py-2 text-sm shadow-sm";

type LineSpecialPriceToggleProps = {
  value: string;
  onValueChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  defaultHint?: string;
};

export function LineSpecialPriceToggle({
  value,
  onValueChange,
  error,
  placeholder,
  defaultHint,
}: LineSpecialPriceToggleProps) {
  const [open, setOpen] = useState(() => value.trim() !== "");

  useEffect(() => {
    if (value.trim() !== "") setOpen(true);
  }, [value]);

  const trimmed = value.trim();
  const parsed = trimmed === "" ? null : Number(trimmed.replace(/,/g, ""));
  const hasValue = parsed != null && Number.isFinite(parsed) && parsed >= 0;

  function cancel() {
    setOpen(false);
    onValueChange("");
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`h-full min-h-[2.75rem] w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
          hasValue
            ? "border-accent-border bg-accent-soft text-accent"
            : "border-border bg-surface text-muted hover:bg-surface-elevated"
        }`}
      >
        <span className="font-medium leading-tight">
          {hasValue ? `Special ${formatPeso(parsed!)}/day` : "Special price"}
        </span>
        {!hasValue && defaultHint && (
          <span className="mt-0.5 block text-xs leading-tight opacity-80">{defaultHint}</span>
        )}
      </button>
    );
  }

  const invalidClass = error
    ? "border-red-500 ring-1 ring-red-500/30 focus:border-red-500"
    : "";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-subtle">Special / day</span>
        <button
          type="button"
          onClick={cancel}
          className="text-xs font-medium text-muted underline hover:text-foreground"
        >
          Cancel
        </button>
      </div>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={value}
        onChange={(e) => onValueChange(e.target.value.replace(/[^\d,]/g, ""))}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        className={`${compactInputClass} ${invalidClass}`}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
