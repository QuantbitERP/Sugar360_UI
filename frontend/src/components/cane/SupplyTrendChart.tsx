import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { SupplyTrendPoint } from "@/lib/cane/types";
import { formatShortDate } from "@/lib/cane/format";

const chartConfig = {
  receivedMt: { label: "Received (MT)", color: "#1FA45C" },
  targetMt: { label: "Target", color: "#D3D6DC" },
} satisfies ChartConfig;

export function SupplyTrendChart({ points }: { points: SupplyTrendPoint[] }) {
  if (points.length === 0) {
    return (
      <div className="chart-wrap grid place-items-center text-sm text-muted-foreground" style={{ height: 170 }}>
        No weighbridge activity recorded yet this season.
      </div>
    );
  }

  const data = points.map((p) => ({ ...p, label: formatShortDate(p.date) }));
  const avgReceived = points.reduce((sum, p) => sum + p.receivedMt, 0) / points.length;
  const target = points[0]?.targetMt ?? 0;
  const avgVsTargetPct = target > 0 ? ((avgReceived - target) / target) * 100 : null;

  return (
    <>
      <div className="card-header">
        <div className="card-title">Cane Supply vs Target — Last {points.length} Reporting Days</div>
        {avgVsTargetPct !== null && (
          <span className={`pill ${avgVsTargetPct >= 0 ? "ok" : "warn"}`}>
            Avg {avgVsTargetPct >= 0 ? "+" : ""}
            {avgVsTargetPct.toFixed(1)}%
          </span>
        )}
      </div>
      <div className="card-sub">Daily received (MT) vs {target.toLocaleString("en-IN")} MT/day target</div>
      <ChartContainer config={chartConfig} className="aspect-auto" style={{ height: 170 }}>
        <ComposedChart data={data} margin={{ left: 4, right: 4, top: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#F3F4F6" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} stroke="#8A909C" />
          <YAxis
            tickLine={false}
            axisLine={false}
            fontSize={10}
            stroke="#8A909C"
            width={40}
            tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}k`}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="receivedMt" fill="#1FA45C" radius={4} />
          <Line dataKey="targetMt" stroke="#D3D6DC" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
        </ComposedChart>
      </ChartContainer>
    </>
  );
}
