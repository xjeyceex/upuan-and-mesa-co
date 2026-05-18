/** Whole-number validation for money, quantities, and prices (no decimals). */

const WHOLE_NUMBER_PATTERN = /^[\d,]*$/;

export function sanitizeWholeNumberInput(value: string): string {
  return value.replace(/[^\d,]/g, "");
}

export function validateWholeNumberString(
  value: string,
  options: {
    label?: string;
    allowEmpty?: boolean;
    min?: number;
    max?: number;
  } = {},
): string | null {
  const label = options.label ?? "This field";
  const trimmed = value.trim();

  if (trimmed === "") {
    return options.allowEmpty ? null : `${label} is required`;
  }

  if (!WHOLE_NUMBER_PATTERN.test(trimmed)) {
    return `${label} must use digits only (no letters or symbols)`;
  }

  const normalized = trimmed.replace(/,/g, "");
  if (normalized === "") {
    return options.allowEmpty ? null : `${label} is required`;
  }

  const n = Number(normalized);
  if (!Number.isFinite(n)) {
    return `${label} is not a valid number`;
  }

  if (!Number.isInteger(n)) {
    return `${label} must be a whole number (no decimals)`;
  }

  if (n < 0) {
    return `${label} cannot be negative`;
  }

  const min = options.min ?? 0;
  if (n < min) {
    return min === 0
      ? `${label} cannot be negative`
      : `${label} must be at least ${min.toLocaleString("en-PH")}`;
  }

  if (options.max != null && n > options.max) {
    return `${label} must be at most ${options.max.toLocaleString("en-PH")}`;
  }

  return null;
}

export function parseWholeNumberString(
  value: string,
  options: Parameters<typeof validateWholeNumberString>[1] = {},
): { ok: true; value: number } | { ok: false; error: string } {
  const error = validateWholeNumberString(value, options);
  if (error) return { ok: false, error };
  const trimmed = value.trim();
  if (trimmed === "" && options.allowEmpty) {
    return { ok: true, value: 0 };
  }
  return { ok: true, value: Number(trimmed.replace(/,/g, "")) };
}

export function parseOptionalWholeNumberString(
  value: string,
  label: string,
  max?: number,
): { ok: true; value: number | null } | { ok: false; error: string } {
  if (value.trim() === "") {
    return { ok: true, value: null };
  }
  const result = parseWholeNumberString(value, { label, allowEmpty: false, min: 0, max });
  if (!result.ok) return result;
  return { ok: true, value: result.value };
}

export function parsePesoFromUnknown(
  value: unknown,
  label: string,
): { ok: true; value: number } | { ok: false; error: string } {
  if (value === undefined || value === null || value === "") {
    return { ok: true, value: 0 };
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return { ok: false, error: `${label} is not a valid number` };
    }
    if (!Number.isInteger(value)) {
      return { ok: false, error: `${label} must be a whole number (no decimals)` };
    }
    if (value < 0) {
      return { ok: false, error: `${label} cannot be negative` };
    }
    if (value > 99_999_999) {
      return { ok: false, error: `${label} is too large` };
    }
    return { ok: true, value: value };
  }

  if (typeof value === "string") {
    return parseWholeNumberString(value, { label, allowEmpty: true, max: 99_999_999 });
  }

  return { ok: false, error: `${label} is not valid` };
}

export function parseQuantityFromUnknown(
  value: unknown,
  label = "Quantity",
): { ok: true; value: number } | { ok: false; error: string } {
  if (value === undefined || value === null || value === "") {
    return { ok: false, error: `${label} is required` };
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value) || !Number.isInteger(value) || value < 1) {
      return { ok: false, error: `${label} must be a whole number of at least 1` };
    }
    if (value > 9999) {
      return { ok: false, error: `${label} cannot be more than 9,999` };
    }
    return { ok: true, value: value };
  }

  if (typeof value === "string") {
    const result = parseWholeNumberString(value, {
      label,
      allowEmpty: false,
      min: 1,
      max: 9999,
    });
    return result;
  }

  return { ok: false, error: `${label} is not valid` };
}

export function parseCountFromUnknown(
  value: unknown,
): { ok: true; value: number } | { ok: false; error: string } {
  return parseQuantityFromUnknown(value, "How many");
}
