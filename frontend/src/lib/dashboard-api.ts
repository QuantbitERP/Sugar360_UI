import type { PanelId } from "@/lib/navigation";
import { callFrappeMethod } from "@/lib/frappe/client";
import type { CaneActivityPage, CaneDashboardData } from "@/lib/cane/types";
import type { ProductionDashboardData } from "@/lib/production/types";
import type { HtDashboardData } from "@/lib/ht/types";
import type { InventoryDashboardData } from "@/lib/inventory/types";
import type { ManagementDashboardData } from "@/lib/management/types";
import type { FinanceDashboardData } from "@/lib/finance/types";

export type UpdateItem = {
  id: string;
  title: string;
  detail: string;
  time: string;
  severity: "normal" | "warning" | "critical";
  acknowledged: boolean;
};

export type UpdatePage = {
  items: UpdateItem[];
  nextCursor?: number | undefined;
};

const departmentNames: Record<PanelId, string> = {
  cmd: "Management",
  cane: "Cane & Agriculture",
  prod: "Production",
  ht: "Harvesting & Transport",
  inv: "Inventory",
  fi: "Finance & Sales",
};

// This generic feed backs the "Operational updates" sidebar shown under every dashboard.
// Cane & Agriculture has a real backing feed (submitted weighbridge slips, see
// sugar360.sugar_360.cane.get_cane_activity_page); the other departments don't have an
// equivalent granular activity log wired in this Frappe instance, so they keep this
// placeholder feed rather than fabricating one.
const updateMessages = [
  ["Shift target reviewed", "Actual output is aligned with the latest operating plan."],
  ["Variance needs attention", "A threshold variance was detected and assigned for review."],
  ["Live reading received", "The newest telemetry batch passed validation."],
  ["Daily plan synchronized", "Targets and operating constraints are now up to date."],
  ["Exception detected", "The control room has received a new exception for assessment."],
  ["Handover completed", "The next shift has confirmed the operational handover."],
] as const;

function delay(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Request aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

export type DepartmentDashboardResult =
  | { id: "cane"; updatedAt: string; kind: "cane"; data: CaneDashboardData }
  | { id: "prod"; updatedAt: string; kind: "production"; data: ProductionDashboardData }
  | { id: "ht"; updatedAt: string; kind: "ht"; data: HtDashboardData }
  | { id: "inv"; updatedAt: string; kind: "inventory"; data: InventoryDashboardData }
  | { id: "cmd"; updatedAt: string; kind: "management"; data: ManagementDashboardData }
  | { id: "fi"; updatedAt: string; kind: "finance"; data: FinanceDashboardData };

export async function fetchDepartmentDashboard(
  id: PanelId,
  signal?: AbortSignal,
): Promise<DepartmentDashboardResult> {
  if (id === "cane") {
    const data = await callFrappeMethod<CaneDashboardData>("sugar360.sugar_360.cane.get_cane_dashboard_data", {}, signal);
    return { id, updatedAt: new Date().toISOString(), kind: "cane", data };
  }
  if (id === "prod") {
    const data = await callFrappeMethod<ProductionDashboardData>(
      "sugar360.sugar_360.production.get_production_dashboard_data",
      {},
      signal,
    );
    return { id, updatedAt: new Date().toISOString(), kind: "production", data };
  }
  if (id === "ht") {
    const data = await callFrappeMethod<HtDashboardData>("sugar360.sugar_360.ht.get_ht_dashboard_data", {}, signal);
    return { id, updatedAt: new Date().toISOString(), kind: "ht", data };
  }
  if (id === "inv") {
    const data = await callFrappeMethod<InventoryDashboardData>(
      "sugar360.sugar_360.inventory.get_inventory_dashboard_data",
      {},
      signal,
    );
    return { id, updatedAt: new Date().toISOString(), kind: "inventory", data };
  }
  if (id === "cmd") {
    const data = await callFrappeMethod<ManagementDashboardData>(
      "sugar360.sugar_360.management.get_management_dashboard_data",
      {},
      signal,
    );
    return { id, updatedAt: new Date().toISOString(), kind: "management", data };
  }

  const data = await callFrappeMethod<FinanceDashboardData>(
    "sugar360.sugar_360.finance.get_finance_dashboard_data",
    {},
    signal,
  );
  return { id, updatedAt: new Date().toISOString(), kind: "finance", data };
}

export async function fetchDepartmentUpdates(
  id: PanelId,
  cursor: number,
  signal?: AbortSignal,
): Promise<UpdatePage> {
  if (id === "cane") {
    // Real, paginated feed of the latest submitted weighbridge slips.
    return callFrappeMethod<CaneActivityPage>("sugar360.sugar_360.cane.get_cane_activity_page", { cursor }, signal);
  }

  await delay(280, signal);
  const pageSize = 4;
  const items = Array.from({ length: pageSize }, (_, offset) => {
    const index = cursor + offset;
    // Safe: index % updateMessages.length is always in bounds.
    const message = updateMessages[index % updateMessages.length]!;
    return {
      id: `${id}-${index}`,
      title: message[0],
      detail: `${departmentNames[id]} · ${message[1]}`,
      time: `${8 + Math.floor(index / 2)}:${index % 2 === 0 ? "15" : "45"}`,
      severity: index % 7 === 1 ? "critical" : index % 3 === 1 ? "warning" : "normal",
      acknowledged: false,
    } satisfies UpdateItem;
  });

  return { items, nextCursor: cursor + pageSize < 12 ? cursor + pageSize : undefined };
}

export async function acknowledgeUpdate(id: string) {
  await delay(240);
  return id;
}
