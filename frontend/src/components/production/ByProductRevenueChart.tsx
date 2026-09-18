import { Cell, Pie, PieChart } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { RevenueSlice } from "@/lib/production/types";

const PALETTE = ["#C7891B", "#F59E0B", "#5B63D3", "#1FA45C", "#60A5FA", "#D3453F"];

export function ByProductRevenueChart({ slices }: { slices: RevenueSlice[] }) {
  if (slices.length === 0) {
    return (
      <div className="chart-wrap grid place-items-center text-sm text-muted-foreground" style={{ height: 200 }}>
        No production revenue recorded yet this season.
      </div>
    );
  }

  const data = slices.map((s, i) => ({ ...s, fill: PALETTE[i % PALETTE.length] ?? "#C7891B" }));
  const config = Object.fromEntries(data.map((s) => [s.label, { label: s.label, color: s.fill }])) satisfies ChartConfig;

  return (
    <div className="chart-wrap flex items-center gap-3" style={{ height: 200 }}>
      <ChartContainer config={config} className="aspect-auto h-full shrink-0" style={{ width: 180 }}>
        <PieChart>
          <ChartTooltip
            content={
              <ChartTooltipContent
                nameKey="label"
                formatter={(value, name) => `${name}: ₹${Number(value).toFixed(2)} Cr`}
              />
            }
          />
          <Pie data={data} dataKey="valueCr" nameKey="label" innerRadius="55%" outerRadius="85%" paddingAngle={1}>
            {data.map((entry) => (
              <Cell key={entry.label} fill={entry.fill} stroke="#fff" strokeWidth={2} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <ul className="min-w-0 flex-1 space-y-1.5 text-[11px]">
        {data.map((s) => (
          <li key={s.label} className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5 truncate">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.fill }} />
              <span className="truncate text-muted-foreground">{s.label}</span>
            </span>
            <span className="shrink-0 font-medium tabular-nums">₹{s.valueCr.toFixed(1)} Cr</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
