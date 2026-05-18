type Props = {
  title?: string;
  children: React.ReactNode;
  variant?: "info" | "tip" | "warning";
};

const styles = {
  info: "border-sky-500/30 bg-info-soft",
  tip: "border-accent-border bg-accent-soft",
  warning: "border-orange-500/30 bg-orange-500/10",
};

export function HelpTip({ title, children, variant = "tip" }: Props) {
  return (
    <div
      className={`rounded-2xl border px-5 py-4 text-sm leading-relaxed text-foreground ${styles[variant]}`}
    >
      {title && <p className="mb-2 font-semibold">{title}</p>}
      <div className="text-muted [&_strong]:font-semibold [&_strong]:text-foreground">
        {children}
      </div>
    </div>
  );
}
