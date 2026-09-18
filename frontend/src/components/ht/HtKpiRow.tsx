import type { HtKpis } from "@/lib/ht/types";
import { formatPct, formatShortDate } from "@/lib/cane/format";

function Kpi({
  accent,
  label,
  value,
  unit,
  delta,
  deltaTone,
}: {
  accent: string;
  label: string;
  value: string;
  unit?: string;
  delta: string;
  deltaTone: "up" | "down" | "nt";
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
    </div>
  );
}

export function HtKpiRow({ kpis }: { kpis: HtKpis }) {
  const tripsLabel = kpis.isToday ? "Trips Completed Today" : `Trips — ${formatShortDate(kpis.latestActivityDate)}`;

  return (
    <div className="kpi-row cols-5">
      <Kpi
        accent="var(--pu)"
        label="Active HT Contracts"
        value={`${kpis.activeContractsToday} / ${kpis.totalActiveContracts}`}
        delta={
          kpis.totalActiveContracts > 0
            ? `${((kpis.activeContractsToday / kpis.totalActiveContracts) * 100).toFixed(1)}% engaged`
            : "—"
        }
        deltaTone="nt"
      />
      <Kpi
        accent="var(--ok)"
        label={tripsLabel}
        value={kpis.tripsOnLatestDate.toLocaleString("en-IN")}
        unit="trips"
        delta={kpis.isToday ? "Live for today" : "Season currently inactive"}
        deltaTone={kpis.isToday ? "up" : "nt"}
      />
      <Kpi
        accent="var(--info)"
        label="Advance Sanctioned (Season)"
        value={`₹${kpis.advanceSanctionedCr.toFixed(2)}`}
        unit="Cr"
        delta="From HT Advance Request"
        deltaTone="nt"
      />
      <Kpi
        accent="var(--warn)"
        label="Advance Paid (Season)"
        value={`₹${kpis.advancePaidCr.toFixed(2)}`}
        unit="Cr"
        delta={`${formatPct(kpis.pctPaidOfSanctioned, 1)} of sanctioned`}
        deltaTone="nt"
      />
      <Kpi
        accent="var(--ag)"
        label="Cane Moved via HT Contracts"
        value={kpis.seasonQuantityViaHtMt.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
        unit="MT"
        delta={`${formatPct(kpis.seasonQuantityCoveragePct, 1)} of season supply`}
        deltaTone="nt"
      />
    </div>
  );
}
