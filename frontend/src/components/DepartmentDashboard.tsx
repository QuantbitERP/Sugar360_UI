import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { Check, LoaderCircle, RefreshCw } from "lucide-react";
import { useEffect, useRef } from "react";
import { AppShell } from "@/components/AppShell";
import { Skeleton } from "@/components/ui/skeleton";
import { CaneDashboard } from "@/components/cane/CaneDashboard";
import { ProductionDashboard } from "@/components/production/ProductionDashboard";
import { HtDashboard } from "@/components/ht/HtDashboard";
import { InventoryDashboard } from "@/components/inventory/InventoryDashboard";
import { ManagementDashboard } from "@/components/management/ManagementDashboard";
import { FinanceDashboard } from "@/components/finance/FinanceDashboard";
import {
  acknowledgeUpdate,
  fetchDepartmentDashboard,
  fetchDepartmentUpdates,
  type UpdatePage,
} from "@/lib/dashboard-api";
import type { PanelId } from "@/lib/navigation";

function DashboardSkeleton() {
  return (
    <div className="space-y-5" aria-label="Loading dashboard" aria-busy="true">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-72" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-8 w-44" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

function OperationalUpdates({ department }: { department: PanelId }) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const queryKey = ["department-updates", department] as const;
  const updates = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam, signal }) => fetchDepartmentUpdates(department, pageParam, signal),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = updates;

  const acknowledge = useMutation({
    mutationFn: acknowledgeUpdate,
    onMutate: async (updateId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<InfiniteData<UpdatePage, number>>(queryKey);
      queryClient.setQueryData<InfiniteData<UpdatePage, number>>(queryKey, (current) =>
        current
          ? {
              ...current,
              pages: current.pages.map((page) => ({
                ...page,
                items: page.items.map((item) =>
                  item.id === updateId ? { ...item, acknowledged: true } : item,
                ),
              })),
            }
          : current,
      );
      return { previous };
    },
    onError: (_error, _updateId, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
  });

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && !isFetchingNextPage) void fetchNextPage();
      },
      { rootMargin: "160px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const items = updates.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <section
      className="mt-5 overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      aria-labelledby="updates-title"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h2 id="updates-title" className="text-sm font-semibold">
            Operational updates
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Cached live feed · more items load as you scroll
          </p>
        </div>
        {updates.isFetching && !updates.isFetchingNextPage && (
          <LoaderCircle
            className="h-4 w-4 animate-spin text-muted-foreground"
            aria-label="Refreshing"
          />
        )}
      </div>

      {updates.isPending ? (
        <div className="space-y-3 p-4">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-14" />
          ))}
        </div>
      ) : updates.isError ? (
        <div className="p-5 text-center">
          <p className="text-sm text-muted-foreground">Updates are temporarily unavailable.</p>
          <button
            type="button"
            onClick={() => void updates.refetch()}
            className="mt-3 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {items.map((item) => (
            <article
              key={item.id}
              className={`flex items-start gap-3 px-4 py-3 transition-opacity ${item.acknowledged ? "opacity-55" : ""}`}
            >
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.severity === "critical" ? "bg-destructive" : item.severity === "warning" ? "bg-warning" : "bg-success"}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h3 className="text-sm font-semibold">{item.title}</h3>
                  <time className="text-xs font-medium text-muted-foreground">{item.time}</time>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">{item.detail}</p>
              </div>
              <button
                type="button"
                disabled={item.acknowledged || acknowledge.isPending}
                onClick={() => acknowledge.mutate(item.id)}
                className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold transition-colors hover:bg-muted disabled:cursor-default disabled:border-transparent disabled:text-success"
              >
                {item.acknowledged ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Acknowledged
                  </>
                ) : (
                  "Acknowledge"
                )}
              </button>
            </article>
          ))}
          <div
            ref={sentinelRef}
            className="flex h-12 items-center justify-center text-xs text-muted-foreground"
          >
            {updates.isFetchingNextPage ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                Loading more
              </>
            ) : updates.hasNextPage ? (
              "Scroll for more"
            ) : (
              "All updates loaded"
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export function DepartmentDashboard({ department }: { department: PanelId }) {
  const dashboard = useQuery({
    queryKey: ["department-dashboard", department],
    queryFn: ({ signal }) => fetchDepartmentDashboard(department, signal),
    refetchInterval: 60_000,
  });

  return (
    <AppShell active={department}>
      {dashboard.isPending ? (
        <DashboardSkeleton />
      ) : dashboard.isError ? (
        <div className="grid min-h-[55vh] place-items-center rounded-xl border border-border bg-card p-6 text-center">
          <div>
            <h1 className="text-xl font-semibold">Dashboard data did not load</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your last cached view is preserved. Try the request again.
            </p>
            <button
              type="button"
              onClick={() => void dashboard.refetch()}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in duration-300">
          {dashboard.data.kind === "cane" ? (
            <CaneDashboard
              data={dashboard.data.data}
              updatedAt={dashboard.data.updatedAt}
              isFetching={dashboard.isFetching}
              onRefresh={() => void dashboard.refetch()}
            />
          ) : dashboard.data.kind === "production" ? (
            <ProductionDashboard
              data={dashboard.data.data}
              updatedAt={dashboard.data.updatedAt}
              isFetching={dashboard.isFetching}
              onRefresh={() => void dashboard.refetch()}
            />
          ) : dashboard.data.kind === "ht" ? (
            <HtDashboard
              data={dashboard.data.data}
              updatedAt={dashboard.data.updatedAt}
              isFetching={dashboard.isFetching}
              onRefresh={() => void dashboard.refetch()}
            />
          ) : dashboard.data.kind === "inventory" ? (
            <InventoryDashboard
              data={dashboard.data.data}
              updatedAt={dashboard.data.updatedAt}
              isFetching={dashboard.isFetching}
              onRefresh={() => void dashboard.refetch()}
            />
          ) : dashboard.data.kind === "management" ? (
            <ManagementDashboard
              data={dashboard.data.data}
              updatedAt={dashboard.data.updatedAt}
              isFetching={dashboard.isFetching}
              onRefresh={() => void dashboard.refetch()}
            />
          ) : (
            <FinanceDashboard
              data={dashboard.data.data}
              updatedAt={dashboard.data.updatedAt}
              isFetching={dashboard.isFetching}
              onRefresh={() => void dashboard.refetch()}
            />
          )}
          <OperationalUpdates department={department} />
        </div>
      )}
    </AppShell>
  );
}
