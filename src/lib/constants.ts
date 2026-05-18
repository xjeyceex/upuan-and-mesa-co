export const ITEM_TYPE_LABELS = {
  CHAIR: "Chair",
  TABLE: "Table",
} as const;

export const TABLE_SIZE_LABELS = {
  FT_4: "4 ft",
  FT_6: "6 ft",
  FT_10: "10 ft",
} as const;

/** Plain words for item location */
export const STATUS_LABELS = {
  IN_WAREHOUSE: "In storage",
  OUT: "At the event",
  DAMAGED: "Damaged",
  MISSING: "Missing",
  RETIRED: "Not in use",
} as const;

/** Plain words for rental job progress */
export const ORDER_STATUS_LABELS = {
  PENDING: "Not delivered yet",
  OUT: "At the event",
  RETURNED: "Finished",
  CANCELLED: "Cancelled",
} as const;

export const AUTH_COOKIE = "upuan_mesa_auth";
