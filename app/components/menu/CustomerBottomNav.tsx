
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
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-[rgba(247,242,235,0.97)] backdrop-blur-[16px] border-t border-[#EDE5D8] h-[56px] z-50 flex items-center justify-around pb-[env(safe-area-inset-bottom)] px-2 font-dm-sans">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="flex-1 flex flex-col items-center justify-center relative cursor-pointer active:scale-95 transition-transform"
            aria-label={tab.label}
          >
            <div className="relative mb-1">
              <Icon 
                size={20} 
                strokeWidth={2} 
                className={`transition-colors ${isActive ? 'text-[#8B6E4F]' : 'text-[#B3A08E]'}`} 
              />
              {tab.id === "menu" && cartItemCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-[#3D2B1F] text-[#F7F2EB] text-[9px] font-[700] rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
                  {cartItemCount > 9 ? "9+" : cartItemCount}
                </span>
              )}
            </div>
            <span className={`text-[10px] ${isActive ? 'font-[600] text-[#8B6E4F]' : 'font-[400] text-[#B3A08E]'}`}>
              {tab.label}
            </span>
            {isActive && (
              <motion.div 
                layoutId="nav-indicator"
                className="absolute -bottom-[2px] w-[4px] h-[4px] rounded-full bg-[#8B6E4F]"
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
