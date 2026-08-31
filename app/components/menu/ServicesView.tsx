
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/app/lib/api";
import { toast } from "react-hot-toast";
import { Droplets, Bell, CheckCircle2, Loader2, ChevronRight } from "lucide-react";

interface ServicesViewProps {
  previewMode?: boolean;
  orderingEnabled?: boolean;
}

type ServiceStatus = "idle" | "sending" | "sent";
type AnimationType = "waiter" | "water" | null;

const STORAGE_KEYS = {
  water: "service_water_requested_until",
  waiter: "service_waiter_requested_until",
};

export default function ServicesView({
  previewMode = false,
  orderingEnabled = true,
}: ServicesViewProps) {
  const [waterStatus, setWaterStatus] = useState<ServiceStatus>("idle");
  const [waiterStatus, setWaiterStatus] = useState<ServiceStatus>("idle");
  const [waterCooldown, setWaterCooldown] = useState(0);
  const [waiterCooldown, setWaiterCooldown] = useState(0);
  const [activeAnimation, setActiveAnimation] = useState<AnimationType>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    // Restore state from localStorage on mount / refresh
    if (typeof window !== "undefined") {
      const now = Date.now();

      const waterUntil = Number(localStorage.getItem(STORAGE_KEYS.water) || 0);
      if (waterUntil > now) {
        const remaining = Math.ceil((waterUntil - now) / 1000);
        setWaterStatus("sent");
        setWaterCooldown(remaining);
      } else {
        localStorage.removeItem(STORAGE_KEYS.water);
      }

      const waiterUntil = Number(localStorage.getItem(STORAGE_KEYS.waiter) || 0);
      if (waiterUntil > now) {
        const remaining = Math.ceil((waiterUntil - now) / 1000);
        setWaiterStatus("sent");
        setWaiterCooldown(remaining);
      } else {
        localStorage.removeItem(STORAGE_KEYS.waiter);
      }
    }
  }, []);

  useEffect(() => {
    if (waterCooldown <= 0) return;
    const t = setInterval(() => {
      setWaterCooldown((c) => {
        if (c <= 1) {
          setWaterStatus("idle");
          if (typeof window !== "undefined") {
            localStorage.removeItem(STORAGE_KEYS.water);
          }
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [waterCooldown]);

  useEffect(() => {
    if (waiterCooldown <= 0) return;
    const t = setInterval(() => {
      setWaiterCooldown((c) => {
        if (c <= 1) {
          setWaiterStatus("idle");
          if (typeof window !== "undefined") {
            localStorage.removeItem(STORAGE_KEYS.waiter);
          }
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [waiterCooldown]);

  const handleRequest = useCallback(
    async (type: "water" | "waiter") => {
      if (previewMode) return;
      if (!orderingEnabled) {
        toast("Service requests are currently disabled.", { icon: "ℹ️" });
        return;
      }
      const setStatus = type === "water" ? setWaterStatus : setWaiterStatus;
      const setCooldown = type === "water" ? setWaterCooldown : setWaiterCooldown;

      setStatus("sending");
      try {
        await api("/api/customer/service-calls", { method: "POST", body: JSON.stringify({ type }) });
        setStatus("sent");
        const cooldownSeconds = 60;
        setCooldown(cooldownSeconds);

        if (typeof window !== "undefined") {
          const expiryTime = Date.now() + cooldownSeconds * 1000;
          localStorage.setItem(STORAGE_KEYS[type], String(expiryTime));
        }

        setActiveAnimation(type);
        setTimeout(() => setActiveAnimation(null), 3000);
      } catch {
        setStatus("idle");
        toast.error("Request failed. Please try again.");
      }
    },
    [previewMode, orderingEnabled]
  );

  return (
    <div className="font-dm-sans bg-white min-h-[calc(100vh-56px)] pb-[80px]">
      {isMounted && activeAnimation && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveAnimation(null)}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 cursor-pointer"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-[28px] p-8 flex flex-col items-center justify-center shadow-2xl max-w-[320px] w-full text-center border border-[#F1F1F1]"
            >
              {activeAnimation === "waiter" ? (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-[#FEF3C7] border border-[#FDE68A] flex items-center justify-center mb-4 text-[#B45309]">
                    <Bell className="w-8 h-8 animate-bounce stroke-[2.5]" />
                  </div>
                  <h3 className="text-[18px] font-bold text-[#18181B] font-dm-sans tracking-tight">
                    Waiter Called
                  </h3>
                  <p className="text-[14px] text-[#71717A] mt-1.5 font-dm-sans leading-snug">
                    Our staff has been notified and will be right with you!
                  </p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center mb-4 text-[#2563EB]">
                    <Droplets className="w-8 h-8 animate-bounce stroke-[2.5]" />
                  </div>
                  <h3 className="text-[18px] font-bold text-[#18181B] font-dm-sans tracking-tight">
                    Water Requested
                  </h3>
                  <p className="text-[14px] text-[#71717A] mt-1.5 font-dm-sans leading-snug">
                    A fresh glass of water is on its way to your table!
                  </p>
                </>
              )}
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}

      <h2 className="text-[16px] font-[700] text-[#18181B] p-[24px_16px_4px_16px] tracking-[-0.02em]">
        Services
      </h2>
      <div className="px-[16px] flex flex-col gap-[12px]">
        {/* Waiter */}
        <button
          onClick={() => waiterStatus === "idle" && handleRequest("waiter")}
          disabled={waiterStatus !== "idle"}
          className={`flex flex-row items-center gap-[12px] p-[14px_16px] rounded-[14px] border transition-colors text-left ${waiterStatus !== 'idle' ? 'bg-[#FEF3C7] border-[#FDE68A]' : 'bg-[#FFFFFF] border-[#F1F1F1] hover:bg-slate-50 active:bg-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.03)]'}`}
        >
          <div className="w-[40px] h-[40px] rounded-[10px] bg-[#F4F4F5] flex items-center justify-center shrink-0">
            {waiterStatus === "sending" ? <Loader2 className="w-5 h-5 text-[#18181B] animate-spin"/> : <Bell className="w-5 h-5 text-[#18181B] stroke-[2]"/>}
          </div>
          <div className="flex-1">
            <h3 className="text-[14px] font-[600] text-[#18181B] leading-tight">
              {waiterStatus === "sent" ? "Waiter called ✓" : "Call Waiter"}
            </h3>
            <p className="text-[12px] text-[#71717A] mt-0.5 leading-tight">
              {waiterStatus === "sent" ? `They'll be right with you (${waiterCooldown}s)` : "Need to place an order or need help?"}
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-[#A1A1AA] shrink-0"/>
        </button>

        {/* Water */}
        <button
          onClick={() => waterStatus === "idle" && handleRequest("water")}
          disabled={waterStatus !== "idle"}
          className={`flex flex-row items-center gap-[12px] p-[14px_16px] rounded-[14px] border transition-colors text-left ${waterStatus !== 'idle' ? 'bg-[#EFF6FF] border-[#BFDBFE]' : 'bg-[#FFFFFF] border-[#F1F1F1] hover:bg-slate-50 active:bg-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.03)]'}`}
        >
          <div className="w-[40px] h-[40px] rounded-[10px] bg-[#F4F4F5] flex items-center justify-center shrink-0">
            {waterStatus === "sending" ? <Loader2 className="w-5 h-5 text-[#18181B] animate-spin"/> : <Droplets className="w-5 h-5 text-[#18181B] stroke-[2]"/>}
          </div>
          <div className="flex-1">
            <h3 className="text-[14px] font-[600] text-[#18181B] leading-tight">
              {waterStatus === "sent" ? "Water requested ✓" : "Request Water"}
            </h3>
            <p className="text-[12px] text-[#71717A] mt-0.5 leading-tight">
              {waterStatus === "sent" ? `A fresh glass is on the way (${waterCooldown}s)` : "Get some fresh table water"}
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-[#A1A1AA] shrink-0"/>
        </button>
      </div>
    </div>
  );
}
