"use client";

import RefundDialog from "@/app/components/billing/RefundDialog";
import StaffSidebar from "@/app/components/StaffSidebar";
import { api } from "@/app/lib/api";
import { printReceipt, type ReceiptData } from "@/app/lib/print";
import {
  endOfMonth,
  endOfWeek,
  format,
  isToday,
  isYesterday,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronRight,
  Download,
  Loader2,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Utensils,
  X,
} from "lucide-react";
import { DateRangePicker } from "@/app/components/ui/DateRangePicker";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
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
  const [dateFilter, setDateFilter] = useState<
    "today" | "yesterday" | "week" | "month" | "custom"
  >("today");
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    return format(d, "yyyy-MM-dd");
  });
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    return format(d, "yyyy-MM-dd");
  });
  const [typeFilter, setTypeFilter] = useState<"all" | "dine_in" | "takeaway">(
    "all",
  );

  // Data
  const [orders, setOrders] = useState<RecentOrderInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Detail View
  const [selectedOrder, setSelectedOrder] =
    useState<UnifiedHistoryDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  // The row that was clicked: gives the receipt its real date and lets us
  // retry if loading fails.
  const [selectedRow, setSelectedRow] = useState<RecentOrderInfo | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const detailRequestRef = useRef(0);
  const [showRefund, setShowRefund] = useState(false);
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

      const res = await api<any>(
        `/api/admin/orders/recent-completed?${query.toString()}`,
      );
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

  // Today's list keeps up on its own: bills closed on the floor show up
  // within 30 seconds, and straight away when you come back to this tab.
  useEffect(() => {
    if (dateFilter !== "today") return;
    const tick = () => {
      if (document.visibilityState === "visible") void loadOrders(true);
    };
    const id = window.setInterval(tick, 30_000);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter, typeFilter]);

  const closeDetail = () => {
    detailRequestRef.current++;
    setSelectedOrder(null);
    setSelectedRow(null);
    setDetailError(null);
    setIsDetailLoading(false);
  };

  const fetchOrderDetail = async (order: RecentOrderInfo) => {
    const requestId = ++detailRequestRef.current;
    setSelectedRow(order);
    setDetailError(null);
    setIsDetailLoading(true);
    setSelectedOrder(null);
    try {
      const res = await api<UnifiedHistoryDetail>(
        `/api/admin/history/orders/${order.id}?type=${encodeURIComponent(order.type)}`,
        { noCache: true },
      );
      // A newer click (or closing the panel) wins over a slow response.
      if (requestId !== detailRequestRef.current) return;
      if (!res || !res.id) throw new Error("empty receipt");
      const bd = res.breakdown || ({} as UnifiedHistoryDetail["breakdown"]);
      setSelectedOrder({
        ...res,
        name: res.name || order.name,
        payment_mode: res.payment_mode || order.payment_mode,
        items: Array.isArray(res.items)
          ? res.items.map((it: UnifiedHistoryItem) => ({ ...it, quantity: Number(it.quantity) || 0, price: Number(it.price) || 0 }))
          : [],
        breakdown: {
          ...bd,
          subtotal: Number(bd.subtotal) || 0,
          discount: Number(bd.discount) || 0,
          service_charge: Number(bd.service_charge) || 0,
          tax: Number(bd.tax) || 0,
          total: Number(bd.total) || Number(order.amount) || 0,
          tax_percent: Number(bd.tax_percent) || 0,
          service_percent: Number(bd.service_percent) || 0,
        },
      });
    } catch (err) {
      if (requestId !== detailRequestRef.current) return;
      setDetailError("Couldn't load this receipt. Check your connection and try again.");
    } finally {
      if (requestId === detailRequestRef.current) setIsDetailLoading(false);
    }
  };

  const handlePrint = () => {
    if (!selectedOrder || !me) return;
    const bd = selectedOrder.breakdown;

    let tn = null;
    if (selectedOrder.type === "dine_in") {
      const m =
        selectedOrder.name.match(/T(\d+)/i) ||
        selectedOrder.name.match(/Table\s*(\d+)/i);
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
      payment_mode: methodName(selectedOrder.payment_mode) || "Not recorded",
      // The date the bill was paid, not the date it's reprinted.
      paid_at: selectedRow?.created_at || new Date().toISOString(),
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
        o.id.toLowerCase().includes(q),
    );
  }, [orders, searchTerm]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      toast.error("No orders to export");
      return;
    }

    const headers = [
      "Order ID",
      "Type",
      "Table/Customer",
      "Amount (INR)",
      "Payment Mode",
      "Date",
      "Time",
    ];
    const rows = filteredOrders.map((o) => [
      o.id,
      o.type === "dine_in" ? "Dine-In" : "Takeaway",
      `"${o.name.replace(/"/g, '""')}"`,
      o.amount.toFixed(2),
      methodName(o.payment_mode) || "Not recorded",
      format(new Date(o.created_at), "yyyy-MM-dd"),
      format(new Date(o.created_at), "HH:mm:ss"),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `order_history_${dateFilter}_${format(new Date(), "yyyyMMdd_HHmm")}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV exported successfully");
  };

  const inr = (n: number) =>
    `₹${(Number(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // "upi" -> "UPI", "cash" -> "Cash"; missing mode reads as "Paid".
  // Payment method as people say it. The backend sends one method ("upi"),
  // several joined with " + " for a split ("cash + upi"), or nothing when no
  // method was recorded. Returns "" when there's nothing to show.
  const MODE_NAMES: Record<string, string> = {
    cash: "Cash",
    card: "Card",
    upi: "UPI",
    qr: "UPI QR",
    wallet: "Wallet",
    online: "Online",
    razorpay: "Online",
    stripe: "Online",
    split: "Split",
  };
  const methodName = (mode?: string | null) => {
    const parts = String(mode || "")
      .split(/\s*[+,]\s*/)
      .map((p) => p.trim().toLowerCase())
      .filter((p) => p && p !== "paid");
    const names = Array.from(new Set(parts.map((p) => MODE_NAMES[p] || p[0].toUpperCase() + p.slice(1))));
    return names.join(" + ");
  };
  const modeLabel = (mode?: string | null) => methodName(mode) || "Paid";

  const formatOrderDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) {
      return `Today, ${format(d, "h:mm a")}`;
    }
    if (isYesterday(d)) {
      return `Yesterday, ${format(d, "h:mm a")}`;
    }
    return format(d, "d MMM yyyy, h:mm a");
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#FAFAF7] text-[#0F1117]">
      <StaffSidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-10 shrink-0 border-b border-[#E8E8E3] bg-white px-8 py-4">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <div className="flex items-center gap-3">
              <h1 className="text-[22px] font-bold leading-none tracking-[-0.02em] text-[#0F1117]">
                Order history
              </h1>
              {!isLoading && (
                <span className="rounded-full bg-[#F3F3EF] px-2.5 py-1 text-[12px] font-medium leading-none tabular-nums text-[#6B7280]">
                  {filteredOrders.length} {filteredOrders.length === 1 ? "order" : "orders"}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="text"
                  placeholder="Search table, customer or amount"
                  aria-label="Search orders"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-10 w-full rounded-xl border border-[#E8E8E3] bg-white pl-9 pr-8 text-[13px] text-[#0F1117] outline-none transition-colors placeholder:text-[#9CA3AF] hover:border-[#D6D6CF] focus:border-[#fe5c13]"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-[#9CA3AF] hover:text-[#0F1117]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <button
                onClick={() => loadOrders(true)}
                disabled={isRefreshing}
                title="Refresh order list"
                aria-label="Refresh order list"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E8E8E3] bg-white text-[#6B7280] transition-colors hover:border-[#D6D6CF] hover:bg-[#FAFAF7] hover:text-[#0F1117] disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              </button>

              <button
                onClick={handleExportCSV}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#E8E8E3] bg-white px-3.5 text-[13px] font-semibold text-[#0F1117] transition-colors hover:border-[#D6D6CF] hover:bg-[#FAFAF7]"
              >
                <Download className="h-4 w-4 text-[#6B7280]" />
                Export CSV
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex h-9 items-center gap-0.5 rounded-xl bg-[#F3F3EF] p-1" role="tablist" aria-label="Order type">
              {[
                { id: "all", label: "All orders", count: orders.length },
                { id: "dine_in", label: "Dine-in", count: orders.filter((o) => o.type === "dine_in").length },
                { id: "takeaway", label: "Takeaway", count: orders.filter((o) => o.type !== "dine_in").length },
              ].map((t) => {
                const active = typeFilter === t.id;
                return (
                  <button
                    key={t.id}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTypeFilter(t.id as any)}
                    className={`flex h-7 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-[12px] font-medium transition-colors ${active
                      ? "bg-white font-semibold text-[#0F1117] shadow-[0_1px_2px_rgba(15,17,23,0.06)]"
                      : "text-[#6B7280] hover:text-[#0F1117]"
                      }`}
                  >
                    {t.label}
                    <span className={`tabular-nums ${active ? "text-[#6B7280]" : "text-[#9CA3AF]"}`}>{t.count}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex h-9 items-center gap-0.5 rounded-xl bg-[#F3F3EF] p-1" role="tablist" aria-label="Date range">
                {[
                  { id: "today", label: "Today" },
                  { id: "yesterday", label: "Yesterday" },
                  { id: "week", label: "This week" },
                  { id: "month", label: "This month" },
                  { id: "custom", label: "Custom", icon: SlidersHorizontal },
                ].map((d) => {
                  const active = dateFilter === d.id;
                  const Icon = d.icon;
                  return (
                    <button
                      key={d.id}
                      role="tab"
                      aria-selected={active}
                      onClick={() => setDateFilter(d.id as any)}
                      className={`flex h-7 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-[12px] font-medium transition-colors ${active
                        ? "bg-white font-semibold text-[#0F1117] shadow-[0_1px_2px_rgba(15,17,23,0.06)]"
                        : "text-[#6B7280] hover:text-[#0F1117]"
                        }`}
                    >
                      {Icon && <Icon className="h-3 w-3" />}
                      {d.label}
                    </button>
                  );
                })}
              </div>

              {dateFilter === "custom" && (
                <DateRangePicker
                  from={fromDate}
                  to={toDate}
                  defaultOpen
                  onChange={(f, t) => {
                    setFromDate(f);
                    setToDate(t);
                  }}
                />
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-8 py-6">
          <div className="overflow-hidden rounded-2xl border border-[#E8E8E3] bg-white">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-28 text-[14px] text-[#6B7280]">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading order history
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
                <Receipt className="h-6 w-6 text-[#C4C4BE]" />
                <p className="mt-3 text-[15px] font-semibold text-[#0F1117]">
                  {searchTerm ? "No orders match your search" : "No completed orders in this range"}
                </p>
                <p className="mt-1 max-w-sm text-[13px] text-[#6B7280]">
                  {searchTerm ? "Try a table number, customer name or amount." : "Pick another date range or order type to see older bills."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#F0F0EB] text-[12px] text-[#6B7280]">
                      <th className="px-6 py-3 font-medium">Order</th>
                      <th className="px-6 py-3 font-medium">Type</th>
                      <th className="px-6 py-3 font-medium">Completed</th>
                      <th className="px-6 py-3 font-medium">Payment</th>
                      <th className="px-6 py-3 text-right font-medium">Total</th>
                      <th className="px-6 py-3 font-medium"><span className="sr-only">Receipt</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F0EB]">
                    {filteredOrders.map((order) => {
                      const isDineIn = order.type === "dine_in";
                      const d = new Date(order.created_at);
                      const recent = isToday(d) || isYesterday(d);
                      return (
                        <tr
                          key={order.id}
                          onClick={() => fetchOrderDetail(order)}
                          className="group cursor-pointer transition-colors hover:bg-[#FAFAF7]"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F3F3EF] text-[#4B5563]">
                                {isDineIn ? <Utensils className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-[14px] font-semibold text-[#0F1117]">{order.name}</p>
                                <p className="mt-0.5 text-[12px] tabular-nums text-[#9CA3AF]">#{order.id.slice(0, 8)}</p>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4 text-[13px] text-[#374151]">
                            {isDineIn ? "Dine-in" : "Takeaway"}
                          </td>

                          <td className="px-6 py-4">
                            <p className="text-[13px] tabular-nums text-[#0F1117]">{formatOrderDate(order.created_at)}</p>
                            {!recent && <p className="mt-0.5 text-[12px] text-[#9CA3AF]">{format(d, "EEEE")}</p>}
                          </td>

                          <td className="px-6 py-4">
                            <span className="inline-flex items-center rounded-full bg-[#F3F3EF] px-2.5 py-1 text-[12px] font-medium leading-none text-[#374151]">
                              {modeLabel(order.payment_mode)}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-right">
                            <p className="text-[15px] font-semibold tabular-nums text-[#0F1117]">{inr(order.amount)}</p>
                          </td>

                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                fetchOrderDetail(order);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-[#6B7280] transition-colors group-hover:text-[#0F1117] hover:bg-[#F3F3EF]"
                            >
                              View receipt
                              <ChevronRight className="h-3.5 w-3.5" />
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

      <AnimatePresence>
        {(isDetailLoading || selectedOrder || detailError) && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#0F1117]/30 backdrop-blur-xs"
              onClick={closeDetail}
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-[#E8E8E3] bg-white shadow-[0_20px_60px_-15px_rgba(15,17,23,0.3)]"
            >
              <div className="flex items-center justify-between border-b border-[#E8E8E3] px-6 py-4">
                <div>
                  <h2 className="text-[17px] font-bold leading-none tracking-[-0.01em] text-[#0F1117]">Receipt</h2>
                  <p className="mt-1.5 text-[12px] tabular-nums text-[#9CA3AF]">
                    {selectedRow
                      ? `${formatOrderDate(selectedRow.created_at)}, #${selectedRow.id.slice(0, 8)}`
                      : "Loading"}
                  </p>
                </div>
                <button
                  onClick={closeDetail}
                  aria-label="Close receipt"
                  className="rounded-xl p-2 text-[#9CA3AF] transition-colors hover:bg-[#F3F3EF] hover:text-[#0F1117]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto bg-[#FAFAF7] p-6">
                {isDetailLoading ? (
                  <div className="flex h-64 items-center justify-center gap-2 text-[13px] text-[#6B7280]">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading receipt
                  </div>
                ) : detailError ? (
                  <div className="flex h-64 flex-col items-center justify-center text-center">
                    <p className="text-[15px] font-semibold text-[#0F1117]">Receipt didn't load</p>
                    <p className="mt-1 max-w-[260px] text-[13px] text-[#6B7280]">{detailError}</p>
                    {selectedRow && (
                      <button
                        onClick={() => void fetchOrderDetail(selectedRow)}
                        className="mt-4 h-9 rounded-xl border border-[#E8E8E3] bg-white px-3.5 text-[13px] font-semibold text-[#374151] transition-colors hover:border-[#D6D6CF] hover:text-[#0F1117]"
                      >
                        Try again
                      </button>
                    )}
                  </div>
                ) : selectedOrder ? (
                  <div className="mx-auto max-w-sm rounded-2xl border border-[#E8E8E3] bg-white p-6">
                    <div className="border-b border-dashed border-[#E8E8E3] pb-5 text-center">
                      <h3 className="text-[17px] font-bold tracking-[-0.01em] text-[#0F1117]">
                        {me?.restaurant || "Qrave Restaurant"}
                      </h3>
                      {me?.gst_number && (
                        <p className="mt-1 text-[11px] font-medium text-[#9CA3AF]">GSTIN {me.gst_number}</p>
                      )}
                      <div className="mt-3.5 inline-flex items-center gap-1.5 rounded-full bg-[#F3F3EF] px-3 py-1 text-[12px] font-medium text-[#374151]">
                        {selectedOrder.type === "dine_in" ? (
                          <Utensils className="h-3.5 w-3.5 text-[#6B7280]" />
                        ) : (
                          <ShoppingBag className="h-3.5 w-3.5 text-[#6B7280]" />
                        )}
                        {selectedOrder.name}
                      </div>
                    </div>

                    <div className="space-y-3 py-4">
                      <div className="flex justify-between border-b border-[#F0F0EB] pb-1.5 text-[12px] font-medium text-[#6B7280]">
                        <span>Item</span>
                        <span>Amount</span>
                      </div>
                      {selectedOrder.items.length === 0 && (
                        <p className="py-2 text-center text-[13px] text-[#9CA3AF]">No item details were saved for this bill.</p>
                      )}
                      {selectedOrder.items.map((it, idx) => (
                        <div key={idx} className="flex items-start justify-between text-[13px]">
                          <div className="flex-1 pr-3">
                            <p className="font-medium text-[#0F1117]">
                              <span className="mr-1.5 tabular-nums text-[#9CA3AF]">{it.quantity}×</span>
                              {it.name}
                            </p>
                            {it.variant_label && <p className="pl-5 text-[12px] text-[#6B7280]">{it.variant_label}</p>}
                            <p className="pl-5 text-[12px] tabular-nums text-[#9CA3AF]">{inr(it.price)} each</p>
                          </div>
                          <p className="font-medium tabular-nums text-[#0F1117]">{inr(it.quantity * it.price)}</p>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2 border-t border-dashed border-[#E8E8E3] pt-4 text-[13px]">
                      <div className="flex justify-between text-[#6B7280]">
                        <span>Subtotal</span>
                        <span className="tabular-nums text-[#374151]">{inr(selectedOrder.breakdown.subtotal)}</span>
                      </div>
                      {selectedOrder.breakdown.discount > 0 && (
                        <div className="flex justify-between text-emerald-700">
                          <span>Discount</span>
                          <span className="tabular-nums">−{inr(selectedOrder.breakdown.discount)}</span>
                        </div>
                      )}
                      {selectedOrder.breakdown.service_charge > 0 && (
                        <div className="flex justify-between text-[#6B7280]">
                          <span>Service charge ({selectedOrder.breakdown.service_percent}%)</span>
                          <span className="tabular-nums text-[#374151]">{inr(selectedOrder.breakdown.service_charge)}</span>
                        </div>
                      )}
                      {selectedOrder.breakdown.tax > 0 && (
                        <div className="flex justify-between text-[#6B7280]">
                          <span>GST ({selectedOrder.breakdown.tax_percent}%)</span>
                          <span className="tabular-nums text-[#374151]">{inr(selectedOrder.breakdown.tax)}</span>
                        </div>
                      )}
                      <div className="mt-2 flex items-baseline justify-between border-t border-[#E8E8E3] pt-3">
                        <span className="text-[14px] font-semibold text-[#0F1117]">Total</span>
                        <span className="text-[20px] font-bold tabular-nums tracking-[-0.02em] text-[#0F1117]">
                          {inr(selectedOrder.breakdown.total)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-[#F0F0EB] pt-4 text-[12px] text-[#6B7280]">
                      <span>
                        {methodName(selectedOrder.payment_mode)
                          ? `Paid by ${methodName(selectedOrder.payment_mode)}`
                          : "Payment method not recorded"}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 font-medium leading-none text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Completed
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>

              {selectedOrder && (
                <div className="space-y-2 border-t border-[#E8E8E3] bg-white p-4">
                  <button
                    onClick={handlePrint}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#fe5c13] text-[14px] font-semibold text-white transition-colors hover:bg-[#e44e0b]"
                  >
                    <Printer className="h-4 w-4" />
                    Print receipt
                  </button>
                  {["owner", "manager", "cashier"].includes(String(me?.role || "").toLowerCase()) && (
                    <button
                      onClick={() => setShowRefund(true)}
                      className="flex h-10 w-full items-center justify-center rounded-xl border border-rose-200 bg-white text-[13px] font-semibold text-rose-700 transition-colors hover:border-rose-300 hover:bg-rose-50"
                    >
                      Refund payment
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {showRefund && selectedOrder && (
        <RefundDialog
          sessionId={selectedOrder.id}
          kind={selectedOrder.type === "dine_in" ? "dine_in" : "takeaway"}
          onClose={() => setShowRefund(false)}
          onDone={() => {
            setShowRefund(false);
            void loadOrders();
          }}
        />
      )}
    </div>
  );
}
