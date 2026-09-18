export const INVENTORY_CACHE_TTL_MS = {
  dashboard: 60_000,
  /** The diesel item's code rarely changes — cache the lookup longer. */
  dieselItemLookup: 30 * 60_000,
} as const;

export const INVENTORY_DASHBOARD_CONFIG = {
  /** How many of the most recent distinct consumption entries to average over. */
  consumptionTrendSamples: 30,
} as const;
