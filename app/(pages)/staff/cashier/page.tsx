"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Receipt, CheckCircle2, DollarSign, Wallet, ArrowRight, Printer, X, Loader2 } from "lucide-react";
import StaffSidebar from "@/app/components/StaffSidebar";
import { api } from "@/app/lib/api";
import { toast } from "react-hot-toast";
import { printReceipt, type ReceiptData, type ReceiptItem } from "@/app/lib/print";

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
  menu_item_name?: string;
  variant_label?: string | null;
};

type ActiveOrder = {
  status: string;
  table_number: number;
  session_id: string;
  items: ActiveOrderItem[];
};

type BillBreakdown = {
  subtotal: number;
  discount: number;
  service_charge: number;
  tax: number;
  total: number;
  tax_percent: number;
  service_percent: number;
  tax_details?: string;
};

type ActiveShift = {
  id: string;
  user_name: string;
  role: string;
  is_clocked_in: boolean;
};

export default function CashierPage() {
  const router = useRouter();
  const [tables, setTables] = useState<Table[]>([]);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [orders, setOrders] = useState<ActiveOrder[]>([]);
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
  const [gstNumber, setGstNumber] = useState<string>("");
  const [restaurantName, setRestaurantName] = useState<string>("Qrave Restaurant");

  const [closingSessionId, setClosingSessionId] = useState<string | null>(null);
  const [floorFilter, setFloorFilter] = useState<string>("all");
  const [counterFilter, setCounterFilter] = useState<string>("all");

  // Selection state
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedTableNumber, setSelectedTableNumber] = useState<number | null>(null);
  const [breakdown, setBreakdown] = useState<BillBreakdown | null>(null);
  const [isBreakdownLoading, setIsBreakdownLoading] = useState(false);

  // Payment states
  const [paymentMode, setPaymentMode] = useState<"cash" | "card" | "upi">("cash");
  const [cashReceived, setCashReceived] = useState<string>("");
  const [changeDue, setChangeDue] = useState<number>(0);

  const refresh = async () => {
    const [tablesRes, sessionsRes, ordersRes, shiftRes] = await Promise.all([
      api<Table[]>("/api/admin/tables"),
      api<{ sessions: ActiveSession[] }>("/api/admin/sessions/active"),
      api<{ orders: ActiveOrder[] }>("/api/admin/orders/active"),
      api<{ shift: ActiveShift | null; is_clocked_in: boolean }>("/api/admin/shifts/active").catch(() => ({ shift: null, is_clocked_in: false })),
    ]);
    setTables(tablesRes || []);
    setSessions(sessionsRes?.sessions || []);
    setOrders(ordersRes?.orders || []);
    if (shiftRes?.is_clocked_in && shiftRes.shift) {
      setActiveShift(shiftRes.shift);
    } else {
      setActiveShift(null);
    }
  };

  useEffect(() => {
    let active = true;
    const guardRole = async () => {
      try {
        const me = await api<{ role?: string; gst_number?: string; restaurant?: string }>("/api/admin/me");
        if (!active) return;
        const role = (me?.role || "").toLowerCase();
        if (!["cashier", "owner", "manager"].includes(role)) {
          router.replace("/staff");
          return;
        }
        if (me?.gst_number) setGstNumber(me.gst_number);
        if (me?.restaurant) setRestaurantName(me.restaurant);
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
    }, 30000);
    const onFocus = () => refresh().catch(() => { });
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      window.clearInterval(t);
      window.removeEventListener("focus", onFocus);
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

  const openCheckout = async (sessionId: string, tableNumber: number) => {
    setSelectedSessionId(sessionId);
    setSelectedTableNumber(tableNumber);
    setIsBreakdownLoading(true);
    setCashReceived("");
    setChangeDue(0);
    setPaymentMode("cash");
    try {
      const res = await api<{ breakdown: BillBreakdown }>(`/api/admin/bills/session/${sessionId}`);
      if (res?.breakdown) {
        setBreakdown(res.breakdown);
      } else {
        toast.error("Failed to load bill breakdown");
      }
    } catch {
      toast.error("Failed to fetch bill details");
    } finally {
      setIsBreakdownLoading(false);
    }
  };

  const handleCashChange = (val: string) => {
    setCashReceived(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && breakdown) {
      setChangeDue(Math.max(0, parsed - breakdown.total));
    } else {
      setChangeDue(0);
    }
  };

  const selectQuickCash = (amt: number) => {
    handleCashChange(amt.toString());
  };

  const printBillReceipt = () => {
    if (!breakdown || !selectedTableNumber) return;

    // Filter relevant session orders
    const sessionOrders = orders.filter((o) => o.session_id === selectedSessionId && o.status !== "cancelled" && o.status !== "cart");
    const items: ReceiptItem[] = [];

    sessionOrders.forEach((o) => {
      o.items.forEach((it) => {
        items.push({
          name: it.menu_item_name || "Item",
          variant_label: it.variant_label,
          quantity: it.quantity,
          unit_price: it.price,
        });
      });
    });

    const data: ReceiptData = {
      restaurant_name: restaurantName,
      table_number: selectedTableNumber,
      order_number: null,
      items,
      subtotal: breakdown.subtotal,
      discount: breakdown.discount,
      service_charge: breakdown.service_charge,
      tax: breakdown.tax,
      total: breakdown.total,
      tax_percent: breakdown.tax_percent,
      service_percent: breakdown.service_percent,
      payment_mode: paymentMode,
      paid_at: new Date().toISOString(),
      cashier_name: activeShift?.user_name || "Cashier Counter",
      gst_number: gstNumber,
      tax_details: breakdown.tax_details,
    };

    printReceipt(data);
  };

  const markPaidAndClose = async () => {
    if (!selectedSessionId || !breakdown) return;
    setClosingSessionId(selectedSessionId);
    try {
      // 1. Mark paid
      await api(`/api/admin/payments/status`, {
        method: "POST",
        body: JSON.stringify({
          session_id: selectedSessionId,
          status: "paid",
          payment_mode: paymentMode,
          reason: "cashier_close",
        }),
      });

      // 2. Record Cash drawer sale event if payment was Cash
      if (paymentMode === "cash") {
        await api(`/api/admin/cash-drawer/event`, {
          method: "POST",
          body: JSON.stringify({
            event_type: "sale",
            amount: breakdown.total,
            note: `Sale for Table T${selectedTableNumber} (Session close)`,
            shift_id: activeShift?.id || "",
          }),
        });
      }

      // 3. End Session
      await api(`/api/admin/sessions/${selectedSessionId}/end`, {
        method: "POST",
      });

      toast.success("Table bill closed successfully!");
      
      // Prompt printing receipt
      printBillReceipt();

      setSelectedSessionId(null);
      setBreakdown(null);
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
            {/* Header */}
            <div className="mb-6 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-orange-100 p-2 text-orange-600">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-slate-900">Cashier Counter</h1>
                  <p className="text-sm text-slate-500">Close table bills, accept payments & print receipts.</p>
                </div>
              </div>

              {activeShift && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 flex items-center gap-2 shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Drawer Active: {activeShift.user_name}
                </div>
              )}
            </div>

            {/* Filters */}
            <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2">
              <select
                value={floorFilter}
                onChange={(e) => setFloorFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm"
              >
                <option value="all">All Floors</option>
                {floors.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
              <select
                value={counterFilter}
                onChange={(e) => setCounterFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm"
              >
                <option value="all">All Counters</option>
                {counters.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {rows.map((row) => (
                <div key={row.session_id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Table</p>
                    <Receipt className="h-4 w-4 text-slate-400" />
                  </div>
                  <p className="mt-1 text-3xl font-black text-slate-900">T{row.table_number}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{row.floor_name} • {row.counter_name}</p>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Amount due</p>
                  <p className="text-2xl font-black text-emerald-700">₹{Math.round(row.amount_due)}</p>

                  <button
                    onClick={() => row.session_id && openCheckout(row.session_id, row.table_number)}
                    disabled={!row.session_id}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm transition-all"
                  >
                    Checkout & Settle
                    <ArrowRight className="h-4 w-4" />
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

      {/* Checkout Sidebar/Modal */}
      {selectedSessionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-sm">
          <div className="h-full w-full max-w-lg bg-white p-6 shadow-2xl flex flex-col justify-between overflow-y-auto">
            <div>
              {/* Checkout Header */}
              <div className="flex items-center justify-between border-b pb-4 mb-6">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Settle Table T{selectedTableNumber}</h2>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Checkout Terminal</p>
                </div>
                <button
                  onClick={() => { setSelectedSessionId(null); setBreakdown(null); }}
                  className="rounded-lg p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {isBreakdownLoading ? (
                <div className="flex h-48 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                </div>
              ) : breakdown ? (
                <>
                  {/* Bill Summary */}
                  <div className="rounded-2xl bg-slate-50 border p-4 mb-6">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">Bill Breakdown</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm font-semibold text-slate-600">
                        <span>Subtotal</span>
                        <span>₹{breakdown.subtotal.toFixed(2)}</span>
                      </div>
                      {breakdown.discount > 0 && (
                        <div className="flex justify-between text-sm font-semibold text-rose-600">
                          <span>Discount Applied</span>
                          <span>-₹{breakdown.discount.toFixed(2)}</span>
                        </div>
                      )}
                      {breakdown.service_charge > 0 && (
                        <div className="flex justify-between text-sm font-semibold text-slate-600">
                          <span>Service Charge ({breakdown.service_percent}%)</span>
                          <span>₹{breakdown.service_charge.toFixed(2)}</span>
                        </div>
                      )}
                      {breakdown.tax > 0 && (
                        <div className="flex justify-between text-sm font-semibold text-slate-600">
                          <span>Tax ({breakdown.tax_percent}%)</span>
                          <span>₹{breakdown.tax.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t pt-2 text-lg font-black text-slate-900">
                        <span>Grand Total</span>
                        <span>₹{breakdown.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Mode */}
                  <div className="mb-6">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">Select Payment Mode</h3>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setPaymentMode("cash")}
                        className={`flex flex-col items-center gap-2 rounded-xl border p-3.5 text-xs font-bold transition-all shadow-sm ${paymentMode === "cash" ? "border-orange-500 bg-orange-500/10 text-orange-600" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"}`}
                      >
                        <DollarSign className="h-5 w-5" />
                        Cash Payment
                      </button>
                      <button
                        onClick={() => setPaymentMode("card")}
                        className={`flex flex-col items-center gap-2 rounded-xl border p-3.5 text-xs font-bold transition-all shadow-sm ${paymentMode === "card" ? "border-orange-500 bg-orange-500/10 text-orange-600" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"}`}
                      >
                        <CreditCard className="h-5 w-5" />
                        Card / POS
                      </button>
                      <button
                        onClick={() => setPaymentMode("upi")}
                        className={`flex flex-col items-center gap-2 rounded-xl border p-3.5 text-xs font-bold transition-all shadow-sm ${paymentMode === "upi" ? "border-orange-500 bg-orange-500/10 text-orange-600" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"}`}
                      >
                        <Wallet className="h-5 w-5" />
                        UPI QR Code
                      </button>
                    </div>
                  </div>

                  {/* Cash received details */}
                  {paymentMode === "cash" && (
                    <div className="space-y-4 mb-6">
                      <div>
                        <label className="text-xs font-black uppercase tracking-wider text-slate-400">Cash Received (₹)</label>
                        <input
                          type="number"
                          value={cashReceived}
                          onChange={(e) => handleCashChange(e.target.value)}
                          placeholder="Enter cash received"
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-sm focus:border-orange-500 focus:outline-none"
                        />
                      </div>
                      
                      {/* Till Buttons */}
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Quick Cash Till</p>
                        <div className="flex flex-wrap gap-1.5">
                          {[100, 200, 500, 1000, 2000].map((amt) => (
                            <button
                              key={amt}
                              onClick={() => selectQuickCash(amt)}
                              className="rounded-lg border bg-slate-50 px-3 py-1.5 text-xs font-extrabold hover:bg-slate-100 border-slate-200 text-slate-700"
                            >
                              ₹{amt}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 flex items-center justify-between text-emerald-800">
                        <span className="text-xs font-bold">Change Due to Guest:</span>
                        <span className="text-lg font-black">₹{changeDue.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm font-bold text-slate-500">Failed to render checkout breakdown.</p>
              )}
            </div>

            {/* Print and Settle buttons */}
            <div className="space-y-2 mt-8 pt-4 border-t">
              <button
                onClick={printBillReceipt}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
              >
                <Printer className="h-4 w-4" />
                Print Bill Receipt
              </button>
              <button
                onClick={markPaidAndClose}
                disabled={closingSessionId !== null || (paymentMode === 'cash' && (!cashReceived || parseFloat(cashReceived) < (breakdown?.total || 0)))}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#090A0F] px-4 py-3.5 text-sm font-black uppercase tracking-wider text-white hover:bg-slate-800 shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                {closingSessionId ? "Settling..." : "Mark Paid & Settle"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
