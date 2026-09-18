import type { RevenueData } from "@/lib/finance/types";
import { formatShortDate } from "@/lib/cane/format";

export function RevenueCard({ revenue }: { revenue: RevenueData }) {
  return (
    <>
      <div className="card-header">
        <div className="card-title">Revenue — {revenue.isToday ? "Today" : formatShortDate(revenue.asOfDate)} / MTD / Season</div>
      </div>
      <div className="card-sub">GL Entry, Income-type accounts (Credit − Debit)</div>
      <div className="status-row">
        <div className="status-label">{revenue.isToday ? "Today's" : "Latest Day's"} Revenue</div>
        <div className="status-val ok">₹{revenue.todayCr.toFixed(2)} Cr</div>
      </div>
      <div className="status-row">
        <div className="status-label">MTD Revenue</div>
        <div className="status-val">₹{revenue.mtdCr.toFixed(2)} Cr</div>
      </div>
      <div className="status-row">
        <div className="status-label">Season Revenue (Total)</div>
        <div className="status-val">₹{revenue.seasonCr.toFixed(2)} Cr</div>
      </div>

      <div className="section-sep">Product-wise (Season)</div>
      {revenue.products.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No items are flagged. Enable "Apply to Sugar 360" on an Item to include its revenue here.
        </p>
      ) : (
        revenue.products.map((p) => (
          <div className="prog-row" key={p.itemCode}>
            <div className="prog-label">{p.itemName}</div>
            <div className="prog-bar">
              <div className="prog-fill" style={{ width: `${Math.min(p.sharePct, 100)}%`, background: "var(--ok)" }} />
            </div>
            <div className="prog-num">₹{p.amountCr.toFixed(2)} Cr</div>
          </div>
        ))
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Product-wise revenue is Sales Invoice Item amounts for items with the "Apply to Sugar 360"
        checkbox enabled on the Item master — not a fixed list.
      </p>
    </>
  );
}
