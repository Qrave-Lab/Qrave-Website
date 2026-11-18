"use client";

import React, { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bike,
  ChefHat,
  ChevronRight,
  ClipboardList,
  CreditCard,
  KeyRound,
  LayoutGrid,
  ListChecks,
  Lock,
  MessageSquare,
  Palette,
  PlusCircle,
  QrCode,
  Receipt,
  RefreshCw,
  Search,
  ShieldCheck,
  Sliders,
  Store,
  TicketPercent,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import StaffSidebar from "../../../components/StaffSidebar";
import { api } from "@/app/lib/api";
import { CustomSelect } from "@/app/components/ui/CustomSelect";
import { isArMenuPath, isArMenuPlan, isFoodCourtStallPath, isFoodCourtStallPlan, isOpsPath, planAllowsMoreBranches, planHasOps } from "@/app/lib/plans";

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

type GroupId = "restaurant" | "payments" | "team" | "system" | "account";

type NavCard = {
  title: string;
  subtitle: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  group: GroupId;
  show?: boolean;
  disabled?: boolean;
  disabledHint?: string;
  danger?: boolean;
};

const GROUPS: { id: GroupId; title: string; description: string }[] = [
  { id: "restaurant", title: "Restaurant", description: "How your place looks, runs and serves guests" },
  { id: "payments", title: "Payments and billing", description: "How you get paid, what bills look like, and discounts" },
  { id: "team", title: "Team and security", description: "Who can sign in, what they can do, and what they did" },
  { id: "system", title: "Devices and system", description: "Printers, QR codes, offline sync and setup" },
  { id: "account", title: "Account", description: "Your plan, branches and help" },
];

function SettingsNavCard({ title, subtitle, href, icon: Icon, disabled, disabledHint, danger }: NavCard) {
  const content = (
    <>
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
          danger
            ? "bg-rose-50 text-rose-600"
            : disabled
              ? "bg-[#F3F3EF] text-[#9CA3AF]"
              : "bg-[#F3F3EF] text-[#4B5563] group-hover:bg-[#FFF4EC] group-hover:text-[#fe5c13]"
        }`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-[15px] font-semibold tracking-[-0.01em] ${danger ? "text-rose-700" : disabled ? "text-[#6B7280]" : "text-[#0F1117]"}`}>
          {title}
        </span>
        <span className="mt-0.5 block text-[13px] leading-relaxed text-[#6B7280]">{subtitle}</span>
        {disabled && disabledHint ? (
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-200/70 bg-amber-50 px-2 py-0.5 text-[12px] font-medium text-amber-800">
            <Lock className="h-3 w-3" /> {disabledHint}
          </span>
        ) : null}
      </span>
      {!disabled && (
        <ChevronRight className="mt-2.5 h-4 w-4 shrink-0 text-[#C4C4BE] transition-colors group-hover:text-[#0F1117]" />
      )}
    </>
  );

  if (disabled) {
    return (
      <div
        aria-disabled="true"
        className="flex cursor-not-allowed items-start gap-4 rounded-2xl border border-dashed border-[#E8E8E3] bg-[#FAFAF7] p-5"
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={`group flex items-start gap-4 rounded-2xl border bg-white p-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fe5c13]/40 focus-visible:ring-offset-2 ${
        danger ? "border-[#E8E8E3] hover:border-rose-200" : "border-[#E8E8E3] hover:border-[#D6D6CF]"
      }`}
    >
      {content}
    </Link>
  );
}

