import type { ProductionKpis } from "@/lib/production/types";
import { formatPct } from "@/lib/cane/format";

function Node({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: "ok" | "risk" | "muted";
}) {
  const color = tone === "ok" ? "var(--ok)" : tone === "risk" ? "var(--risk)" : "var(--text3)";
  return (
    <div className="eff-node">
      <div className="eff-node-label">{label}</div>
      <div className="eff-node-val">
        {value} {unit && <span className="eff-node-unit">{unit}</span>}
      </div>
      <div className="eff-node-delta" style={{ color, fontSize: 10 }} />
    </div>
  );
}

export function EfficiencyFlow({ kpis }: { kpis: ProductionKpis }) {
  return (
    <div className="eff-flow">
      <Node label="Cane Crushed" value={kpis.caneCrushedMt.toLocaleString("en-IN", { maximumFractionDigits: 0 })} unit="MT" />
      <div className="eff-arrow">→</div>
      <div className="eff-recovery">
        <div className="eff-node-label">Recovery</div>
        <div className="eff-node-val">{formatPct(kpis.recoveryPct, 2)}</div>
      </div>
      <div className="eff-arrow">→</div>
      <Node
        label="Sugar Produced"
        value={kpis.sugarProducedMt.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
        unit="MT"
      />
      <div className="eff-arrow">→</div>
      <Node
        label="Season Production"
        value={kpis.seasonSugarProductionMt.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
        unit="MT"
        tone="muted"
      />
    </div>
  );
}
