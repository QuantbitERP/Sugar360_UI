import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  Search,
  Command as CmdIcon,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { NAV, type PanelId } from "@/lib/navigation";
import { callFrappeMethod } from "@/lib/frappe/client";
import type { TickerData } from "@/lib/ticker/types";
import { getLoggedUser, logoutFrappe, redirectToFrappeLogin } from "@/lib/frappe/auth";

function getTickerData(): Promise<TickerData> {
  return callFrappeMethod<TickerData>("sugar360.sugar_360.ticker.get_ticker_data");
}

interface TickerItem {
  label: string;
  value: string;
  tone?: "success" | "warning" | "destructive" | undefined;
}

function buildTickerItems(data: TickerData | undefined): TickerItem[] {
  if (!data) return [];
  const items: TickerItem[] = [
    {
      label: "Season Day",
      value: data.seasonDay !== null ? `Day ${data.seasonDay}${data.seasonDayTotal ? ` of ${data.seasonDayTotal}` : ""}` : "—",
    },
    {
      label: "Cane Crushed",
      value: `${data.caneCrushedMt.toLocaleString("en-IN", { maximumFractionDigits: 0 })} MT`,
      tone: "success",
    },
    {
      label: "Recovery % (Season)",
      value: data.seasonRecoveryPct !== null ? `${data.seasonRecoveryPct.toFixed(2)}%` : "Not connected",
      tone: data.seasonRecoveryPct !== null ? "warning" : undefined,
    },
    { label: "Cane Yard", value: "Not connected" },
    {
      label: "Bank & Cash",
      value: `${data.bankAndCashCr < 0 ? "-" : ""}₹${Math.abs(data.bankAndCashCr).toFixed(2)} Cr`,
      tone: data.bankAndCashCr >= 0 ? "success" : "destructive",
    },
    { label: "Sugar Stock", value: `${data.sugarStockMt.toLocaleString("en-IN", { maximumFractionDigits: 0 })} MT` },
    { label: "Ethanol Today", value: "Not connected" },
    {
      label: "Diesel Stock",
      value: data.dieselStockL !== null ? `${data.dieselStockL.toLocaleString("en-IN", { maximumFractionDigits: 0 })} L` : "—",
      tone: data.dieselStockL !== null ? "destructive" : undefined,
    },
  ];
  return items;
}

function toneClass(tone?: string) {
  if (tone === "success") return "text-success";
  if (tone === "warning") return "text-warning";
  if (tone === "destructive") return "text-destructive";
  return "text-foreground";
}

function useDebouncedValue(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [delay, value]);

  return debounced;
}

