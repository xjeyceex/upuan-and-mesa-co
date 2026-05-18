type Props = {
  title?: string;
  children: React.ReactNode;
  variant?: "info" | "tip" | "warning";
};

const styles = {
  info: "border-sky-200 bg-sky-50 text-sky-900",
  tip: "border-amber-200 bg-amber-50 text-amber-950",
  warning: "border-orange-200 bg-orange-50 text-orange-950",
};

export function HelpTip({ title, children, variant = "tip" }: Props) {
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${styles[variant]}`}>
      {title && <p className="mb-1 font-semibold">{title}</p>}
      <div className="text-stone-700 [&_strong]:font-semibold [&_strong]:text-inherit">
        {children}
      </div>
    </div>
  );
}
