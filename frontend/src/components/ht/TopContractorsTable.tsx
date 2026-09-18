import type { ContractorRow } from "@/lib/ht/types";

export function TopContractorsTable({ rows }: { rows: ContractorRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No transporter-linked deliveries recorded yet this season.</p>;
  }

  return (
    <div className="table-wrap">
      <table className="s360">
        <thead>
          <tr>
            <th>#</th>
            <th>Contractor</th>
            <th>Village</th>
            <th>Supplied (MT)</th>
            <th>Trips</th>
            <th>Advance Sanctioned (₹L)</th>
            <th>Advance Paid (₹L)</th>
            <th>Balance (₹L)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.transporterContract}>
              <td>{i + 1}</td>
              <td>
                <b>{r.transporterName}</b>
                <div className="text-xs text-muted-foreground">{r.transporterContract}</div>
              </td>
              <td>{r.village}</td>
              <td>{r.suppliedMt.toLocaleString("en-IN", { maximumFractionDigits: 1 })}</td>
              <td>{r.trips.toLocaleString("en-IN")}</td>
              <td>{r.advanceSanctionedL.toFixed(1)}</td>
              <td>{r.advancePaidL.toFixed(1)}</td>
              <td style={{ color: r.advanceBalanceL > 0 ? "var(--warn)" : "var(--ok)" }}>
                {r.advanceBalanceL.toFixed(1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-muted-foreground">
        Ranked by cane quantity supplied this season. "Achievement %" against a contracted target
        and advance recovery % aren't shown — this instance has no contracted-quantity target or
        repayment tracking to source them from.
      </p>
    </div>
  );
}
