"use client";

import { api } from "@/app/lib/api";
import { goToCheckout } from "@/stores/cartStore";
import { getTokenCookie, setTokenCookie, removeTokenCookie } from "@/app/lib/clientCookies";
import {
  BellRing,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Loader2,
  ReceiptText,
  Clock,
  CookingPot,
  Package,
  RefreshCw,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { notifyGuest, notifyPermission, requestNotifyPermission } from "@/app/lib/guestNotify";

/* ── Status mapping ────────────────────────────────────────────────── */

const STEPS = [
  { key: "pending", label: "Order placed", icon: ClipboardList },
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
  if (
    s.includes("deliver") ||
    s.includes("served") ||
    s.includes("completed") ||
    s.includes("complete")
  )
    return 3;
  if (
    s.includes("ready") ||
    s.includes("finished") ||
    s.includes("done") ||
    s.includes("cooked")
  )
    return 2;
  if (
    s.includes("prepar") ||
    s.includes("cooking") ||
    s.includes("progress") ||
    s.includes("making") ||
    s.includes("assign") ||
    s.includes("accept") ||
    s.includes("confirmed")
  )
    return 1;
  if (
    s.includes("placed") ||
    s.includes("pending") ||
    s.includes("received") ||
    s.includes("new") ||
    s.includes("submitted")
  )
    return 0;
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
  menu_item_name?: string;
  variant_label?: string;
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
  const [billRequested, setBillRequested] = useState(false);
  const [isRequestingBill, setIsRequestingBill] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      getTokenCookie("session_id").then(sessionId => {
        if (sessionId && localStorage.getItem(`bill_requested_${sessionId}`) === "true") {
          setBillRequested(true);
        }
      });
    }
  }, []);


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
          { credentials: "include", suppressErrorLog: true },
        );
        const list = Array.isArray(data) ? data : (data?.orders ?? []);
        setOrders(list.filter((order: any) => order.status !== "cart"));
      } catch (err: any) {
        if (err?.status === 401 || String(err?.message || "").includes("session expired")) {
          if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("customer_session_expired"));
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [previewMode],
  );

  // Poll fast while something is in flight, slowly otherwise, never while the
  // tab is hidden; catch up the moment the guest comes back or reconnects.
  const hasActiveRef = useRef(true);
  useEffect(() => {
    fetchOrders();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = () => {
      if (document.visibilityState === "visible") fetchOrders(true);
      timer = setTimeout(tick, hasActiveRef.current ? 5_000 : 30_000);
    };
    timer = setTimeout(tick, 5_000);
    const wake = () => {
      if (document.visibilityState === "visible") fetchOrders(true);
    };
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("online", wake);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("online", wake);
    };
  }, [fetchOrders]);

  // Alert the guest when an order they're waiting on moves forward.
  const lastStatus = useRef<Record<string, string>>({});
  // Only rendered after orders load (client-side), so reading it at init is hydration-safe.
  const [permission, setPermission] = useState<ReturnType<typeof notifyPermission>>(() => notifyPermission());
  useEffect(() => {
    const seen = lastStatus.current;
    const first = Object.keys(seen).length === 0;
    for (const o of orders) {
      const status = (o.status || "").toLowerCase();
      const label = o.daily_order_number ? `#${o.daily_order_number}` : o.order_number ? `#${o.order_number}` : "Your order";
      if (!first && seen[o.id] && seen[o.id] !== status) {
        if (status === "ready") void notifyGuest("Your order is ready", `${label} is ready to be served.`, `order-${o.id}`);
        else if (status === "preparing") void notifyGuest("Being prepared", `${label} is now being prepared.`, `order-${o.id}`);
        else if (status === "cancelled") void notifyGuest("Order cancelled", `${label} was cancelled by the restaurant.`, `order-${o.id}`);
      }
      seen[o.id] = status;
    }
  }, [orders]);
  const hasActive = orders.some((o) => !["served", "completed", "cancelled"].includes((o.status || "").toLowerCase()));
  useEffect(() => {
    hasActiveRef.current = hasActive;
  }, [hasActive]);

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
          <p className="ov-empty-desc">Items you order will appear here.</p>
        </div>
        <OrdersStyles />
      </div>
    );
  }

  const nonCancelledOrders = orders.filter((o) => (o.status || "").toLowerCase() !== "cancelled");
  const previousOrdersTotal = nonCancelledOrders.reduce((acc, order) => {
    return (
      acc +
      (typeof order.total === "number" && order.total > 0
        ? order.total
        : order.items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0))
    );
  }, 0);

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

      {permission === "default" && hasActive && (
        <button
          type="button"
          className="ov-refresh"
          style={{ width: "100%", margin: "0 0 12px", padding: "10px 14px", borderRadius: 12, fontWeight: 600 }}
          onClick={async () => setPermission(await requestNotifyPermission())}
        >
          Notify me when my order is ready
        </button>
      )}

      <div className="ov-list">
        {orders.map((order) => {
          const isCancelled = (order.status || "").toLowerCase() === "cancelled";
          const stepIdx = statusToStepIndex(order.status);
          const createdRaw = order.created_at || order.createdAt;
          const createdDate = createdRaw ? new Date(createdRaw) : null;
          const timeStr = createdDate
            ? createdDate.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "";
          const orderLabel = order.daily_order_number
            ? `#${order.daily_order_number}`
            : order.order_number
              ? `#${order.order_number}`
              : `#${order.id.slice(0, 6)}`;
          const total =
            (typeof order.total === "number" && order.total > 0
              ? order.total
              : null) ??
            order.items.reduce(
              (sum, item) => sum + (item.price || 0) * (item.quantity || 1),
              0,
            );

          // Calculate estimated time remaining
          const createdTime = createdDate ? createdDate.getTime() : Date.now();
          const elapsedMins = Math.floor((Date.now() - createdTime) / 60000);
          const totalPrepTime =
            typeof order.estimated_prep_minutes === "number"
              ? order.estimated_prep_minutes
              : 20; // fallback to 20 mins
          const remainingMins = Math.max(0, totalPrepTime - elapsedMins);

          let etaLabel = "";
          if (stepIdx === 0) etaLabel = "Awaiting confirmation...";
          else if (stepIdx === 1) etaLabel = `${remainingMins} mins left`;
          else if (stepIdx === 2) etaLabel = "Ready now!";
          else if (stepIdx === 3) etaLabel = "Enjoy your meal!";

          return (
            <div key={order.id} className={`ov-card ${isCancelled ? "ov-card--cancelled" : ""}`}>
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
                <div className="ov-card-status-badge" data-step={stepIdx} data-cancelled={isCancelled}>
                  {isCancelled ? "Cancelled" : STEPS[stepIdx].label}
                </div>
              </div>

              {/* Stepper */}
              {!isCancelled && (
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
              )}

              {/* Items */}
              <div className="ov-items">
                {order.items.map((item, i) => (
                  <div key={i} className="ov-item">
                    <span className="ov-item-qty">{item.quantity}×</span>
                    <span className="ov-item-name">
                      {item.menu_item_name ||
                        item.name ||
                        item.item_name ||
                        `Item`}
                      {item.variant_label ? ` (${item.variant_label})` : ""}
                    </span>
                    <span className="ov-item-price">
                      ₹{item.price * item.quantity}
                    </span>
                  </div>
                ))}
              </div>

              {isCancelled && (
                <div style={{ padding: "0 18px 8px 18px" }}>
                  <p style={{ fontSize: "11px", fontWeight: "bold", color: "#ef4444" }}>
                    This order was cancelled.
                  </p>
                </div>
              )}

              {/* Total */}
              <div className="ov-card-footer">
                <span className="ov-total-label">Total</span>
                <span className="ov-total-amount">₹{total}</span>
              </div>
            </div>
          );
        })}

        {/* Checkout & Bill Summary Link */}
        {previousOrdersTotal > 0 && (
          <div className="ov-summary-card">
            <div className="ov-summary-info">
              <span className="ov-summary-label">Total Placed Bill</span>
              <span className="ov-summary-amount">₹{previousOrdersTotal}</span>
            </div>
            <div className="ov-summary-actions">
              <button
                type="button"
                onClick={() => {
                  void goToCheckout();
                }}
                className="ov-btn-checkout"
              >
                <ReceiptText size={18} strokeWidth={2.25} />
                <span>View bill &amp; checkout</span>
                <ChevronRight size={18} strokeWidth={2.5} className="ov-btn-arrow" />
              </button>
              <button
                type="button"
                disabled={billRequested || isRequestingBill}
                onClick={async () => {
                  setIsRequestingBill(true);
                  const { toast } = await import("react-hot-toast");
                  try {
                    const { orderService } = await import("@/services/orderService");
                    await orderService.requestBill();
                    toast.success("Bill requested! Waiter is on their way.");
                    const sessionId = (await getTokenCookie("session_id")) || "default";
                    localStorage.setItem(`bill_requested_${sessionId}`, "true");
                    setBillRequested(true);
                  } catch (err: any) {
                    toast.error(err?.message || "Failed to request bill");
                  } finally {
                    setIsRequestingBill(false);
                  }
                }}
                className={`ov-btn-request ${billRequested ? "ov-btn-request--done" : ""}`}
              >
                {isRequestingBill ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : billRequested ? (
                  <CheckCircle2 size={17} strokeWidth={2.5} />
                ) : (
                  <BellRing size={17} strokeWidth={2.25} />
                )}
                <span>
                  {billRequested
                    ? "Bill requested"
                    : isRequestingBill
                      ? "Requesting…"
                      : "Request bill at table"}
                </span>
              </button>
            </div>
          </div>
        )}
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
        min-height: 80vh;
        display: flex;
        flex-direction: column;
        font-family: 'DM Sans', sans-serif;
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
        color: #3D2B1F;
        letter-spacing: -0.02em;
      }
      .ov-refresh {
        width: 36px;
        height: 36px;
        border-radius: 12px;
        border: 1px solid #EDE5D8;
        background: #fff;
        color: #6B5B4E;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
      }
      .ov-refresh:hover {
        background: #F7F2EB;
      }
      .ov-refresh--spin svg {
        animation: ov-spin 0.8s linear infinite;
      }
      @keyframes ov-spin {
        to {
          transform: rotate(360deg);
        }
      }

      .ov-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      /* Card */
      .ov-card {
        background: #fff;
        border-radius: 20px;
        border: 1px solid #EDE5D8;
        box-shadow: 0 4px 20px rgba(61, 43, 31, 0.04);
        overflow: hidden;
      }
      .ov-card--cancelled {
        opacity: 0.7;
        background-color: #fafafa;
        border-color: #fee2e2;
      }
      .ov-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 18px 12px;
        border-bottom: 1px solid #F7F2EB;
      }
      .ov-card-id {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .ov-card-order-num {
        font-size: 15px;
        font-weight: 800;
        color: #3D2B1F;
      }
      .ov-card-time {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 11px;
        font-weight: 600;
        color: #9B8677;
      }
      .ov-card-status-badge {
        font-size: 10px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        padding: 4px 10px;
        border-radius: 8px;
        background: #EDE5D8;
        color: #6B5B4E;
        background: #F4F4F5;
        color: #71717A;
      }
      .ov-card-status-badge[data-cancelled="true"] {
        background: #fee2e2;
        color: #991b1b;
      }
      .ov-card-status-badge[data-step="1"] {
        background: #fef3c7;
        color: #92400e;
      }
      .ov-card-status-badge[data-step="2"] {
        background: #ffedd5;
        color: #c2410c;
      }
      .ov-card-status-badge[data-step="3"] {
        background: #dcfce7;
        color: #166534;
      }
      .ov-card-status-badge[data-step="4"] {
        background: #d1fae5;
        color: #065f46;
      }

      /* Stepper */
      .ov-stepper {
        display: flex;
        align-items: flex-start;
        padding: 18px 18px 14px;
        gap: 0;
        overflow-x: auto;
        scrollbar-width: none;
      }
      .ov-stepper::-webkit-scrollbar {
        display: none;
      }
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
        background: #F4F4F5;
        color: #71717A;
        transition: all 0.3s ease;
      }
      .ov-step--done .ov-step-icon {
        background: #18181B;
        color: #FFFFFF;
      }
      .ov-step--active .ov-step-icon {
        background: #18181B;
        color: #FFFFFF;
        box-shadow: 0 4px 14px rgba(24, 24, 27, 0.25);
      }
      .ov-step-pulse {
        position: absolute;
        inset: -4px;
        border-radius: 14px;
        border: 2px solid #18181B;
        opacity: 0.4;
        animation: ov-pulse 1.8s ease-in-out infinite;
      }
      @keyframes ov-pulse {
        0%,
        100% {
          transform: scale(1);
          opacity: 0.4;
        }
        50% {
          transform: scale(1.12);
          opacity: 0;
        }
      }
      .ov-step-label {
        font-size: 9px;
        font-weight: 700;
        text-align: center;
        color: #71717A;
        line-height: 1.2;
        max-width: 65px;
      }
      .ov-step-eta {
        font-size: 9px;
        font-weight: 800;
        text-align: center;
        color: #18181B;
        background: rgba(0, 0, 0, 0.05);
        padding: 2px 6px;
        border-radius: 6px;
        margin-top: 2px;
        white-space: nowrap;
      }
      .ov-step--done .ov-step-label {
        color: #18181B;
      }
      .ov-step--active .ov-step-label {
        color: #18181B;
        font-weight: 800;
      }
      .ov-step-line {
        flex: 1;
        height: 2px;
        min-width: 12px;
        background: #E4E4E7;
        margin-top: 15px;
        border-radius: 1px;
        transition: background 0.3s;
      }
      .ov-step-line--done {
        background: #18181B;
      }

      /* Items */
      .ov-items {
        padding: 0 18px;
      }
      .ov-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 0;
        border-bottom: 1px solid #F4F4F5;
      }
      .ov-item:last-child {
        border-bottom: none;
      }
      .ov-item-qty {
        font-size: 12px;
        font-weight: 800;
        color: #6B5B4E;
        min-width: 24px;
      }
      .ov-item-name {
        flex: 1;
        font-size: 13px;
        font-weight: 600;
        color: #3D2B1F;
      }
      .ov-item-price {
        font-size: 13px;
        font-weight: 700;
        color: #3D2B1F;
      }

      /* Footer */
      .ov-card-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 18px 16px;
        border-top: 1px dashed #EDE5D8;
        margin-top: 4px;
      }
      .ov-total-label {
        font-size: 13px;
        font-weight: 700;
        color: #6B5B4E;
      }
      .ov-total-amount {
        font-size: 18px;
        font-weight: 800;
        color: #3D2B1F;
      }

      /* Summary Card */
      .ov-summary-card {
        margin-top: 24px;
        padding: 20px;
        background: #fff;
        border-radius: 20px;
        border: 2px solid #EDE5D8;
        box-shadow: 0 4px 20px rgba(61, 43, 31, 0.06);
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .ov-summary-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .ov-summary-label {
        font-size: 14px;
        font-weight: 700;
        color: #6B5B4E;
      }
      .ov-summary-amount {
        font-size: 24px;
        font-weight: 800;
        color: #3D2B1F;
        font-variant-numeric: tabular-nums;
        letter-spacing: -0.01em;
      }
      .ov-summary-actions {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .ov-btn-checkout,
      .ov-btn-request {
        width: 100%;
        min-height: 52px;
        padding: 0 18px;
        border-radius: 16px;
        font-family: inherit;
        font-size: 15px;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        transition: transform 0.15s ease, background-color 0.2s ease, opacity 0.2s ease;
        -webkit-tap-highlight-color: transparent;
      }
      .ov-btn-checkout:active:not(:disabled),
      .ov-btn-request:active:not(:disabled) {
        transform: scale(0.98);
      }
      .ov-btn-checkout {
        background: #3D2B1F;
        color: #F7F2EB;
        border: none;
        box-shadow: 0 6px 18px rgba(61, 43, 31, 0.22);
      }
      .ov-btn-checkout span {
        flex: 1;
        text-align: left;
      }
      .ov-btn-checkout:hover {
        background: #4A3527;
      }
      .ov-btn-arrow {
        opacity: 0.8;
      }
      .ov-btn-request {
        background: #F7F2EB;
        color: #3D2B1F;
        border: 1.5px solid #DDD5C5;
      }
      .ov-btn-request:hover:not(:disabled) {
        background: #EDE5D8;
      }
      .ov-btn-request:disabled {
        cursor: default;
      }
      .ov-btn-request--done {
        background: rgba(16, 185, 129, 0.08);
        border-color: rgba(16, 185, 129, 0.35);
        color: #047857;
      }

      /* Empty & Loading */
      .ov-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 60px 24px;
        flex-grow: 1;
      }
      .ov-empty-icon {
        width: 80px;
        height: 80px;
        border-radius: 24px;
        background: #F7F2EB;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #C9B89A;
        margin-bottom: 20px;
      }
      .ov-empty-title {
        font-size: 18px;
        font-weight: 800;
        color: #3D2B1F;
        margin-bottom: 8px;
      }
      .ov-empty-desc {
        font-size: 13px;
        color: #6B5B4E;
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
        border: 3px solid #EDE5D8;
        border-top-color: #3D2B1F;
        border-radius: 50%;
        animation: ov-spin 0.7s linear infinite;
      }
      .ov-loading-text {
        font-size: 13px;
        font-weight: 600;
        color: #6B5B4E;
      }
    `}</style>
  );
}
