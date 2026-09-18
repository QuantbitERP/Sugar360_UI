export interface DieselWidgetData {
  asOfDate: string | null;
  isToday: boolean;
  currentStockL: number;
  currentStockValueCr: number;
  receivedTodayL: number;
  consumedTodayL: number;
  avgDailyConsumptionL: number;
  avgSampleDays: number;
  stockDaysRemaining: number | null;
  /** current stock ÷ (avg daily consumption × 30) — a coverage ratio, not a physical tank-capacity %. */
  coverageOfRollingMonthPct: number | null;
}

export interface FuelRoleRow {
  entityType: string;
  quantityL: number;
  entries: number;
  sharePct: number;
}

export interface StockBalanceRow {
  itemCode: string;
  itemName: string;
  unit: string;
  currentStock: number;
  currentStockValueCr: number;
}

export interface InventoryDashboardData {
  meta: {
    seasonName: string;
    generatedAt: string;
    cacheTtlSeconds: number;
  };
  diesel: DieselWidgetData;
  dieselByRole: FuelRoleRow[];
  stockBalance: StockBalanceRow[];
}
