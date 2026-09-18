/**
 * Business assumptions and cache policy for the Production dashboard.
 *
 * Everything here is now sourced from real ERPNext stock/manufacturing data:
 *  - Production flow & cost: `Process Order` and its `Finished Goods` /
 *    `Bi-Products` child tables (submitting a Process Order posts real
 *    `Stock Entry` documents — verified the quantities reconcile exactly).
 *  - Current stock & valuation: `Bin`, the materialized current-stock table
 *    ERPNext maintains from Stock Ledger postings — not reconstructed by
 *    summing history ourselves.
 *
 * No unit-conversion assumptions are needed except the one below, which is
 * an exact, fixed conversion (not an estimate).
 *
 * TODO(mill ops): confirm `seasonSugarProductionTargetMt` with production
 * planning — it's a placeholder, not a confirmed target.
 */
export const PRODUCTION_DASHBOARD_CONFIG = {
  /** Season production target, used only for the progress-bar context on the KPI card. */
  seasonSugarProductionTargetMt: 64_000,
  /** How many of the most recent production dates to show on the trend chart. */
  trendDays: 10,
  /** Sugar quantities in Process Order / Bin are stored in Quintals (QTL); 1 QTL = 0.1 MT exactly. */
  qtlToMt: 0.1,
} as const;

export const PRODUCTION_CACHE_TTL_MS = {
  dashboard: 60_000,
} as const;
