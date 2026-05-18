import { formatPeso, orderBalance } from "@/lib/money";

type Props = {
  offerTotal: number;
  amountPaid: number;
  size?: "sm" | "lg";
};

export function PaymentSummary({ offerTotal, amountPaid, size = "sm" }: Props) {
  const balance = orderBalance(offerTotal, amountPaid);
  const isLg = size === "lg";

  if (offerTotal <= 0 && amountPaid <= 0) {
    return (
      <p className={`text-muted ${isLg ? "text-sm" : "text-xs"}`}>
        Enter the total price and how much they paid.
      </p>
    );
  }

  const cell = isLg ? "rounded-xl bg-surface-elevated p-4" : "";
  const balanceCell =
    isLg &&
    `rounded-xl p-4 ${balance > 0 ? "bg-danger-soft" : balance < 0 ? "bg-info-soft" : "bg-success-soft"}`;

  return (
    <div
      className={`grid gap-3 ${isLg ? "grid-cols-3 text-center" : "grid-cols-3 gap-2 text-xs"}`}
    >
      <div className={cell}>
        <p className="text-muted">Total price</p>
        <p className={`font-semibold text-foreground ${isLg ? "text-lg sm:text-xl" : ""}`}>
          {formatPeso(offerTotal)}
        </p>
      </div>
      <div className={cell}>
        <p className="text-muted">They paid</p>
        <p className={`font-semibold text-emerald-400 ${isLg ? "text-lg sm:text-xl" : ""}`}>
          {formatPeso(amountPaid)}
        </p>
      </div>
      <div className={balanceCell || undefined}>
        <p className="text-muted">
          {balance > 0 ? "Still owed" : balance < 0 ? "Paid extra" : "All paid"}
        </p>
        <p
          className={`font-semibold ${isLg ? "text-lg sm:text-xl" : ""} ${
            balance > 0
              ? "text-red-400"
              : balance < 0
                ? "text-sky-400"
                : "text-emerald-400"
          }`}
        >
          {formatPeso(Math.abs(balance))}
        </p>
      </div>
    </div>
  );
}
