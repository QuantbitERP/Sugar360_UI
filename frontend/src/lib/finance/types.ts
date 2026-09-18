export interface FinanceKpis {
  bankBalanceCr: number;
  cashBalanceCr: number;
  outstandingReceivablesCr: number;
  outstandingPayablesCr: number;
}

export interface RevenueData {
  todayCr: number;
  mtdCr: number;
  seasonCr: number;
  isToday: boolean;
  asOfDate: string | null;
  products: { itemCode: string; itemName: string; amountCr: number; sharePct: number }[];
}

export interface PurchaseData {
  todayCr: number;
  mtdCr: number;
  seasonCr: number;
  isToday: boolean;
  asOfDate: string | null;
  byHead: { itemGroup: string; amountCr: number; sharePct: number }[];
}

export interface GradeSales {
  itemCode: string;
  itemName: string;
  todayQty: number;
  todayValueCr: number;
  mtdQty: number;
  mtdValueCr: number;
}

export interface SalesPerformance {
  asOfDate: string | null;
  isToday: boolean;
  grades: GradeSales[];
  todayTotalQty: number;
  todayTotalValueCr: number;
  mtdTotalQty: number;
  mtdTotalValueCr: number;
  avgRealisationPerQtl: number | null;
}

export interface TopCustomerRow {
  customer: string;
  customerName: string;
  seasonValueCr: number;
  outstandingCr: number;
}

export interface FinanceDashboardData {
  meta: {
    seasonName: string;
    generatedAt: string;
    cacheTtlSeconds: number;
  };
  kpis: FinanceKpis;
  revenue: RevenueData;
  purchases: PurchaseData;
  salesPerformance: SalesPerformance;
  topCustomers: TopCustomerRow[];
}

export type PriceTrendGranularity = "daily" | "weekly" | "monthly";

export interface PriceTrendPoint {
  label: string;
  avgRate: number;
  qty: number;
}

export interface PriceTrendResult {
  points: PriceTrendPoint[];
  mspPerQtl: number;
}
