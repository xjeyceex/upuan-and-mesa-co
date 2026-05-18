import { STATUS_LABELS } from "@/lib/constants";
import type { ItemStatus } from "@/generated/prisma/client";

const styles: Record<ItemStatus, string> = {
  IN_WAREHOUSE: "bg-emerald-500/20 text-emerald-300",
  OUT: "bg-sky-500/20 text-sky-300",
  DAMAGED: "bg-orange-500/20 text-orange-300",
  MISSING: "bg-danger-soft0/20 text-red-300",
  RETIRED: "bg-surface-elevated text-muted",
};

export function StatusBadge({ status }: { status: ItemStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${styles[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
