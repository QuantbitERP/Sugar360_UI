import type { ProductionKpis } from "@/lib/production/types";
import { formatShortDate } from "@/lib/cane/format";

function Kpi({
  accent,
  label,
  value,
  unit,
  delta,
  deltaTone,
  bar,
}: {
  accent: string;
  label: string;
  value: string;
  unit?: string;
  delta: string;
  deltaTone: "up" | "down" | "nt";
  bar?: number | undefined;
}) {
  return (
    <div className="kpi">
      <div className="kpi-accent" style={{ background: accent }} />
      <div className="kpi-label">{label}</div>
      <div className="kpi-val">
        {value}
        {unit && <span className="kpi-unit"> {unit}</span>}
      </div>
      <div className={`kpi-delta ${deltaTone}`}>{delta}</div>
      {bar != null && (
        <div className="kpi-mini-bar">
          <div className="kpi-mini-fill" style={{ width: `${Math.min(Math.max(bar, 0), 100)}%`, background: accent }} />
        </div>
      )}
    </div>
  );
}

export function ProductionKpiRow({ kpis }: { kpis: ProductionKpis }) {
  const mtdLabel = kpis.isToday ? "MTD Sugar Production" : `Month-to-date (as of ${formatShortDate(kpis.latestActivityDate)})`;

  return (
    <div className="kpi-row cols-4">
      <Kpi
        accent="var(--ch)"
        label={mtdLabel}
        value={kpis.mtdSugarProductionMt.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
        unit="MT"
        delta="From Process Order postings"
        deltaTone="nt"
      />
      <Kpi
        accent="var(--ok)"
        label="Season Sugar Production"
        value={kpis.seasonSugarProductionMt.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
        unit="MT"
        delta={`${kpis.pctOfSeasonTarget.toFixed(0)}% of target ${kpis.seasonTargetMt.toLocaleString("en-IN")} MT`}
        deltaTone="nt"
        bar={kpis.pctOfSeasonTarget}
      />
      <Kpi
        accent="var(--info)"
        label="Current Stock Value"
        value={`₹${kpis.currentStockValueCr.toFixed(2)}`}
        unit="Cr"
        delta="Finished goods + by-products, from Bin"
        deltaTone="nt"
      />
      <Kpi
        accent="var(--warn)"
        label="Season By-product Revenue"
        value={`₹${kpis.seasonByProductValueCr.toFixed(2)}`}
        unit="Cr"
        delta={`Sugar: ₹${kpis.seasonFinishedGoodsValueCr.toFixed(2)} Cr`}
        deltaTone="nt"
      />
    </div>
  );
}
