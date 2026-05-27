"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/app/lib/api";
import { toast } from "react-hot-toast";
import {
  Droplets,
  Bell,
  CheckCircle2,
  Loader2,
  Sparkles,
  HandHelping,
} from "lucide-react";

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

  // Cooldown timer
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
      const setCooldown =
        type === "water" ? setWaterCooldown : setWaiterCooldown;

      setStatus("sending");
      try {
        await api("/api/customer/service-calls", {
          method: "POST",
          body: JSON.stringify({ type }),
        });
        setStatus("sent");
        setCooldown(60); // 60s cooldown
        toast.success(
          type === "water"
            ? "Water request sent! Staff has been notified."
            : "Waiter has been called! They'll be with you shortly."
        );
      } catch {
        setStatus("idle");
        toast.error("Request failed. Please try again.");
      }
    },
    [previewMode, orderingEnabled]
  );

  return (
    <div className="sv-root">
      <div className="sv-header">
        <h2 className="sv-title">Services</h2>
        <p className="sv-subtitle">Need assistance? We're here to help.</p>
      </div>

      <div className="sv-cards">
        {/* Water Request */}
        <button
          className={`sv-card sv-card--water ${waterStatus !== "idle" ? "sv-card--active" : ""}`}
          onClick={() => waterStatus === "idle" && handleRequest("water")}
          disabled={waterStatus !== "idle"}
        >
          <div className="sv-card-icon sv-card-icon--water">
            {waterStatus === "sending" ? (
              <Loader2 size={28} className="sv-spinner" />
            ) : waterStatus === "sent" ? (
              <CheckCircle2 size={28} />
            ) : (
              <Droplets size={28} />
            )}
          </div>
          <div className="sv-card-content">
            <h3 className="sv-card-title">Request Water</h3>
            <p className="sv-card-desc">
              {waterStatus === "sent"
                ? `Staff notified • ${waterCooldown}s`
                : waterStatus === "sending"
                  ? "Sending request…"
                  : "Tap to request water for your table"}
            </p>
          </div>
          {waterStatus === "idle" && (
            <div className="sv-card-arrow">→</div>
          )}
          {waterStatus === "sent" && (
            <div className="sv-card-check">
              <Sparkles size={16} />
            </div>
          )}
        </button>

        {/* Call Waiter */}
        <button
          className={`sv-card sv-card--waiter ${waiterStatus !== "idle" ? "sv-card--active" : ""}`}
          onClick={() => waiterStatus === "idle" && handleRequest("waiter")}
          disabled={waiterStatus !== "idle"}
        >
          <div className="sv-card-icon sv-card-icon--waiter">
            {waiterStatus === "sending" ? (
              <Loader2 size={28} className="sv-spinner" />
            ) : waiterStatus === "sent" ? (
              <CheckCircle2 size={28} />
            ) : (
              <Bell size={28} />
            )}
          </div>
          <div className="sv-card-content">
            <h3 className="sv-card-title">Call Waiter</h3>
            <p className="sv-card-desc">
              {waiterStatus === "sent"
                ? `Waiter notified • ${waiterCooldown}s`
                : waiterStatus === "sending"
                  ? "Alerting staff…"
                  : "Tap to call a waiter to your table"}
            </p>
          </div>
          {waiterStatus === "idle" && (
            <div className="sv-card-arrow">→</div>
          )}
          {waiterStatus === "sent" && (
            <div className="sv-card-check">
              <Sparkles size={16} />
            </div>
          )}
        </button>
      </div>

      {/* Help note */}
      <div className="sv-help">
        <HandHelping size={16} />
        <p>For urgent matters, please speak to the nearest staff member.</p>
      </div>

      <style jsx>{`
        .sv-root {
          padding: 20px 20px 120px;
          min-height: 60vh;
        }
        .sv-header {
          margin-bottom: 28px;
        }
        .sv-title {
          font-size: 22px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.02em;
          margin-bottom: 4px;
        }
        .sv-subtitle {
          font-size: 13px;
          color: #94a3b8;
          font-weight: 500;
        }
        .sv-cards {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .sv-card {
          display: flex;
          align-items: center;
          gap: 16px;
          width: 100%;
          padding: 20px;
          border-radius: 20px;
          border: 1px solid #f1f5f9;
          background: #fff;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.03);
          cursor: pointer;
          text-align: left;
          transition: all 0.25s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .sv-card:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
        }
        .sv-card:active:not(:disabled) {
          transform: scale(0.98);
        }
        .sv-card--active {
          pointer-events: none;
        }
        .sv-card-icon {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.3s ease;
        }
        .sv-card-icon--water {
          background: #eff6ff;
          color: #3b82f6;
        }
        .sv-card--active .sv-card-icon--water {
          background: #3b82f6;
          color: #fff;
        }
        .sv-card-icon--waiter {
          background: #fef3c7;
          color: #f59e0b;
        }
        .sv-card--active .sv-card-icon--waiter {
          background: #f59e0b;
          color: #fff;
        }
        .sv-card-content {
          flex: 1;
          min-width: 0;
        }
        .sv-card-title {
          font-size: 15px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 3px;
        }
        .sv-card-desc {
          font-size: 12px;
          font-weight: 500;
          color: #94a3b8;
        }
        .sv-card--active .sv-card-desc {
          color: #64748b;
          font-weight: 600;
        }
        .sv-card-arrow {
          font-size: 18px;
          color: #cbd5e1;
          flex-shrink: 0;
          font-weight: 300;
        }
        .sv-card-check {
          color: #22c55e;
          flex-shrink: 0;
          animation: sv-pop 0.4s ease;
        }
        @keyframes sv-pop {
          0% { transform: scale(0); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        .sv-help {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-top: 32px;
          padding: 16px;
          border-radius: 14px;
          background: #f8fafc;
          color: #94a3b8;
          font-size: 12px;
          line-height: 1.5;
          font-weight: 500;
        }
        .sv-help :global(svg) {
          flex-shrink: 0;
          margin-top: 1px;
        }
      `}</style>
      <style jsx global>{`
        .sv-spinner {
          animation: sv-spin 0.8s linear infinite;
        }
        @keyframes sv-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
