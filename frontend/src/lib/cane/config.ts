/**
 * Business assumptions and cache policy for the Cane & Agriculture dashboard.
 *
 * Everything derivable straight from transactional data (Cane Weight, Cane
 * Registration, ...) is computed live in `queries.server.ts`. The handful of
 * values below are *not* stored anywhere in Frappe today — they're planning
 * assumptions a mill's cane/agronomy team sets once a season. Keeping them
 * here (instead of hardcoding them inline) makes them one obvious place to
 * change instead of a scavenger hunt through the query layer.
 *
 * TODO(mill ops): confirm `avgYieldMtPerAcre` and `targetDailySupplyMt` with
 * the agronomy/cane-development team for the active season — the values
 * below are placeholders, not confirmed figures.
 */
export const CANE_DASHBOARD_CONFIG = {
  /** Assumed cane yield per registered acre, used to estimate season availability. */
  avgYieldMtPerAcre: 20,
  /** Daily intake target used as the reference line on the supply-vs-target chart. */
  targetDailySupplyMt: 5000,
  /** How many of the most recent posting dates to show on the supply trend chart. */
  supplyTrendDays: 10,
  /** How many top varieties to break out individually before bucketing the rest as "Other". */
  varietyTopN: 6,
  /** How many zones (circle offices) to surface on the zone-health card. */
  zoneLimit: 8,
} as const;

export const CACHE_TTL_MS = {
  /** The full bundled dashboard payload — short, since this is a "live control room" view. */
  dashboard: 60_000,
  /** Which season is "active" — changes at most a few times a year. */
  season: 5 * 60_000,
  /** Code → label lookups (circle office, village, crop variety, shift) — practically static. */
  dimensions: 30 * 60_000,
} as const;

export const ACTIVITY_PAGE_SIZE = 8;
