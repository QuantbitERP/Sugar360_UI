import { Bar, CartesianGrid, ComposedChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { ProductionTrendPoint } from "@/lib/production/types";
import { formatShortDate } from "@/lib/cane/format";

const chartConfig = {
  sugarProducedMt: { label: "Sugar Produced (MT)", color: "#C7891B" },
} satisfies ChartConfig;

export function ProductionTrendChart({ points }: { points: ProductionTrendPoint[] }) {
  if (points.length === 0) {
    return (
      <div className="chart-wrap grid place-items-center text-sm text-muted-foreground" style={{ height: 200 }}>
        No sugar production recorded yet this season.
      </div>
    );
  }

  const data = points.map((p) => ({ ...p, label: formatShortDate(p.date) }));

  return (
    <ChartContainer config={chartConfig} className="aspect-auto" style={{ height: 200 }}>
      <ComposedChart data={data} margin={{ left: 4, right: 4, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#F3F4F6" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} stroke="#8A909C" />
        <YAxis tickLine={false} axisLine={false} fontSize={10} stroke="#8A909C" width={40} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="sugarProducedMt" fill="#C7891B" radius={4} />
      </ComposedChart>
    </ChartContainer>
  );
}
