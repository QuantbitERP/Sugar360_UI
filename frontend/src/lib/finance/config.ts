export const FINANCE_CACHE_TTL_MS = {
  dashboard: 60_000,
  /** Account lists by type barely change — cache longer. */
  accountsByType: 30 * 60_000,
  priceTrend: 60_000,
} as const;

export const FINANCE_DASHBOARD_CONFIG = {
  topCustomersLimit: 10,
  purchaseItemGroupLimit: 8,
} as const;
