
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/app/lib/api";
import { toast } from "react-hot-toast";
import { Droplets, Bell, CheckCircle2, Loader2, ChevronRight } from "lucide-react";

interface ServicesViewProps {
  previewMode?: boolean;
  orderingEnabled?: boolean;
}

type ServiceStatus = "idle" | "sending" | "sent";

export default function ServicesView({
  previewMode = false,
  orderingEnabled = true,
}: ServicesViewProps) {
  const [waterStatus, setWaterStatus] = useState<ServiceStatus>("idle");
  const [waiterStatus, setWaiterStatus] = useState<ServiceStatus>("idle");
  const [waterCooldown, setWaterCooldown] = useState(0);
  const [waiterCooldown, setWaiterCooldown] = useState(0);

  useEffect(() => {
    if (waterCooldown <= 0) return;
    const t = setInterval(() => {
      setWaterCooldown((c) => {
        if (c <= 1) {
          setWaterStatus("idle");
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
        setCooldown(60);
      } catch {
        setStatus("idle");
        toast.error("Request failed. Please try again.");
      }
    },
    [previewMode, orderingEnabled]
  );

  return (
    <div className="font-dm-sans bg-[#F7F2EB] min-h-[calc(100vh-56px)] pb-[80px]">
      <h2 className="text-[16px] font-[700] text-[#3D2B1F] p-[24px_16px_4px_16px] tracking-[-0.02em]">
        Services
      </h2>
      <div className="px-[16px] flex flex-col gap-[12px]">
        {/* Waiter */}
        <button
          onClick={() => waiterStatus === "idle" && handleRequest("waiter")}
          disabled={waiterStatus !== "idle"}
          className={`flex flex-row items-center gap-[12px] p-[14px_16px] rounded-[14px] border border-[#EDE5D8] transition-colors text-left ${waiterStatus !== 'idle' ? 'bg-[#FEF3C7] border-[#FDE68A]' : 'bg-[#FFFFFF] active:bg-[#fafafa]'}`}
        >
          <div className="w-[40px] h-[40px] rounded-[10px] bg-[#F7F2EB] flex items-center justify-center shrink-0">
            {waiterStatus === "sending" ? <Loader2 className="w-5 h-5 text-[#8B6E4F] animate-spin"/> : <Bell className="w-5 h-5 text-[#8B6E4F] stroke-[2]"/>}
          </div>
          <div className="flex-1">
            <h3 className="text-[14px] font-[600] text-[#3D2B1F] leading-tight">
              {waiterStatus === "sent" ? "Waiter called ✓" : "Call Waiter"}
            </h3>
            <p className="text-[12px] text-[#9B8677] mt-0.5 leading-tight">
              {waiterStatus === "sent" ? `They'll be right with you (${waiterCooldown}s)` : "Need to place an order or need help?"}
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-[#C9B89A] shrink-0"/>
        </button>

        {/* Water */}
        <button
          onClick={() => waterStatus === "idle" && handleRequest("water")}
          disabled={waterStatus !== "idle"}
          className={`flex flex-row items-center gap-[12px] p-[14px_16px] rounded-[14px] border border-[#EDE5D8] transition-colors text-left ${waterStatus !== 'idle' ? 'bg-[#EFF6FF] border-[#BFDBFE]' : 'bg-[#FFFFFF] active:bg-[#fafafa]'}`}
        >
          <div className="w-[40px] h-[40px] rounded-[10px] bg-[#F7F2EB] flex items-center justify-center shrink-0">
            {waterStatus === "sending" ? <Loader2 className="w-5 h-5 text-[#8B6E4F] animate-spin"/> : <Droplets className="w-5 h-5 text-[#8B6E4F] stroke-[2]"/>}
          </div>
          <div className="flex-1">
            <h3 className="text-[14px] font-[600] text-[#3D2B1F] leading-tight">
              {waterStatus === "sent" ? "Water requested ✓" : "Request Water"}
            </h3>
            <p className="text-[12px] text-[#9B8677] mt-0.5 leading-tight">
              {waterStatus === "sent" ? `A fresh glass is on the way (${waterCooldown}s)` : "Get some fresh table water"}
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-[#C9B89A] shrink-0"/>
        </button>
      </div>
    </div>
  );
}
