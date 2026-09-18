import type { ZeroDeliveryRow } from "@/lib/ht/types";

export function ZeroDeliveryCard({ rows }: { rows: ZeroDeliveryRow[] }) {
  return (
    <>
      <div className="card-header">
        <div className="card-title">Advance Paid, No Deliveries Yet</div>
        <span className={`pill ${rows.length > 0 ? "warn" : "ok"}`}>{rows.length} Open</span>
      </div>
      <div className="card-sub">Contracts with advance disbursed but zero cane received this season</div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No contracts with paid advance and zero deliveries this season — every advanced contract
          has supplied cane.
        </p>
      ) : (
        <div className="alert-list">
          {rows.map((r) => (
            <div className="alert-item a" key={r.transporterContract}>
              <div className="alert-dot a" />
              <div className="alert-body">
                <div className="alert-title">{r.transporterContract}</div>
                <div className="alert-desc">
                  {r.village} · ₹{r.advancePaidL.toFixed(1)} L advance paid · no weighbridge activity recorded
                </div>
              </div>
              <span className="alert-badge a">Follow Up</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
