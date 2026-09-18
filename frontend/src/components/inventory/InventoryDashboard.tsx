import { Package, RefreshCw } from "lucide-react";
import type { InventoryDashboardData } from "@/lib/inventory/types";
import { DieselWidget } from "@/components/inventory/DieselWidget";
import { DieselByRoleTable } from "@/components/inventory/DieselByRoleTable";
import { StockBalanceTable } from "@/components/inventory/StockBalanceTable";

export function InventoryDashboard({
  data,
  updatedAt,
  isFetching,
  onRefresh,
}: {
  data: InventoryDashboardData;
  updatedAt: string;
  isFetching: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="s360-app">
      <div className="panel-header">
        <div className="panel-title-wrap">
          <div className="panel-role-badge" style={{ background: "var(--fi-bg)" }}>
            <Package className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <div className="panel-title">Inventory — Stock &amp; Diesel Management</div>
            <div className="panel-sub">Diesel Monitoring · Finished-goods Stock · By-product Stock</div>
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

      <DieselWidget diesel={data.diesel} />

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Diesel Issued by Entity Type — Season</div>
            <span className="pill info">Fuel Ledger Entry</span>
          </div>
          <div className="card-sub">Harvester vs Transporter fuel issue split, season to date</div>
          <DieselByRoleTable rows={data.dieselByRole} />
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Stock Balance — Finished Goods &amp; By-products</div>
            <span className="pill info">Bin</span>
          </div>
          <div className="card-sub">Current warehouse stock &amp; valuation</div>
          <StockBalanceTable rows={data.stockBalance} />
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Not Yet Connected</div>
        </div>
        <p className="text-sm text-muted-foreground">
          Critical-chemicals reorder monitoring (Sulphur, Lime, Filter Cloth, etc.) needs Item
          Reorder / min-max stock levels configured — this instance has none set up, so a
          below-minimum alert table would be guessing at thresholds. Diesel department-wise
          breakdown (Harvesters/Tractors/Factory/Generators) isn't tagged in this instance either —
          shown by entity type instead, which is real. Wire these once confirmed with mill ops.
        </p>
      </div>
    </div>
  );
}
