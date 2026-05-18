import { ORDER_STATUS_LABELS } from "@/lib/constants";
import type { OrderStatus } from "@/generated/prisma/client";

const styles: Record<OrderStatus, string> = {
  PENDING: "bg-accent-soft0/20 text-amber-300",
  OUT: "bg-sky-500/20 text-sky-300",
  RETURNED: "bg-emerald-500/20 text-emerald-300",
  CANCELLED: "bg-surface-elevated text-muted",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${styles[status]}`}
    >
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}
