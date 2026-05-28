"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChefHat, Clock3, Loader2, LogOut, RefreshCw, Printer, Flame, Play, CheckCircle2, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { api } from "@/app/lib/api";
import { connectEventSocket, type EventSocketMessage } from "@/app/lib/eventSocket";
import { printKOT, type KOTItem, type KOTData } from "@/app/lib/print";

type ActiveOrderItemModifier = {
  label: string;
  price_delta?: number;
  quantity?: number;
};

type ActiveOrderItem = {
  menu_item_id: string;
  variant_id: string;
  quantity: number;
  price: number;
  menu_item_name: string;
  variant_label?: string | null;
  modifiers?: ActiveOrderItemModifier[];
};

type ActiveOrder = {
  id?: string;
  order_id?: string;
  status: string;
  created_at: string;
  estimated_prep_minutes?: number | null;
  estimated_ready_at?: string | null;
  session_id: string;
  table_id: string;
  table_number: number;
  order_number?: number | null;
  daily_order_number?: number | null;
  items: ActiveOrderItem[];
};

export default function KitchenDisplayPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<ActiveOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isKitchenPaused, setIsKitchenPaused] = useState(false);
  const [restaurantName, setRestaurantName] = useState<string>("Qrave Restaurant");

  const prevIds = useRef<Set<string>>(new Set());
  const autoPrintedIds = useRef<Set<string>>(new Set());
  const ordersRef = useRef<ActiveOrder[]>([]);

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  const queueOrders = useMemo(
    () =>
      orders
        .filter((o) => o.status === "accepted")
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [orders]
  );

  const grillOrders = useMemo(
    () =>
      orders
        .filter((o) => o.status === "preparing")
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [orders]
  );

  const upsertOrder = useCallback((incoming: ActiveOrder) => {
    const orderId = incoming.id || incoming.order_id;
    if (!orderId) return;
    const normalized: ActiveOrder = { ...incoming, id: orderId, order_id: orderId };
    setOrders((prev) => [normalized, ...prev.filter((o) => (o.id || o.order_id) !== orderId)]);
  }, []);

  const handlePrint = (order: ActiveOrder) => {
    const items: KOTItem[] = order.items.map((it) => ({
      menu_item_name: it.menu_item_name,
      variant_label: it.variant_label,
      quantity: it.quantity,
      modifiers: it.modifiers?.map((m) => ({
        label: m.label,
        price_delta: m.price_delta,
        quantity: m.quantity,
      })),
    }));

    const data: KOTData = {
      restaurant_name: restaurantName,
      table_number: order.table_number,
      order_number: order.order_number,
      daily_order_number: order.daily_order_number,
      order_id: order.id || order.order_id,
      items,
      created_at: order.created_at,
      kot_type: 'dine-in',
    };

    printKOT(data);
  };

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const [me, res, capacity, rest] = await Promise.all([
        api<{ role?: string }>("/api/admin/me", { method: "GET" }),
        api<{ orders: ActiveOrder[] }>("/api/admin/orders/active"),
        api<{ is_paused?: boolean }>("/api/admin/kitchen/capacity"),
        api<{ name?: string }>("/api/admin/restaurant").catch(() => ({ name: "Qrave" })),
      ]);

      const role = (me?.role || "").toLowerCase();
      if (!["owner", "manager", "kitchen"].includes(role)) {
        router.replace("/staff");
        return;
      }

      setIsKitchenPaused(Boolean(capacity?.is_paused));
      if (rest?.name) {
        setRestaurantName(rest.name);
      }

      const list = res?.orders || [];
      const nextIds = new Set<string>(list.map((o: ActiveOrder) => o.id || o.order_id || "").filter(Boolean));

      // Auto print newly arrived accepted orders
      list.forEach((order: ActiveOrder) => {
        const orderId = order.id || order.order_id;
        if (orderId && order.status === "accepted" && !autoPrintedIds.current.has(orderId)) {
          autoPrintedIds.current.add(orderId);
          // 800ms delay to let UI settle
          setTimeout(() => {
            handlePrint(order);
          }, 800);
        }
      });

      if (prevIds.current.size > 0) {
        const newCount = Array.from(nextIds).filter((id) => !prevIds.current.has(id)).length;
        if (newCount > 0) toast.success(`${newCount} new order${newCount > 1 ? "s" : ""} in kitchen`);
      }
      prevIds.current = nextIds;
      setOrders(list);
    } catch {
      toast.error("Failed to load kitchen orders");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [router, restaurantName]);

  useEffect(() => {
    fetchOrders().catch(() => undefined);
    const t = window.setInterval(() => {
      fetchOrders(true).catch(() => undefined);
    }, 60000);
    return () => window.clearInterval(t);
  }, [fetchOrders]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const base = process.env.NEXT_PUBLIC_EVENT_SERVICE_URL?.trim();
    if (!base) return;

    const getRealtimeToken = async (): Promise<string | null> => {
      try {
        const res = await api<{ access_token?: string }>("/auth/refresh", {
          method: "POST",
          skipAuthRedirect: true,
          suppressErrorLog: true,
        });
        return (res?.access_token || "").trim() || null;
      } catch {
        return null;
      }
    };

    const cleanup = connectEventSocket({
      baseUrl: base,
      getToken: getRealtimeToken,
      onMessage: (msg: EventSocketMessage) => {
        if (msg?.type !== "order.created" && msg?.type !== "order.updated") {
          return;
        }
        const data = msg?.data as ActiveOrder;
        const nextId = data?.id || data?.order_id;
        if (!data || !nextId) return;

        const wasAccepted = ordersRef.current.some((o) => (o.id || o.order_id) === nextId && o.status === "accepted");
        upsertOrder(data);

        if (data.status === "accepted" && !wasAccepted) {
          toast.success("New accepted order in kitchen");
          if (!autoPrintedIds.current.has(nextId)) {
            autoPrintedIds.current.add(nextId);
            setTimeout(() => {
              handlePrint(data);
            }, 800);
          }
        }
      },
    });

    return () => cleanup();
  }, [upsertOrder, restaurantName]);

  const updateStatus = async (orderId: string, nextStatus: string) => {
    if (!orderId || updatingId) return;
    const previous = orders;
    setOrders((prev) =>
      prev.map((o) => ((o.id || o.order_id) === orderId ? { ...o, status: nextStatus } : o))
    );
    setUpdatingId(orderId);
    try {
      await api(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      toast.success(`Order status updated to ${nextStatus}`);
      if (nextStatus === "served" || nextStatus === "ready") {
        // Remove from list if it's served
        setOrders((prev) => prev.filter((o) => (o.id || o.order_id) !== orderId));
      }
    } catch {
      setOrders(previous);
      toast.error("Unable to update order status");
    } finally {
      setUpdatingId(null);
    }
  };

  const signOut = async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      // no-op
    } finally {
      router.push("/login");
    }
  };

  const getAgeMins = (createdAt: string) => {
    return Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
  };

  const getAgeStr = (createdAt: string) => {
    const mins = getAgeMins(createdAt);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m ago`;
  };

  const getUrgencyStyles = (createdAt: string) => {
    const mins = getAgeMins(createdAt);
    if (mins <= 5) {
      return {
        bg: "bg-[#161F2E]",
        border: "border-emerald-500/30 shadow-emerald-950/20 shadow-md",
        text: "text-emerald-400",
        pill: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      };
    }
    if (mins <= 15) {
      return {
        bg: "bg-[#1F1B24]",
        border: "border-amber-500/30 shadow-amber-950/20 shadow-md",
        text: "text-amber-400",
        pill: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      };
    }
    return {
      bg: "bg-[#251820]",
      border: "border-rose-500/40 shadow-rose-950/30 shadow-lg animate-pulse",
      text: "text-rose-400",
      pill: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    };
  };

  return (
    <div className="min-h-screen bg-[#090A0F] text-[#E4E6EB] font-sans antialiased">
      {/* Top Navbar */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#1F222F] bg-[#0F111A] px-6 py-4 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-rose-600 shadow-md shadow-orange-950/20">
            <ChefHat className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
              KDS Screen
              <span className="rounded-full bg-[#1A1C29] px-2 py-0.5 text-[10px] font-bold text-orange-500 border border-orange-500/20">LIVE</span>
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#7C8194]">
              {restaurantName} Kitchen Display System
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchOrders().catch(() => undefined)}
            className="flex h-9 items-center gap-2 rounded-lg border border-[#2B2F44] bg-[#161824] px-4 text-xs font-bold uppercase tracking-wider text-[#A0A5B9] transition-all hover:bg-[#1F2235] hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-orange-500" : ""}`} />
            Refresh
          </button>
          <button
            onClick={signOut}
            className="flex h-9 items-center gap-2 rounded-lg border border-rose-950/40 bg-[#1F1219] px-4 text-xs font-bold uppercase tracking-wider text-rose-400 transition-all hover:bg-rose-900/20 hover:text-rose-300"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="flex min-h-[80vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
            <p className="text-xs font-bold uppercase tracking-wider text-[#7C8194]">Loading kitchen deck...</p>
          </div>
        </div>
      ) : (
        <main className="p-6">
          {isKitchenPaused && (
            <div className="mb-6 rounded-xl border border-rose-900/40 bg-[#1F1219] px-5 py-3 text-xs font-bold text-rose-400 shadow-md">
              Kitchen is currently paused for new order intake (auto-throttle active).
            </div>
          )}

          {/* Swim Lanes Layout */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* COLUMN 1: Queue (accepted orders) */}
            <div className="flex flex-col rounded-2xl bg-[#0F111A] border border-[#1F222F] shadow-xl overflow-hidden min-h-[75vh]">
              <div className="flex items-center justify-between border-b border-[#1F222F] bg-[#161824] px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <Play className="h-4.5 w-4.5 text-orange-500" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-white">Queue Lane</h2>
                    <p className="text-[10px] font-bold text-[#7C8194] uppercase tracking-wider">Accepted orders, pending preparation</p>
                  </div>
                </div>
                <span className="rounded-full bg-orange-500/10 border border-orange-500/20 px-3 py-1 text-xs font-black text-orange-500">
                  {queueOrders.length} ORDERS
                </span>
              </div>

              <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[70vh]">
                {queueOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full min-h-[40vh] text-center p-6">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500/40 mb-3" />
                    <p className="text-sm font-bold text-white">Queue is clear!</p>
                    <p className="text-xs text-[#7C8194] mt-1">No orders waiting to be started.</p>
                  </div>
                ) : (
                  queueOrders.map((order) => {
                    const id = order.id || order.order_id || "";
                    const styles = getUrgencyStyles(order.created_at);
                    return (
                      <div
                        key={id}
                        className={`rounded-xl border p-4 transition-all ${styles.bg} ${styles.border}`}
                      >
                        {/* Card Header */}
                        <div className="flex items-start justify-between border-b border-[#2B2F44]/40 pb-3 mb-3">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                              Table T{order.table_number}
                            </span>
                            <h3 className="mt-2 text-sm font-black text-white">
                              {order.daily_order_number ? (
                                <>Order <span className="text-orange-500">#{order.daily_order_number}</span></>
                              ) : (
                                `Order #${id.slice(0, 8)}`
                              )}
                            </h3>
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[10px] font-bold ${styles.pill}`}>
                              <Clock3 className="h-3 w-3" />
                              {getAgeStr(order.created_at)}
                            </span>
                            <button
                              onClick={() => handlePrint(order)}
                              title="Print KOT"
                              className="rounded bg-[#161824] p-1.5 border border-[#2B2F44] text-[#A0A5B9] hover:bg-[#1F2235] hover:text-white"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Items Section */}
                        <div className="space-y-2.5 my-3">
                          {order.items.map((item, idx) => (
                            <div key={`${id}-${idx}`} className="rounded-lg bg-[#090A0F]/60 border border-[#1F222F]/50 px-3 py-2">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-xs font-black text-[#E4E6EB] leading-tight">
                                    {item.menu_item_name}
                                    {item.variant_label && (
                                      <span className="text-[10px] text-orange-400 font-medium"> ({item.variant_label})</span>
                                    )}
                                  </p>
                                  {/* Modifiers List */}
                                  {item.modifiers && item.modifiers.length > 0 && (
                                    <div className="mt-1 space-y-0.5 pl-2 border-l border-orange-500/30">
                                      {item.modifiers.map((mod, mIdx) => (
                                        <p key={mIdx} className="text-[10px] text-[#A0A5B9] font-medium">
                                          + {mod.label}
                                        </p>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <span className="rounded bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 text-[10px] font-black text-orange-400">
                                  x{item.quantity}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-4 pt-3 border-t border-[#2B2F44]/30">
                          <button
                            onClick={() => updateStatus(id, "preparing")}
                            disabled={updatingId === id}
                            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-orange-500 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-orange-950/20 transition-all hover:bg-orange-600 disabled:opacity-50"
                          >
                            <Flame className="h-3.5 w-3.5" />
                            {updatingId === id ? "Starting..." : "Accept & Fire"}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* COLUMN 2: On Grill (preparing orders) */}
            <div className="flex flex-col rounded-2xl bg-[#0F111A] border border-[#1F222F] shadow-xl overflow-hidden min-h-[75vh]">
              <div className="flex items-center justify-between border-b border-[#1F222F] bg-[#161824] px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 border border-rose-500/20">
                    <Flame className="h-4.5 w-4.5 text-rose-500 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-white">On Grill Lane</h2>
                    <p className="text-[10px] font-bold text-[#7C8194] uppercase tracking-wider">Orders active, currently on the grill</p>
                  </div>
                </div>
                <span className="rounded-full bg-rose-500/10 border border-rose-500/20 px-3 py-1 text-xs font-black text-rose-500">
                  {grillOrders.length} ORDERS
                </span>
              </div>

              <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[70vh]">
                {grillOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full min-h-[40vh] text-center p-6">
                    <ChefHat className="h-10 w-10 text-orange-500/30 mb-3" />
                    <p className="text-sm font-bold text-white">Grill is empty</p>
                    <p className="text-xs text-[#7C8194] mt-1">Ready orders from the Queue to fire them onto the grill!</p>
                  </div>
                ) : (
                  grillOrders.map((order) => {
                    const id = order.id || order.order_id || "";
                    const styles = getUrgencyStyles(order.created_at);
                    return (
                      <div
                        key={id}
                        className={`rounded-xl border p-4 transition-all ${styles.bg} ${styles.border}`}
                      >
                        {/* Card Header */}
                        <div className="flex items-start justify-between border-b border-[#2B2F44]/40 pb-3 mb-3">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                              Table T{order.table_number}
                            </span>
                            <h3 className="mt-2 text-sm font-black text-white">
                              {order.daily_order_number ? (
                                <>Order <span className="text-rose-500">#{order.daily_order_number}</span></>
                              ) : (
                                `Order #${id.slice(0, 8)}`
                              )}
                            </h3>
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[10px] font-bold ${styles.pill}`}>
                              <Clock3 className="h-3 w-3" />
                              {getAgeStr(order.created_at)}
                            </span>
                            <button
                              onClick={() => handlePrint(order)}
                              title="Print KOT"
                              className="rounded bg-[#161824] p-1.5 border border-[#2B2F44] text-[#A0A5B9] hover:bg-[#1F2235] hover:text-white"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Items Section */}
                        <div className="space-y-2.5 my-3">
                          {order.items.map((item, idx) => (
                            <div key={`${id}-${idx}`} className="rounded-lg bg-[#090A0F]/60 border border-[#1F222F]/50 px-3 py-2">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-xs font-black text-[#E4E6EB] leading-tight">
                                    {item.menu_item_name}
                                    {item.variant_label && (
                                      <span className="text-[10px] text-rose-400 font-medium"> ({item.variant_label})</span>
                                    )}
                                  </p>
                                  {/* Modifiers List */}
                                  {item.modifiers && item.modifiers.length > 0 && (
                                    <div className="mt-1 space-y-0.5 pl-2 border-l border-rose-500/30">
                                      {item.modifiers.map((mod, mIdx) => (
                                        <p key={mIdx} className="text-[10px] text-[#A0A5B9] font-medium">
                                          + {mod.label}
                                        </p>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <span className="rounded bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 text-[10px] font-black text-rose-400">
                                  x{item.quantity}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-4 pt-3 border-t border-[#2B2F44]/30">
                          <button
                            onClick={() => updateStatus(id, "served")}
                            disabled={updatingId === id}
                            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-rose-600 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-rose-950/20 transition-all hover:bg-rose-700 disabled:opacity-50"
                          >
                            <ChevronRight className="h-4 w-4 animate-bounce" />
                            {updatingId === id ? "Bumping..." : "Bump to Served"}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
