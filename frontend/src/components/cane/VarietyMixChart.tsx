import { Cell, Pie, PieChart } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { VarietySlice } from "@/lib/cane/types";

const PALETTE = ["#1FA45C", "#22C55E", "#4ADE80", "#86EFAC", "#B9F5CE", "#D1FAE5", "#E7F9EE"];

export function VarietyMixChart({ slices }: { slices: VarietySlice[] }) {
  if (slices.length === 0) {
    return (
      <div className="chart-wrap grid place-items-center text-sm text-muted-foreground" style={{ height: 180 }}>
        No crushing data recorded yet this season.
      </div>
    );
  }

  const data = slices.map((s, i) => ({ ...s, fill: PALETTE[i % PALETTE.length] ?? "#1FA45C" }));
  const config = Object.fromEntries(
    data.map((s) => [s.variety, { label: s.variety, color: s.fill }]),
  ) satisfies ChartConfig;

  return (
    <div className="flex items-center gap-3">
      <ChartContainer config={config} className="aspect-auto shrink-0" style={{ height: 150, width: 150 }}>
        <PieChart>
          <ChartTooltip
            content={
              <ChartTooltipContent
                nameKey="variety"
                formatter={(value, name) => `${name}: ${Number(value).toFixed(0)} MT`}
              />
            }
          />
          <Pie data={data} dataKey="totalMt" nameKey="variety" innerRadius="55%" outerRadius="85%" paddingAngle={1}>
            {data.map((entry) => (
              <Cell key={entry.variety} fill={entry.fill} stroke="#fff" strokeWidth={2} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <ul className="min-w-0 flex-1 space-y-1.5 text-[11px]">
        {data.map((s) => (
          <li key={s.variety} className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5 truncate">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.fill }} />
              <span className="truncate text-muted-foreground">{s.variety}</span>
            </span>
            <span className="shrink-0 font-medium tabular-nums">{s.sharePct.toFixed(0)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
