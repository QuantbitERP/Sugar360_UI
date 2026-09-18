import type { FinanceKpis } from "@/lib/finance/types";

function fmtCr(value: number) {
  const sign = value < 0 ? "-" : "";
  return `${sign}₹${Math.abs(value).toFixed(2)}`;
}

function Kpi({
  accent,
  label,
  value,
  note,
  noteColor,
}: {
  accent: string;
  label: string;
  value: string;
  note: string;
  noteColor?: string | undefined;
}) {
  return (
    <div className="fi-kpi">
      <div className="fi-kpi-accent" style={{ background: accent }} />
      <div className="fi-kpi-label">{label}</div>
      <div className="fi-kpi-val">
        {value} <span className="fi-kpi-unit">Cr</span>
      </div>
      <div className="fi-kpi-note" style={noteColor ? { color: noteColor } : undefined}>
        {note}
      </div>
    </div>
  );
}

function NotConnectedKpi({ label }: { label: string }) {
  return (
    <div className="fi-kpi">
      <div className="fi-kpi-accent" style={{ background: "var(--border)" }} />
      <div className="fi-kpi-label">{label}</div>
      <div className="fi-kpi-val text-muted-foreground" style={{ fontSize: 16 }}>
        Not connected
      </div>
      <div className="fi-kpi-note">No CC-facility account tagging in this instance</div>
    </div>
  );
}

export function FinanceKpiGrid({ kpis }: { kpis: FinanceKpis }) {
  return (
    <div className="fi-kpi-grid">
      <Kpi
        accent="var(--ok)"
        label="Total Bank Balance"
        value={fmtCr(kpis.bankBalanceCr)}
        note="GL Entry — Bank-type accounts (Debit − Credit)"
      />
      <Kpi
        accent="var(--text3)"
        label="Cash Balance (Petty)"
        value={fmtCr(kpis.cashBalanceCr)}
        note="GL Entry — Cash-type accounts (Debit − Credit)"
      />
      <NotConnectedKpi label="C.C. Loan Outstanding" />
      <NotConnectedKpi label="C.C. Available Limit" />
      <Kpi
        accent="var(--risk)"
        label="Outstanding Receivables"
        value={fmtCr(kpis.outstandingReceivablesCr)}
        note="GL Entry — Receivable-type accounts"
        noteColor={kpis.outstandingReceivablesCr > 0 ? "var(--risk)" : undefined}
      />
      <Kpi
        accent="var(--warn)"
        label="Outstanding Payables"
        value={fmtCr(kpis.outstandingPayablesCr)}
        note="GL Entry — Payable-type accounts"
        noteColor={kpis.outstandingPayablesCr > 0 ? "var(--warn)" : undefined}
      />
    </div>
  );
}
