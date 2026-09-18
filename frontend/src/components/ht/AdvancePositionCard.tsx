import type { HtKpis } from "@/lib/ht/types";
import { formatPct } from "@/lib/cane/format";

export function AdvancePositionCard({ kpis }: { kpis: HtKpis }) {
  const paidPct = kpis.pctPaidOfSanctioned ?? 0;
  const balanceCr = Math.max(kpis.advanceSanctionedCr - kpis.advancePaidCr, 0);
  const balancePct = 100 - paidPct;

  return (
    <>
      <div className="card-header">
        <div className="card-title">H&amp;T Advance Position</div>
        <span className="pill info">{formatPct(kpis.pctPaidOfSanctioned, 1)} Paid</span>
      </div>
      <div className="card-sub">Sanctioned vs paid — season to date</div>
      <div className="prog-row">
        <div className="prog-label">Sanctioned</div>
        <div className="prog-bar">
          <div className="prog-fill" style={{ width: "100%", background: "var(--border-s)" }} />
        </div>
        <div className="prog-num">₹{kpis.advanceSanctionedCr.toFixed(2)} Cr</div>
      </div>
      <div className="prog-row">
        <div className="prog-label">Paid</div>
        <div className="prog-bar">
          <div className="prog-fill" style={{ width: `${Math.min(paidPct, 100)}%`, background: "var(--ok)" }} />
        </div>
        <div className="prog-num">₹{kpis.advancePaidCr.toFixed(2)} Cr</div>
      </div>
      <div className="prog-row">
        <div className="prog-label">Balance</div>
        <div className="prog-bar">
          <div className="prog-fill" style={{ width: `${Math.max(balancePct, 0)}%`, background: "var(--warn)" }} />
        </div>
        <div className="prog-num">₹{balanceCr.toFixed(2)} Cr</div>
      </div>

      <div className="section-sep">Contract Position</div>
      <div className="status-row">
        <div className="status-label">Total Active HT Contracts</div>
        <div className="status-val">{kpis.totalActiveContracts}</div>
      </div>
      <div className="status-row">
        <div className="status-label">Contracts Active Today</div>
        <div className="status-val ok">{kpis.activeContractsToday}</div>
      </div>
      <div className="status-row">
        <div className="status-label">Cane Moved via HT Contracts</div>
        <div className="status-val ok">{kpis.seasonQuantityViaHtMt.toLocaleString("en-IN", { maximumFractionDigits: 0 })} MT</div>
      </div>
      <div className="status-row">
        <div className="status-label">Coverage vs Season Supply</div>
        <div className="status-val">{formatPct(kpis.seasonQuantityCoveragePct, 1)}</div>
      </div>
    </>
  );
}
