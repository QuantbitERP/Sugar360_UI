import type { OperationsKpis } from "@/lib/management/types";
import { formatShortDate } from "@/lib/cane/format";

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

export function OperationsKpiRow({ kpis }: { kpis: OperationsKpis }) {
  const label = kpis.isToday ? "Cane Received Today" : `Cane Received — ${formatShortDate(kpis.latestActivityDate)}`;

  return (
    <div className="kpi-row cols-4 md-bento md-bento-operations">
      <Kpi
        accent="var(--ch)"
        label={label}
        value={kpis.caneReceivedTodayMt.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
        unit="MT"
        delta={kpis.isToday ? "Live for today" : "Season currently inactive"}
      />
      <Kpi
        accent="var(--md)"
        label="Received per Hour (Avg)"
        value={kpis.caneReceivedPerHourMt !== null ? kpis.caneReceivedPerHourMt.toFixed(0) : "—"}
        unit="MT/hr"
        delta={kpis.peakHour !== null ? `Peak ${String(kpis.peakHour).padStart(2, "0")}:00 — ${kpis.peakHourMt?.toFixed(0)} MT` : "—"}
      />
      <Kpi
        accent="var(--ok)"
        label="Season Cane Received"
        value={kpis.seasonCaneReceivedMt.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
        unit="MT"
        delta="Season to date · see Cane & Agriculture"
      />
      <Kpi accent="var(--info)" label="Expected Cane (Today)" value="—" delta="Not connected — no daily forecast source" />
    </div>
  );
}
