export interface OperationsKpis {
  latestActivityDate: string | null;
  isToday: boolean;
  caneReceivedTodayMt: number;
  caneReceivedPerHourMt: number | null;
  seasonCaneReceivedMt: number;
  peakHourMt: number | null;
  peakHour: number | null;
}

export interface ProductionSalesKpis {
  sugarProducedTodayMt: number;
  seasonSugarProductionMt: number;
  currentStockValueCr: number;
  todaySugarSalesQty: number;
  todaySugarSalesValueCr: number;
  salesAsOfDate: string | null;
  salesIsToday: boolean;
}

export interface FinancialPositionKpis {
  bankBalanceCr: number;
  outstandingReceivablesCr: number;
  outstandingPayablesCr: number;
  todayRevenueCr: number;
  todayExpensesCr: number;
  asOfDate: string | null;
  isToday: boolean;
}

export interface HourlyPoint {
  hour: string;
  actualMt: number;
  trips: number;
}

export type AlertTone = "critical" | "warning" | "good";

export interface AlertItem {
  category: string;
  tone: AlertTone;
  title: string;
  detail: string;
  badge: string;
}

export interface ManagementDashboardData {
  meta: {
    seasonName: string;
    generatedAt: string;
    cacheTtlSeconds: number;
  };
  financialPosition: FinancialPositionKpis;
  operations: OperationsKpis;
  productionSales: ProductionSalesKpis;
  hourly: HourlyPoint[];
  alerts: AlertItem[];
}
