"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  CheckCircle2,
  Clock,
  ChefHat,
  Search,
  XCircle,
  Check,
  ArrowRight,
  MoreVertical,
  ArrowRightLeft,
  Merge,
  Users,
  Filter,
  Bell,
  Droplets,
  AlertTriangle,
  Receipt,
  UtensilsCrossed,
  LogOut,
  Trash2
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import StaffSidebar from "../../components/StaffSidebar";
import { api } from "@/app/lib/api";

type BillStatus = "open" | "bill_requested" | "bill_printed" | "paid";

type StaffTable = {
  id: string;
  tableCode: string;
  restaurantName: string;
  isOccupied: boolean;
  activeSessionId?: string;
  currentTotal?: number;
  itemsCount?: number;
  guests?: number;
  billStatus?: BillStatus;
  seatedAt?: Date;
};

type OrderStatus = "pending" | "cooking";

type PendingOrder = {
  id: string;
  orderId: string;
  tableCode: string;
  itemName: string;
  quantity: number;
  orderedAt: Date;
  status: OrderStatus;
};

type ServiceCallType = "waiter" | "water" | "help";
type ServiceCallStatus = "open" | "attending" | "done";

type ServiceCall = {
  id: string;
  tableCode: string;
  type: ServiceCallType;
  createdAt: Date;
  status: ServiceCallStatus;
};

type TableFilter =
  | "all"
  | "occupied"
  | "free"
  | "bill_requested"
  | "long_sitting";

type TableSort = "table" | "total" | "seated";

type TableAPI = {
  id: string;
  table_number: number;
  is_enabled: boolean;
};

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
  session_id: string;
  table_id: string;
  table_number: number;
  items: ActiveOrderItem[];
};

type ActiveOrdersResponse = {
  orders: ActiveOrder[];
};

type ServiceCallAPI = {
  id: string;
  table_id: string;
  table_number: number;
  session_id: string;
  type: ServiceCallType;
  status: ServiceCallStatus;
  created_at: string;
};

