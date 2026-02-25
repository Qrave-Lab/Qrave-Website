"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Utensils,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FileSpreadsheet,
  Bike,
  Check,
  Loader2,
  MapPin,
} from "lucide-react";
import { api } from "@/app/lib/api";

type SidebarItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
};

type SidebarSection = {
  category: string;
  items: SidebarItem[];
};

type LocationOption = {
  restaurant_id: string;
  restaurant: string;
  role: string;
  currency: string;
};
type BranchMeta = {
  restaurant_id: string;
  address?: string | null;
};

type RoleAccessConfig = Record<string, Record<string, boolean>>;

const sidebarItems: SidebarSection[] = [
  {
    category: "Overview",
    items: [
      { label: "Floor & Tables", href: "/staff", icon: LayoutDashboard },
    ]
  },
  {
    category: "Management",
    items: [
      { label: "Menu & Inventory", href: "/staff/menu", icon: Utensils, description: "Set Qty, 86 Items" },
      { label: "Takeaway & Delivery", href: "/staff/takeaway", icon: Bike, description: "Walk-in & delivery orders" },
      { label: "Sales & Reports", href: "/staff/analytics", icon: BarChart3, description: "Daily/Monthly, CSV Export" },
    ]
  },
  {
    category: "System",
    items: [
      { label: "Settings", href: "/staff/settings", icon: Settings },
    ]
  }
];

const ME_CACHE_KEY = "staff_sidebar_me_cache_v1";
const LOCATION_CACHE_KEY = "staff_sidebar_locations_cache_v1";
const PROFILE_UPDATED_EVENT = "qrave:profile-updated";

function hasFeatureAccess(role: string, roleAccess: RoleAccessConfig | null, feature: string): boolean {
  const r = String(role || "").toLowerCase();
  if (!r || r === "owner") return true;
  if (!roleAccess) return true;
  const byRole = roleAccess[r];
  if (!byRole) return true;
  if (typeof byRole[feature] === "boolean") return byRole[feature];
  return true;
}

