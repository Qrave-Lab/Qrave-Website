"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  format,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isToday,
  isYesterday,
} from "date-fns";
import {
  Clock,
  Receipt,
  ChevronRight,
  X,
  Loader2,
  Calendar,
  Printer,
  Search,
  RefreshCw,
  ShoppingBag,
  UtensilsCrossed,
  Download,
  ArrowRight,
  SlidersHorizontal,
} from "lucide-react";
import StaffSidebar from "@/app/components/StaffSidebar";
import { api } from "@/app/lib/api";
import { printReceipt, type ReceiptData } from "@/app/lib/print";
import { toast } from "react-hot-toast";

type RecentOrderInfo = {
  id: string;
  type: string;
  name: string;
  amount: number;
  payment_mode?: string;
  created_at: string;
};

type UnifiedHistoryItem = {
  name: string;
  variant_label?: string;
  quantity: number;
  price: number;
};

type UnifiedHistoryDetail = {
  id: string;
  type: string;
  name: string;
  payment_mode?: string;
  breakdown: {
    subtotal: number;
    discount: number;
    service_charge: number;
    tax: number;
    total: number;
    tax_percent: number;
    service_percent: number;
    tax_details?: string;
  };
  items: UnifiedHistoryItem[];
};

export default function OrderHistoryPage() {
  const router = useRouter();

  // Filters
  const [dateFilter, setDateFilter] = useState<"today" | "yesterday" | "week" | "month" | "custom">("today");
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    return format(d, "yyyy-MM-dd");
  });
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    return format(d, "yyyy-MM-dd");
  });
  const [typeFilter, setTypeFilter] = useState<"all" | "dine_in" | "takeaway">("all");

  // Data
  const [orders, setOrders] = useState<RecentOrderInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Detail View
  const [selectedOrder, setSelectedOrder] = useState<UnifiedHistoryDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [me, setMe] = useState<any>(null);

  useEffect(() => {
    api<any>("/api/admin/me")
      .then((res) => {
        const role = (res?.role || "").toLowerCase();
        if (!["cashier", "manager", "owner", "admin"].includes(role)) {
          router.replace("/staff");
          return;
        }
        setMe(res);
      })
      .catch(() => router.replace("/staff"));
  }, [router]);

  const loadOrders = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      let fDate = new Date();
      let tDate = new Date();
      const today = new Date();

      if (dateFilter === "today") {
        fDate = new Date(today.setHours(0, 0, 0, 0));
        tDate = new Date(today.setHours(23, 59, 59, 999));
      } else if (dateFilter === "yesterday") {
        const yest = subDays(new Date(), 1);
        fDate = new Date(yest.setHours(0, 0, 0, 0));
        tDate = new Date(yest.setHours(23, 59, 59, 999));
      } else if (dateFilter === "week") {
        fDate = startOfWeek(new Date(), { weekStartsOn: 1 });
        tDate = endOfWeek(new Date(), { weekStartsOn: 1 });
      } else if (dateFilter === "month") {
        fDate = startOfMonth(new Date());
        tDate = endOfMonth(new Date());
      } else if (dateFilter === "custom") {
        fDate = new Date(fromDate + "T00:00:00");
        tDate = new Date(toDate + "T23:59:59.999");
      }

      const query = new URLSearchParams({
        from: fDate.toISOString(),
        to: tDate.toISOString(),
        type: typeFilter,
        limit: "500",
      });

      const res = await api<any>(`/api/admin/orders/recent-completed?${query.toString()}`);
      // Backend returns a bare array (not wrapped in {orders:[]})
      if (Array.isArray(res)) {
        setOrders(res);
      } else if (res && Array.isArray(res.orders)) {
        setOrders(res.orders);
      } else {
        setOrders([]);
      }
    } catch (err) {
      toast.error("Failed to load order history");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter, fromDate, toDate, typeFilter]);

  const fetchOrderDetail = async (order: RecentOrderInfo) => {
    setIsDetailLoading(true);
    setSelectedOrder(null);
    try {
      const res = await api<UnifiedHistoryDetail>(
        `/api/admin/history/orders/${order.id}?type=${order.type}`
      );
      setSelectedOrder(res);
    } catch (err) {
      toast.error("Failed to load receipt details");
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handlePrint = () => {
    if (!selectedOrder || !me) return;
    const bd = selectedOrder.breakdown;

    let tn = null;
    if (selectedOrder.type === "dine_in") {
      const m = selectedOrder.name.match(/T(\d+)/i) || selectedOrder.name.match(/Table\s*(\d+)/i);
      if (m) tn = parseInt(m[1], 10);
    }

    const printData: ReceiptData = {
      restaurant_name: me.restaurant || "Qrave Restaurant",
      table_number: tn !== null ? tn : undefined,
      order_number: null,
      items: selectedOrder.items.map((it) => ({
        name: it.name,
        variant_label: it.variant_label || undefined,
        quantity: it.quantity,
        unit_price: it.price,
      })),
      subtotal: bd.subtotal,
      discount: bd.discount,
      service_charge: bd.service_charge,
      tax: bd.tax,
      total: bd.total,
      tax_percent: bd.tax_percent,
      service_percent: bd.service_percent,
      payment_mode: selectedOrder.payment_mode || "Paid",
      paid_at: new Date().toISOString(),
      cashier_name: me.name || "Cashier",
      gst_number: me.gst_number || "",
      tax_details: bd.tax_details,
    };

    printReceipt(printData);
  };

  const filteredOrders = useMemo(() => {
    if (!searchTerm.trim()) return orders;
    const q = searchTerm.toLowerCase().trim();
    return orders.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.amount.toString().includes(q) ||
        (o.payment_mode && o.payment_mode.toLowerCase().includes(q)) ||
        o.id.toLowerCase().includes(q)
    );
  }, [orders, searchTerm]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      toast.error("No orders to export");
      return;
    }

    const headers = ["Order ID", "Type", "Table/Customer", "Amount (INR)", "Payment Mode", "Date", "Time"];
    const rows = filteredOrders.map((o) => [
      o.id,
      o.type === "dine_in" ? "Dine-In" : "Takeaway",
      `"${o.name.replace(/"/g, '""')}"`,
      o.amount.toFixed(2),
      o.payment_mode || "Paid",
      format(new Date(o.created_at), "yyyy-MM-dd"),
      format(new Date(o.created_at), "HH:mm:ss"),
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `order_history_${dateFilter}_${format(new Date(), "yyyyMMdd_HHmm")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV exported successfully");
  };

  const formatOrderDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) {
      return `Today, ${format(d, "h:mm a")}`;
    }
    if (isYesterday(d)) {
      return `Yesterday, ${format(d, "h:mm a")}`;
    }
    return format(d, "MMM d, yyyy • h:mm a");
  };

  return (
    <div className="flex h-screen w-full bg-[#F8FAFC] text-slate-900 overflow-hidden font-sans">
      <StaffSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200/80 px-8 py-5 flex flex-col gap-5 z-10 sticky top-0 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            {/* Title Block */}
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500/10 to-amber-500/10 text-[#fe5c13] ring-1 ring-[#fe5c13]/20 flex items-center justify-center shadow-xs">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl font-bold tracking-tight text-slate-900">Order History</h1>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200/60">
                    {filteredOrders.length} {filteredOrders.length === 1 ? "order" : "orders"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 font-normal">
                  Inspect completed bills, verify payment modes & reprint receipts
                </p>
              </div>
            </div>

            {/* Controls (Search + Actions) */}
            <div className="flex items-center gap-2.5">
              <div className="relative w-72">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search table, customer, amount..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9.5 pr-8 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200/90 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#fe5c13]/20 focus:border-[#fe5c13] transition-all shadow-xs"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                onClick={() => loadOrders(true)}
                disabled={isRefreshing}
                title="Refresh order list"
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-xs active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-[#fe5c13]" : ""}`} />
              </button>

              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all shadow-xs active:scale-95"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Unified Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            
            {/* Segmented Channel Filter */}
            <div className="inline-flex bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 shadow-inner">
              {[
                { id: "all", label: "All Orders", count: orders.length },
                { id: "dine_in", label: "Dine-In", count: orders.filter((o) => o.type === "dine_in").length },
                { id: "takeaway", label: "Takeaway", count: orders.filter((o) => o.type !== "dine_in").length },
              ].map((t) => {
                const active = typeFilter === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTypeFilter(t.id as any)}
                    className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      active
                        ? "bg-white text-slate-900 shadow-sm font-bold ring-1 ring-black/5"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>{t.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        active ? "bg-[#fe5c13]/10 text-[#fe5c13]" : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {t.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Date Range Selector & Custom Inputs */}
            <div className="flex items-center gap-2">
              <div className="inline-flex bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 shadow-inner">
                {[
                  { id: "today", label: "Today" },
                  { id: "yesterday", label: "Yesterday" },
                  { id: "week", label: "This Week" },
                  { id: "month", label: "This Month" },
                  { id: "custom", label: "Custom", icon: SlidersHorizontal },
                ].map((d) => {
                  const active = dateFilter === d.id;
                  const Icon = d.icon;
                  return (
                    <button
                      key={d.id}
                      onClick={() => setDateFilter(d.id as any)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        active
                          ? "bg-white text-[#fe5c13] shadow-sm font-bold ring-1 ring-black/5"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {Icon && <Icon className="w-3 h-3" />}
                      <span>{d.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Styled Custom Date Range Picker */}
              <AnimatePresence>
                {dateFilter === "custom" && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex items-center gap-1.5 bg-white border border-slate-200/90 shadow-xs px-2.5 py-1 rounded-xl"
                  >
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-0.5" />
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="bg-transparent border-none text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer py-1"
                    />
                    <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="bg-transparent border-none text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer py-1"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto px-8 py-6 space-y-6">

          {/* Orders Table Container */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-28 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mb-3 text-[#fe5c13]" />
                <p className="text-sm font-semibold text-slate-600">Retrieving order history...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-28 text-slate-400">
                <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center mb-4">
                  <Receipt className="w-8 h-8 opacity-40 text-slate-500" />
                </div>
                <p className="text-base font-bold text-slate-700">No completed orders found</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm text-center">
                  Try adjusting the date range or order type filter to find older transactions.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-200/80">
                      <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Order & Table
                      </th>
                      <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Type
                      </th>
                      <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Completed Time
                      </th>
                      <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Payment Mode
                      </th>
                      <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">
                        Total Amount
                      </th>
                      <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOrders.map((order) => {
                      const isDineIn = order.type === "dine_in";
                      return (
                        <tr
                          key={order.id}
                          onClick={() => fetchOrderDetail(order)}
                          className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                        >
                          {/* Order & Table */}
                          <td className="px-6 py-4.5">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                  isDineIn
                                    ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/10"
                                    : "bg-orange-50 text-[#fe5c13] ring-1 ring-[#fe5c13]/10"
                                }`}
                              >
                                {isDineIn ? (
                                  <UtensilsCrossed className="w-4 h-4" />
                                ) : (
                                  <ShoppingBag className="w-4 h-4" />
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-900 group-hover:text-[#fe5c13] transition-colors">
                                  {order.name}
                                </p>
                                <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                                  #{order.id.slice(0, 8)}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Type */}
                          <td className="px-6 py-4.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
                                isDineIn
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                                  : "bg-orange-50 text-[#fe5c13] border-orange-200/60"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isDineIn ? "bg-emerald-500" : "bg-[#fe5c13]"
                                }`}
                              />
                              {isDineIn ? "Dine-In" : "Takeaway"}
                            </span>
                          </td>

                          {/* Completed Time */}
                          <td className="px-6 py-4.5">
                            <p className="text-xs font-semibold text-slate-700">
                              {formatOrderDate(order.created_at)}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                              {format(new Date(order.created_at), "EEEE")}
                            </p>
                          </td>

                          {/* Payment Mode */}
                          <td className="px-6 py-4.5">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/60 uppercase tracking-wide">
                              {order.payment_mode || "Paid"}
                            </span>
                          </td>

                          {/* Total Amount */}
                          <td className="px-6 py-4.5 text-right">
                            <p className="text-base font-black text-slate-900 tracking-tight">
                              ₹{order.amount.toFixed(2)}
                            </p>
                          </td>

                          {/* Action Button */}
                          <td className="px-6 py-4.5 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                fetchOrderDetail(order);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 group-hover:bg-[#fe5c13] group-hover:text-white transition-all shadow-2xs"
                            >
                              <span>View Receipt</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Slide-over Receipt Drilldown Panel */}
      <AnimatePresence>
        {(isDetailLoading || selectedOrder) && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/30 backdrop-blur-xs"
              onClick={() => setSelectedOrder(null)}
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10"
            >
              {/* Header */}
              <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-orange-50 text-[#fe5c13]">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Receipt Details</h2>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {selectedOrder ? `#${selectedOrder.id}` : "Loading..."}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Receipt Body */}
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                {isDetailLoading ? (
                  <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mb-3 text-[#fe5c13]" />
                    <p className="text-xs font-semibold text-slate-600">Generating receipt...</p>
                  </div>
                ) : selectedOrder ? (
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6 max-w-sm mx-auto font-sans relative">
                    
                    {/* Thermal Receipt Header */}
                    <div className="text-center pb-5 border-b border-dashed border-slate-200">
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">
                        {me?.restaurant || "Qrave Restaurant"}
                      </h3>
                      {me?.gst_number && (
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                          GSTIN: {me.gst_number}
                        </p>
                      )}
                      <div className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-700">
                        {selectedOrder.type === "dine_in" ? (
                          <UtensilsCrossed className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <ShoppingBag className="w-3.5 h-3.5 text-[#fe5c13]" />
                        )}
                        <span>{selectedOrder.name}</span>
                      </div>
                    </div>

                    {/* Items List */}
                    <div className="py-4 space-y-3">
                      <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
                        <span>Item</span>
                        <span>Total</span>
                      </div>

                      {selectedOrder.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between items-start text-xs">
                          <div className="flex-1 pr-3">
                            <div className="font-bold text-slate-800">
                              <span className="text-[#fe5c13] font-black mr-1.5">{it.quantity}x</span>
                              {it.name}
                            </div>
                            {it.variant_label && (
                              <div className="text-[10px] text-slate-400 pl-4">{it.variant_label}</div>
                            )}
                            <div className="text-[10px] text-slate-400 pl-4">
                              ₹{it.price.toFixed(2)} each
                            </div>
                          </div>
                          <div className="font-bold text-slate-900">
                            ₹{(it.quantity * it.price).toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Financial Summary */}
                    <div className="border-t border-dashed border-slate-200 pt-4 space-y-2">
                      <div className="flex justify-between text-xs font-medium text-slate-500">
                        <span>Subtotal</span>
                        <span className="font-semibold text-slate-700">
                          ₹{selectedOrder.breakdown.subtotal.toFixed(2)}
                        </span>
                      </div>

                      {selectedOrder.breakdown.discount > 0 && (
                        <div className="flex justify-between text-xs font-medium text-rose-500">
                          <span>Discount</span>
                          <span className="font-semibold">-₹{selectedOrder.breakdown.discount.toFixed(2)}</span>
                        </div>
                      )}

                      {selectedOrder.breakdown.service_charge > 0 && (
                        <div className="flex justify-between text-xs font-medium text-slate-500">
                          <span>Service Charge ({selectedOrder.breakdown.service_percent}%)</span>
                          <span className="font-semibold text-slate-700">
                            ₹{selectedOrder.breakdown.service_charge.toFixed(2)}
                          </span>
                        </div>
                      )}

                      {selectedOrder.breakdown.tax > 0 && (
                        <div className="flex justify-between text-xs font-medium text-slate-500">
                          <span>GST / Taxes ({selectedOrder.breakdown.tax_percent}%)</span>
                          <span className="font-semibold text-slate-700">
                            ₹{selectedOrder.breakdown.tax.toFixed(2)}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between items-center text-base font-black text-slate-900 pt-3 border-t border-slate-200 mt-2">
                        <span>Grand Total</span>
                        <span className="text-lg text-[#fe5c13]">
                          ₹{selectedOrder.breakdown.total.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Footer Info */}
                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <span>Method: {selectedOrder.payment_mode || "Paid"}</span>
                      <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-black">
                        COMPLETED
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Action Bar */}
              {selectedOrder && (
                <div className="p-4 border-t border-slate-100 bg-white">
                  <button
                    onClick={handlePrint}
                    className="w-full py-3 bg-[#fe5c13] hover:bg-orange-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Thermal Receipt</span>
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
