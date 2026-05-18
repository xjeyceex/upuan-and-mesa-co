import type { OrderLineLike } from "@/lib/item-display";
import { formatPeso } from "@/lib/money";
import type { PricingConfig } from "@/lib/pricing-config";
import {
  formatLineRateText,
  orderReferenceTotal,
  pricingConfigSummary,
} from "@/lib/pricing";

export function LinePriceHint({
  line,
  config,
}: {
  line: OrderLineLike;
  config: PricingConfig;
}) {
  const text = formatLineRateText(config, line);
  if (!text) return null;
  return <p className="text-xs text-accent">{text}</p>;
}

export function OrderPriceReference({
  lines,
  config,
}: {
  lines: OrderLineLike[];
  config: PricingConfig;
}) {
  const total = orderReferenceTotal(config, lines);
  if (total == null) {
    return (
      <p className="text-sm text-muted">
        Add rates for all items to see a suggested daily total (set 10 ft price in Default
        prices, or use a special price on the line).
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-accent-border bg-accent-soft px-4 py-3">
      <p className="text-sm font-semibold text-amber-950">Suggested price (per day)</p>
      <p className="mt-1 text-xl font-bold text-accent">{formatPeso(total)}</p>
      <p className="mt-1 text-xs text-accent">{pricingConfigSummary(config)}</p>
    </div>
  );
}
