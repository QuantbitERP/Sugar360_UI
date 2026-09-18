import { Factory, Package, Sprout, Truck, Wallet, Zap } from "lucide-react";

export type PanelId = "cmd" | "cane" | "prod" | "ht" | "inv" | "fi";
export type DepartmentPath =
  | "/management"
  | "/cane-agriculture"
  | "/production"
  | "/harvesting-transport"
  | "/inventory"
  | "/finance-sales";

export type NavItem = {
  id: PanelId;
  label: string;
  dept: string;
  icon: typeof Zap;
  group: string;
  to: DepartmentPath;
};

export const NAV: NavItem[] = [
  {
    id: "cmd",
    label: "MD / Management",
    dept: "Level 1 Executive View",
    icon: Zap,
    group: "Top Management",
    to: "/management",
  },
  {
    id: "cane",
    label: "Cane & Agriculture",
    dept: "Receiving & Forecast",
    icon: Sprout,
    group: "Operations",
    to: "/cane-agriculture",
  },
  {
    id: "prod",
    label: "Production",
    dept: "Sugar & By-products",
    icon: Factory,
    group: "Operations",
    to: "/production",
  },
  {
    id: "ht",
    label: "H&T",
    dept: "Harvesting & Transport",
    icon: Truck,
    group: "Operations",
    to: "/harvesting-transport",
  },
  {
    id: "inv",
    label: "Inventory",
    dept: "Stock & Fuel / Diesel",
    icon: Package,
    group: "Business",
    to: "/inventory",
  },
  {
    id: "fi",
    label: "Finance & Sales",
    dept: "Cash Flow & Revenue",
    icon: Wallet,
    group: "Business",
    to: "/finance-sales",
  },
];