export default function StaffSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const savedState = localStorage.getItem("sidebarCollapsed");
      return savedState ? Boolean(JSON.parse(savedState)) : false;
    } catch {
      return false;
    }
  });
  const [restaurantName, setRestaurantName] = useState("Restaurant");
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [currentRole, setCurrentRole] = useState<string>("");
  const [roleAccess, setRoleAccess] = useState<RoleAccessConfig | null>(null);
  const [billingLocked, setBillingLocked] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [locations, setLocations] = useState<LocationOption[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(LOCATION_CACHE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as { locations?: LocationOption[] };
      return Array.isArray(parsed?.locations) ? parsed.locations : [];
    } catch {
      return [];
    }
  });
  const [locationLabels, setLocationLabels] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(LOCATION_CACHE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as { locationLabels?: Record<string, string> };
      return parsed?.locationLabels || {};
    } catch {
      return {};
    }
  });
  const [activeRestaurantId, setActiveRestaurantId] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    try {
      const raw = localStorage.getItem(LOCATION_CACHE_KEY);
      if (!raw) return "";
      const parsed = JSON.parse(raw) as { activeRestaurantId?: string };
      return String(parsed?.activeRestaurantId || "");
    } catch {
      return "";
    }
  });
  const [isSwitchingLocation, setIsSwitchingLocation] = useState(false);
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const locationDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isActive = true;
    const fetchLocations = async () => {
      try {
        const [locRes, branchRes] = await Promise.all([
          api<{ active_restaurant_id?: string; locations?: LocationOption[] }>("/api/admin/locations"),
          api<{ branches?: BranchMeta[] }>("/api/admin/branches?include_archived=0"),
        ]);
        if (!isActive) return;
        const byId: Record<string, string> = {};
        for (const b of branchRes?.branches || []) {
          const clean = String(b.address || "").trim();
          if (clean) byId[b.restaurant_id] = clean;
        }
        setLocationLabels(byId);
        setLocations(locRes?.locations || []);
        setActiveRestaurantId(locRes?.active_restaurant_id || "");
        if (typeof window !== "undefined") {
          localStorage.setItem(
            LOCATION_CACHE_KEY,
            JSON.stringify({
              locations: locRes?.locations || [],
              locationLabels: byId,
              activeRestaurantId: locRes?.active_restaurant_id || "",
            })
          );
        }
      } catch {
        if (!isActive) return;
        // keep cached values to avoid selector flicker on transient failures
      }
    };
    fetchLocations();
    const onLocationChanged = () => {
      fetchLocations();
    };
    window.addEventListener("qrave:location-changed", onLocationChanged);
    return () => {
      isActive = false;
      window.removeEventListener("qrave:location-changed", onLocationChanged);
    };
  }, []);

  // Close location dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(e.target as Node)) {
        setLocationDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    let isActive = true;

    const fetchMe = async () => {
      try {
        const cachedRaw = localStorage.getItem(ME_CACHE_KEY);
        if (cachedRaw) {
          try {
            const cached = JSON.parse(cachedRaw) as {
              restaurant?: string;
              logo_url?: string;
              role?: string;
              role_access?: RoleAccessConfig;
            };
            if (isActive) {
              setRestaurantName(cached.restaurant || "Restaurant");
              setLogoUrl(cached.logo_url || "");
              setCurrentRole(cached.role || "");
              setRoleAccess(cached.role_access || null);
            }
          } catch {
            // ignore malformed cache
          }
        }

        const me = await api<{
          restaurant?: string;
          role?: string;
          logo_url?: string | null;
          logo_version?: number | null;
          theme_config?: { role_access?: RoleAccessConfig } | null;
        }>("/api/admin/me");
        if (!isActive) return;
        const suffix = me?.logo_version ? `?v=${me.logo_version}` : "";
        const nextRestaurant = me?.restaurant || "Restaurant";
        const nextLogo = me?.logo_url ? `${me.logo_url}${suffix}` : "";
        const nextRole = me?.role || "";
        const nextRoleAccess = me?.theme_config?.role_access || null;
        setRestaurantName(nextRestaurant);
        setLogoUrl(nextLogo);
        setCurrentRole(nextRole);
        setRoleAccess(nextRoleAccess);
        localStorage.setItem(
          ME_CACHE_KEY,
          JSON.stringify({
            restaurant: nextRestaurant,
            logo_url: nextLogo,
            role: nextRole,
            role_access: nextRoleAccess,
          })
        );
      } catch {
        if (!isActive) return;
        setRestaurantName("Restaurant");
        setLogoUrl("");
        setCurrentRole("");
        setRoleAccess(null);
      }
    };

    fetchMe();
    const onStorage = (event: StorageEvent) => {
      if (event.key === ME_CACHE_KEY) fetchMe();
    };
    const onProfileUpdated = () => {
      fetchMe();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(PROFILE_UPDATED_EVENT, onProfileUpdated);
    return () => {
      isActive = false;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(PROFILE_UPDATED_EVENT, onProfileUpdated);
    };
  }, [pathname]);

  useEffect(() => {
    let isActive = true;
    const fetchBilling = async () => {
      try {
        const data = await api<{ is_access_allowed?: boolean; status?: string }>("/api/admin/billing/status");
        if (!isActive) return;
        const allowed = data?.is_access_allowed !== false;
        setBillingLocked(!allowed);
      } catch {
        if (!isActive) return;
        setBillingLocked(false);
      }
    };
    fetchBilling();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!billingLocked) return;
    if (pathname === "/staff/settings/subscription") return;
    if (pathname === "/staff/settings") return;
    if (pathname === "/staff/settings/theme") return;
    router.replace("/staff/settings/subscription");
  }, [billingLocked, pathname, router]);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);

    try {
      await api("/auth/logout", {
        method: "POST",
      });
    } catch {
      // Even if logout fails, proceed to clear local tokens.
    } finally {
      if (typeof window !== "undefined") {
        localStorage.removeItem("session_id");
        localStorage.removeItem("order_id");
        localStorage.removeItem("table_number");
        router.replace("/login");
      }
    }
  };

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem("sidebarCollapsed", JSON.stringify(newState));
  };

  const handleSwitchLocation = async (nextRestaurantId: string) => {
    if (!nextRestaurantId || nextRestaurantId === activeRestaurantId || isSwitchingLocation) return;
    setIsSwitchingLocation(true);
    setLocationDropdownOpen(false);
    // Optimistically update the display name right away
    const nextLoc = locations.find((l) => l.restaurant_id === nextRestaurantId);
    if (nextLoc) setRestaurantName(nextLoc.restaurant);
    try {
      await api("/api/admin/locations/switch", {
        method: "POST",
        body: JSON.stringify({ restaurant_id: nextRestaurantId }),
      });
      // Flush all per-session caches so the new branch loads cleanly
      localStorage.setItem(
        LOCATION_CACHE_KEY,
        JSON.stringify({
          locations,
          locationLabels,
          activeRestaurantId: nextRestaurantId,
        })
      );
      localStorage.removeItem(ME_CACHE_KEY);
      localStorage.removeItem("restaurant_name");
      localStorage.removeItem("restaurant_logo_url");
      localStorage.removeItem("session_id");
      localStorage.removeItem("order_id");
      localStorage.removeItem("table_number");
      // Hard redirect — soft router.replace on the same route doesn't
      // reliably flush server-component data after a session cookie change.
      window.location.href = "/staff";
    } catch {
      setIsSwitchingLocation(false);
    }
  };

  const visibleSections = billingLocked
    ? sidebarItems
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => item.href === "/staff/settings"),
      }))
      .filter((section) => section.items.length > 0)
    : sidebarItems
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          const feature =
            item.href === "/staff" ? "floor" :
              item.href === "/staff/menu" ? "menu" :
                item.href === "/staff/analytics" ? "analytics" :
                  item.href === "/staff/settings" ? "settings" :
                    item.href === "/staff/takeaway" ? "takeaway" :
                      "";
          // Takeaway is for cashier, manager, owner
          if (item.href === "/staff/takeaway") {
            const r = String(currentRole || "").toLowerCase();
            return ["owner", "manager", "cashier"].includes(r);
          }
          return feature ? hasFeatureAccess(currentRole, roleAccess, feature) : true;
        }),
      }))
      .filter((section) => section.items.length > 0);
  const activeLocationLabel = (() => {
    const active = locations.find((l) => l.restaurant_id === activeRestaurantId);
    if (!active) return "No branch selected";
    const label = locationLabels[active.restaurant_id];
    return label ? `${active.restaurant} - ${label}` : active.restaurant;
  })();
  const roleViewLabel = (() => {
    const r = String(currentRole || "").trim().toLowerCase();
    if (!r || r === "owner" || r === "admin") return "Admin View";
    return `${r.charAt(0).toUpperCase()}${r.slice(1)} View`;
  })();

  return (
    <motion.div
      initial={false}
      animate={{ width: isCollapsed ? 80 : 260 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="h-screen bg-white border-r border-gray-200 flex flex-col relative z-200 pointer-events-auto shrink-0"
    >
      <div className={`h-16 flex items-center border-b border-gray-100 ${isCollapsed ? "justify-center" : "px-6"}`}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 overflow-hidden border border-gray-200 bg-white transition-all duration-300">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={`${restaurantName} logo`} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gray-900 text-white flex items-center justify-center">
              <span className="font-bold text-xs">
                {(restaurantName || "R").trim().slice(0, 1).toUpperCase()}
              </span>
            </div>
          )}
        </div>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="ml-3 overflow-hidden whitespace-nowrap"
          >
            <h1 className="text-sm font-bold text-gray-900">{restaurantName}</h1>
            <p className="text-[10px] text-gray-500 font-medium">{roleViewLabel}</p>
            <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-600" title={activeLocationLabel}>
              {activeLocationLabel}
            </p>
          </motion.div>
        )}
      </div>

      {!isCollapsed && locations.length > 1 && (
        <div className="px-3 py-2.5 border-b border-gray-100" ref={locationDropdownRef}>
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 px-1">Branch</p>
          <div className="relative">
            <button
              type="button"
              disabled={isSwitchingLocation}
              onClick={() => setLocationDropdownOpen((v) => !v)}
              className="w-full flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300 px-2.5 py-2 text-left transition-all disabled:opacity-60"
            >
              {isSwitchingLocation ? (
                <Loader2 className="w-3.5 h-3.5 text-slate-400 shrink-0 animate-spin" />
              ) : (
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              )}
              <span className="flex-1 text-xs font-semibold text-slate-700 truncate">
                {(() => {
                  const active = locations.find((l) => l.restaurant_id === activeRestaurantId);
                  if (!active) return "Select branch";
                  const lbl = locationLabels[active.restaurant_id];
                  return lbl ? lbl : active.restaurant;
                })()}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${locationDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {locationDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.12 }}
                  className="absolute top-full left-0 right-0 mt-1 z-300 rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 overflow-hidden"
                >
                  {locations.map((loc) => {
                    const isActive = loc.restaurant_id === activeRestaurantId;
                    const lbl = locationLabels[loc.restaurant_id];
                    const display = lbl ? lbl : loc.restaurant;
                    return (
                      <button
                        key={loc.restaurant_id}
                        type="button"
                        onClick={() => handleSwitchLocation(loc.restaurant_id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
                          isActive ? "bg-slate-900 text-white" : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <MapPin className={`w-3 h-3 shrink-0 ${isActive ? "text-white/60" : "text-slate-400"}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-[11px] font-semibold truncate ${isActive ? "text-white" : "text-slate-800"}`}>
                            {loc.restaurant}
                          </p>
                          {lbl && (
                            <p className={`text-[10px] truncate ${isActive ? "text-white/60" : "text-slate-400"}`}>
                              {lbl}
                            </p>
                          )}
                        </div>
                        {isActive && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-6">
        {visibleSections.map((section, idx) => (
          <div key={idx} className={isCollapsed ? "px-2 text-center" : "px-4"}>
            {!isCollapsed && (
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-2 whitespace-nowrap">
                {section.category}
              </h4>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={isCollapsed ? item.label : ""}
                    className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                      ${isActive
                        ? "bg-gray-900 text-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }
                      ${isCollapsed ? "justify-center px-0 py-3" : ""}
                    `}
                  >
                    <Icon className={`w-5 h-5 shrink-0 ${isActive ? "text-white" : "text-gray-500 group-hover:text-gray-900"}`} />

                    {!isCollapsed && (
                      <div className="flex-1 overflow-hidden whitespace-nowrap">
                        <span className="text-sm font-medium block">{item.label}</span>
                        {item.description && (
                          <span className={`text-[10px] block truncate ${isActive ? "text-gray-400" : "text-gray-400"}`}>
                            {item.description}
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-gray-100 space-y-2">
        {!isCollapsed && (
          <div className="bg-gray-50 rounded-lg p-3 mb-2 border border-gray-100 whitespace-nowrap overflow-hidden">
            <div className="flex items-center gap-2 mb-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-gray-700">Quick Export</span>
            </div>
            <button className="w-full text-[10px] bg-white border border-gray-200 hover:bg-gray-100 text-gray-600 font-medium py-1.5 rounded transition-colors">
              Download Daily CSV
            </button>
          </div>
        )}

        <button
          onClick={handleSignOut}
          disabled={isSigningOut}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors w-full
            ${isCollapsed ? "justify-center" : ""}
          `}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!isCollapsed && (
            <span className="text-sm font-medium whitespace-nowrap">
              {isSigningOut ? "Signing Out..." : "Sign Out"}
            </span>
          )}
        </button>
      </div>

      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 bg-white border border-gray-200 text-gray-500 hover:text-gray-900 p-1 rounded-full shadow-sm hover:shadow-md transition-all z-210"
      >
        {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </motion.div>
  );
}
