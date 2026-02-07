"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { api } from "@/app/lib/api";

const getTableFromPath = (pathname: string) => {
  const parts = pathname.split("/").filter(Boolean);
  const tIdx = parts.indexOf("t");
  if (tIdx !== -1 && parts[tIdx + 1]) return parts[tIdx + 1];
  const menuIdx = parts.indexOf("menu");
  if (menuIdx !== -1 && parts[menuIdx + 1] === "t" && parts[menuIdx + 2]) {
    return parts[menuIdx + 2];
  }
  return null;
};

const getSectionLabel = (pathname: string) => {
  if (pathname.startsWith("/staff/menu")) return "Menu";
  if (pathname.startsWith("/staff/analytics")) return "Analytics";
  if (pathname.startsWith("/staff/settings/qr-codes")) return "Settings";
  if (pathname.startsWith("/staff/settings/EditStaff")) return "Settings";
  if (pathname.startsWith("/staff/settings/AddStaff")) return "Settings";
  if (pathname.startsWith("/staff/settings")) return "Settings";
  if (pathname.startsWith("/staff/table")) return "Table";
  if (pathname.startsWith("/staff")) return "Dashboard";
  if (pathname.startsWith("/checkout")) return "Checkout";
  if (pathname.startsWith("/menu")) return "Menu";
  return "";
};

export default function TitleManager() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [restaurantName, setRestaurantName] = useState<string>("Qrave");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("restaurant_name");
    if (stored) setRestaurantName(stored);

    if (!pathname?.startsWith("/staff")) return;

    let cancelled = false;
    api<{ restaurant?: string }>("/api/admin/me")
      .then((res) => {
        if (cancelled) return;
        const name = res?.restaurant?.trim();
        if (name) {
          setRestaurantName(name);
          localStorage.setItem("restaurant_name", name);
        }
      })
      .catch(() => {
      });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const title = useMemo(() => {
    if (!pathname) return "";
    const label = getSectionLabel(pathname);
    if (!label) return "";

    let table =
      searchParams?.get("table") ||
      searchParams?.get("t") ||
      searchParams?.get("table_id") ||
      getTableFromPath(pathname) ||
      (typeof window !== "undefined"
        ? localStorage.getItem("table_number") || localStorage.getItem("table")
        : null);

    const needsTable = pathname.startsWith("/menu") || pathname.startsWith("/checkout");
    const tableSuffix = needsTable && table ? ` | Table ${table}` : "";

    return `${restaurantName} | ${label}${tableSuffix}`;
  }, [pathname, searchParams, restaurantName]);

  useEffect(() => {
    if (!title) return;
    document.title = title;
  }, [title]);

  return null;
}
