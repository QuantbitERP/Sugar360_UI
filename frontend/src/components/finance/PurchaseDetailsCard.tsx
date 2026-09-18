import type { PurchaseData } from "@/lib/finance/types";
import { formatShortDate } from "@/lib/cane/format";

const HEAD_COLORS = ["var(--ag)", "var(--md)", "var(--warn)", "var(--pu)", "var(--info)", "var(--text3)", "var(--ok)", "var(--risk)"];

export function PurchaseDetailsCard({ purchases }: { purchases: PurchaseData }) {
  return (
    <>
      <div className="card-header">
        <div className="card-title">Purchase Details — {purchases.isToday ? "Today" : formatShortDate(purchases.asOfDate)} / MTD</div>
      </div>
      <div className="card-sub">From Purchase Invoice</div>
      <div className="status-row">
        <div className="status-label">{purchases.isToday ? "Today's" : "Latest Day's"} Purchases</div>
        <div className="status-val ok">₹{purchases.todayCr.toFixed(2)} Cr</div>
      </div>
      <div className="status-row">
        <div className="status-label">MTD Purchases</div>
        <div className="status-val warn">₹{purchases.mtdCr.toFixed(2)} Cr</div>
      </div>
      <div className="status-row">
        <div className="status-label">Season Purchases</div>
        <div className="status-val">₹{purchases.seasonCr.toFixed(2)} Cr</div>
      </div>

      <div className="section-sep">By Item Group (MTD)</div>
      {purchases.byHead.length === 0 ? (
        <p className="text-sm text-muted-foreground">No purchases recorded this month.</p>
      ) : (
        purchases.byHead.map((h, i) => (
          <div className="prog-row" key={h.itemGroup}>
            <div className="prog-label">{h.itemGroup}</div>
            <div className="prog-bar">
              <div
                className="prog-fill"
                style={{ width: `${Math.min(h.sharePct, 100)}%`, background: HEAD_COLORS[i % HEAD_COLORS.length] }}
              />
            </div>
            <div className="prog-num">₹{h.amountCr.toFixed(2)} Cr</div>
          </div>
        ))
      )}
    </>
  );
}
