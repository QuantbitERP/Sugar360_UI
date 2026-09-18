import type { TripStatusCount } from "@/lib/ht/types";

const ICONS: Record<string, string> = {
  New: "🆕",
  "Pending Token": "🎫",
  "Submitted Token": "🛣️",
  "Weight Done": "✅",
};

const ORDER = ["New", "Pending Token", "Submitted Token", "Weight Done"];

export function TripStatusStrip({ statuses, asOfDate }: { statuses: TripStatusCount[]; asOfDate: string | null }) {
  const byStatus = new Map(statuses.map((s) => [s.status, s.count]));
  const ordered = ORDER.map((status) => ({ status, count: byStatus.get(status) ?? 0 }));

  return (
    <div className="vehicle-strip">
      {ordered.map((s) => (
        <div className="veh-box" key={s.status}>
          <div className="veh-box-icon">{ICONS[s.status] ?? "🚛"}</div>
          <div className="veh-box-val">{s.count}</div>
          <div className="veh-box-label">{s.status}</div>
        </div>
      ))}
      <div className="veh-box" style={{ opacity: 0.7 }}>
        <div className="veh-box-icon">📅</div>
        <div className="veh-box-val" style={{ fontSize: 12 }}>
          {asOfDate ?? "—"}
        </div>
        <div className="veh-box-label">Trip Sheet status as of</div>
      </div>
    </div>
  );
}
