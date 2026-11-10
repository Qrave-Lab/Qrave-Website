"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type Phase = "idle" | "loading" | "done";

/*
 * Marketing-site navigation feedback: a thin saffron line along the top edge
 * grows while the next page loads and completes when it arrives. It never
 * covers the page.
 */
export default function RouteLoadingBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [phase, setPhase] = useState<Phase>("idle");

  // Check if current route is part of marketing / landing website
  const isMarketingRoute =
    pathname === "/" ||
    pathname.startsWith("/feature") ||
    pathname === "/onboarding" ||
    pathname === "/login" ||
    pathname === "/demo" ||
    pathname === "/forgot-password";

  // Disable the bar completely for POS, Staff Dashboard, Menu & Checkout routes
  const isAppRoute =
    pathname.startsWith("/staff") ||
    pathname.startsWith("/menu") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/pos") ||
    pathname.startsWith("/kds");

  // On route change: reset scroll to the top (marketing pages) and finish the bar.
  useEffect(() => {
    if (isAppRoute || !isMarketingRoute) {
      setPhase("idle");
      return;
    }

    // Disable default browser scroll restoration jump
    if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    // Instantly scroll to top on arrival, unless navigating to an anchor hash
    if (typeof window !== "undefined" && !window.location.hash) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    }

    setPhase((p) => (p === "loading" ? "done" : p));
    const timer = setTimeout(() => setPhase("idle"), 500);
    return () => clearTimeout(timer);
  }, [pathname, searchParams, isMarketingRoute, isAppRoute]);

  // Start the bar when an internal link to another marketing page is clicked
  useEffect(() => {
    if (isAppRoute || !isMarketingRoute) return;

    const handleLinkClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href) return;

      // Ignore external links, mailto, tel, anchor hashes (#), and target="_blank"
      if (
        href.startsWith("http") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("#") ||
        target.target === "_blank"
      ) {
        return;
      }

      const currentPath = window.location.pathname;
      const targetPath = href.split("?")[0].split("#")[0];

      // Do NOT show the bar when navigating into POS / Staff App
      if (
        targetPath.startsWith("/staff") ||
        targetPath.startsWith("/menu") ||
        targetPath.startsWith("/checkout")
      ) {
        return;
      }

      if (targetPath !== currentPath) {
        setPhase("loading");
      }
    };

    document.addEventListener("click", handleLinkClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleLinkClick, { capture: true });
    };
  }, [isMarketingRoute, isAppRoute]);

  // If in POS / Staff app, render nothing
  if (isAppRoute || !isMarketingRoute) {
    return null;
  }

  const style: React.CSSProperties =
    phase === "loading"
      ? { transform: "scaleX(0.85)", opacity: 1, transition: "transform 1400ms cubic-bezier(0.1, 0.6, 0.2, 1)" }
      : phase === "done"
        ? {
            transform: "scaleX(1)",
            opacity: 0,
            transition: "transform 180ms ease-out, opacity 260ms ease-out 180ms",
          }
        : { transform: "scaleX(0)", opacity: 0, transition: "none" };

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-0.5 motion-reduce:hidden"
    >
      <div className="h-full origin-left bg-[#fe5c13]" style={style} />
    </div>
  );
}
