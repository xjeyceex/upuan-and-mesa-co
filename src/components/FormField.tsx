import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

const inputClass =
  "field-input mt-1.5 w-full rounded-xl border px-4 py-3 text-base shadow-sm";

type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
};

export function TextField({
  label,
  hint,
  error,
  className = "",
  ...props
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const invalidClass = error
    ? "border-red-500 ring-1 ring-red-500/30 focus:border-red-500"
    : "";

  return (
    <label className="block">
      <span className="text-sm font-medium text-subtle">{label}</span>
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
      <input
        className={`${inputClass} ${invalidClass} ${className}`}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      {error && <p className="mt-1.5 text-sm text-red-400">{error}</p>}
    </label>
  );
}

export function WholeNumberField({
  label,
  hint,
  error,
  value,
  onValueChange,
  allowEmpty = false,
  className = "",
  ...props
}: FieldProps & {
  value: string;
  onValueChange: (value: string) => void;
  allowEmpty?: boolean;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">) {
  return (
    <TextField
      label={label}
      hint={hint}
      error={error}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={value}
      onChange={(e) => onValueChange(e.target.value.replace(/[^\d,]/g, ""))}
      className={className}
      placeholder={allowEmpty ? props.placeholder : props.placeholder ?? "0"}
      {...props}
    />
  );
}

export function TextAreaField({
  label,
  hint,
  className = "",
  ...props
}: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-subtle">{label}</span>
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
      <textarea className={`${inputClass} ${className}`} {...props} />
    </label>
  );
}

export function SelectField({
  label,
  hint,
  className = "",
  children,
  ...props
}: FieldProps & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-subtle">{label}</span>
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
      <select className={`${inputClass} ${className}`} {...props}>
        {children}
      </select>
    </label>
  );
}

export { inputClass };