function SettingsHubSkeleton() {
  return (
    <div className="animate-pulse space-y-10">
      {[6, 3].map((n, g) => (
        <section key={g}>
          <div className="mb-4 h-4 w-32 rounded bg-[#E8E8E3]" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: n }).map((_, idx) => (
              <div key={idx} className="flex items-start gap-4 rounded-2xl border border-[#E8E8E3] bg-white p-5">
                <div className="h-10 w-10 rounded-xl bg-[#F3F3EF]" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3.5 w-36 rounded bg-[#E8E8E3]" />
                  <div className="h-3 w-52 rounded bg-[#F3F3EF]" />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [role, setRole] = useState<string>("");
  const [roleAccess, setRoleAccess] = useState<Record<string, Record<string, boolean>> | null>(null);
  const [currency, setCurrency] = useState<string>("INR");
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [locationLabels, setLocationLabels] = useState<Record<string, string>>({});
  const [activeRestaurantId, setActiveRestaurantId] = useState<string>("");
  const [isSwitchingLocation, setIsSwitchingLocation] = useState(false);
  const [planCode, setPlanCode] = useState<string>("monthly_499");
  const [branchCount, setBranchCount] = useState(1);
  const [query, setQuery] = useState("");

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
        setRoleAccess(roleAccess || null);
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
    planAllowsMoreBranches(normalizedPlan);
  const addBranchLocked = role === "owner" && !isPremiumPlan && branchCount >= 1;

  const isOwnerOrManager = role === "owner" || role === "manager";
  const canAccess = (feature: string, fallback: boolean) => {
    if (role === "owner") return true;
    if (!role || !roleAccess) return fallback;
    const allowed = roleAccess?.[role]?.[feature];
    if (typeof allowed === "boolean") return allowed;
    return fallback;
  };

  const cards: NavCard[] = [
    { group: "restaurant", title: "Restaurant profile", subtitle: "Name, logo, opening hours, phone and tax details", href: "/staff/settings/profile", icon: Store, show: canAccess("profile", isOwnerOrManager) },
    { group: "restaurant", title: "Floor plan", subtitle: "Tables, floors and counters", href: "/staff/settings/floor-plan", icon: LayoutGrid, show: canAccess("floor_plan", isOwnerOrManager) },
    { group: "restaurant", title: "Theme studio", subtitle: "How your menu looks to guests", href: "/staff/settings/theme", icon: Palette, show: canAccess("theme", isOwnerOrManager) },
    { group: "restaurant", title: "Menu health", subtitle: "Missing details, weak dishes and item trends", href: "/staff/menu/health", icon: Activity, show: canAccess("insights", isOwnerOrManager) },
    { group: "restaurant", title: "Kitchen capacity", subtitle: "Order limits, wait times and load by category", href: "/staff/settings/kitchen", icon: ChefHat, show: canAccess("kitchen_capacity", isOwnerOrManager) },
    { group: "restaurant", title: "FSSAI and compliance", subtitle: "FSSAI licence number printed on every bill", href: "/staff/settings/compliance", icon: Receipt, show: isOwnerOrManager },
    { group: "restaurant", title: "Delivery zones", subtitle: "Where you deliver and what it costs by distance", href: "/staff/settings/delivery-zones", icon: Bike, show: canAccess("delivery", isOwnerOrManager) },

    { group: "payments", title: "Payments and billing controls", subtitle: "UPI or Razorpay, discount limits, bill lock and shift cash", href: "/staff/settings/billing", icon: CreditCard, show: isOwnerOrManager },
    { group: "payments", title: "Receipts", subtitle: "Bill templates and print layout", href: "/staff/settings/receipt", icon: Receipt, show: canAccess("receipts", isOwnerOrManager) },
    { group: "payments", title: "Offers and coupons", subtitle: "Deals, promo codes and item discounts", href: "/staff/settings/offers", icon: TicketPercent, show: canAccess("offers", isOwnerOrManager) },

    { group: "team", title: "Team members", subtitle: "Add, edit and remove staff", href: "/staff/settings/team", icon: Users, show: canAccess("team", isOwnerOrManager) },
    { group: "team", title: "Role access", subtitle: "Choose what each staff role can open", href: "/staff/settings/access-control", icon: KeyRound, show: role === "owner" },
    { group: "team", title: "Security", subtitle: "Two-factor sign-in for your account", href: "/staff/settings/security", icon: ShieldCheck, show: role === "owner" || role === "manager" || role === "cashier" },
    { group: "team", title: "Audit log", subtitle: "Important actions by staff and the system", href: "/staff/settings/audit", icon: ClipboardList, show: canAccess("audit", isOwnerOrManager) },
    { group: "team", title: "Privacy and data", subtitle: "Export or erase a customer's data, and retention rules", href: "/staff/settings/privacy", icon: Lock, show: role === "owner" || role === "manager" },

    { group: "system", title: "Devices and QR codes", subtitle: "Receipt printers and table QR codes", href: "/staff/settings/devices", icon: QrCode, show: canAccess("devices", isOwnerOrManager) },
    { group: "system", title: "Sync queue", subtitle: "Orders waiting to sync after going offline", href: "/staff/settings/sync-queue", icon: RefreshCw, show: true },
    { group: "system", title: "Operations control", subtitle: "Turn features on or off and roll them out", href: "/staff/operations", icon: Sliders, show: role === "owner" },
    { group: "system", title: "Setup guide", subtitle: "Menu, tables, QR codes, payments and GST in five steps", href: "/staff/setup", icon: ListChecks, show: role === "owner" || role === "manager" },

    { group: "account", title: "Subscription", subtitle: "Your plan and payment status", href: "/staff/settings/subscription", icon: CreditCard, show: role === "owner" },
    {
      group: "account",
      title: "Add a branch",
      subtitle: "Set up another location",
      href: "/staff/settings/branches/add",
      icon: PlusCircle,
      show: role === "owner",
      disabled: addBranchLocked,
      disabledHint: addBranchLocked ? "Upgrade your plan to add branches" : undefined,
    },
    { group: "account", title: "Feedback and issues", subtitle: "Report a bug, request a feature or tell us what you think", href: "/staff/settings/feedback", icon: MessageSquare, show: canAccess("feedback", true) },
    { group: "account", title: "Delete account", subtitle: "Permanently delete your account and data", href: "/staff/settings/delete-account", icon: AlertTriangle, show: role === "owner", danger: true },
  ];

  // Food court stalls and AR Menu plans only manage their digital menu.
  const visibleCards = isFoodCourtStallPlan(planCode)
    ? cards.filter((c) => isFoodCourtStallPath(c.href))
    : isArMenuPlan(planCode)
    ? cards.filter((c) => isArMenuPath(c.href))
    : planCode && !planHasOps(planCode)
    ? cards.filter((c) => !isOpsPath(c.href)) // Ordering and AR plans: no operations tools
    : cards;

  const q = query.trim().toLowerCase();
  const shown = visibleCards.filter(
    (c) =>
      c.show !== false &&
      (!q || c.title.toLowerCase().includes(q) || c.subtitle.toLowerCase().includes(q)),
  );
  const activeLocation = locations.find((l) => l.restaurant_id === activeRestaurantId);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#FAFAF7] text-[#0F1117]">
      <StaffSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-[#E8E8E3] bg-white px-8 py-4">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <div className="flex min-w-0 items-center gap-3">
              <h1 className="text-[22px] font-bold leading-none tracking-[-0.02em] text-[#0F1117]">Settings</h1>
              {!isLoading && activeLocation && locations.length <= 1 && (
                <span className="truncate rounded-full bg-[#F3F3EF] px-2.5 py-1 text-[12px] font-medium leading-none text-[#6B7280]">
                  {activeLocation.restaurant}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search settings"
                  aria-label="Search settings"
                  className="h-10 w-full rounded-xl border border-[#E8E8E3] bg-white pl-9 pr-8 text-[13px] text-[#0F1117] outline-none transition-colors placeholder:text-[#9CA3AF] hover:border-[#D6D6CF] focus:border-[#fe5c13]"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-[#9CA3AF] hover:bg-[#F3F3EF] hover:text-[#0F1117]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {!isLoading && locations.length > 1 && (
                <CustomSelect
                  value={activeRestaurantId}
                  onChange={(val: string) => switchLocationFromSettings(val)}
                  options={locations.map((loc) => ({
                    value: loc.restaurant_id,
                    label: locationLabels[loc.restaurant_id]
                      ? `${loc.restaurant}, ${locationLabels[loc.restaurant_id]}`
                      : loc.restaurant,
                  }))}
                  placeholder="Choose a branch"
                  theme="orange"
                  className={`!w-64 transition-opacity ${isSwitchingLocation ? "pointer-events-none opacity-60" : ""}`}
                  buttonClassName="!h-10 !min-h-10 !py-0 !px-3.5 !text-[13px] !bg-white !border-[#E8E8E3] hover:!border-[#D6D6CF]"
                />
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="px-8 py-6 pb-12">
            {isLoading ? (
              <SettingsHubSkeleton />
            ) : shown.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
                <Search className="h-6 w-6 text-[#C4C4BE]" />
                <p className="mt-3 text-[15px] font-semibold text-[#0F1117]">No settings match &ldquo;{query.trim()}&rdquo;</p>
                <p className="mt-1 text-[13px] text-[#6B7280]">Try a word like printer, tax, staff or QR.</p>
              </div>
            ) : (
              <div className="space-y-10">
                {GROUPS.map((g) => {
                  const list = shown.filter((c) => c.group === g.id);
                  if (list.length === 0) return null;
                  return (
                    <section key={g.id} aria-labelledby={`settings-${g.id}`}>
                      <div className="mb-4">
                        <h2 id={`settings-${g.id}`} className="text-[17px] font-semibold tracking-[-0.01em] text-[#0F1117]">
                          {g.title}
                        </h2>
                        <p className="mt-0.5 text-[13px] text-[#6B7280]">{g.description}</p>
                      </div>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {list.map((card) => (
                          <SettingsNavCard key={card.title} {...card} />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
