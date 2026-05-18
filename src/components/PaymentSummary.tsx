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
      <p className={`text-stone-500 ${isLg ? "text-sm" : "text-xs"}`}>
        Enter the total price and how much they paid.
      </p>
    );
  }

  const cell = isLg ? "rounded-lg bg-stone-50 p-3" : "";
  const balanceCell =
    isLg &&
    `rounded-lg p-3 ${balance > 0 ? "bg-red-50" : balance < 0 ? "bg-sky-50" : "bg-emerald-50"}`;

  return (
    <div
      className={`grid gap-2 ${isLg ? "grid-cols-3 text-center" : "grid-cols-3 gap-1 text-xs"}`}
    >
      <div className={cell}>
        <p className="text-stone-500">Total price</p>
        <p className={`font-semibold text-stone-900 ${isLg ? "text-lg sm:text-xl" : ""}`}>
          {formatPeso(offerTotal)}
        </p>
      </div>
      <div className={cell}>
        <p className="text-stone-500">They paid</p>
        <p className={`font-semibold text-emerald-700 ${isLg ? "text-lg sm:text-xl" : ""}`}>
          {formatPeso(amountPaid)}
        </p>
      </div>
      <div className={balanceCell || undefined}>
        <p className="text-stone-500">
          {balance > 0 ? "Still owed" : balance < 0 ? "Paid extra" : "All paid"}
        </p>
        <p
          className={`font-semibold ${isLg ? "text-lg sm:text-xl" : ""} ${
            balance > 0
              ? "text-red-700"
              : balance < 0
                ? "text-sky-700"
                : "text-emerald-700"
          }`}
        >
          {formatPeso(Math.abs(balance))}
        </p>
      </div>
    </div>
  );
}
