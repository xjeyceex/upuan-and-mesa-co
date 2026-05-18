import Link from "next/link";

const base =
  "inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-60 sm:text-base";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export function PrimaryButton({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const styles =
    variant === "primary"
      ? "bg-accent text-stone-950 hover:opacity-90"
      : "border-2 border-border bg-surface text-foreground hover:bg-surface-elevated";

  return (
    <button type="button" className={`${base} ${styles} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function PrimaryLink({
  href,
  variant = "primary",
  className = "",
  children,
}: {
  href: string;
  variant?: "primary" | "secondary";
  className?: string;
  children: React.ReactNode;
}) {
  const styles =
    variant === "primary"
      ? "bg-accent text-stone-950 hover:opacity-90"
      : "border-2 border-border bg-surface text-foreground hover:bg-surface-elevated";

  return (
    <Link href={href} className={`${base} ${styles} ${className}`}>
      {children}
    </Link>
  );
}
