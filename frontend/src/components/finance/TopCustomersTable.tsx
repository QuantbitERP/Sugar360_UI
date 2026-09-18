import type { TopCustomerRow } from "@/lib/finance/types";

export function TopCustomersTable({ rows }: { rows: TopCustomerRow[] }) {
  const totalOutstanding = rows.reduce((sum, r) => sum + r.outstandingCr, 0);

  return (
    <>
      <div className="card-header">
        <div className="card-title">Top Customers — Outstanding</div>
        <span className="pill warn">₹{totalOutstanding.toFixed(2)} Cr receivable</span>
      </div>
      <div className="card-sub">Season to date · from Sales Invoice</div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No sales invoices recorded this season.</p>
      ) : (
        <div className="table-wrap">
          <table className="s360">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Season Value (₹ Cr)</th>
                <th>Outstanding (₹ Cr)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.customer}>
                  <td>{r.customerName}</td>
                  <td>{r.seasonValueCr.toFixed(2)}</td>
                  <td style={{ color: r.outstandingCr > 0 ? "var(--warn)" : "var(--ok)" }}>
                    {r.outstandingCr.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Overdue-by-age and collection status aren't shown — ageing buckets need a confirmed overdue
        policy this instance doesn't configure.
      </p>
    </>
  );
}
