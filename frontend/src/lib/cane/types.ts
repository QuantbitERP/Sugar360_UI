/**
 * Shape of the bundled Cane & Agriculture dashboard payload. Pure types —
 * safe to import from client components (see `src/components/cane/*`).
 *
 * A metric that isn't backed by any table yet (no fabricated numbers) is
 * modeled as `null` with the field name kept, not omitted — the UI renders
 * an explicit "Not connected" state instead of a fake zero.
 */

export interface CaneKpis {
  registeredAreaAcres: number;
  registeredAreaDeltaPct: number | null;
  estAvailabilityMt: number;
  avgYieldMtPerAcre: number;
  receivedSeasonMt: number;
  pctOfEstimate: number | null;
  latestActivityDate: string | null;
  isToday: boolean;
  tripsOnLatestDate: number;
  supplyTargetMt: number;
  expectedCrushingDaysRemaining: number | null;
  seasonEndDate: string | null;
}

export interface SupplyTrendPoint {
  date: string;
  receivedMt: number;
  targetMt: number;
}

export interface VarietySlice {
  variety: string;
  totalMt: number;
  sharePct: number;
}

export interface ZoneHealth {
  circleOffice: string;
  registeredAreaAcres: number;
  receivedMt: number;
  estAvailabilityMt: number;
  coveragePct: number | null;
}

export interface ShiftReceipt {
  shift: string;
  totalMt: number;
  trips: number;
}

export interface WeighbridgeStatus {
  asOfDate: string | null;
  caneReceivedPerHourMt: number | null;
  shifts: ShiftReceipt[];
  /** Metrics that need a gate-entry / lab-QA data source not yet wired — kept explicit, not fabricated. */
  pendingVehiclesAtGate: number | null;
  avgVehicleWaitMin: number | null;
  avgWeighmentMin: number | null;
  avgPolPercent: number | null;
}

export interface CaneDashboardData {
  meta: {
    seasonName: string;
    generatedAt: string;
    cacheTtlSeconds: number;
  };
  kpis: CaneKpis;
  supplyTrend: SupplyTrendPoint[];
  varietyMix: VarietySlice[];
  zoneHealth: ZoneHealth[];
  weighbridge: WeighbridgeStatus;
}

export interface CaneActivityItem {
  id: string;
  title: string;
  detail: string;
  time: string;
  severity: "normal" | "warning" | "critical";
  acknowledged: boolean;
}

export interface CaneActivityPage {
  items: CaneActivityItem[];
  nextCursor?: number | undefined;
}
