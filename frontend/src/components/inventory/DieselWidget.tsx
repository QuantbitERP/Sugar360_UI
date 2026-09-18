import type { DieselWidgetData } from "@/lib/inventory/types";

function tone(days: number | null): "ok" | "warn" | "risk" {
  if (days === null) return "ok";
  if (days >= 10) return "ok";
  if (days >= 5) return "warn";
  return "risk";
}

export function DieselWidget({ diesel }: { diesel: DieselWidgetData }) {
  const level = Math.min(Math.max(diesel.coverageOfRollingMonthPct ?? 0, 0), 100);
  const daysTone = tone(diesel.stockDaysRemaining);

  return (
    <div className="diesel-widget">
      <div className="diesel-header">
        <div className="diesel-title">
          ⛽ Diesel — Live Status{" "}
          {daysTone !== "ok" && (
            <span className={`pill ${daysTone}`} style={{ marginLeft: 4 }}>
              {daysTone === "risk" ? "LOW STOCK" : "WATCH"}
            </span>
          )}
        </div>
        <span className={`pill ${daysTone}`}>
          {diesel.stockDaysRemaining !== null ? `${diesel.stockDaysRemaining.toFixed(1)} Days Coverage` : "—"}{" "}
          {daysTone === "risk" && "⚠"}
        </span>
      </div>
      <div className="diesel-gauge-row">
        <div className="diesel-level-wrap">
          <div className="diesel-level">
            <div className="diesel-level-fill" style={{ height: `${level}%` }} />
          </div>
          <div className="diesel-level-pct">{level.toFixed(0)}%</div>
        </div>
        <div className="diesel-kpis">
          <div className="diesel-kpi">
            <div className="diesel-kpi-label">Current Stock</div>
            <div className="diesel-kpi-val" style={{ color: `var(--${daysTone === "ok" ? "ok" : daysTone})` }}>
              {diesel.currentStockL.toLocaleString("en-IN", { maximumFractionDigits: 0 })} L
            </div>
          </div>
          <div className="diesel-kpi">
            <div className="diesel-kpi-label">Stock Value</div>
            <div className="diesel-kpi-val">₹{diesel.currentStockValueCr.toFixed(2)} Cr</div>
          </div>
          <div className="diesel-kpi">
            <div className="diesel-kpi-label">{diesel.isToday ? "Today's" : "Latest Day's"} Receipt</div>
            <div className="diesel-kpi-val" style={{ color: "var(--ok)" }}>
              +{diesel.receivedTodayL.toLocaleString("en-IN", { maximumFractionDigits: 0 })} L
            </div>
          </div>
          <div className="diesel-kpi">
            <div className="diesel-kpi-label">{diesel.isToday ? "Today's" : "Latest Day's"} Consumption</div>
            <div className="diesel-kpi-val" style={{ color: "var(--risk)" }}>
              -{diesel.consumedTodayL.toLocaleString("en-IN", { maximumFractionDigits: 0 })} L
            </div>
          </div>
          <div className="diesel-kpi">
            <div className="diesel-kpi-label">Avg Daily Consumption</div>
            <div className="diesel-kpi-val">
              {diesel.avgDailyConsumptionL.toLocaleString("en-IN", { maximumFractionDigits: 0 })} L/day
            </div>
          </div>
          <div className="diesel-kpi">
            <div className="diesel-kpi-label">Stock Days Remaining</div>
            <div className="diesel-kpi-val" style={{ color: `var(--${daysTone})` }}>
              {diesel.stockDaysRemaining !== null ? `${diesel.stockDaysRemaining.toFixed(1)} days` : "—"}{" "}
              {daysTone === "risk" && "🔴"}
            </div>
          </div>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        As of {diesel.asOfDate ?? "—"}. Coverage % is stock ÷ a rolling {diesel.avgSampleDays}-entry average
        daily draw × 30 — a demand-coverage ratio, not a physical tank-capacity reading (no tank
        capacity is configured in this instance).
      </p>
    </div>
  );
}
