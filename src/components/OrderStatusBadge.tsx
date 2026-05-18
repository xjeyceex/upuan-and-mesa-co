import { ORDER_STATUS_LABELS } from "@/lib/constants";
import type { OrderStatus } from "@/generated/prisma/client";

const styles: Record<OrderStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  OUT: "bg-sky-100 text-sky-800",
  RETURNED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-stone-200 text-stone-600",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}
