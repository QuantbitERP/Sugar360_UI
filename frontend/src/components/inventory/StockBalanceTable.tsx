import type { StockBalanceRow } from "@/lib/inventory/types";

export function StockBalanceTable({ rows }: { rows: StockBalanceRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No finished-goods or by-product stock recorded yet this season.</p>;
  }

  return (
    <div className="table-wrap">
      <table className="s360">
        <thead>
          <tr>
            <th>Item</th>
            <th>Current Stock</th>
            <th>Stock Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.itemCode}>
              <td>
                <b>{r.itemName}</b>
              </td>
              <td style={{ fontWeight: 600 }}>
                {r.currentStock.toLocaleString("en-IN", { maximumFractionDigits: 1 })} {r.unit}
              </td>
              <td style={{ color: "var(--ok)" }}>₹{r.currentStockValueCr.toFixed(2)} Cr</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-muted-foreground">
        Current closing stock from ERPNext's Bin table (Process Order finished-goods &amp;
        by-product items). Opening/receipts/issues columns and min/max reorder levels aren't wired
        yet — no Item Reorder configuration exists in this instance to source min/max norms from.
      </p>
    </div>
  );
}
