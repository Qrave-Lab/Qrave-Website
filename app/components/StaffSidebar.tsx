"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Utensils,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet
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
const ME_CACHE_TTL_MS = 5 * 60 * 1000;

export default function StaffSidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [restaurantName, setRestaurantName] = useState("Restaurant");
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [billingLocked, setBillingLocked] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    const savedState = localStorage.getItem("sidebarCollapsed");
    if (savedState) {
      setIsCollapsed(JSON.parse(savedState));
    }
    setIsMounted(true);
  }, []);

  useEffect(() => {
    let isActive = true;

    const fetchMe = async () => {
      try {
        let shouldFetch = true;
        const cachedRaw = localStorage.getItem(ME_CACHE_KEY);
        if (cachedRaw) {
          try {
            const cached = JSON.parse(cachedRaw) as {
              restaurant?: string;
              logo_url?: string;
              updated_at?: number;
            };
            if (isActive) {
              setRestaurantName(cached.restaurant || "Restaurant");
              setLogoUrl(cached.logo_url || "");
            }
            if (
              typeof cached.updated_at === "number" &&
              Date.now() - cached.updated_at < ME_CACHE_TTL_MS
            ) {
              shouldFetch = false;
            }
          } catch {
            // ignore malformed cache
          }
        }

        if (!shouldFetch) return;

        const me = await api<{
          restaurant?: string;
          logo_url?: string | null;
          logo_version?: number | null;
        }>("/api/admin/me");
        if (!isActive) return;
        const suffix = me?.logo_version ? `?v=${me.logo_version}` : "";
        const nextRestaurant = me?.restaurant || "Restaurant";
        const nextLogo = me?.logo_url ? `${me.logo_url}${suffix}` : "";
        setRestaurantName(nextRestaurant);
        setLogoUrl(nextLogo);
        localStorage.setItem(
          ME_CACHE_KEY,
          JSON.stringify({
            restaurant: nextRestaurant,
            logo_url: nextLogo,
            updated_at: Date.now(),
          })
        );
      } catch {
        if (!isActive) return;
        setRestaurantName("Restaurant");
        setLogoUrl("");
      }
    };

    fetchMe();
    return () => {
      isActive = false;
    };
  }, []);

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
    window.location.href = "/staff/settings/subscription";
  }, [billingLocked, pathname]);

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
        window.location.href = "/login";
      }
    }
  };

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem("sidebarCollapsed", JSON.stringify(newState));
  };

  if (!isMounted) return null; 

  const visibleSections = billingLocked
    ? sidebarItems
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => item.href === "/staff/settings"),
      }))
      .filter((section) => section.items.length > 0)
    : sidebarItems;

  return (
    <motion.div
      initial={false} 
      animate={{ width: isCollapsed ? 80 : 260 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="h-screen bg-white border-r border-gray-200 flex flex-col relative z-20 shrink-0"
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
            <p className="text-[10px] text-gray-500 font-medium">Manager View</p>
          </motion.div>
        )}
      </div>

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
        className="absolute -right-3 top-20 bg-white border border-gray-200 text-gray-500 hover:text-gray-900 p-1 rounded-full shadow-sm hover:shadow-md transition-all z-30"
      >
        {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </motion.div>
  );
}
