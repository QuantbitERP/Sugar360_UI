export const HT_CACHE_TTL_MS = {
  dashboard: 60_000,
} as const;

export const HT_DASHBOARD_CONFIG = {
  /** How many top contractors (by season quantity supplied) to show. */
  topContractorsLimit: 10,
  /** How many "advance paid, zero deliveries" exceptions to surface. */
  zeroDeliveryLimit: 8,
} as const;
