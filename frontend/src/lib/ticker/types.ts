export interface TickerData {
  seasonDay: number | null;
  seasonDayTotal: number | null;
  caneCrushedMt: number;
  caneCrushedAsOfDate: string | null;
  /** Season-to-date (sugar season total ÷ cane season total), not same-day — a same-day ratio is misleading (verified). */
  seasonRecoveryPct: number | null;
  bankAndCashCr: number;
  sugarStockMt: number;
  dieselStockL: number | null;
  /** No yard/in-transit stock tracking, and no Ethanol item exists in this instance. */
  caneYardMt: null;
  ethanolTodayL: null;
}
