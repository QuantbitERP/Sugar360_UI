import type { CaneKpis } from "@/lib/cane/types";
import { formatLakhMt, formatPct, formatShortDate, formatSignedPct } from "@/lib/cane/format";

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
  unit?: string | undefined;
  delta: string;
  deltaTone: "up" | "down" | "nt";
  bar?: number | null;
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
          <div
            className="kpi-mini-fill"
            style={{ width: `${Math.min(Math.max(bar, 0), 100)}%`, background: accent }}
          />
        </div>
      )}
    </div>
  );
}

export function KpiRow({ kpis }: { kpis: CaneKpis }) {
  const tripsLabel = kpis.isToday ? "Today's Trips" : `Trips — ${formatShortDate(kpis.latestActivityDate)}`;

  return (
    <div className="kpi-row cols-5">
      <Kpi
        accent="var(--ag)"
        label="Registered Cane Area"
        value={kpis.registeredAreaAcres.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
        unit="Ac"
        delta={
          kpis.registeredAreaDeltaPct === null
            ? "vs last season: —"
            : `${formatSignedPct(kpis.registeredAreaDeltaPct)} vs last season`
        }
        deltaTone={
          kpis.registeredAreaDeltaPct === null ? "nt" : kpis.registeredAreaDeltaPct >= 0 ? "up" : "down"
        }
      />
      <Kpi
        accent="var(--ch)"
        label="Est. Cane Availability"
        value={formatLakhMt(kpis.estAvailabilityMt)}
        delta={`@ ${kpis.avgYieldMtPerAcre} MT/Ac assumed yield`}
        deltaTone="nt"
      />
      <Kpi
        accent="var(--ok)"
        label="Cane Received (Season)"
        value={formatLakhMt(kpis.receivedSeasonMt)}
        delta={kpis.pctOfEstimate === null ? "—" : `${formatPct(kpis.pctOfEstimate)} of estimated availability`}
        deltaTone="nt"
        bar={kpis.pctOfEstimate}
      />
      <Kpi
        accent="var(--ag)"
        label={tripsLabel}
        value={kpis.tripsOnLatestDate.toLocaleString("en-IN")}
        unit="trips"
        delta={kpis.isToday ? "Live for today" : "Season currently inactive"}
        deltaTone={kpis.isToday ? "up" : "nt"}
      />
      <Kpi
        accent="var(--info)"
        label="Expected Crushing Days Left"
        value={kpis.expectedCrushingDaysRemaining === null ? "—" : String(kpis.expectedCrushingDaysRemaining)}
        unit={kpis.expectedCrushingDaysRemaining === null ? undefined : "days"}
        delta={kpis.seasonEndDate ? `Season end: ${formatShortDate(kpis.seasonEndDate)}` : "Season end date not set"}
        deltaTone="nt"
      />
    </div>
  );
}
