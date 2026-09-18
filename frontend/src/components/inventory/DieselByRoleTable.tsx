import type { FuelRoleRow } from "@/lib/inventory/types";

export function DieselByRoleTable({ rows }: { rows: FuelRoleRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No diesel issued against Harvester/Transporter entities yet this season.</p>;
  }

  const totalL = rows.reduce((sum, r) => sum + r.quantityL, 0);
  const totalEntries = rows.reduce((sum, r) => sum + r.entries, 0);

  return (
    <div className="table-wrap">
      <table className="s360">
        <thead>
          <tr>
            <th>Entity Type</th>
            <th>Issue Entries</th>
            <th>Total Issued (L)</th>
            <th>Avg per Entry (L)</th>
            <th>Share</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.entityType}>
              <td>
                <b>{r.entityType}</b>
              </td>
              <td>{r.entries.toLocaleString("en-IN")}</td>
              <td>{r.quantityL.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
              <td>{(r.entries > 0 ? r.quantityL / r.entries : 0).toFixed(1)}</td>
              <td>{r.sharePct.toFixed(1)}%</td>
            </tr>
          ))}
          <tr style={{ background: "var(--bg)" }}>
            <td>
              <b>Total</b>
            </td>
            <td>
              <b>{totalEntries.toLocaleString("en-IN")}</b>
            </td>
            <td>
              <b>{totalL.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</b>
            </td>
            <td>—</td>
            <td>
              <b>100%</b>
            </td>
          </tr>
        </tbody>
      </table>
      <p className="mt-2 text-xs text-muted-foreground">
        Season to date, from Fuel Ledger Entry issued entries — split by the real entity_type field
        (Harvester / Transporter), not the equipment-category breakdown the original mock used
        (this instance doesn't tag issues by vehicle/equipment category).
      </p>
    </div>
  );
}
