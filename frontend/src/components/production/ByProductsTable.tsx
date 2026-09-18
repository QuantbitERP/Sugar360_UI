import type { ByProductRow } from "@/lib/production/types";

export function ByProductsTable({ rows, asOfDate }: { rows: ByProductRow[]; asOfDate: string | null }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No by-product records yet this season.</p>;
  }

  return (
    <div className="table-wrap">
      <table className="s360">
        <thead>
          <tr>
            <th>By-product</th>
            <th>Unit</th>
            <th>Opening Stock</th>
            <th>Today Production</th>
            <th>Today Consumed</th>
            <th>Today Sales</th>
            <th>Closing Stock</th>
            <th>Stock Value</th>
            <th>Realisation</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.itemCode}>
              <td>
                <b>{r.itemName}</b>
              </td>
              <td>{r.unit}</td>
              <td>{r.openingStock !== null ? r.openingStock.toLocaleString("en-IN", { maximumFractionDigits: 1 }) : "—"}</td>
              <td>{r.todayProduction.toLocaleString("en-IN", { maximumFractionDigits: 1 })}</td>
              <td>{r.todayConsumed.toLocaleString("en-IN", { maximumFractionDigits: 1 })}</td>
              <td>{r.todaySales.toLocaleString("en-IN", { maximumFractionDigits: 1 })}</td>
              <td style={{ fontWeight: 600 }}>{r.currentStock.toLocaleString("en-IN", { maximumFractionDigits: 1 })}</td>
              <td>₹{r.currentStockValueCr.toFixed(2)} Cr</td>
              <td>
                ₹{r.realisationPerUnit.toLocaleString("en-IN", { maximumFractionDigits: 0 })}/{r.unit}
              </td>
              <td>
                <span className="pill neu">Live</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-muted-foreground">
        As of {asOfDate ?? "—"}. Opening Stock = closing Bin balance minus the day's net Stock
        Ledger movement. Today Consumed = non-Manufacture Stock Entry postings that day (currently
        0 for most rows — this instance doesn't record a separate consumption transaction for these
        items, e.g. bagasse burned as boiler fuel isn't booked as a Stock Entry here). Today Sales =
        Sales Invoice Item for that item on this date.
      </p>
    </div>
  );
}