const getTimeAgo = (date: Date) => {
  const diff = Math.floor((new Date().getTime() - date.getTime()) / 60000);
  if (diff < 1) return "Just now";
  if (diff < 60) return `${diff}m ago`;
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  if (hours >= 3) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

const getMinutesDiff = (date?: Date) => {
  if (!date) return 0;
  return Math.floor((new Date().getTime() - date.getTime()) / 60000);
};

export default function StaffDashboardPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [tables, setTables] = useState<StaffTable[]>([]);
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);
  const [serviceCalls, setServiceCalls] = useState<ServiceCall[]>([]);
  const [todaySales, setTodaySales] = useState<number>(0);

  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);

  const [tableFilter, setTableFilter] = useState<TableFilter>("all");
  const [tableSort, setTableSort] = useState<TableSort>("table");
  const [activeSidebarTab, setActiveSidebarTab] = useState<"kitchen" | "service">("kitchen");

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement === document.body) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setOpenMenuId(null);
        setShowMoveModal(false);
        setShowMergeModal(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const buildPendingOrders = (ordersList: ActiveOrder[]) => {
    const next: PendingOrder[] = [];
    for (const order of ordersList) {
      const orderId = order.id || order.order_id;
      if (!orderId) continue;
      const mappedStatus: OrderStatus =
        order.status === "pending" ? "pending" : "cooking";
      for (const item of order.items || []) {
        const variantSuffix = item.variant_label ? ` (${item.variant_label})` : "";
        next.push({
          id: `${orderId}-${item.menu_item_id}-${item.variant_id}`,
          orderId,
          tableCode: `T${order.table_number}`,
          itemName: `${item.menu_item_name}${variantSuffix}`,
          quantity: item.quantity,
          orderedAt: new Date(order.created_at),
          status: mappedStatus,
        });
      }
    }
    return next;
  };

  const buildTables = (tablesApi: TableAPI[], ordersList: ActiveOrder[]) => {
    const totalsByTable = new Map<number, { total: number; count: number; sessionId?: string }>();
    for (const order of ordersList) {
      const existing = totalsByTable.get(order.table_number) || { total: 0, count: 0 };
      const orderTotal = order.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
      totalsByTable.set(order.table_number, {
        total: existing.total + orderTotal,
        count: existing.count + order.items.reduce((sum, i) => sum + i.quantity, 0),
        sessionId: order.session_id,
      });
    }

    return tablesApi.map((t) => {
      const meta = totalsByTable.get(t.table_number);
      return {
        id: t.id,
        tableCode: `T${t.table_number}`,
        restaurantName: "",
        isOccupied: Boolean(meta),
        activeSessionId: meta?.sessionId,
        currentTotal: meta?.total,
        itemsCount: meta?.count,
      } as StaffTable;
    });
  };

  const refreshLiveData = async () => {
    const [tablesRes, ordersRes] = await Promise.all([
      api<TableAPI[]>("/api/admin/tables"),
      api<ActiveOrdersResponse>("/api/admin/orders/active"),
    ]);

    const ordersList = ordersRes?.orders || [];
    setActiveOrders(ordersList);
    setOrders(buildPendingOrders(ordersList));
    setTables(buildTables(tablesRes || [], ordersList));
  };

  useEffect(() => {
    let isActive = true;
    const load = async () => {
      try {
        await refreshLiveData();
        const [serviceRes, salesRes] = await Promise.all([
          api<ServiceCallAPI[]>("/api/admin/service-calls"),
          api<{ total: number }>("/api/admin/sales/today"),
        ]);
        if (!isActive) return;
        setServiceCalls(
          (serviceRes || []).map((c) => ({
            id: c.id,
            tableCode: `T${c.table_number}`,
            type: c.type,
            status: c.status,
            createdAt: new Date(c.created_at),
          }))
        );
        setTodaySales(salesRes?.total || 0);
      } catch {
        if (!isActive) return;
        setActiveOrders([]);
        setOrders([]);
        setTables([]);
        setServiceCalls([]);
        setTodaySales(0);
      }
    };
    load();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("access_token");
    if (!token) return;

    const base = process.env.NEXT_PUBLIC_EVENT_SERVICE_URL;
    if (!base) return;
    const ws = new WebSocket(`${base}/ws?token=${encodeURIComponent(token)}`);
    ws.onerror = () => {
      // no-op
    };
    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg?.type === "order.created" || msg?.type === "order.updated") {
          const data = msg?.data as ActiveOrder;
          const orderId = data?.id || data?.order_id;
          if (!data || !orderId) return;
          const normalized: ActiveOrder = { ...data, id: orderId };
          setActiveOrders((prev) => {
            const next = [normalized, ...prev.filter((o) => (o.id || o.order_id) !== orderId)];
            setOrders(buildPendingOrders(next));
            setTables((prevTables) =>
              buildTables(
                prevTables.map((t) => ({
                  id: t.id,
                  table_number: parseInt(t.tableCode.replace("T", ""), 10),
                  is_enabled: true,
                })),
                next
              )
            );
            return next;
          });
          return;
        }

        if (msg?.type === "service.call.created" || msg?.type === "service.call.updated") {
          const data = msg?.data as ServiceCallAPI & { table_number: number };
          if (!data || !data.id) return;
          setServiceCalls((prev) => {
            const next = [
              {
                id: data.id,
                tableCode: `T${data.table_number}`,
                type: data.type,
                status: data.status,
                createdAt: new Date(data.created_at),
              },
              ...prev.filter((c) => c.id !== data.id),
            ].filter((c) => c.status !== "done");
            return next;
          });
          return;
        }
      } catch {
        // ignore
      }
    };

    ws.onclose = () => {
      // no-op
    };

    return () => {
      ws.close();
    };
  }, []);

  const occupiedCount = tables.filter((t) => t.isOccupied).length;
  const totalTables = tables.length;
  const totalSales = todaySales;

  const pendingOrdersCount = orders.filter((o) => o.status === "pending").length;
  const cookingOrdersCount = orders.filter((o) => o.status === "cooking").length;
  const delayedOrdersCount = orders.filter(
    (o) => o.status === "pending" && getMinutesDiff(o.orderedAt) > 10
  ).length;

  const activeServiceCallsCount = serviceCalls.filter((c) => c.status !== "done").length;

  const billRequestedCount = tables.filter(
    (t) => t.billStatus === "bill_requested"
  ).length;

  const longSittingCount = tables.filter(
    (t) => t.isOccupied && getMinutesDiff(t.seatedAt) > 90
  ).length;

  const filteredTables = tables
    .filter((table) =>
      table.tableCode.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter((table) => {
      if (tableFilter === "all") return true;
      if (tableFilter === "occupied") return table.isOccupied;
      if (tableFilter === "free") return !table.isOccupied;
      if (tableFilter === "bill_requested")
        return table.billStatus === "bill_requested";
      if (tableFilter === "long_sitting")
        return table.isOccupied && getMinutesDiff(table.seatedAt) > 90;
      return true;
    })
    .sort((a, b) => {
      if (tableSort === "table") {
        return a.tableCode.localeCompare(b.tableCode, undefined, {
          numeric: true,
        });
      }
      if (tableSort === "total") {
        return (b.currentTotal || 0) - (a.currentTotal || 0);
      }
      if (tableSort === "seated") {
        return getMinutesDiff(b.seatedAt) - getMinutesDiff(a.seatedAt);
      }
      return 0;
    });

  const handleAccept = async (orderId: string) => {
    await api(`/api/admin/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "accepted" }),
    });
    await refreshLiveData();
  };

  const handleServe = async (orderId: string) => {
    await api(`/api/admin/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "served" }),
    });
    await refreshLiveData();
  };

  const handleReject = async (orderId: string) => {
    await api(`/api/admin/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "cancelled" }),
    });
    await refreshLiveData();
  };

  const handleFreeTable = (tableId: string) => {
    const tableToFree = tables.find(t => t.id === tableId);
    if(!tableToFree) return;

    setTables(prev => prev.map(t => t.id === tableId ? {
        ...t,
        isOccupied: false,
        activeSessionId: undefined,
        currentTotal: 0,
        itemsCount: 0,
        guests: 0,
        billStatus: undefined,
        seatedAt: undefined
    } : t));

    setOrders(prev => prev.filter(o => o.tableCode !== tableToFree.tableCode));
    setServiceCalls(prev => prev.filter(s => s.tableCode !== tableToFree.tableCode));
    setOpenMenuId(null);
  };

  const handleMoveTable = async (targetTableId: string) => {
    if (!activeTableId) return;

    const sourceTable = tables.find((t) => t.id === activeTableId);
    const targetTable = tables.find((t) => t.id === targetTableId);
    if (!sourceTable || !targetTable) return;

    if (!sourceTable.activeSessionId) return;

    await api("/api/admin/tables/move", {
      method: "POST",
      body: JSON.stringify({
        session_id: sourceTable.activeSessionId,
        target_table_id: targetTableId,
      }),
    });

    await refreshLiveData();

    setShowMoveModal(false);
    setActiveTableId(null);
    setOpenMenuId(null);
  };

  const handleMergeTable = (targetTableId: string) => {
    if (!activeTableId) return;

    const sourceTable = tables.find((t) => t.id === activeTableId);
    const targetTable = tables.find((t) => t.id === targetTableId);
    if (!sourceTable || !targetTable) return;

    setTables((prev) =>
      prev.map((t) => {
        if (t.id === targetTableId) {
          return {
            ...t,
            currentTotal: (t.currentTotal || 0) + (sourceTable.currentTotal || 0),
            itemsCount: (t.itemsCount || 0) + (sourceTable.itemsCount || 0),
            guests: (t.guests || 0) + (sourceTable.guests || 0),
            seatedAt: t.seatedAt || sourceTable.seatedAt || new Date(),
          };
        }
        if (t.id === activeTableId) {
          return {
            ...t,
            isOccupied: false,
            activeSessionId: undefined,
            currentTotal: 0,
            itemsCount: 0,
            guests: 0,
            billStatus: undefined,
            seatedAt: undefined,
          };
        }
        return t;
      })
    );

    setOrders((prev) =>
      prev.map((o) =>
        o.tableCode === sourceTable.tableCode
          ? { ...o, tableCode: targetTable.tableCode }
          : o
      )
    );

    setServiceCalls((prev) =>
      prev.map((c) =>
        c.tableCode === sourceTable.tableCode
          ? { ...c, tableCode: targetTable.tableCode }
          : c
      )
    );

    setShowMergeModal(false);
    setActiveTableId(null);
    setOpenMenuId(null);
  };

  const handleServiceCallStatus = async (id: string, status: ServiceCallStatus) => {
    await api(`/api/admin/service-calls/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    const serviceRes = await api<ServiceCallAPI[]>("/api/admin/service-calls");
    setServiceCalls(
      (serviceRes || []).map((c) => ({
        id: c.id,
        tableCode: `T${c.table_number}`,
        type: c.type,
        status: c.status,
        createdAt: new Date(c.created_at),
      }))
    );
  };

  const hasActiveKitchen = orders.length > 0;
  const hasActiveService = activeServiceCallsCount > 0;
  const sidebarVisible = hasActiveKitchen || hasActiveService;

  useEffect(() => {
    if (hasActiveService && !hasActiveKitchen) {
        setActiveSidebarTab('service');
    } else if (hasActiveKitchen) {
        setActiveSidebarTab('kitchen');
    }
  }, [hasActiveKitchen, hasActiveService]);

  return (
    <div
      className="flex h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden"
      onClick={() => setOpenMenuId(null)}
    >
      <StaffSidebar />

      <div className="flex-1 flex flex-col min-w-0 relative">
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-8 sticky top-0 z-10 shrink-0">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-gray-900">
              Floor Overview
            </h2>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                Live Service
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6 divide-x divide-gray-100">
            <div className="flex flex-col items-end pr-6">
              <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                Today's Sales
              </span>
              <span className="text-lg font-bold text-emerald-600 flex items-center gap-1">
                ₹{totalSales.toLocaleString()}
              </span>
            </div>
            <div className="flex flex-col items-end pl-6">
              <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                Occupancy
              </span>
              <span className="text-lg font-bold text-gray-700">
                {occupiedCount}
                <span className="text-gray-300 font-light mx-1">/</span>
                {totalTables}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
                <div>
                    <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Pending Orders</span>
                    <div className="text-2xl font-bold text-gray-900 mt-1">{pendingOrdersCount}</div>
                </div>
                <div className={`p-2 rounded-lg ${pendingOrdersCount > 5 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'}`}>
                    <ChefHat className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
                <div>
                    <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Bill Requests</span>
                    <div className="text-2xl font-bold text-gray-900 mt-1">{billRequestedCount}</div>
                </div>
                <div className={`p-2 rounded-lg ${billRequestedCount > 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-50 text-gray-400'}`}>
                    <Receipt className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
                 <div>
                    <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Service Calls</span>
                    <div className="text-2xl font-bold text-gray-900 mt-1">{activeServiceCallsCount}</div>
                 </div>
                 <div className={`p-2 rounded-lg ${activeServiceCallsCount > 0 ? 'bg-sky-50 text-sky-600' : 'bg-gray-50 text-gray-400'}`}>
                    <Bell className="w-5 h-5" />
                 </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
                 <div>
                    <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Long Sitting</span>
                    <div className="text-2xl font-bold text-gray-900 mt-1">{longSittingCount}</div>
                 </div>
                 <div className={`p-2 rounded-lg ${longSittingCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-gray-50 text-gray-400'}`}>
                    <Clock className="w-5 h-5" />
                 </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm sticky top-0 z-30">
              <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
                <div className="flex items-center gap-1 bg-gray-100/50 p-1 rounded-lg">
                  {(["all", "occupied", "free", "bill_requested"] as TableFilter[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => setTableFilter(f)}
                      className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wide transition-all ${
                        tableFilter === f
                          ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200"
                          : "text-gray-500 hover:bg-gray-200/50"
                      }`}
                    >
                      {f.replace("_", " ")}
                    </button>
                  ))}
                </div>

                <div className="h-6 w-px bg-gray-200 mx-2 hidden sm:block"></div>
                
                 <select
                    value={tableSort}
                    onChange={(e) => setTableSort(e.target.value as TableSort)}
                    className="bg-transparent text-xs font-medium text-gray-600 focus:outline-none cursor-pointer hover:text-gray-900"
                  >
                    <option value="table">Sort by Number</option>
                    <option value="total">Sort by Value</option>
                    <option value="seated">Sort by Time</option>
                  </select>
              </div>

              <div className="relative group w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gray-600 transition-colors" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search table..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900/10 bg-gray-50 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {filteredTables.map((table) => {
                const isFree = !table.isOccupied;
                const seatedMinutes = getMinutesDiff(table.seatedAt);
                const longSit = table.isOccupied && seatedMinutes > 90;
                
                // Count both pending AND cooking for the table pill, because cooking items are still "In Kitchen"
                const activeOrdersForTable = orders.filter((o) => o.tableCode === table.tableCode && (o.status === 'pending' || o.status === 'cooking')).length;
                
                let cardStyle = "bg-white border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300";
                if (isFree) cardStyle = "bg-gray-50/50 border-gray-200 border-dashed opacity-60 hover:opacity-100 hover:bg-white hover:border-solid hover:shadow-sm";
                else if (table.billStatus === 'bill_requested') cardStyle = "bg-indigo-50/30 border-indigo-200 shadow-sm hover:shadow-md ring-1 ring-indigo-100";
                else if (longSit) cardStyle = "bg-rose-50/30 border-rose-200 shadow-sm hover:shadow-md";

                return (
                  <div
                    key={table.id}
                    className={`relative flex flex-col justify-between h-52 w-full p-4 rounded-xl transition-all duration-200 border ${cardStyle}`}
                  >
                    <div className="flex justify-between items-start z-20 relative">
                        <div>
                             <span className={`text-2xl font-bold tracking-tight ${isFree ? "text-gray-400" : "text-gray-900"}`}>
                                {table.tableCode}
                            </span>
                            {table.isOccupied && (
                                <div className="flex items-center gap-1.5 mt-1">
                                    <Clock className="w-3 h-3 text-gray-400"/>
                                    <span className={`text-[10px] font-medium ${longSit ? "text-rose-600 font-bold" : "text-gray-500"}`}>
                                        {seatedMinutes < 60 ? `${seatedMinutes}m` : `${Math.floor(seatedMinutes / 60)}h ${seatedMinutes % 60}m`}
                                    </span>
                                </div>
                            )}
                        </div>

                      {table.isOccupied ? (
                        <div className="flex items-start gap-2">
                           {table.billStatus && table.billStatus !== 'open' && (
                                <div className={`p-1.5 rounded-md ${
                                    table.billStatus === 'bill_requested' ? 'bg-indigo-100 text-indigo-700' : 
                                    table.billStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                    {table.billStatus === 'bill_requested' && <Receipt className="w-4 h-4" />}
                                    {table.billStatus === 'bill_printed' && <CheckCircle2 className="w-4 h-4" />}
                                    {table.billStatus === 'paid' && <Check className="w-4 h-4" />}
                                </div>
                           )}

                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === table.id ? null : table.id);
                              }}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-colors"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            <AnimatePresence>
                              {openMenuId === table.id && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95, y: 5 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: 5 }}
                                  className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden ring-1 ring-black/5"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="py-1">
                                      <button onClick={() => { setActiveTableId(table.id); setShowMoveModal(true); }} className="w-full text-left px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                        <ArrowRightLeft className="w-3.5 h-3.5" /> Move Table
                                      </button>
                                      <button onClick={() => { setActiveTableId(table.id); setShowMergeModal(true); }} className="w-full text-left px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                        <Merge className="w-3.5 h-3.5" /> Merge Bill
                                      </button>
                                  </div>
                                  <div className="border-t border-gray-100 py-1">
                                      <button onClick={() => setTables((prev) => prev.map((t) => t.id === table.id ? { ...t, billStatus: "bill_printed" } : t))} className="w-full text-left px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                        <Receipt className="w-3.5 h-3.5" /> Print Bill
                                      </button>
                                      <button onClick={() => setTables((prev) => prev.map((t) => t.id === table.id ? { ...t, billStatus: "paid" } : t))} className="w-full text-left px-4 py-2.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 flex items-center gap-2">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Mark Paid
                                      </button>
                                      <button onClick={() => handleFreeTable(table.id)} className="w-full text-left px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-rose-50 hover:text-rose-600 flex items-center gap-2">
                                        <LogOut className="w-3.5 h-3.5" /> Free Table
                                      </button>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      ) : (
                        <div className="px-2 py-1 bg-gray-100 rounded text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          Free
                        </div>
                      )}
                    </div>

                    {isFree ? (
                      <div className="flex flex-col items-center justify-center h-full pb-2 opacity-30">
                        <UtensilsCrossed className="w-8 h-8 mb-2" />
                        <span className="text-xs font-medium">Available</span>
                      </div>
                    ) : (
                      <Link
                        href={`/staff/table/${table.activeSessionId}`}
                        className="mt-auto pt-4 space-y-3 block group"
                      >
                         <div className="grid grid-cols-2 gap-2">
                            <div className="bg-gray-50 rounded-lg p-2 text-center border border-gray-100">
                                <span className="block text-[10px] text-gray-400 uppercase font-bold">Items</span>
                                <span className="text-sm font-semibold text-gray-700">{table.itemsCount}</span>
                            </div>
                         </div>
                        
                        <div className="flex items-center justify-between">
                             <div>
                                {activeOrdersForTable > 0 && (
                                    <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded-full flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> {activeOrdersForTable} active
                                    </span>
                                )}
                             </div>
                             <div className="text-right">
                                <span className="block text-[10px] text-gray-400 uppercase font-bold">Total</span>
                                <span className="text-base font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">₹{table.currentTotal}</span>
                             </div>
                        </div>
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </main>

        {showMoveModal && activeTableId && (
          <div className="absolute inset-0 z-[60] bg-gray-900/20 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ring-1 ring-black/5">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div>
                  <h3 className="font-bold text-gray-900">Relocate Table</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Moving guests from <span className="font-bold text-gray-800">{tables.find((t) => t.id === activeTableId)?.tableCode}</span>
                  </p>
                </div>
                <button onClick={() => setShowMoveModal(false)} className="p-1 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Select Destination</h4>
                <div className="grid grid-cols-4 gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                  {tables.filter((t) => !t.isOccupied).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleMoveTable(t.id)}
                      className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-xl hover:border-gray-900 hover:bg-gray-50 hover:shadow-md transition-all group"
                    >
                      <span className="text-xl font-bold text-gray-700 group-hover:text-gray-900">{t.tableCode}</span>
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full mt-1">Free</span>
                    </button>
                  ))}
                  {tables.filter((t) => !t.isOccupied).length === 0 && (
                    <div className="col-span-4 py-8 text-center text-gray-500 text-sm bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      No empty tables available.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {showMergeModal && activeTableId && (
          <div className="absolute inset-0 z-[60] bg-gray-900/20 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ring-1 ring-black/5">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div>
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Merge className="w-4 h-4" /> Merge Bill
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Merging <span className="font-bold text-gray-800">{tables.find((t) => t.id === activeTableId)?.tableCode}</span> into another session
                  </p>
                </div>
                <button onClick={() => setShowMergeModal(false)} className="p-1 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Select Target Table</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                  {tables.filter((t) => t.isOccupied && t.id !== activeTableId).map((t) => (
                      <button
                        key={t.id}
                        onClick={() => handleMergeTable(t.id)}
                        className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-xl hover:border-amber-500 hover:bg-amber-50/50 transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center font-bold text-lg text-gray-700 group-hover:bg-white group-hover:text-amber-600 shadow-sm">
                            {t.tableCode}
                          </div>
                          <div className="text-left">
                            <div className="text-sm font-bold text-gray-900 group-hover:text-amber-700">₹{t.currentTotal} Bill</div>
                            <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                <Users className="w-3 h-3" /> {t.guests} Guests
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-amber-500" />
                      </button>
                    ))}
                  {tables.filter((t) => t.isOccupied && t.id !== activeTableId).length === 0 && (
                    <div className="py-8 text-center text-gray-500 text-sm bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      No other occupied tables to merge with.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {sidebarVisible && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 380, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="bg-white border-l border-gray-200 hidden xl:flex flex-col overflow-hidden whitespace-nowrap z-10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-100 bg-white">
               <h3 className="font-bold text-gray-900 text-sm mb-3">Activity Feed</h3>
               <div className="flex p-1 bg-gray-100 rounded-lg">
                    {/* Only show Kitchen tab if there are orders, otherwise disable or hide logic could apply, but for now we keep it simple */}
                    <button onClick={() => setActiveSidebarTab("kitchen")} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2 ${activeSidebarTab === 'kitchen' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                        Kitchen
                        {pendingOrdersCount > 0 && <span className="bg-amber-100 text-amber-700 px-1.5 rounded-full text-[10px]">{pendingOrdersCount}</span>}
                    </button>
                    <button onClick={() => setActiveSidebarTab("service")} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2 ${activeSidebarTab === 'service' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                        Service
                        {activeServiceCallsCount > 0 && <span className="bg-sky-100 text-sky-700 px-1.5 rounded-full text-[10px]">{activeServiceCallsCount}</span>}
                    </button>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-gray-50/50 p-4">
                {activeSidebarTab === 'kitchen' ? (
                   <div className="space-y-3">
                        <AnimatePresence mode="popLayout">
                            {orders.map((order) => {
                                const minutes = getMinutesDiff(order.orderedAt);
                                const delayed = order.status === "pending" && minutes > 10;
                                return (
                                    <motion.div key={order.id} layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className={`bg-white p-3 rounded-xl border shadow-sm ${order.status === 'cooking' ? 'border-blue-100' : delayed ? 'border-red-200 bg-red-50/10' : 'border-gray-200'}`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-xs bg-gray-100 px-2 py-1 rounded-md text-gray-700">{order.tableCode}</span>
                                                <span className="text-[10px] text-gray-400 font-medium">{getTimeAgo(order.orderedAt)}</span>
                                            </div>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${order.status === 'cooking' ? 'bg-blue-100 text-blue-700' : delayed ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {order.status === 'cooking' ? 'Cooking' : delayed ? 'Delayed' : 'Pending'}
                                            </span>
                                        </div>
                                        <div className="flex gap-3 mb-3">
                                            <div className="mt-1 min-w-[32px] h-8 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400">
                                                <ChefHat className="w-4 h-4"/>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-800">{order.itemName}</p>
                                                <p className="text-xs text-gray-500">Qty: {order.quantity}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            {order.status === 'pending' ? (
                                                <>
                                                    <button onClick={() => handleAccept(order.orderId)} className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold py-1.5 rounded-lg transition-colors border border-emerald-100">Accept</button>
                                                    <button onClick={() => handleReject(order.orderId)} className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold py-1.5 rounded-lg transition-colors border border-rose-100">Reject</button>
                                                </>
                                            ) : (
                                                <button onClick={() => handleServe(order.orderId)} className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-1.5 rounded-lg shadow-sm transition-colors">Mark Served</button>
                                            )}
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </AnimatePresence>
                   </div>
                ) : (
                    <div className="space-y-3">
                        <AnimatePresence mode="popLayout">
                            {serviceCalls.filter(c => c.status !== 'done').map((call) => (
                                <motion.div key={call.id} layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-white p-3 rounded-xl border border-sky-100 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-bold text-xs bg-gray-100 px-2 py-1 rounded-md text-gray-700">{call.tableCode}</span>
                                        <span className="text-[10px] text-gray-400">{getTimeAgo(call.createdAt)}</span>
                                    </div>
                                    <div className="flex gap-3 mb-3 items-center">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${call.type === 'waiter' ? 'bg-amber-100 text-amber-600' : call.type === 'water' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                                            {call.type === 'waiter' ? <Bell className="w-4 h-4"/> : call.type === 'water' ? <Droplets className="w-4 h-4"/> : <AlertTriangle className="w-4 h-4"/>}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-800 capitalize">{call.type} Request</p>
                                            <p className="text-xs text-gray-500">{call.status === 'attending' ? 'Staff attending...' : 'Waiting for staff'}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {call.status === 'open' ? (
                                            <>
                                                <button onClick={() => handleServiceCallStatus(call.id, 'attending')} className="flex-1 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-semibold py-1.5 rounded-lg transition-colors border border-sky-100">Attend</button>
                                                <button onClick={() => handleServiceCallStatus(call.id, 'done')} className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold py-1.5 rounded-lg transition-colors border border-emerald-100">Done</button>
                                            </>
                                        ) : (
                                             <button onClick={() => handleServiceCallStatus(call.id, 'done')} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-1.5 rounded-lg shadow-sm transition-colors">Mark Resolved</button>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>

             <div className="p-4 border-t border-gray-100 bg-white">
                  <button className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2">
                    Open Full Kitchen Display
                    <ArrowRight className="w-3.5 h-3.5 opacity-50" />
                  </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
