"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChefHat, Clock3, Loader2, LogOut, RefreshCw, UtensilsCrossed } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { api } from "@/app/lib/api";
import { connectEventSocket, type EventSocketMessage } from "@/app/lib/eventSocket";

type ActiveOrderItem = {
  menu_item_id: string;
  variant_id: string;
  quantity: number;
  price: number;
  menu_item_name: string;
  variant_label?: string | null;
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
  items: ActiveOrderItem[];
};

export default function KitchenDisplayPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<ActiveOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [isKitchenPaused, setIsKitchenPaused] = useState(false);
  const prevIds = useRef<Set<string>>(new Set());
  const ordersRef = useRef<ActiveOrder[]>([]);

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  const acceptedOrders = useMemo(
    () =>
      orders
        .filter((o) => o.status === "accepted")
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [orders]
  );

  const upsertOrder = useCallback((incoming: ActiveOrder) => {
    const orderId = incoming.id || incoming.order_id;
    if (!orderId) return;
    const normalized: ActiveOrder = { ...incoming, id: orderId, order_id: orderId };
    setOrders((prev) => [normalized, ...prev.filter((o) => (o.id || o.order_id) !== orderId)]);
  }, []);

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const me = await api<{ role?: string }>("/api/admin/me", { method: "GET" });
      const role = (me?.role || "").toLowerCase();
      if (!["owner", "manager", "kitchen"].includes(role)) {
        router.replace("/staff");
        return;
      }

      const res = await api<{ orders: ActiveOrder[] }>("/api/admin/orders/active");
      const capacity = await api<{ is_paused?: boolean }>("/api/admin/kitchen/capacity");
      setIsKitchenPaused(Boolean(capacity?.is_paused));
      const list = res?.orders || [];
      const nextIds = new Set<string>(list.map((o) => o.id || o.order_id || "").filter(Boolean));
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
  }, [router]);

  useEffect(() => {
    fetchOrders().catch(() => undefined);
    const t = window.setInterval(() => {
      fetchOrders(true).catch(() => undefined);
    }, 15000);
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
        }
      },
    });

    return () => cleanup();
  }, [upsertOrder]);

  const markReady = async (orderId: string) => {
    if (!orderId || markingId) return;
    const previous = orders;
    setOrders((prev) =>
      prev.map((o) => ((o.id || o.order_id) === orderId ? { ...o, status: "ready" } : o))
    );
    setMarkingId(orderId);
    try {
      await api(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "ready" }),
      });
      toast.success("Order marked as ready");
    } catch {
      setOrders(previous);
      toast.error("Unable to update order");
    } finally {
      setMarkingId(null);
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

  const getAge = (createdAt: string) => {
    const mins = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  const getOrderTag = (createdAt: string): { label: string; className: string; headerClass: string } => {
    const mins = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
    if (mins <= 5) {
      return {
        label: "New",
        className: "bg-emerald-50 text-emerald-700 border border-emerald-200",
        headerClass: "bg-emerald-50 border-emerald-200",
      };
    }
    if (mins <= 15) {
      return {
        label: "Attention",
        className: "bg-amber-50 text-amber-700 border border-amber-200",
        headerClass: "bg-amber-50 border-amber-200",
      };
    }
    return {
      label: "Delayed",
      className: "bg-red-50 text-red-700 border border-red-200",
      headerClass: "bg-red-50 border-red-200",
    };
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
            <ChefHat className="h-6 w-6 text-orange-500" />
          </div>
          <div>
            <h1 className="text-2xl font-black">Kitchen Display</h1>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Accepted orders queue</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            New: 0-5m
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Attention: 6-15m
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            Delayed: 15m+
          </div>
          <button
            onClick={() => fetchOrders().catch(() => undefined)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider hover:bg-slate-100 inline-flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={signOut}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider hover:bg-slate-100 inline-flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
        </div>
      ) : acceptedOrders.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <UtensilsCrossed className="mx-auto h-10 w-10 text-slate-500" />
          <p className="mt-3 text-lg font-bold text-slate-900">No accepted orders right now</p>
          <p className="mt-1 text-sm text-slate-400">New accepted orders will appear here automatically.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {isKitchenPaused && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
              Kitchen is paused for new order intake (auto-throttle active).
            </div>
          )}
        <div className="grid items-start grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {acceptedOrders.map((order) => {
            const id = order.id || order.order_id || "";
            const tag = getOrderTag(order.created_at);
            return (
              <article key={id} className="h-fit rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
                <div className={`mb-3 flex items-center justify-between rounded-lg border px-2.5 py-2 ${tag.headerClass}`}>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-orange-600">Table T{order.table_number}</p>
                    <p className="mt-1 text-xs text-slate-500">Order #{id.slice(0, 8)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`rounded-lg px-2 py-1 text-xs font-black ${tag.className}`}>
                      {tag.label}
                    </div>
                    <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
                      <Clock3 className="h-3.5 w-3.5" />
                      {getAge(order.created_at)}
                    </div>
                  </div>
                </div>
                {(order.estimated_prep_minutes || order.estimated_ready_at) && (
                  <div className="mb-3 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-700">
                    ETA {order.estimated_prep_minutes ? `${order.estimated_prep_minutes}m` : "--"}
                    {order.estimated_ready_at ? ` • Ready by ${new Date(order.estimated_ready_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
                  </div>
                )}

                <div className="space-y-1.5">
                  {order.items.map((item, idx) => (
                    <div key={`${id}-${idx}`} className="flex items-start justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-2 border border-slate-100">
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold leading-snug text-slate-900 break-words">
                          {item.menu_item_name}
                          {item.variant_label ? <span className="text-slate-500"> ({item.variant_label})</span> : null}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-md bg-orange-50 border border-orange-200 px-2 py-1 text-[11px] font-black text-orange-700">
                        x{item.quantity}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => markReady(id)}
                  disabled={markingId === id}
                  className="mt-3 w-full rounded-lg bg-slate-900 px-3 py-2.5 text-xs font-black uppercase tracking-wider text-white hover:bg-slate-800 disabled:opacity-70"
                >
                  {markingId === id ? "Updating..." : "Mark Ready"}
                </button>
              </article>
            );
          })}
        </div>
        </div>
      )}
    </div>
  );
}
