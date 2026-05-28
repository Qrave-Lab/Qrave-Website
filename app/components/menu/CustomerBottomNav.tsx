"use client";

import React from "react";
import { motion } from "framer-motion";
import { UtensilsCrossed, ClipboardList, ConciergeBell } from "lucide-react";

export type CustomerTab = "menu" | "orders" | "services";

interface CustomerBottomNavProps {
  activeTab: CustomerTab;
  onTabChange: (tab: CustomerTab) => void;
  cartItemCount?: number;
  orderingEnabled?: boolean;
}

const tabs: { id: CustomerTab; label: string; icon: React.ElementType }[] = [
  { id: "menu", label: "Menu", icon: UtensilsCrossed },
  { id: "orders", label: "Orders", icon: ClipboardList },
  { id: "services", label: "Services", icon: ConciergeBell },
];

export default function CustomerBottomNav({
  activeTab,
  onTabChange,
  cartItemCount = 0,
  orderingEnabled = true,
}: CustomerBottomNavProps) {
  return (
    <nav className="cbn-root">
      <div className="cbn-inner">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`cbn-tab ${isActive ? "cbn-tab--active" : ""}`}
              aria-label={tab.label}
            >
              {isActive && (
                <motion.div
                  layoutId="cbn-active-bg"
                  className="cbn-active-pill"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <div className="cbn-icon-wrap">
                <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
                {tab.id === "menu" && cartItemCount > 0 && (
                  <span className="cbn-badge">{cartItemCount > 9 ? "9+" : cartItemCount}</span>
                )}
              </div>
              <span className="cbn-label">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <style jsx>{`
        .cbn-root {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 70;
          padding: 0 12px env(safe-area-inset-bottom, 8px);
          pointer-events: none;
        }
        .cbn-inner {
          pointer-events: auto;
          max-width: 420px;
          margin: 0 auto 10px;
          display: flex;
          align-items: center;
          justify-content: space-around;
          background: rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(24px) saturate(1.6);
          -webkit-backdrop-filter: blur(24px) saturate(1.6);
          border-radius: 22px;
          padding: 6px 8px;
          box-shadow:
            0 4px 24px rgba(0, 0, 0, 0.08),
            0 1px 3px rgba(0, 0, 0, 0.04),
            inset 0 0 0 1px rgba(0, 0, 0, 0.06);
        }
        .cbn-tab {
          position: relative;
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding: 8px 4px 6px;
          border-radius: 16px;
          border: none;
          background: transparent;
          cursor: pointer;
          transition: color 0.2s ease;
          -webkit-tap-highlight-color: transparent;
          color: #94a3b8;
        }
        .cbn-tab--active {
          color: #0f172a;
        }
        .cbn-active-pill {
          position: absolute;
          inset: 0;
          border-radius: 16px;
          background: rgba(15, 23, 42, 0.06);
        }
        .cbn-icon-wrap {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
        }
        .cbn-badge {
          position: absolute;
          top: -4px;
          right: -8px;
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          border-radius: 9px;
          background: #ef4444;
          color: #fff;
          font-size: 10px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
          box-shadow: 0 2px 6px rgba(239, 68, 68, 0.4);
        }
        .cbn-label {
          position: relative;
          z-index: 1;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.02em;
          line-height: 1;
        }
      `}</style>
    </nav>
  );
}
