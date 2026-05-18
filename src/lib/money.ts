/** Whole pesos (₱) — no centavos in UI for now */

import {
  parseOptionalWholeNumberString,
  parseWholeNumberString,
  validateWholeNumberString,
} from "./validate-numbers";

export function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString("en-PH")}`;
}

/** @deprecated Prefer validatePesoInput — returns 0 for invalid input */
export function parsePesoInput(value: string): number {
  const result = parseWholeNumberString(value, { allowEmpty: true, max: 99_999_999 });
  return result.ok ? result.value : 0;
}

export function validatePesoInput(
  value: string,
  label = "Amount",
): string | null {
  return validateWholeNumberString(value, {
    label,
    allowEmpty: true,
    max: 99_999_999,
  });
}

export function parsePesoInputStrict(
  value: string,
  label = "Amount",
): { ok: true; value: number } | { ok: false; error: string } {
  return parseWholeNumberString(value, {
    label,
    allowEmpty: true,
    max: 99_999_999,
  });
}

export function parseOptionalPesoInput(
  value: string,
  label: string,
): { ok: true; value: number | null } | { ok: false; error: string } {
  return parseOptionalWholeNumberString(value, label, 99_999_999);
}

export function orderBalance(offerTotal: number, amountPaid: number): number {
  return Math.max(0, offerTotal - amountPaid);
}

export function isFullyPaid(offerTotal: number, amountPaid: number): boolean {
  return offerTotal > 0 && amountPaid >= offerTotal;
}
