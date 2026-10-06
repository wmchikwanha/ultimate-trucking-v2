import {
  Home, UserPlus, ClipboardCheck, Crosshair, Truck, Smartphone, Users, ShieldCheck,
  Banknote, BarChart3, Store, Radio, LifeBuoy, type LucideIcon,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export const ALL_ROLES: AppRole[] = ["admin", "approver", "ops", "auditor", "customer", "supplier", "driver"];

export type ModuleId =
  | "home" | "onboarding" | "approvals" | "match" | "dispatch" | "driver" | "customer"
  | "trust" | "collections" | "insights" | "marketplace" | "telematics" | "help";

export type NavItem = {
  id: ModuleId;
  path: string;
  icon: LucideIcon;
  roles: AppRole[];
  flag: string | null;
  phase: number | null;
};

export const NAV: NavItem[] = [
  { id: "home", path: "/home", icon: Home, roles: ALL_ROLES, flag: null, phase: null },
  { id: "onboarding", path: "/onboarding/supplier", icon: UserPlus, roles: ["admin", "ops", "supplier"], flag: "phase0_supplier_onboarding", phase: 0 },
  { id: "approvals", path: "/ops/approvals", icon: ClipboardCheck, roles: ["admin", "approver", "ops", "auditor"], flag: "phase0_supplier_onboarding", phase: 0 },
  { id: "match", path: "/match", icon: Crosshair, roles: ["admin", "approver", "ops"], flag: "phase0_match_engine", phase: 0 },
  { id: "dispatch", path: "/dispatch", icon: Truck, roles: ["admin", "ops"], flag: "phase1_jobs_dispatch", phase: 1 },
  { id: "driver", path: "/driver", icon: Smartphone, roles: ["admin", "driver"], flag: "phase2_customer_apps", phase: 2 },
  { id: "customer", path: "/customer", icon: Users, roles: ["admin", "customer"], flag: "phase2_customer_apps", phase: 2 },
  { id: "trust", path: "/trust", icon: ShieldCheck, roles: ["admin", "approver", "auditor", "supplier"], flag: "phase3_trust_engine", phase: 3 },
  { id: "collections", path: "/collections", icon: Banknote, roles: ["admin", "ops", "auditor", "customer"], flag: "phase4_payments", phase: 4 },
  { id: "insights", path: "/insights", icon: BarChart3, roles: ["admin", "approver", "ops", "auditor"], flag: "phase5_analytics", phase: 5 },
  { id: "marketplace", path: "/marketplace", icon: Store, roles: ["admin", "customer", "supplier"], flag: "phase6_marketplace", phase: 6 },
  { id: "help", path: "/help", icon: LifeBuoy, roles: ALL_ROLES, flag: null, phase: null },
  { id: "telematics", path: "/telematics", icon: Radio, roles: ["admin", "ops", "customer"], flag: "phase6_telematics", phase: 6 },
];

export const navFor = (role: AppRole | null) => NAV.filter((n) => role && n.roles.includes(role));
export const navItem = (id: ModuleId) => NAV.find((n) => n.id === id)!;
