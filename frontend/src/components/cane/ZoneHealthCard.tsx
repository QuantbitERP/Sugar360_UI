import type { ZoneHealth } from "@/lib/cane/types";

function toneFor(coveragePct: number | null): { className: string; badge: string } {
  if (coveragePct === null) return { className: "var(--muted-foreground, #8A909C)", badge: "" };
  if (coveragePct >= 65) return { className: "var(--ok)", badge: "OK" };
  if (coveragePct >= 45) return { className: "var(--warn)", badge: "⚠" };
  return { className: "var(--risk)", badge: "🔴" };
}

export function ZoneHealthCard({ zones }: { zones: ZoneHealth[] }) {
  if (zones.length === 0) {
    return <p className="text-sm text-muted-foreground">No registered zones for this season yet.</p>;
  }

  const worst = [...zones].sort((a, b) => (a.coveragePct ?? 100) - (b.coveragePct ?? 100))[0];

  return (
    <>
      <div className="card-header">
        <div className="card-title">Zone-wise Supply Health</div>
        {worst && worst.coveragePct !== null && worst.coveragePct < 45 && (
          <span className="pill risk">{worst.circleOffice} Lagging</span>
        )}
      </div>
      <div className="card-sub">Received vs estimated availability — season to date</div>
      {zones.map((zone) => {
        const tone = toneFor(zone.coveragePct);
        const pct = zone.coveragePct === null ? 0 : Math.min(zone.coveragePct, 100);
        return (
          <div className="prog-row" key={zone.circleOffice}>
            <div className="prog-label">{zone.circleOffice}</div>
            <div className="prog-bar">
              <div className="prog-fill" style={{ width: `${pct}%`, background: tone.className }} />
            </div>
            <div className="prog-num">
              {zone.coveragePct === null ? "—" : `${zone.coveragePct.toFixed(0)}%`} {tone.badge}
            </div>
          </div>
        );
      })}
    </>
  );
}
