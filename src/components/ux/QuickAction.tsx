import Link from "next/link";

type Props = {
  href: string;
  title: string;
  description: string;
  accent?: "amber" | "emerald" | "sky" | "stone";
};

const accents = {
  amber: "border-amber-200 bg-amber-50 hover:border-amber-400 hover:bg-amber-100",
  emerald: "border-emerald-200 bg-emerald-50 hover:border-emerald-400 hover:bg-emerald-100",
  sky: "border-sky-200 bg-sky-50 hover:border-sky-400 hover:bg-sky-100",
  stone: "border-stone-200 bg-white hover:border-stone-400 hover:bg-stone-50",
};

export function QuickAction({ href, title, description, accent = "amber" }: Props) {
  return (
    <Link
      href={href}
      className={`block rounded-xl border-2 p-4 transition sm:rounded-2xl ${accents[accent]}`}
    >
      <p className="text-base font-bold text-stone-900">{title}</p>
      <p className="mt-1 line-clamp-2 text-sm leading-snug text-stone-600">{description}</p>
    </Link>
  );
}
