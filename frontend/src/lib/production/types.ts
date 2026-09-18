export interface ProductionKpis {
  latestActivityDate: string | null;
  isToday: boolean;
  caneCrushedMt: number;
  sugarProducedMt: number;
  recoveryPct: number | null;
  seasonSugarProductionMt: number;
  seasonTargetMt: number;
  pctOfSeasonTarget: number;
  mtdSugarProductionMt: number;
  /** Season-to-date, from Process Order's own cost fields — real ₹, not estimated. */
  seasonFinishedGoodsValueCr: number;
  seasonByProductValueCr: number;
  /** Current stock value across all finished-goods + by-product items, from Bin. */
  currentStockValueCr: number;
  /** Season sugar production ÷ number of distinct production days this season. */
  avgDailyProductionMt: number;
  productionDaysCount: number;
  /** Qty-weighted average sugar sell price, from Sales Invoice Item on the latest sales date. */
  avgSellPricePerQtl: number | null;
}

export interface RevenueSlice {
  label: string;
  valueCr: number;
  sharePct: number;
}

export interface ProductionTrendPoint {
  date: string;
  sugarProducedMt: number;
}

export interface GradeRow {
  itemCode: string;
  itemName: string;
  openingStockMt: number | null;
  todayProductionMt: number;
  todaySalesMt: number;
  seasonProductionMt: number;
  avgRatePerQtl: number;
  currentStockMt: number;
  currentStockValueCr: number;
}

export interface ByProductRow {
  itemCode: string;
  itemName: string;
  unit: string;
  openingStock: number | null;
  todayProduction: number;
  todayConsumed: number;
  todaySales: number;
  seasonProduction: number;
  currentStock: number;
  currentStockValueCr: number;
  realisationPerUnit: number;
}

export interface ProductionDashboardData {
  meta: {
    seasonName: string;
    generatedAt: string;
    cacheTtlSeconds: number;
  };
  kpis: ProductionKpis;
  trend: ProductionTrendPoint[];
  gradeWise: GradeRow[];
  byProducts: ByProductRow[];
  /** Season-to-date revenue split across sugar + each by-product, from Process Order cost fields. */
  revenueSplit: RevenueSlice[];
  /** Not backed by a wired data source yet (see dashboard.server.ts comments). */
  notConnected: {
    plantUtilisationPct: null;
    boilingHousePurityPct: null;
  };
}
