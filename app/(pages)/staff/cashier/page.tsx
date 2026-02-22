"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Receipt, CheckCircle2 } from "lucide-react";
import StaffSidebar from "@/app/components/StaffSidebar";
import { api } from "@/app/lib/api";
import { toast } from "react-hot-toast";

type Table = {
  id: string;
  table_number: number;
  is_enabled: boolean;
  floor_name?: string;
  counter_name?: string;
};

type ActiveSession = {
  session_id: string;
  table_number: number;
};

type ActiveOrderItem = {
  quantity: number;
  price: number;
};

type ActiveOrder = {
  status: string;
  table_number: number;
  session_id: string;
  items: ActiveOrderItem[];
};

export default function CashierPage() {
  const router = useRouter();
  const [tables, setTables] = useState<Table[]>([]);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [orders, setOrders] = useState<ActiveOrder[]>([]);
  const [closingSessionId, setClosingSessionId] = useState<string | null>(null);
  const [floorFilter, setFloorFilter] = useState<string>("all");
  const [counterFilter, setCounterFilter] = useState<string>("all");

  const refresh = async () => {
    const [tablesRes, sessionsRes, ordersRes] = await Promise.all([
      api<Table[]>("/api/admin/tables"),
      api<{ sessions: ActiveSession[] }>("/api/admin/sessions/active"),
      api<{ orders: ActiveOrder[] }>("/api/admin/orders/active"),
    ]);
    setTables(tablesRes || []);
    setSessions(sessionsRes?.sessions || []);
    setOrders(ordersRes?.orders || []);
  };

  useEffect(() => {
    let active = true;
    const guardRole = async () => {
      try {
        const me = await api<{ role?: string }>("/api/admin/me");
        if (!active) return;
        const role = (me?.role || "").toLowerCase();
        if (!["cashier", "owner", "manager"].includes(role)) {
          router.replace("/staff");
          return;
        }
        await refresh();
      } catch {
        if (!active) return;
        router.replace("/staff");
      }
    };
    guardRole();
    const t = window.setInterval(() => {
      refresh().catch(() => {
        // ignore polling errors
      });
    }, 5000);
    return () => {
      active = false;
      window.clearInterval(t);
    };
  }, [router]);

  const rows = useMemo(() => {
    const sessionByTable = new Map<number, string>();
    for (const s of sessions) sessionByTable.set(s.table_number, s.session_id);
    const tableMetaByNumber = new Map<number, { floor: string; counter: string }>();
    for (const t of tables) {
      tableMetaByNumber.set(t.table_number, {
        floor: t.floor_name || "Main Floor",
        counter: t.counter_name || "Counter A",
      });
    }

    const totalByTable = new Map<number, number>();
    for (const o of orders) {
      if (o.status === "completed" || o.status === "cancelled" || o.status === "cart") continue;
      const orderTotal = (o.items || []).reduce((sum, item) => sum + (item.quantity * item.price), 0);
      totalByTable.set(o.table_number, (totalByTable.get(o.table_number) || 0) + orderTotal);
    }

    return tables
      .filter((t) => t.is_enabled)
      .map((t) => ({
        table_number: t.table_number,
        session_id: sessionByTable.get(t.table_number),
        amount_due: totalByTable.get(t.table_number) || 0,
        floor_name: tableMetaByNumber.get(t.table_number)?.floor || "Main Floor",
        counter_name: tableMetaByNumber.get(t.table_number)?.counter || "Counter A",
      }))
      .filter((r) => Boolean(r.session_id))
      .filter((r) => (floorFilter === "all" ? true : r.floor_name === floorFilter))
      .filter((r) => (counterFilter === "all" ? true : r.counter_name === counterFilter))
      .sort((a, b) => a.table_number - b.table_number);
  }, [tables, sessions, orders, floorFilter, counterFilter]);

  const floors = useMemo(
    () => Array.from(new Set(tables.map((t) => t.floor_name || "Main Floor"))).sort(),
    [tables]
  );
  const counters = useMemo(
    () => Array.from(new Set(tables.map((t) => t.counter_name || "Counter A"))).sort(),
    [tables]
  );

  const markPaidAndClose = async (sessionId: string) => {
    setClosingSessionId(sessionId);
    try {
      await api(`/api/admin/sessions/${sessionId}/end`, {
        method: "POST",
        body: JSON.stringify({ mark_paid: true, payment_mode: "cash" }),
      });
      toast.success("Marked paid and closed table");
      await refresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to close table");
    } finally {
      setClosingSessionId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        <StaffSidebar />
        <main className="flex-1 p-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900">Cashier Counter</h1>
                <p className="text-sm text-slate-500">Close table bills by location and session.</p>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <select
                value={floorFilter}
                onChange={(e) => setFloorFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
              >
                <option value="all">All Floors</option>
                {floors.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
              <select
                value={counterFilter}
                onChange={(e) => setCounterFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
              >
                <option value="all">All Counters</option>
                {counters.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {rows.map((row) => (
                <div key={row.session_id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Table</p>
                    <Receipt className="h-4 w-4 text-slate-400" />
                  </div>
                  <p className="mt-1 text-3xl font-black text-slate-900">T{row.table_number}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{row.floor_name} • {row.counter_name}</p>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Amount due</p>
                  <p className="text-2xl font-black text-emerald-700">₹{Math.round(row.amount_due)}</p>

                  <button
                    onClick={() => row.session_id && markPaidAndClose(row.session_id)}
                    disabled={!row.session_id || closingSessionId === row.session_id}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {closingSessionId === row.session_id ? "Closing..." : "Mark Paid & Close"}
                  </button>
                </div>
              ))}
            </div>

            {rows.length === 0 && (
              <div className="mt-12 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <p className="text-lg font-bold text-slate-700">No active bills right now</p>
                <p className="mt-1 text-sm text-slate-500">Active table sessions with pending bills will appear here.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
