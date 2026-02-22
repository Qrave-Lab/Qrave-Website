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
  if (pathname.startsWith("/login")) return "Login";
  if (pathname.startsWith("/onboarding")) return "Sign In";
  if (pathname.startsWith("/forgot-password")) return "Sign In";
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

const isAuthPath = (pathname: string) =>
  pathname.startsWith("/login") ||
  pathname.startsWith("/onboarding") ||
  pathname.startsWith("/forgot-password");

export default function TitleManager() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [restaurantName, setRestaurantName] = useState<string>("Qrave");
  const [restaurantLogo, setRestaurantLogo] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("restaurant_name");
    if (stored) setRestaurantName(stored);
    const storedLogo =
      localStorage.getItem("restaurant_logo_url") ||
      localStorage.getItem("restaurant_logo") ||
      "";
    if (storedLogo) setRestaurantLogo(storedLogo);

    if (!pathname?.startsWith("/staff")) return;

    let cancelled = false;
    api<{ restaurant?: string; logo_url?: string | null; logo_version?: number | null }>("/api/admin/me")
      .then((res) => {
        if (cancelled) return;
        const name = res?.restaurant?.trim();
        if (name) {
          setRestaurantName(name);
          localStorage.setItem("restaurant_name", name);
        }
        if (res?.logo_url) {
          const suffix = res.logo_version ? `?v=${res.logo_version}` : "";
          const logo = `${res.logo_url}${suffix}`;
          setRestaurantLogo(logo);
          localStorage.setItem("restaurant_logo_url", logo);
        }
      })
      .catch(() => {
      });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    if (!pathname) return;
    if (isAuthPath(pathname)) return;
    if (!pathname.startsWith("/menu") && !pathname.startsWith("/checkout")) return;

    const restaurantID =
      searchParams?.get("restaurant") ||
      (typeof window !== "undefined" ? localStorage.getItem("restaurant_id") : null);
    if (!restaurantID) return;

    let cancelled = false;
    api<{ logo_url?: string | null }>(`/public/restaurants/${restaurantID}/logo`)
      .then((res) => {
        if (cancelled || !res?.logo_url) return;
        setRestaurantLogo(res.logo_url);
        if (typeof window !== "undefined") {
          localStorage.setItem("restaurant_logo_url", res.logo_url);
        }
      })
      .catch(() => {
      });

    return () => {
      cancelled = true;
    };
  }, [pathname, searchParams]);

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

    const base = isAuthPath(pathname) ? "Qrave" : restaurantName;
    return `${base} | ${label}${tableSuffix}`;
  }, [pathname, searchParams, restaurantName]);

  useEffect(() => {
    if (!title) return;
    document.title = title;
  }, [title]);

  useEffect(() => {
    if (!pathname) return;
    const href = isAuthPath(pathname) || !restaurantLogo ? "/favicon.ico" : restaurantLogo;

    let icon = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
    if (!icon) {
      icon = document.createElement("link");
      icon.rel = "icon";
      document.head.appendChild(icon);
    }
    icon.href = href;
  }, [pathname, restaurantLogo]);

  return null;
}
