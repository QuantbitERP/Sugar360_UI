import { RefreshCw, Zap } from "lucide-react";
import type { ManagementDashboardData } from "@/lib/management/types";
import { FinancialPositionKpiRow } from "@/components/management/FinancialPositionKpiRow";
import { OperationsKpiRow } from "@/components/management/OperationsKpiRow";
import { ProductionSalesKpiRow } from "@/components/management/ProductionSalesKpiRow";
import { HourlyCrushingChart } from "@/components/management/HourlyCrushingChart";
import { AlertsFeed } from "@/components/management/AlertsFeed";

export function ManagementDashboard({
  data,
  updatedAt,
  isFetching,
  onRefresh,
}: {
  data: ManagementDashboardData;
  updatedAt: string;
  isFetching: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="s360-app">
      <div className="panel-header">
        <div className="panel-title-wrap">
          <div className="panel-role-badge" style={{ background: "var(--md-bg)" }}>
            <Zap className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <div className="panel-title">MD / Management — Executive Summary</div>
            <div className="panel-sub">What is happening today · Why · Financial Impact · What next</div>
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

      <div className="cluster-label fin">💳 Financial Position</div>
      <FinancialPositionKpiRow kpis={data.financialPosition} />

      {!data.operations.isToday && (
        <div
          className="mb-4 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning"
          role="status"
        >
          No weighbridge activity for today — Operations figures show the most recent recorded day
          ({data.operations.latestActivityDate ?? "—"}).
        </div>
      )}

      <div className="cluster-label ops">🌾 Operations &amp; Cane Position</div>
      <OperationsKpiRow kpis={data.operations} />

      <div className="cluster-label prd">🍬 Production &amp; Sales</div>
      <ProductionSalesKpiRow kpis={data.productionSales} />

      <div className="grid-2-1">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Hourly Crushing Rate — Latest Reporting Day</div>
            <span className="pill info">
              {data.operations.peakHour !== null
                ? `Peak ${String(data.operations.peakHour).padStart(2, "0")}:00`
                : "No data"}
            </span>
          </div>
          <div className="card-sub">Cane received (MT) by hour of day, from weighbridge slip timestamps</div>
          <HourlyCrushingChart points={data.hourly} />
        </div>
        <div className="card">
          <AlertsFeed alerts={data.alerts} />
        </div>
      </div>
    </div>
  );
}
