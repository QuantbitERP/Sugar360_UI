import { Bar, CartesianGrid, ComposedChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { HourlyPoint } from "@/lib/management/types";

const chartConfig = {
  actualMt: { label: "Received (MT)", color: "#5B63D3" },
} satisfies ChartConfig;

export function HourlyCrushingChart({ points }: { points: HourlyPoint[] }) {
  if (points.length === 0) {
    return (
      <div className="chart-wrap grid place-items-center text-sm text-muted-foreground" style={{ height: 180 }}>
        No weighbridge activity recorded on the latest reporting day.
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="aspect-auto" style={{ height: 180 }}>
      <ComposedChart data={points} margin={{ left: 4, right: 4, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#F3F4F6" />
        <XAxis dataKey="hour" tickLine={false} axisLine={false} fontSize={10} stroke="#8A909C" />
        <YAxis tickLine={false} axisLine={false} fontSize={10} stroke="#8A909C" width={40} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="actualMt" fill="#5B63D3" radius={4} />
      </ComposedChart>
    </ChartContainer>
  );
}
