import type { GradeRow, ProductionKpis } from "@/lib/production/types";

export function GradeWiseTable({
  rows,
  kpis,
  asOfDate,
}: {
  rows: GradeRow[];
  kpis: ProductionKpis;
  asOfDate: string | null;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No submitted Process Orders recorded yet this season.</p>;
  }

  const totals = rows.reduce(
    (acc, r) => ({
      opening: r.openingStockMt !== null ? acc.opening + r.openingStockMt : acc.opening,
      hasOpening: acc.hasOpening || r.openingStockMt !== null,
      today: acc.today + r.todayProductionMt,
      sales: acc.sales + r.todaySalesMt,
      stock: acc.stock + r.currentStockMt,
      value: acc.value + r.currentStockValueCr,
    }),
    { opening: 0, hasOpening: false, today: 0, sales: 0, stock: 0, value: 0 },
  );

  return (
    <>
      <div className="table-wrap">
        <table className="s360">
          <thead>
            <tr>
              <th>Grade</th>
              <th>Opening Stock (MT)</th>
              <th>Today Prod (MT)</th>
              <th>Today Sales (MT)</th>
              <th>Closing Stock (MT)</th>
              <th>Closing Qtl</th>
              <th>Stock Value (₹ Cr)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.itemCode}>
                <td>
                  <b>{r.itemName}</b>
                </td>
                <td>
                  {r.openingStockMt !== null
                    ? r.openingStockMt.toLocaleString("en-IN", { maximumFractionDigits: 1 })
                    : "—"}
                </td>
                <td>{r.todayProductionMt.toLocaleString("en-IN", { maximumFractionDigits: 1 })}</td>
                <td>{r.todaySalesMt.toLocaleString("en-IN", { maximumFractionDigits: 1 })}</td>
                <td style={{ fontWeight: 600 }}>{r.currentStockMt.toLocaleString("en-IN", { maximumFractionDigits: 1 })}</td>
                <td>{(r.currentStockMt * 10).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                <td style={{ color: "var(--ok)" }}>₹{r.currentStockValueCr.toFixed(2)}</td>
                <td>
                  <span className="pill neu">Live</span>
                </td>
              </tr>
            ))}
            <tr style={{ background: "var(--bg)" }}>
              <td>
                <b>Total</b>
              </td>
              <td>
                <b>{totals.hasOpening ? totals.opening.toLocaleString("en-IN", { maximumFractionDigits: 1 }) : "—"}</b>
              </td>
              <td>
                <b>{totals.today.toLocaleString("en-IN", { maximumFractionDigits: 1 })}</b>
              </td>
              <td>
                <b>{totals.sales.toLocaleString("en-IN", { maximumFractionDigits: 1 })}</b>
              </td>
              <td style={{ fontWeight: 700 }}>{totals.stock.toLocaleString("en-IN", { maximumFractionDigits: 1 })}</td>
              <td>
                <b>{(totals.stock * 10).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</b>
              </td>
              <td style={{ color: "var(--ok)", fontWeight: 700 }}>₹{totals.value.toFixed(2)}</td>
              <td>
                <span className="pill brand">Season</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="section-sep">Production KPIs</div>
      <div className="grid-3" style={{ gap: 8, marginBottom: 0 }}>
        <div>
          <div style={{ fontSize: 9, color: "var(--text3)", fontWeight: 700, textTransform: "uppercase" }}>
            Avg Daily Prod
          </div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>
            {kpis.avgDailyProductionMt.toLocaleString("en-IN", { maximumFractionDigits: 0 })} MT
          </div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: "var(--text3)", fontWeight: 700, textTransform: "uppercase" }}>
            Production Days
          </div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{kpis.productionDaysCount} days</div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: "var(--text3)", fontWeight: 700, textTransform: "uppercase" }}>
            Avg Sell Price
          </div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>
            {kpis.avgSellPricePerQtl !== null ? `₹${kpis.avgSellPricePerQtl.toFixed(0)}/Qtl` : "—"}
          </div>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Today's figures as of {asOfDate ?? "—"} (Process Order postings). Today Sales and Avg Sell
        Price are qty-weighted from Sales Invoice Item; Opening Stock is Closing Stock (Bin) minus
        the day's net Stock Ledger movement.
      </p>
    </>
  );
}