export function AppShell({ active, children }: { active: PanelId; children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<string | null>(null);
  const current = NAV.find((item) => item.id === active)!;

  useEffect(() => {
    getLoggedUser().then((u: string | null) => {
      if (!u) {
        redirectToFrappeLogin("/sugar360/");
      } else {
        setUser(u);
      }
    });
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar
        active={active}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((value) => !value)}
      />
      <div className={`transition-[padding] duration-200 ${collapsed ? "lg:pl-16" : "lg:pl-60"}`}>
        <TopNav title={current.label} user={user} onMenuClick={() => setMobileOpen(true)} />
        <Ticker />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

function Sidebar({
  active,
  mobileOpen,
  onClose,
  collapsed,
  onToggleCollapse,
}: {
  active: PanelId;
  mobileOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  let lastGroup = "";

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-surface-panel/95 transition-all duration-200 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "lg:w-16" : "w-60"}`}
      >
        <div
          className={`flex h-14 items-center border-b border-border px-4 ${
            collapsed ? "lg:justify-center lg:px-0" : "justify-between"
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-foreground text-background">
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                <path d="M8 1L10.5 6H14L11 9.5L12 14L8 11.5L4 14L5 9.5L2 6H5.5L8 1Z" />
              </svg>
            </div>
            {!collapsed && (
              <div className="leading-tight">
                <div className="text-[15px] font-semibold tracking-tight">Sugar 360</div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Decision Intelligence
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onToggleCollapse}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground lg:grid"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3" aria-label="Department navigation">
          {NAV.map((item) => {
            const showGroup = item.group !== lastGroup;
            lastGroup = item.group;
            const isActive = item.id === active;

            return (
              <div key={item.id}>
                {showGroup && !collapsed && (
                  <div className="mb-2 mt-3 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {item.group}
                  </div>
                )}
                <Link
                  to={item.to}
                  onClick={onClose}
                  aria-current={isActive ? "page" : undefined}
                  title={collapsed ? item.label : undefined}
                  className={`group flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors ${
                    isActive
                      ? "bg-foreground text-background shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && (
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{item.label}</span>
                      <span
                        className={`block truncate text-xs ${isActive ? "text-background/70" : "text-muted-foreground"}`}
                      >
                        {item.dept}
                      </span>
                    </span>
                  )}
                </Link>
              </div>
            );
          })}
        </nav>

        {!collapsed && (
          <div className="border-t border-border p-3">
            <div className="rounded-lg border border-border bg-surface p-3">
              <div className="text-xs font-medium text-muted-foreground">
                Season 2024–25 Progress
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-[39%] rounded-full bg-success" />
              </div>
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>Day 47 of 120</span>
                <span>
                  <b className="font-semibold text-foreground">39%</b> complete
                </span>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

function TopNav({ title, user, onMenuClick }: { title: string; user: string | null; onMenuClick: () => void }) {
  const [clock, setClock] = useState("—");
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebouncedValue(query.trim().toLowerCase(), 180);
  const results = useMemo(
    () =>
      debouncedQuery
        ? NAV.filter((item) => `${item.label} ${item.dept}`.toLowerCase().includes(debouncedQuery))
        : [],
    [debouncedQuery],
  );

  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }),
      );
    tick();
    const timer = setInterval(tick, 1_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-xl">
      <button
        type="button"
        aria-label="Open navigation"
        onClick={onMenuClick}
        className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
      >
        <Menu className="h-4 w-4" />
      </button>
      <div className="hidden min-w-0 items-center gap-2 text-sm text-muted-foreground md:flex">
        <span>Dashboard</span>
        <span className="text-border">/</span>
        <span className="truncate font-medium text-foreground">{title}</span>
      </div>
      <div className="flex-1" />
      <div className="relative hidden w-full max-w-sm md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search departments..."
          aria-label="Search departments"
          className="h-9 w-full rounded-lg border border-border bg-surface pl-9 pr-14 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
        />
        <kbd className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          <CmdIcon className="h-3 w-3" />K
        </kbd>
        {query && (
          <div className="absolute left-0 right-0 top-11 overflow-hidden rounded-xl border border-border bg-background p-1 shadow-xl">
            {results.length ? (
              results.map((item) => (
                <Link
                  key={item.id}
                  to={item.to}
                  onClick={() => setQuery("")}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-muted"
                >
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <span>
                    <b className="block font-medium">{item.label}</b>
                    <span className="text-xs text-muted-foreground">{item.dept}</span>
                  </span>
                </Link>
              ))
            ) : (
              <p className="px-3 py-3 text-sm text-muted-foreground">No department found.</p>
            )}
          </div>
        )}
      </div>
      <span className="hidden items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-medium text-success sm:inline-flex">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
        Live
      </span>
      <span className="hidden font-mono text-xs text-muted-foreground lg:inline">{clock}</span>
      <button
        type="button"
        aria-label="Notifications"
        className="relative grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Bell className="h-4 w-4" />
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
      </button>

      {user ? (
        <div className="flex items-center gap-2 rounded-lg bg-surface border border-border px-2.5 py-1 text-xs font-medium">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground/10 text-foreground font-bold text-[10px]">
            {user.slice(0, 2).toUpperCase()}
          </div>
          <span className="hidden sm:inline font-semibold text-foreground">{user}</span>
          <button
            type="button"
            onClick={() => logoutFrappe()}
            title="Logout from Frappe session"
            className="ml-1 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => redirectToFrappeLogin("/sugar360/")}
          className="flex h-8 items-center gap-1 rounded-lg bg-foreground px-3 text-xs font-semibold text-background shadow-xs hover:opacity-90"
        >
          Login
        </button>
      )}
    </header>
  );
}

function Ticker() {
  const { data, isPending } = useQuery({
    queryKey: ["ticker-data"],
    queryFn: () => getTickerData(),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
  const items = buildTickerItems(data);

  return (
    <div className="flex gap-6 overflow-x-auto border-b border-border bg-surface-panel/60 px-4 py-2 lg:px-6">
      {isPending && items.length === 0
        ? Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="shrink-0 animate-pulse">
              <div className="h-2.5 w-16 rounded bg-primary/10" />
              <div className="mt-1.5 h-4 w-14 rounded bg-primary/10" />
            </div>
          ))
        : items.map((item) => (
            <div key={item.label} className="shrink-0">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {item.label}
              </div>
              <div className={`text-sm font-semibold ${toneClass(item.tone)}`}>{item.value}</div>
            </div>
          ))}
    </div>
  );
}
