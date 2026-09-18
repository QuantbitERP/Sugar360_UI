import type { WeighbridgeStatus } from "@/lib/cane/types";
import { formatShortDate } from "@/lib/cane/format";

function StatusRow({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" | "risk" }) {
  return (
    <div className="status-row">
      <div className="status-label">{label}</div>
      <div className={`status-val ${tone ?? ""}`}>{value}</div>
    </div>
  );
}

/** Not-yet-wired metrics render this instead of a fabricated number. */
function NotConnected({ label }: { label: string }) {
  return (
    <div className="status-row">
      <div className="status-label">{label}</div>
      <div className="status-val text-muted-foreground" title="Needs a gate-entry / lab-QA data source to be confirmed">
        Not connected
      </div>
    </div>
  );
}

export function WeighbridgeStatusCard({ status }: { status: WeighbridgeStatus }) {
  return (
    <>
      <div className="card-header">
        <div className="card-title">Weighbridge &amp; Yard Status</div>
        <span className="pill info">{status.asOfDate ? formatShortDate(status.asOfDate) : "—"}</span>
      </div>
      <div className="card-sub">Derived from submitted weighbridge slips</div>
      <StatusRow
        label="Cane Rcvd per Hour (Avg)"
        value={status.caneReceivedPerHourMt !== null ? `${status.caneReceivedPerHourMt.toFixed(0)} MT/hr` : "—"}
      />
      {status.shifts.map((shift) => (
        <StatusRow
          key={shift.shift}
          label={`${shift.shift} Receipts`}
          value={`${shift.totalMt.toLocaleString("en-IN", { maximumFractionDigits: 0 })} MT (${shift.trips} trips)`}
        />
      ))}
      <NotConnected label="Avg Weighment Time" />
      <StatusRow
        label="Pending Vehicles at Gate"
        value={`${status.pendingVehiclesAtGate ?? 0} vehicles`}
        tone={status.pendingVehiclesAtGate && status.pendingVehiclesAtGate > 0 ? "warn" : "ok"}
      />
      <StatusRow
        label="Avg Vehicle Wait Time"
        value={status.avgVehicleWaitMin !== null ? `${status.avgVehicleWaitMin.toFixed(0)} min` : "—"}
      />
      <NotConnected label="Avg Pol% in Cane" />
    </>
  );
}
