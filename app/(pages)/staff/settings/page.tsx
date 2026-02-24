"use client";

import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bike,
  ClipboardList,
  ChefHat,
  CreditCard,
  Globe,
  TicketPercent,
  Palette,
  PlusCircle,
  Printer,
  Receipt,
  Store,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import StaffSidebar from "../../../components/StaffSidebar";
import { api } from "@/app/lib/api";

type AdminMeResponse = {
  role?: string;
  currency?: string;
  theme_config?: {
    role_access?: Record<string, Record<string, boolean>>;
  };
};

type LocationOption = {
  restaurant_id: string;
  restaurant: string;
};

type BranchMeta = {
  restaurant_id: string;
  address?: string | null;
};

type NavCard = {
  title: string;
  subtitle: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  show?: boolean;
  disabled?: boolean;
  disabledHint?: string;
};

function SettingsNavCard({ title, subtitle, href, icon: Icon, disabled, disabledHint }: NavCard) {
  const content = (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-4">
        <div className="mt-0.5 rounded-2xl bg-slate-100 p-3 text-slate-700">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-base font-bold text-slate-900">{title}</p>
          <p className="mt-1 text-sm text-slate-500 leading-relaxed">{subtitle}</p>
          {disabled && disabledHint ? (
            <p className="mt-1.5 text-xs font-semibold text-amber-700">{disabledHint}</p>
          ) : null}
        </div>
      </div>
      <ArrowRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-700" />
    </div>
  );

  if (disabled) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm opacity-75 cursor-not-allowed">
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg"
    >
      {content}
    </Link>
  );
}

