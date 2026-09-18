import { RefreshCw, Wallet } from "lucide-react";
import type { FinanceDashboardData } from "@/lib/finance/types";
import { FinanceKpiGrid } from "@/components/finance/FinanceKpiGrid";
import { SugarPriceTrendChart } from "@/components/finance/SugarPriceTrendChart";
import { RevenueCard } from "@/components/finance/RevenueCard";
import { PurchaseDetailsCard } from "@/components/finance/PurchaseDetailsCard";
import { SalesPerformanceTable } from "@/components/finance/SalesPerformanceTable";
import { TopCustomersTable } from "@/components/finance/TopCustomersTable";

export function FinanceDashboard({
  data,
  updatedAt,
  isFetching,
  onRefresh,
}: {
  data: FinanceDashboardData;
  updatedAt: string;
  isFetching: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="s360-app">
      <div className="panel-header">
        <div className="panel-title-wrap">
          <div className="panel-role-badge" style={{ background: "var(--sa-bg)" }}>
            <Wallet className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <div className="panel-title">Finance &amp; Sales</div>
            <div className="panel-sub">Bank Position · Revenue · Purchases · Sales Performance · Top Customers</div>
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

      <FinanceKpiGrid kpis={data.kpis} />

      <div className="card">
        <SugarPriceTrendChart />
      </div>

      <div className="grid-2">
        <div className="card">
          <RevenueCard revenue={data.revenue} />
        </div>
        <div className="card">
          <PurchaseDetailsCard purchases={data.purchases} />
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <SalesPerformanceTable sales={data.salesPerformance} />
        </div>
        <div className="card">
          <TopCustomersTable rows={data.topCustomers} />
        </div>
      </div>
    </div>
  );
}
