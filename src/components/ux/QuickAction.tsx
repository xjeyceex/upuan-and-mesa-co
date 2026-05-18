import Link from "next/link";

type Props = {
  href: string;
  title: string;
  accent?: "amber" | "emerald" | "sky" | "stone";
  className?: string;
};

const accents = {
  amber: "bg-accent text-stone-950 shadow-sm hover:opacity-90",
  emerald:
    "border border-emerald-500/40 bg-emerald-500/15 text-foreground hover:bg-emerald-500/25",
  sky: "border border-sky-500/40 bg-sky-500/15 text-foreground hover:bg-sky-500/25",
  stone:
    "border border-border bg-surface-elevated text-foreground hover:bg-surface hover:border-muted",
};

export function QuickAction({ href, title, accent = "amber", className = "" }: Props) {
  return (
    <Link
      href={href}
      className={`flex min-h-[2.75rem] items-center justify-center rounded-xl px-3 py-2.5 text-center text-sm font-semibold transition active:scale-[0.98] ${accents[accent]} ${className}`}
    >
      {title}
    </Link>
  );
}
