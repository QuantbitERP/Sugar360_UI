import type { FinancialPositionKpis } from "@/lib/management/types";
import { formatShortDate } from "@/lib/cane/format";

function Kpi({ accent, label, value, delta }: { accent: string; label: string; value: string; delta: string }) {
  return (
    <div className="kpi">
      <div className="kpi-accent" style={{ background: accent }} />
      <div className="kpi-label">{label}</div>
      <div className="kpi-val">
        {value} <span className="kpi-unit">Cr</span>
      </div>
      <div className="kpi-delta nt">{delta}</div>
    </div>
  );
}

function fmtCr(value: number) {
  const sign = value < 0 ? "-" : "";
  return `${sign}₹${Math.abs(value).toFixed(2)}`;
}

export function FinancialPositionKpiRow({ kpis }: { kpis: FinancialPositionKpis }) {
  const label = kpis.isToday ? "Today's" : formatShortDate(kpis.asOfDate);

  return (
    <div className="kpi-row cols-6 md-bento md-bento-finance">
      <Kpi accent="var(--ok)" label="Bank Balance" value={fmtCr(kpis.bankBalanceCr)} delta="GL Entry — Bank accounts" />
      <Kpi
        accent="var(--warn)"
        label="C.C. Available Limit"
        value="—"
        delta="Not connected — no CC-facility tagging"
      />
      <Kpi
        accent="var(--risk)"
        label="Outstanding Receivables"
        value={fmtCr(kpis.outstandingReceivablesCr)}
        delta="GL Entry — Receivable accounts"
      />
      <Kpi
        accent="var(--warn)"
        label="Outstanding Payables"
        value={fmtCr(kpis.outstandingPayablesCr)}
        delta="GL Entry — Payable accounts"
      />
      <Kpi accent="var(--ok)" label={`${label} Revenue`} value={fmtCr(kpis.todayRevenueCr)} delta="GL Entry — Income accounts" />
      <Kpi accent="var(--ch)" label={`${label} Expenses`} value={fmtCr(kpis.todayExpensesCr)} delta="Purchase Invoice total" />
    </div>
  );
}
