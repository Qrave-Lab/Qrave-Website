"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/app/lib/api";
import {
  ClipboardList,
  ChefHat,
  Flame,
  CookingPot,
  CheckCircle2,
  Truck,
  Package,
  Clock,
  RefreshCw,
} from "lucide-react";

/* ── Status mapping ────────────────────────────────────────────────── */

const STEPS = [
  { key: "pending", label: "Waiting for confirmation", icon: ClipboardList },
  { key: "cooking", label: "Cooking", icon: CookingPot },
  { key: "ready", label: "Ready to be served", icon: Package },
  { key: "served", label: "Served", icon: CheckCircle2 },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

/**
 * Map the raw `status` string from the API to a step index (0-3).
 * The backend may use various casing / values — be lenient.
 */
function statusToStepIndex(status?: string): number {
  if (!status) return 0;
  const s = status.toLowerCase().replace(/[_\- ]/g, "");
  if (s.includes("deliver") || s.includes("served") || s.includes("completed") || s.includes("complete")) return 3;
  if (s.includes("ready") || s.includes("finished") || s.includes("done") || s.includes("cooked")) return 2;
  if (s.includes("prepar") || s.includes("cooking") || s.includes("progress") || s.includes("making") || s.includes("assign") || s.includes("accept") || s.includes("confirmed")) return 1;
  if (s.includes("placed") || s.includes("pending") || s.includes("received") || s.includes("new") || s.includes("submitted")) return 0;
  return 0;
}

/* ── Types ─────────────────────────────────────────────────────────── */

type OrderItem = {
  menu_item_id: string;
  variant_id?: string;
  quantity: number;
  price: number;
  name?: string;
  item_name?: string;
};

type Order = {
  id: string;
  items: OrderItem[];
  status: string;
  created_at?: string;
  createdAt?: string;
  estimated_prep_minutes?: number | null;
  order_number?: number | null;
  daily_order_number?: number | null;
  total?: number;
};

interface OrdersViewProps {
  previewMode?: boolean;
}

export default function OrdersView({ previewMode = false }: OrdersViewProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(
    async (silent = false) => {
      if (previewMode) {
        setLoading(false);
        return;
      }
      try {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        const data = await api<Order[] | { orders?: Order[] }>(
          "/api/customer/orders",
          { credentials: "include" }
        );
        const list = Array.isArray(data) ? data : data?.orders ?? [];
        setOrders(list);
      } catch {
        // keep current state
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [previewMode]
  );

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => fetchOrders(true), 10_000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  /* ── Loading ─────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="ov-root">
        <div className="ov-loading">
          <div className="ov-loading-spinner" />
          <p className="ov-loading-text">Loading your orders…</p>
        </div>
        <OrdersStyles />
      </div>
    );
  }

  /* ── Empty state ─────────────────────────────────────────────────── */
  if (orders.length === 0) {
    return (
      <div className="ov-root">
        <div className="ov-empty">
          <div className="ov-empty-icon">
            <ClipboardList size={40} strokeWidth={1.4} />
          </div>
          <h3 className="ov-empty-title">No orders yet</h3>
          <p className="ov-empty-desc">
            Items you order will appear here with live preparation updates.
          </p>
        </div>
        <OrdersStyles />
      </div>
    );
  }

  /* ── Orders list ─────────────────────────────────────────────────── */
  return (
    <div className="ov-root">
      <div className="ov-header">
        <h2 className="ov-title">Your Orders</h2>
        <button
          className={`ov-refresh ${refreshing ? "ov-refresh--spin" : ""}`}
          onClick={() => fetchOrders(true)}
          aria-label="Refresh orders"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="ov-list">
        {orders.map((order) => {
          const stepIdx = statusToStepIndex(order.status);
          const createdRaw = order.created_at || order.createdAt;
          const createdDate = createdRaw ? new Date(createdRaw) : null;
          const timeStr = createdDate
            ? createdDate.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "";
          const orderLabel =
            order.daily_order_number
              ? `#${order.daily_order_number}`
              : order.order_number
                ? `#${order.order_number}`
                : `#${order.id.slice(0, 6)}`;
          const total =
            order.total ??
            order.items.reduce(
              (sum, item) => sum + item.price * item.quantity,
              0
            );

          // Calculate estimated time remaining
          const createdTime = createdDate ? createdDate.getTime() : Date.now();
          const elapsedMins = Math.floor((Date.now() - createdTime) / 60000);
          const totalPrepTime = typeof order.estimated_prep_minutes === "number" ? order.estimated_prep_minutes : 20; // fallback to 20 mins
          const remainingMins = Math.max(0, totalPrepTime - elapsedMins);
          
          let etaLabel = "";
          if (stepIdx === 0) etaLabel = "Awaiting confirmation...";
          else if (stepIdx === 1) etaLabel = `${remainingMins} mins left`;
          else if (stepIdx === 2) etaLabel = "Ready now!";
          else if (stepIdx === 3) etaLabel = "Enjoy your meal!";

          return (
            <div key={order.id} className="ov-card">
              {/* Card header */}
              <div className="ov-card-header">
                <div className="ov-card-id">
                  <span className="ov-card-order-num">{orderLabel}</span>
                  {timeStr && (
                    <span className="ov-card-time">
                      <Clock size={11} />
                      {timeStr}
                    </span>
                  )}
                </div>
                <div className="ov-card-status-badge" data-step={stepIdx}>
                  {STEPS[stepIdx].label}
                </div>
              </div>

              {/* Stepper */}
              <div className="ov-stepper">
                {STEPS.map((step, idx) => {
                  const Icon = step.icon;
                  const isCompleted = idx < stepIdx;
                  const isActive = idx === stepIdx;
                  const isPending = idx > stepIdx;
                  return (
                    <React.Fragment key={step.key}>
                      <div
                        className={`ov-step ${
                          isCompleted
                            ? "ov-step--done"
                            : isActive
                              ? "ov-step--active"
                              : "ov-step--pending"
                        }`}
                      >
                        <div className="ov-step-icon">
                          <Icon size={14} strokeWidth={2} />
                          {isActive && <div className="ov-step-pulse" />}
                        </div>
                        <span className="ov-step-label">{step.label}</span>
                        {isActive && (
                          <span className="ov-step-eta">{etaLabel}</span>
                        )}
                      </div>
                      {idx < STEPS.length - 1 && (
                        <div
                          className={`ov-step-line ${
                            idx < stepIdx ? "ov-step-line--done" : ""
                          }`}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Items */}
              <div className="ov-items">
                {order.items.map((item, i) => (
                  <div key={i} className="ov-item">
                    <span className="ov-item-qty">{item.quantity}×</span>
                    <span className="ov-item-name">
                      {item.name || item.item_name || `Item`}
                    </span>
                    <span className="ov-item-price">₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="ov-card-footer">
                <span className="ov-total-label">Total</span>
                <span className="ov-total-amount">₹{total}</span>
              </div>
            </div>
          );
        })}
      </div>
      <OrdersStyles />
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────────────────────── */

function OrdersStyles() {
  return (
    <style jsx global>{`
      .ov-root {
        padding: 20px 20px 120px;
        min-height: 60vh;
      }
      .ov-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 20px;
      }
      .ov-title {
        font-size: 22px;
        font-weight: 800;
        color: #0f172a;
        letter-spacing: -0.02em;
      }
      .ov-refresh {
        width: 36px;
        height: 36px;
        border-radius: 12px;
        border: 1px solid #e2e8f0;
        background: #fff;
        color: #64748b;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
      }
      .ov-refresh:hover { background: #f8fafc; }
      .ov-refresh--spin svg { animation: ov-spin 0.8s linear infinite; }
      @keyframes ov-spin { to { transform: rotate(360deg); } }

      .ov-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      /* Card */
      .ov-card {
        background: #fff;
        border-radius: 20px;
        border: 1px solid #f1f5f9;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
        overflow: hidden;
      }
      .ov-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 18px 12px;
        border-bottom: 1px solid #f8fafc;
      }
      .ov-card-id {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .ov-card-order-num {
        font-size: 15px;
        font-weight: 800;
        color: #0f172a;
      }
      .ov-card-time {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 11px;
        font-weight: 600;
        color: #94a3b8;
      }
      .ov-card-status-badge {
        font-size: 10px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        padding: 4px 10px;
        border-radius: 8px;
        background: #f1f5f9;
        color: #64748b;
      }
      .ov-card-status-badge[data-step="1"] { background: #fef3c7; color: #92400e; }
      .ov-card-status-badge[data-step="2"] { background: #ffedd5; color: #c2410c; }
      .ov-card-status-badge[data-step="3"] { background: #dcfce7; color: #166534; }
      .ov-card-status-badge[data-step="4"] { background: #d1fae5; color: #065f46; }

      /* Stepper */
      .ov-stepper {
        display: flex;
        align-items: flex-start;
        padding: 18px 18px 14px;
        gap: 0;
        overflow-x: auto;
        scrollbar-width: none;
      }
      .ov-stepper::-webkit-scrollbar { display: none; }
      .ov-step {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        min-width: 56px;
        flex-shrink: 0;
      }
      .ov-step-icon {
        position: relative;
        width: 32px;
        height: 32px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f1f5f9;
        color: #94a3b8;
        transition: all 0.3s ease;
      }
      .ov-step--done .ov-step-icon {
        background: #0f172a;
        color: #fff;
      }
      .ov-step--active .ov-step-icon {
        background: #f59e0b;
        color: #fff;
        box-shadow: 0 4px 14px rgba(245, 158, 11, 0.35);
      }
      .ov-step-pulse {
        position: absolute;
        inset: -4px;
        border-radius: 14px;
        border: 2px solid #f59e0b;
        opacity: 0.4;
        animation: ov-pulse 1.8s ease-in-out infinite;
      }
      @keyframes ov-pulse {
        0%, 100% { transform: scale(1); opacity: 0.4; }
        50% { transform: scale(1.12); opacity: 0; }
      }
      .ov-step-label {
        font-size: 9px;
        font-weight: 700;
        text-align: center;
        color: #94a3b8;
        line-height: 1.2;
        max-width: 65px;
      }
      .ov-step-eta {
        font-size: 9px;
        font-weight: 800;
        text-align: center;
        color: #f59e0b;
        background: rgba(245, 158, 11, 0.1);
        padding: 2px 6px;
        border-radius: 6px;
        margin-top: 2px;
        white-space: nowrap;
      }
      .ov-step--done .ov-step-label { color: #0f172a; }
      .ov-step--active .ov-step-label { color: #f59e0b; font-weight: 800; }
      .ov-step-line {
        flex: 1;
        height: 2px;
        min-width: 12px;
        background: #e2e8f0;
        margin-top: 15px;
        border-radius: 1px;
        transition: background 0.3s;
      }
      .ov-step-line--done { background: #0f172a; }

      /* Items */
      .ov-items {
        padding: 0 18px;
      }
      .ov-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 0;
        border-bottom: 1px solid #f8fafc;
      }
      .ov-item:last-child { border-bottom: none; }
      .ov-item-qty {
        font-size: 12px;
        font-weight: 800;
        color: #64748b;
        min-width: 24px;
      }
      .ov-item-name {
        flex: 1;
        font-size: 13px;
        font-weight: 600;
        color: #334155;
      }
      .ov-item-price {
        font-size: 13px;
        font-weight: 700;
        color: #0f172a;
      }

      /* Footer */
      .ov-card-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 18px 16px;
        border-top: 1px dashed #e2e8f0;
        margin-top: 4px;
      }
      .ov-total-label {
        font-size: 13px;
        font-weight: 700;
        color: #64748b;
      }
      .ov-total-amount {
        font-size: 18px;
        font-weight: 800;
        color: #0f172a;
      }

      /* Empty & Loading */
      .ov-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 60px 24px;
      }
      .ov-empty-icon {
        width: 80px;
        height: 80px;
        border-radius: 24px;
        background: #f8fafc;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #cbd5e1;
        margin-bottom: 20px;
      }
      .ov-empty-title {
        font-size: 18px;
        font-weight: 800;
        color: #1e293b;
        margin-bottom: 8px;
      }
      .ov-empty-desc {
        font-size: 13px;
        color: #94a3b8;
        max-width: 260px;
        line-height: 1.5;
      }
      .ov-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 80px 24px;
        gap: 16px;
      }
      .ov-loading-spinner {
        width: 32px;
        height: 32px;
        border: 3px solid #f1f5f9;
        border-top-color: #0f172a;
        border-radius: 50%;
        animation: ov-spin 0.7s linear infinite;
      }
      .ov-loading-text {
        font-size: 13px;
        font-weight: 600;
        color: #94a3b8;
      }
    `}</style>
  );
}
