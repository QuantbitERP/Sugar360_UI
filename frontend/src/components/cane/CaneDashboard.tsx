import { RefreshCw, Sprout } from "lucide-react";
import type { CaneDashboardData } from "@/lib/cane/types";
import { KpiRow } from "@/components/cane/KpiRow";
import { SupplyTrendChart } from "@/components/cane/SupplyTrendChart";
import { VarietyMixChart } from "@/components/cane/VarietyMixChart";
import { ZoneHealthCard } from "@/components/cane/ZoneHealthCard";
import { WeighbridgeStatusCard } from "@/components/cane/WeighbridgeStatusCard";

export function CaneDashboard({
  data,
  updatedAt,
  isFetching,
  onRefresh,
}: {
  data: CaneDashboardData;
  updatedAt: string;
  isFetching: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="s360-app">
      <div className="panel-header">
        <div className="panel-title-wrap">
          <div className="panel-role-badge" style={{ background: "var(--ag-bg)" }}>
            <Sprout className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <div className="panel-title">Cane &amp; Agriculture</div>
            <div className="panel-sub">
              Registration · Supply Forecast · Receiving · Weighbridge · Zone Performance
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="panel-date text-right">
            Season {data.meta.seasonName}
            <br />
            <span className="text-muted-foreground">
              Updated {new Date(updatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isFetching}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium hover:bg-muted disabled:opacity-60"
            title="Refresh dashboard data"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            {isFetching ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {!data.kpis.isToday && (
        <div
          className="mb-4 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning"
          role="status"
        >
          No weighbridge activity for today — showing the most recent recorded day (
          {data.kpis.latestActivityDate ?? "—"}). The mill's crushing season is currently inactive.
        </div>
      )}

      <KpiRow kpis={data.kpis} />

      <div className="grid-2">
        <div className="card">
          <SupplyTrendChart points={data.supplyTrend} />
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Variety-wise Cane Mix</div>
          </div>
          <div className="card-sub">Crush mix by variety — season to date</div>
          <VarietyMixChart slices={data.varietyMix} />
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <ZoneHealthCard zones={data.zoneHealth} />
        </div>
        <div className="card">
          <WeighbridgeStatusCard status={data.weighbridge} />
        </div>
      </div>
    </div>
  );
}
