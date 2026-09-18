import { RefreshCw, Truck } from "lucide-react";
import type { HtDashboardData } from "@/lib/ht/types";
import { HtKpiRow } from "@/components/ht/HtKpiRow";
import { TripStatusStrip } from "@/components/ht/TripStatusStrip";
import { AdvancePositionCard } from "@/components/ht/AdvancePositionCard";
import { ZeroDeliveryCard } from "@/components/ht/ZeroDeliveryCard";
import { TopContractorsTable } from "@/components/ht/TopContractorsTable";

export function HtDashboard({
  data,
  updatedAt,
  isFetching,
  onRefresh,
}: {
  data: HtDashboardData;
  updatedAt: string;
  isFetching: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="s360-app">
      <div className="panel-header">
        <div className="panel-title-wrap">
          <div className="panel-role-badge" style={{ background: "var(--pu-bg)" }}>
            <Truck className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <div className="panel-title">H&amp;T — Harvesting &amp; Transportation</div>
            <div className="panel-sub">Contractors · Advance Position · Trip Status · Top Suppliers</div>
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
          {data.kpis.latestActivityDate ?? "—"}).
        </div>
      )}

      <HtKpiRow kpis={data.kpis} />
      <TripStatusStrip statuses={data.tripStatus} asOfDate={data.kpis.latestActivityDate} />

      <div className="grid-2">
        <div className="card">
          <AdvancePositionCard kpis={data.kpis} />
        </div>
        <div className="card">
          <ZeroDeliveryCard rows={data.zeroDeliveryAdvances} />
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Top {data.topContractors.length} Contractors — Season Supply &amp; Advance</div>
          <span className="pill info">Season to Date</span>
        </div>
        <div className="card-sub">Ranked by cane quantity supplied · Advance sanctioned vs paid</div>
        <TopContractorsTable rows={data.topContractors} />
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Not Yet Connected</div>
        </div>
        <p className="text-sm text-muted-foreground">
          Vehicle turnaround/wait time, live gate-in/gate-out tracking and advance-recovery
          (repayment) all need a gate-entry timestamp workflow and a repayment ledger this instance
          doesn't populate yet. Contracted-quantity targets aren't tracked either, so
          "achievement %" isn't shown. Wire these once confirmed with mill ops.
        </p>
      </div>
    </div>
  );
}
