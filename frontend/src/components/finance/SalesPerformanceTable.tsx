import type { SalesPerformance } from "@/lib/finance/types";
import { formatShortDate } from "@/lib/cane/format";

export function SalesPerformanceTable({ sales }: { sales: SalesPerformance }) {
  return (
    <>
      <div className="card-header">
        <div className="card-title">Sales — {sales.isToday ? "Today" : formatShortDate(sales.asOfDate)} &amp; MTD Performance</div>
        <span className="pill ok">
          {sales.avgRealisationPerQtl !== null ? `₹${sales.avgRealisationPerQtl.toFixed(0)}/Qtl Avg` : "—"}
        </span>
      </div>
      <div className="card-sub">Grade-wise sales quantity &amp; value — items flagged "Apply to Sugar 360"</div>
      {sales.grades.length === 0 ? (
        <p className="text-sm text-muted-foreground">No sugar-grade items are flagged for reporting.</p>
      ) : (
        <div className="table-wrap">
          <table className="s360">
            <thead>
              <tr>
                <th>Grade</th>
                <th>Today Qty (Qtl)</th>
                <th>Today Value (₹ Cr)</th>
                <th>MTD Qty (Qtl)</th>
                <th>MTD Value (₹ Cr)</th>
              </tr>
            </thead>
            <tbody>
              {sales.grades.map((g) => (
                <tr key={g.itemCode}>
                  <td>
                    <b>{g.itemName}</b>
                  </td>
                  <td>{g.todayQty.toLocaleString("en-IN")}</td>
                  <td>{g.todayValueCr.toFixed(2)}</td>
                  <td>{g.mtdQty.toLocaleString("en-IN")}</td>
                  <td>{g.mtdValueCr.toFixed(2)}</td>
                </tr>
              ))}
              <tr style={{ background: "var(--bg)" }}>
                <td>
                  <b>Total</b>
                </td>
                <td>
                  <b>{sales.todayTotalQty.toLocaleString("en-IN")}</b>
                </td>
                <td>
                  <b>₹{sales.todayTotalValueCr.toFixed(2)}</b>
                </td>
                <td>
                  <b>{sales.mtdTotalQty.toLocaleString("en-IN")}</b>
                </td>
                <td>
                  <b>₹{sales.mtdTotalValueCr.toFixed(2)}</b>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Pending dispatch and target/last-year comparisons aren't shown — no Delivery Note/target
        data source in this instance.
      </p>
    </>
  );
}
