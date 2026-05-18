import { STATUS_LABELS } from "@/lib/constants";
import type { ItemStatus } from "@/generated/prisma/client";

const styles: Record<ItemStatus, string> = {
  IN_WAREHOUSE: "bg-emerald-100 text-emerald-800",
  OUT: "bg-sky-100 text-sky-800",
  DAMAGED: "bg-orange-100 text-orange-800",
  MISSING: "bg-red-100 text-red-800",
  RETIRED: "bg-stone-200 text-stone-600",
};

export function StatusBadge({ status }: { status: ItemStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
