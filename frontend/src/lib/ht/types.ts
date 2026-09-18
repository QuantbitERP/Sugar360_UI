export interface HtKpis {
  latestActivityDate: string | null;
  isToday: boolean;
  activeContractsToday: number;
  totalActiveContracts: number;
  tripsOnLatestDate: number;
  advanceSanctionedCr: number;
  advancePaidCr: number;
  pctPaidOfSanctioned: number | null;
  seasonQuantityViaHtMt: number;
  seasonQuantityCoveragePct: number | null;
}

export interface TripStatusCount {
  status: string;
  count: number;
}

export interface ContractorRow {
  transporterContract: string;
  transporterName: string;
  village: string;
  suppliedMt: number;
  trips: number;
  advanceSanctionedL: number;
  advancePaidL: number;
  advanceBalanceL: number;
}

export interface ZeroDeliveryRow {
  transporterContract: string;
  village: string;
  advancePaidL: number;
}

export interface HtDashboardData {
  meta: {
    seasonName: string;
    generatedAt: string;
    cacheTtlSeconds: number;
  };
  kpis: HtKpis;
  tripStatus: TripStatusCount[];
  topContractors: ContractorRow[];
  zeroDeliveryAdvances: ZeroDeliveryRow[];
}
