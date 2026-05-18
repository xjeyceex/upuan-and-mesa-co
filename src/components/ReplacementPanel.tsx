import Link from "next/link";
import { STATUS_LABELS } from "@/lib/constants";
import { formatPeso } from "@/lib/money";
import type { PricingConfig } from "@/lib/pricing-config";
import type { ReplacementRow } from "@/lib/replacements";

type Props = {
  rows: ReplacementRow[];
  totalOwed: number;
  unknownCount: number;
  config: PricingConfig;
  compact?: boolean;
};

export function ReplacementPanel({
  rows,
  totalOwed,
  unknownCount,
  config,
  compact,
}: Props) {
  if (rows.length === 0) return null;

  return (
    <section
      className={`rounded-xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white p-3 sm:p-4`}
    >
      <h2 className="text-sm font-bold text-orange-950 sm:text-base">
        Damaged or missing — customer must pay or replace
      </h2>
      <p className="mt-0.5 text-xs text-orange-900 sm:text-sm">
        {rows.length} item{rows.length === 1 ? "" : "s"} not settled yet
        {totalOwed > 0 && (
          <>
            {" "}
            · Total if they pay: <strong>{formatPeso(totalOwed)}</strong>
          </>
        )}
        {unknownCount > 0 && " · Some items need a custom amount in notes"}
      </p>

      <ul className={`mt-3 space-y-2 ${compact ? "max-h-48 overflow-y-auto" : ""}`}>
        {rows.map((row) => (
          <li key={row.code}>
            <Link
              href={`/inventory/${row.code}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-orange-100 bg-surface px-3 py-2.5 hover:border-orange-300"
            >
              <div>
                <p className="font-mono text-sm font-bold text-foreground">{row.code}</p>
                <p className="text-sm text-muted">{row.description}</p>
                <p className="text-xs text-muted">{STATUS_LABELS[row.status]}</p>
                {row.rentalOrderNumber && (
                  <p className="text-xs text-accent">Rental {row.rentalOrderNumber}</p>
                )}
              </div>
              <p className="text-sm font-semibold text-orange-900">
                {row.cost != null ? formatPeso(row.cost) : "Custom amount"}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs text-orange-800">
        Chair {formatPeso(config.chairReplacement)} · 4 ft {formatPeso(config.table4ftReplacement)}{" "}
        · 6 ft {formatPeso(config.table6ftReplacement)}
        {" · "}
        <Link href="/prices" className="font-semibold underline">
          Edit default prices
        </Link>
      </p>
    </section>
  );
}