function SettingsHubSkeleton() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse">
      <div className="mb-5 space-y-2">
        <div className="h-5 w-40 rounded bg-slate-200" />
        <div className="h-4 w-72 rounded bg-slate-100" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 9 }).map((_, idx) => (
          <div key={idx} className="rounded-3xl border border-slate-200 bg-white p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="h-11 w-11 rounded-2xl bg-slate-100" />
                <div className="space-y-2">
                  <div className="h-4 w-36 rounded bg-slate-200" />
                  <div className="h-3 w-48 rounded bg-slate-100" />
                </div>
              </div>
              <div className="h-5 w-5 rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [role, setRole] = useState<string>("");
  const [currency, setCurrency] = useState<string>("INR");
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [locationLabels, setLocationLabels] = useState<Record<string, string>>({});
  const [activeRestaurantId, setActiveRestaurantId] = useState<string>("");
  const [isSwitchingLocation, setIsSwitchingLocation] = useState(false);
  const [planCode, setPlanCode] = useState<string>("monthly_499");
  const [branchCount, setBranchCount] = useState(1);

  useEffect(() => {
    (async () => {
      try {
        const [adminData, locRes, branchRes, billingRes] = await Promise.all([
          api<AdminMeResponse>("/api/admin/me", { method: "GET" }),
          api<{ active_restaurant_id?: string; locations?: LocationOption[] }>("/api/admin/locations", { method: "GET" }),
          api<{ branches?: BranchMeta[] }>("/api/admin/branches?include_archived=0", { method: "GET" }),
          api<{ plan?: string }>("/api/admin/billing/status", { method: "GET" }),
        ]);

        const nextRole = String(adminData.role || "").toLowerCase();
        const roleAccess = adminData?.theme_config?.role_access;
        if (nextRole && nextRole !== "owner") {
          const allowed = roleAccess?.[nextRole]?.settings;
          if (allowed === false && typeof window !== "undefined") {
            toast.error("Settings access disabled for your role");
            router.replace("/staff");
            return;
          }
        }

        const byId: Record<string, string> = {};
        for (const b of branchRes?.branches || []) {
          const addr = String(b.address || "").trim();
          if (addr) byId[b.restaurant_id] = addr;
        }

        setRole(nextRole);
        setCurrency(String(adminData.currency || "INR"));
        setLocations(locRes?.locations || []);
        setLocationLabels(byId);
        setActiveRestaurantId(locRes?.active_restaurant_id || "");
        setPlanCode(String(billingRes?.plan || "monthly_499"));
        setBranchCount((branchRes?.branches || []).length || 1);
      } catch {
        toast.error("Failed to load settings");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [router]);

  const switchLocationFromSettings = async (nextRestaurantId: string) => {
    if (!nextRestaurantId || nextRestaurantId === activeRestaurantId || isSwitchingLocation) return;
    setIsSwitchingLocation(true);
    try {
      await api("/api/admin/locations/switch", {
        method: "POST",
        body: JSON.stringify({ restaurant_id: nextRestaurantId }),
      });
      setActiveRestaurantId(nextRestaurantId);
      router.replace("/staff/settings");
      router.refresh();
    } catch {
      toast.error("Failed to switch branch");
      setIsSwitchingLocation(false);
    }
  };

  const normalizedPlan = String(planCode || "").toLowerCase();
  const isPremiumPlan =
    normalizedPlan === "monthly_999" ||
    normalizedPlan === "monthly_1499" ||
    normalizedPlan === "yearly_10999" ||
    normalizedPlan === "yearly_14999";
  const addBranchLocked = role === "owner" && !isPremiumPlan && branchCount >= 1;

  const isOwnerOrManager = role === "owner" || role === "manager";

  const cards: NavCard[] = [
    { title: "Restaurant Profile", subtitle: "Brand details, logo, hours, phone, taxes", href: "/staff/settings/profile", icon: Store, show: isOwnerOrManager },
    { title: "Floor Plan", subtitle: "Manage tables, floors, and counters", href: "/staff/settings/floor-plan", icon: Receipt, show: isOwnerOrManager },
    { title: "Team Members", subtitle: "Add, edit, and remove staff access", href: "/staff/settings/team", icon: Users, show: isOwnerOrManager },
    { title: "Devices & QR", subtitle: "POS printers and table QR tools", href: "/staff/settings/devices", icon: Printer, show: isOwnerOrManager },
    { title: "Theme Studio", subtitle: "Customize customer menu visuals", href: "/staff/settings/theme", icon: Palette, show: isOwnerOrManager },
    { title: "Offers & Coupons", subtitle: "Create deals, promo codes, and item discounts", href: "/staff/settings/offers", icon: TicketPercent, show: isOwnerOrManager },
    { title: "Delivery Zones", subtitle: "Configure delivery areas and fees by distance", href: "/staff/settings/delivery-zones", icon: Bike, show: isOwnerOrManager },
    { title: "Kitchen Capacity", subtitle: "Auto-throttle, ETA, and category load limits", href: "/staff/settings/kitchen", icon: ChefHat, show: isOwnerOrManager },
    { title: "Audit Logs", subtitle: "Track critical actions across staff and system", href: "/staff/settings/audit", icon: ClipboardList, show: isOwnerOrManager },
    {
      title: "Add New Branch",
      subtitle: "Create another branch/location",
      href: "/staff/settings/branches/add",
      icon: PlusCircle,
      show: role === "owner",
      disabled: addBranchLocked,
      disabledHint: addBranchLocked ? "To add more branches, upgrade plan" : undefined,
    },
    { title: "Role Access Control", subtitle: "Set feature access per staff role", href: "/staff/settings/access-control", icon: Users, show: role === "owner" },
    { title: "Subscription", subtitle: "Manage plan and billing status", href: "/staff/settings/subscription", icon: CreditCard, show: role === "owner" },
    { title: "Delete Account", subtitle: "Permanent account deletion", href: "/staff/settings/delete-account", icon: AlertTriangle, show: role === "owner" },
  ];

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] text-slate-900 overflow-hidden font-sans">
      <StaffSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0 z-10">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Settings Hub</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Globe className="w-3 h-3 text-slate-400" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Branch Configuration • {isLoading ? "..." : currency}
              </span>
            </div>
          </div>
          {!isLoading && locations.length > 1 && (
            <select
              value={activeRestaurantId}
              disabled={isSwitchingLocation}
              onChange={(e) => switchLocationFromSettings(e.target.value)}
              className="min-w-[320px] rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60"
            >
              {locations.map((loc) => (
                <option key={loc.restaurant_id} value={loc.restaurant_id}>
                  {locationLabels[loc.restaurant_id]
                    ? `${loc.restaurant} - ${locationLabels[loc.restaurant_id]}`
                    : loc.restaurant}
                </option>
              ))}
            </select>
          )}
        </header>

        <main className="flex-1 overflow-y-auto p-6 scroll-smooth">
          <div className="mx-auto max-w-[1400px] pb-10">
            {isLoading ? (
              <SettingsHubSkeleton />
            ) : (
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5">
                  <h2 className="text-lg font-bold text-slate-900">Manage Settings</h2>
                  <p className="text-sm text-slate-500">Open a section to manage it in its own page.</p>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {cards
                    .filter((card) => card.show !== false)
                    .map((card) => (
                      <SettingsNavCard key={card.title} {...card} />
                    ))}
                </div>
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
