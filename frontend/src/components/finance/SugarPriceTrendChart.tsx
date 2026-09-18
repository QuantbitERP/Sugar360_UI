import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { callFrappeMethod } from "@/lib/frappe/client";
import type { PriceTrendGranularity, PriceTrendResult } from "@/lib/finance/types";

function getSugarPriceTrend(params: {
  from?: string | undefined;
  to?: string | undefined;
  granularity: PriceTrendGranularity;
}) {
  return callFrappeMethod<PriceTrendResult>("sugar360.sugar_360.finance.get_sugar_price_trend", params);
}

type Preset = "last30" | "last90" | "season" | "custom";

function todayIso() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}
function daysAgoIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
}

const chartConfig = {
  avgRate: { label: "Avg Realisation (₹/Qtl)", color: "#D3453F" },
  msp: { label: "MSP", color: "#D3D6DC" },
} satisfies ChartConfig;

export function SugarPriceTrendChart() {
  const [preset, setPreset] = useState<Preset>("last90");
  const [granularity, setGranularity] = useState<PriceTrendGranularity>("weekly");
  const [customFrom, setCustomFrom] = useState(daysAgoIso(90));
  const [customTo, setCustomTo] = useState(todayIso());

  const range = useMemo(() => {
    if (preset === "last30") return { from: daysAgoIso(30), to: todayIso() };
    if (preset === "last90") return { from: daysAgoIso(90), to: todayIso() };
    if (preset === "custom") return { from: customFrom, to: customTo };
    return { from: undefined, to: undefined }; // "season" — let the server pick the default range
  }, [preset, customFrom, customTo]);

  const query = useQuery({
    queryKey: ["sugar-price-trend", range.from, range.to, granularity],
    queryFn: () => getSugarPriceTrend({ from: range.from, to: range.to, granularity }),
    staleTime: 60_000,
  });

  const data = query.data?.points.map((p) => ({ ...p, msp: query.data?.mspPerQtl ?? 0 })) ?? [];

  return (
    <>
      <div className="card-header">
        <div className="card-title">Sugar Price Trend</div>
      </div>
      <div className="card-sub">Qty-weighted average realisation per Qtl vs reference MSP (₹/Qtl)</div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          value={preset}
          onChange={(e) => setPreset(e.target.value as Preset)}
          className="h-8 rounded-md border border-border bg-surface px-2 text-xs"
        >
          <option value="last30">Last 30 Days</option>
          <option value="last90">Last 90 Days</option>
          <option value="season">This Season</option>
          <option value="custom">Custom Range</option>
        </select>
        {preset === "custom" && (
          <>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="h-8 rounded-md border border-border bg-surface px-2 text-xs"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="h-8 rounded-md border border-border bg-surface px-2 text-xs"
            />
          </>
        )}
        <select
          value={granularity}
          onChange={(e) => setGranularity(e.target.value as PriceTrendGranularity)}
          className="h-8 rounded-md border border-border bg-surface px-2 text-xs"
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
        {query.isFetching && <span className="text-xs text-muted-foreground">Loading…</span>}
      </div>

      {query.isPending ? (
        <Skeleton className="h-[170px] w-full rounded-xl" />
      ) : query.isError ? (
        <div className="grid h-[170px] place-items-center text-sm text-muted-foreground">Couldn't load price trend.</div>
      ) : data.length === 0 ? (
        <div className="grid h-[170px] place-items-center text-sm text-muted-foreground">
          No sugar sales recorded in this range.
        </div>
      ) : (
        <ChartContainer config={chartConfig} className="aspect-auto" style={{ height: 170 }}>
          <ComposedChart data={data} margin={{ left: 4, right: 4, top: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#F3F4F6" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} stroke="#8A909C" />
            <YAxis tickLine={false} axisLine={false} fontSize={10} stroke="#8A909C" width={45} domain={["auto", "auto"]} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="avgRate" fill="#D3453F" radius={4} />
            <Line dataKey="msp" stroke="#D3D6DC" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
          </ComposedChart>
        </ChartContainer>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        From Sales Invoice Item, item group "SUGAR" — average is quantity-weighted. MSP reference
        (₹{query.data?.mspPerQtl ?? 3100}/Qtl) is not confirmed against a live MSP data source.
      </p>
    </>
  );
}
