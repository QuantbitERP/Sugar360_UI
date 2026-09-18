import { Factory, RefreshCw } from "lucide-react";
import type { ProductionDashboardData } from "@/lib/production/types";
import { EfficiencyFlow } from "@/components/production/EfficiencyFlow";
import { ProductionKpiRow } from "@/components/production/ProductionKpiRow";
import { ProductionTrendChart } from "@/components/production/ProductionTrendChart";
import { GradeWiseTable } from "@/components/production/GradeWiseTable";
import { ByProductsTable } from "@/components/production/ByProductsTable";
import { ByProductRevenueChart } from "@/components/production/ByProductRevenueChart";

export function ProductionDashboard({
  data,
  updatedAt,
  isFetching,
  onRefresh,
}: {
  data: ProductionDashboardData;
  updatedAt: string;
  isFetching: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="s360-app">
      <div className="panel-header">
        <div className="panel-title-wrap">
          <div className="panel-role-badge" style={{ background: "var(--ch-bg)" }}>
            <Factory className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <div className="panel-title">Production — Sugar &amp; By-products</div>
            <div className="panel-sub">Grade-wise Production · By-products · Recovery · Efficiency · MTD Comparison</div>
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
          No production entry for today — showing the most recent recorded day (
          {data.kpis.latestActivityDate ?? "—"}).
        </div>
      )}

      <EfficiencyFlow kpis={data.kpis} />
      <ProductionKpiRow kpis={data.kpis} />

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Grade-wise Sugar Production</div>
            <span className="pill info">Today · Season</span>
          </div>
          <div className="card-sub">Production, cost and current warehouse stock by grade</div>
          <GradeWiseTable rows={data.gradeWise} kpis={data.kpis} asOfDate={data.kpis.latestActivityDate} />
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-title">By-product Revenue Split — Season</div>
          </div>
          <div className="card-sub">Revenue contribution by by-product category</div>
          <ByProductRevenueChart slices={data.revenueSplit} />
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">By-product Production, Stock &amp; Sales — Today</div>
          <span className="pill info">Process Order · Bin</span>
        </div>
        <div className="card-sub">Molasses · Bagasse · Press Mud — as recorded on Process Orders</div>
        <ByProductsTable rows={data.byProducts} asOfDate={data.kpis.latestActivityDate} />
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Daily Sugar Production — Last {data.trend.length} Reporting Days</div>
        </div>
        <div className="card-sub">Finished-goods quantity posted per day (Process Order → Stock Entry)</div>
        <ProductionTrendChart points={data.trend} />
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Not Yet Connected</div>
        </div>
        <p className="text-sm text-muted-foreground">
          Plant Utilisation % and Boiling House Purity % need machine-uptime and lab-QA data sources
          this instance doesn't populate yet. Recovery % (sugar output vs cane input) needs a
          lag-adjusted calculation, not a same-day ratio — deferred rather than shown wrong. Opening
          stock, consumption and sales against these items also aren't wired yet — no Sales
          Invoice/Delivery Note/Stock Entry activity of those kinds in this instance to source them
          from. Wire these once confirmed with mill ops, rather than estimating them.
        </p>
      </div>
    </div>
  );
}
