import type { ProductionSalesKpis } from "@/lib/management/types";

function Kpi({ accent, label, value, unit, delta }: { accent: string; label: string; value: string; unit?: string; delta: string }) {
  return (
    <div className="kpi">
      <div className="kpi-accent" style={{ background: accent }} />
      <div className="kpi-label">{label}</div>
      <div className="kpi-val">
        {value}
        {unit && <span className="kpi-unit"> {unit}</span>}
      </div>
      <div className="kpi-delta nt">{delta}</div>
    </div>
  );
}

export function ProductionSalesKpiRow({ kpis }: { kpis: ProductionSalesKpis }) {
  return (
    <div className="kpi-row cols-4 md-bento md-bento-production">
      <Kpi
        accent="var(--sa)"
        label="Sugar Production (Latest Day)"
        value={kpis.sugarProducedTodayMt.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
        unit="MT"
        delta="From Process Order postings"
      />
      <Kpi
        accent="var(--ok)"
        label="Season Sugar Production"
        value={kpis.seasonSugarProductionMt.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
        unit="MT"
        delta="Season to date · see Production"
      />
      <Kpi
        accent="var(--info)"
        label="Current Stock Value"
        value={`₹${kpis.currentStockValueCr.toFixed(2)}`}
        unit="Cr"
        delta="Finished goods + by-products, from Bin"
      />
      <Kpi
        accent="var(--warn)"
        label={kpis.salesIsToday ? "Today's Sugar Sales" : "Latest Day's Sugar Sales"}
        value={kpis.todaySugarSalesQty.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
        unit="Qtl"
        delta={`₹${kpis.todaySugarSalesValueCr.toFixed(2)} Cr — Sales Invoice Item`}
      />
    </div>
  );
}
