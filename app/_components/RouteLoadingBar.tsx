"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function RouteLoadingBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isTransitioning, setIsTransitioning] = useState(false);

  // Check if current route is part of marketing / landing website
  const isMarketingRoute =
    pathname === "/" ||
    pathname.startsWith("/feature") ||
    pathname === "/onboarding" ||
    pathname === "/login" ||
    pathname === "/demo" ||
    pathname === "/forgot-password";

  // Disable loading screen completely for POS, Staff Dashboard, Menu & Checkout routes
  const isAppRoute =
    pathname.startsWith("/staff") ||
    pathname.startsWith("/menu") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/pos") ||
    pathname.startsWith("/kds");

  // Force scroll position to top (0, 0) instantly on route changes for marketing pages
  useEffect(() => {
    if (isAppRoute || !isMarketingRoute) {
      setIsTransitioning(false);
      return;
    }

    // Disable default browser scroll restoration jump
    if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    // Instantly scroll to top before revealing new page
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });

    // Hide transition curtain after scroll position is reset to top
    const timer = setTimeout(() => {
      setIsTransitioning(false);
    }, 220);

    return () => clearTimeout(timer);
  }, [pathname, searchParams, isMarketingRoute, isAppRoute]);

  // Listen to internal page routing link clicks on marketing pages
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

      // Do NOT trigger transition if navigating into POS / Staff App
      if (
        targetPath.startsWith("/staff") ||
        targetPath.startsWith("/menu") ||
        targetPath.startsWith("/checkout")
      ) {
        return;
      }

      if (targetPath !== currentPath) {
        setIsTransitioning(true);
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

  return (
    <AnimatePresence mode="wait">
      {isTransitioning && (
        <motion.div
          key="light-screen-transition-curtain"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[9999] bg-[#FAF9F6] flex items-center justify-center pointer-events-none"
        >
          {/* Minimal Elegant Accent Line Indicator */}
          <motion.div
            initial={{ scaleX: 0.4, opacity: 0.6 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-20 h-1 rounded-full bg-gradient-to-r from-[#fe5c13] via-amber-500 to-[#fe5c13] shadow-[0_0_16px_rgba(254,92,19,0.4)]"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
