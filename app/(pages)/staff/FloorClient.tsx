"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { processDashboardData } from "../../lib/processDashboardData";
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
  Trash2,
  Printer,
  Plus,
  Frown
} from "lucide-react";
import Link from "next/link";
import LoyaltyPanel from "@/app/components/billing/LoyaltyPanel";
import { AnimatePresence, motion } from "framer-motion";
import { CustomSelect } from "@/app/components/ui/CustomSelect";
import { TableSketch, type SketchTone } from "@/app/components/settings/TableManager";
import { useRouter } from "next/navigation";
import StaffSidebar from "../../components/StaffSidebar";
import SetupChecklist from "../../components/onboarding/SetupChecklist";
import { api, refreshAccessToken } from "@/app/lib/api";
import { printBillTicket, printKitchenTicket } from "@/app/lib/posPrinter";
import { toast } from "react-hot-toast";
import { connectEventSocket, type EventSocketMessage } from "@/app/lib/eventSocket";

type BillStatus = "open" | "bill_requested" | "bill_printed" | "paid";

type StaffTable = {
  id: string;
  tableCode: string;
  restaurantName: string;
  isOccupied: boolean;
  isEnabled?: boolean;
  /** Guests have left but staff haven't cleaned the table yet. */
  needsCleaning?: boolean;
  activeSessionId?: string;
  isTakeaway?: boolean;
  takeawayStatus?: string; // raw status from takeaway_orders for reception dine-in tables
  currentTotal?: number;
  itemsCount?: number;
  guests?: number;
  billStatus?: BillStatus;
  seatedAt?: Date;
  floorName?: string;
  /** Seats at the table, from the floor plan. */
  capacity?: number;
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
  orderNumber?: number | null;
  dailyOrderNumber?: number | null;
};

type ServiceCallType = "waiter" | "water" | "help" | "bill" | "low-rating" | "cleaning";
type ServiceCallStatus = "open" | "attending" | "done";

type ServiceCall = {
  id: string;
  tableCode: string;
  type: ServiceCallType;
  createdAt: Date;
  status: ServiceCallStatus;
  rating?: number;
  comment?: string;
};

type TakeawaySummary = {
  takeout_count: number;
  delivery_count: number;
  takeout_revenue: number;
  delivery_revenue: number;
  delivery_fee_total: number;
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
  floor_name?: string;
  needs_cleaning?: boolean;
  capacity?: number | null;
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
  estimated_prep_minutes?: number | null;
  estimated_ready_at?: string | null;
  session_id: string;
  table_id: string;
  table_number: number;
  order_number?: number | null;
  daily_order_number?: number | null;
  items: ActiveOrderItem[];
  is_takeaway?: boolean;
};

type ActiveOrdersResponse = {
  orders: ActiveOrder[];
};

type ActiveSessionAPI = {
  session_id: string;
  table_id: string;
  table_number: number;
  started_at: string;
  last_active_at: string;
};

type ActiveSessionsResponse = {
  sessions: ActiveSessionAPI[];
};

type ServiceCallAPI = {
  id: string;
  table_id: string;
  table_number: number;
  session_id: string;
  type: ServiceCallType;
  status: ServiceCallStatus;
  created_at: string;
  rating?: number;
  comment?: string;
};

const getTimeAgo = (rawDate: any) => {
  if (!rawDate) return "Unknown time";
  const date = rawDate instanceof Date ? rawDate : new Date(rawDate);
  if (isNaN(date.getTime())) return "Unknown time";
  const diff = Math.floor((new Date().getTime() - date.getTime()) / 60000);
  if (diff < 1) return "Just now";
  if (diff < 60) return `${diff}m ago`;
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  if (hours >= 3) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

const getMinutesDiff = (rawDate?: any) => {
  if (!rawDate) return 0;
  const date = rawDate instanceof Date ? rawDate : new Date(rawDate);
  if (isNaN(date.getTime())) return 0;
  return Math.floor((new Date().getTime() - date.getTime()) / 60000);
};

export default function StaffDashboardPage({ initialData }: { initialData?: any }) {
  const router = useRouter();

  const initialProcessed = useMemo(() => processDashboardData(initialData), [initialData]);

  const [searchTerm, setSearchTerm] = useState("");
  const [tables, setTables] = useState<StaffTable[]>(initialProcessed?.tables || []);
  const [selectedFloor, setSelectedFloor] = useState<string>("All Floors");
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>(initialProcessed?.activeOrders || []);
  const [taxPercent, setTaxPercent] = useState<number>(
    typeof initialData?.meRes?.tax_percent === "number" ? initialData.meRes.tax_percent : 5
  );
  const [servicePercent, setServicePercent] = useState<number>(
    typeof initialData?.meRes?.service_charge === "number" ? initialData.meRes.service_charge : 0
  );
  const [serviceCalls, setServiceCalls] = useState<ServiceCall[]>(initialProcessed?.serviceCalls || []);
  // null = this role can't see takings (server refused), so the tile is hidden.
  const [todaySales, setTodaySales] = useState<number | null>(
    initialData && !initialData.salesRes ? null : initialProcessed?.todaySales || 0
  );
  const [profitMetrics, setProfitMetrics] = useState<any>(null);
  const [waitlistCount, setWaitlistCount] = useState<number>(initialProcessed?.waitlistCount || 0);
  const [takeawaySummary, setTakeawaySummary] = useState<TakeawaySummary | null>(initialProcessed?.takeawaySummary || null);
  const [orderActionPending, setOrderActionPending] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(!initialProcessed);


  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Mark Paid (without freeing the table): ask for the payment type first.
  const [markPaidModal, setMarkPaidModal] = useState<{
    tableId: string;
    tableCode: string;
    sessionId: string;
    total: number;
    selectedPayment: string;
    isProcessing: boolean;
    isTakeaway?: boolean;
  } | null>(null);
  // Sessions already settled; survives refreshes so Mark Paid stays disabled.
  const [paidSessionIds, setPaidSessionIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("qrave_paid_sessions") || "[]");
    } catch {
      return [];
    }
  });
  const isTablePaid = (t: StaffTable) =>
    t.billStatus === "paid" || Boolean(t.activeSessionId && paidSessionIds.includes(t.activeSessionId));

  const openMarkPaid = (tableId: string) => {
    const t = tables.find((x) => x.id === tableId);
    if (!t || !t.activeSessionId || isTablePaid(t)) return;
    setOpenMenuId(null);
    setMarkPaidModal({
      tableId: t.id,
      tableCode: t.tableCode,
      sessionId: t.activeSessionId,
      total: t.currentTotal || 0,
      selectedPayment: "cash",
      isProcessing: false,
      isTakeaway: t.isTakeaway,
    });
  };

  const confirmMarkPaid = async () => {
    if (!markPaidModal || markPaidModal.isProcessing) return;
    const m = markPaidModal;
    setMarkPaidModal({ ...m, isProcessing: true });
    try {
      const payload: any = { status: "paid", payment_mode: m.selectedPayment, reason: "staff_mark_paid" };
      if (m.isTakeaway) payload.takeaway_order_id = m.sessionId;
      else payload.session_id = m.sessionId;
      await api(`/api/admin/payments/status`, { method: "POST", body: JSON.stringify(payload) });
      setPaidSessionIds((prev) => {
        const next = Array.from(new Set([...prev, m.sessionId])).slice(-200);
        try { localStorage.setItem("qrave_paid_sessions", JSON.stringify(next)); } catch {}
        return next;
      });
      setTables((prev) => prev.map((t) => (t.id === m.tableId ? { ...t, billStatus: "paid" } : t)));
      setMarkPaidModal(null);
      toast.success(`${m.tableCode} marked paid (${m.selectedPayment.toUpperCase()})`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to mark as paid");
      setMarkPaidModal({ ...m, isProcessing: false });
    }
  };
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [selectedMergeTableIds, setSelectedMergeTableIds] = useState<string[]>([]);
  const [confirmAction, setConfirmAction] = useState<null | {
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
    confirmText?: string;
    cancelText?: string;
    hideCancel?: boolean;
    destructive?: boolean;
  }>(null);

  // Inline "Free Table" modal — shown when table has an unpaid balance
  const [freeTableModal, setFreeTableModal] = useState<{
    isOpen: boolean;
    tableId: string;
    tableCode: string;
    sessionId: string;
    totalAmount: number;
    currentTotal: number;
    selectedPayment: string;
    isProcessing: boolean;
    isTakeaway?: boolean;
  } | null>(null);

  const [tableFilter, setTableFilter] = useState<TableFilter>("all");
  const [tableSort, setTableSort] = useState<TableSort>("table");
  const [activeSidebarTab, setActiveSidebarTab] = useState<"kitchen" | "service">("kitchen");

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const refreshLockRef = useRef(false);
  const socketRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDraggingRef = useRef(false);
  // Optimistic status changes (accept / serve) that must survive stale refreshes
  // and socket events still carrying the old status, so cards don't flicker back.
  const statusOverridesRef = useRef<Map<string, { status: string; at: number }>>(new Map());
  const applyStatusOverride = <T extends { id?: string; order_id?: string; status: string }>(o: T): T => {
    const id = o.id || o.order_id;
    const ov = id ? statusOverridesRef.current.get(id) : undefined;
    if (!id || !ov) return o;
    if (Date.now() - ov.at > 30000) {
      statusOverridesRef.current.delete(id);
      return o;
    }
    const terminal = o.status === "served" || o.status === "completed" || o.status === "cancelled";
    const caughtUp = ov.status === "served" ? terminal || o.status === "ready" : o.status !== "pending";
    if (caughtUp) {
      statusOverridesRef.current.delete(id);
      return o;
    }
    return { ...o, status: ov.status };
  };

  useEffect(() => {
    let mounted = true;
    const guardRole = async () => {
      try {
        const me = await api<{ role?: string }>("/api/admin/me", { method: "GET", suppressErrorLog: true });
        if (!mounted) return;
        const role = (me?.role || "").toLowerCase();
        if (role === "kitchen") {
          router.replace("/staff/kitchen");
          return;
        }
        if (role === "cashier") {
          router.replace("/staff/cashier");
          return;
        }
      } catch {
        // staff layout already handles unauthenticated redirects
      }
    };
    guardRole();
    return () => {
      mounted = false;
    };
  }, [router]);

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
      // Kitchen list should only show active work; hide served/completed/cancelled.
      if (order.status === "served" || order.status === "completed" || order.status === "cancelled") {
        continue;
      }
      const mappedStatus: OrderStatus =
        order.status === "pending" ? "pending" : "cooking";
      for (const item of order.items || []) {
        // Skip ghost/malformed items with no name or zero quantity
        if (!item.menu_item_name || !item.quantity) continue;
        const variantSuffix = item.variant_label ? ` (${item.variant_label})` : "";
        next.push({
          id: `${orderId}-${item.menu_item_id}-${item.variant_id}`,
          orderId,
          tableCode: `T${order.table_number}`,
          itemName: `${item.menu_item_name}${variantSuffix}`,
          quantity: item.quantity,
          orderedAt: new Date(order.created_at),
          status: mappedStatus,
          orderNumber: order.order_number,
          dailyOrderNumber: order.daily_order_number,
        });
      }
    }
    return next;
  };

  const upsertOrder = (ordersList: ActiveOrder[], incoming: ActiveOrder) => {
    const orderId = incoming.id || incoming.order_id;
    if (!orderId) return ordersList;
    const normalized: ActiveOrder = { ...incoming, id: orderId, order_id: orderId };
    return [normalized, ...ordersList.filter((o) => (o.id || o.order_id) !== orderId)];
  };

  const buildTables = (tablesApi: TableAPI[], ordersList: ActiveOrder[], sessionsList: ActiveSessionAPI[], rawTakeawayOrders?: any[], tPct = 5, sPct = 0) => {
    const occupancyByTable = new Map<string, { sessionId: string; seatedAt?: Date }>();
    for (const s of sessionsList) {
      if (!s.table_id) continue;
      occupancyByTable.set(s.table_id, {
        sessionId: s.session_id,
        seatedAt: s.started_at ? new Date(s.started_at) : undefined,
      });
    }

    const totalsByTable = new Map<string, { sub: number; count: number; sessionId?: string; seatedAt?: Date }>();
    for (const order of ordersList) {
      if (!order.table_id) continue;
      const existing = totalsByTable.get(order.table_id) || { sub: 0, count: 0, sessionId: order.session_id };
      const orderCreatedAt = order.created_at ? new Date(order.created_at) : undefined;
      const orderSub = order.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
      totalsByTable.set(order.table_id, {
        sub: existing.sub + orderSub,
        count: existing.count + order.items.reduce((sum, i) => sum + i.quantity, 0),
        sessionId: order.session_id || existing.sessionId,
        seatedAt:
          existing.seatedAt && orderCreatedAt
            ? existing.seatedAt < orderCreatedAt
              ? existing.seatedAt
              : orderCreatedAt
            : existing.seatedAt || orderCreatedAt,
      });
    }

    const finalTotals = new Map<string, { total: number; count: number; sessionId?: string; seatedAt?: Date }>();
    for (const [tableId, data] of totalsByTable.entries()) {
      const service = Math.round(data.sub * (sPct / 100));
      const taxAmount = Math.round((data.sub + service) * (tPct / 100));
      finalTotals.set(tableId, {
        total: data.sub + service + taxAmount,
        count: data.count,
        sessionId: data.sessionId,
        seatedAt: data.seatedAt,
      });
    }

    // Also include "ready" (served but not freed) takeaway orders in the table totals
    // so the table card shows the bill even after marking served, until staff frees it.
    const takeawayStatusByTable = new Map<string, string>(); // table_id → takeaway status
    for (const tw of rawTakeawayOrders || []) {
      if (tw.status === "completed" || tw.status === "cancelled") continue;
      let tableNum = parseInt(String(tw.table_number || ""), 10);
      const notes = String(tw.notes || "");
      if (isNaN(tableNum) && notes.includes("[RECEPTION_DINEIN]")) {
        const m = notes.match(/\[RECEPTION_DINEIN\]\s*T(\d+)/i);
        if (m) tableNum = parseInt(m[1], 10);
      }
      if (isNaN(tableNum) || tableNum <= 0) continue;
      const matchingTable = tablesApi.find(t => t.table_number === tableNum);
      if (!matchingTable) continue;
      // Track the takeaway status for buildTableTimeline
      takeawayStatusByTable.set(matchingTable.id, tw.status);
      // Only add to totals if NOT already covered by the injected order in ordersList
      if (finalTotals.has(matchingTable.id)) continue;
      const twTotal = Number(tw.total) || (tw.items || []).reduce((s: number, i: any) => s + (i.unit_price || 0) * (i.quantity || 1), 0);
      const twCount = (tw.items || []).reduce((s: number, i: any) => s + (i.quantity || 1), 0);
      if (twTotal > 0 || twCount > 0) {
        finalTotals.set(matchingTable.id, {
          total: twTotal,
          count: twCount,
          sessionId: tw.id,
          seatedAt: tw.created_at ? new Date(tw.created_at) : undefined,
        });
      }
    }

    return tablesApi.map((t) => {
      const occ = occupancyByTable.get(t.id);
      const meta = finalTotals.get(t.id);
      const hasActiveOrders = Boolean(meta && meta.count > 0);
      return {
        id: t.id,
        tableCode: `T${t.table_number}`,
        restaurantName: "",
        isOccupied: Boolean(occ) || hasActiveOrders,
        activeSessionId: occ?.sessionId || meta?.sessionId,
        isTakeaway: !occ && hasActiveOrders,
        takeawayStatus: takeawayStatusByTable.get(t.id),
        currentTotal: meta?.total,
        itemsCount: meta?.count,
        seatedAt: occ?.seatedAt || meta?.seatedAt,
        isEnabled: t.is_enabled,
        needsCleaning: Boolean(t.needs_cleaning) && !occ && !hasActiveOrders,
        floorName: t.floor_name || "Main Floor",
        capacity: typeof t.capacity === "number" ? t.capacity : undefined,
      } as StaffTable;
    });
  };

  const refreshLiveData = async () => {
    const [tablesRes, ordersRes, sessionsRes, takeawayRes] = await Promise.all([
      api<TableAPI[]>("/api/admin/tables", { noCache: true }),
      api<ActiveOrdersResponse>("/api/admin/orders/active"),
      api<ActiveSessionsResponse>("/api/admin/sessions/active"),
      api<{ orders: any[] }>("/api/admin/takeaway/orders?status=active").catch(() => ({ orders: [] })),
    ]);

    const ordersList = [...(ordersRes?.orders || [])];
    const sessionsList = sessionsRes?.sessions || [];
    const takeawayOrdersList = takeawayRes?.orders || [];
    const tablesApi = tablesRes || [];

    // Inject Dine-in Takeaway orders as active POS orders
    // Skip if a real POS order already exists for this table (prevents duplicates after kitchen accepts)
    for (const tw of takeawayOrdersList) {
      if (tw.status === "completed" || tw.status === "cancelled" || tw.status === "ready") continue;
      
      let tableNum = parseInt(String(tw.table_number || ""), 10);
      const notes = String(tw.notes || "");
      if (isNaN(tableNum) && notes.includes("[RECEPTION_DINEIN]")) {
        const m = notes.match(/\[RECEPTION_DINEIN\]\s*T(\d+)/i);
        if (m) tableNum = parseInt(m[1], 10);
      }
      
      if (!isNaN(tableNum) && tableNum > 0) {
        const matchingTable = tablesApi.find(t => t.table_number === tableNum);
        const tableId = matchingTable ? matchingTable.id : "";

        // If any real (non-takeaway) order already covers this table, skip injection to avoid duplicates
        const alreadyHasRealOrder = ordersList.some(
          o => !o.is_takeaway && (o.table_id === tableId || o.table_number === tableNum)
        );
        if (alreadyHasRealOrder) continue;

        // Also skip if this takeaway order is already in ordersList (e.g., from a previous inject)
        const alreadyInjected = ordersList.some(o => (o.id || o.order_id) === tw.id);
        if (alreadyInjected) continue;

        ordersList.push({
          id: tw.id,
          order_id: tw.id,
          status: "accepted", // Receptionist added orders are automatically accepted
          created_at: tw.created_at,
          session_id: tw.id, // using order id as fake session proxy
          table_id: tableId,
          table_number: tableNum,
          order_number: tw.order_number || null,
          daily_order_number: tw.daily_order_number || null,
          items: (tw.items || []).map((i: any) => ({
            menu_item_id: i.menu_item_id || "",
            variant_id: i.variant_id || "",
            quantity: i.quantity || 1,
            price: i.unit_price || 0,
            menu_item_name: i.menu_item_name || "",
            variant_label: i.variant_label || null,
          })),
          is_takeaway: true
        });
      }
    }

    const reconciled = ordersList.map(applyStatusOverride);
    setActiveOrders(reconciled);
    setOrders(buildPendingOrders(reconciled));
    setTables(buildTables(tablesApi, reconciled, sessionsList, takeawayOrdersList, taxPercent, servicePercent));
  };

  const refreshDashboard = async () => {
    if (refreshLockRef.current) return;
    refreshLockRef.current = true;
    try {
      await refreshLiveData();
      const [serviceRes, salesRes, takeawayRes, waitlistRes] = await Promise.all([
        api<ServiceCallAPI[]>("/api/admin/service-calls"),
        // Only cashiers and up may see takings; other roles get 403 and no tile.
        api<{ total: number }>("/api/admin/sales/today", { suppressErrorLog: true }).catch(() => null),
        // Ordering and AR plans have no takeaway tools: the server answers 403.
        api<TakeawaySummary>("/api/admin/takeaway/summary", { suppressErrorLog: true }).catch(() => null),
        api<{ waitlist?: any[] }>("/api/admin/waitlist").catch(() => ({ waitlist: [] })),
      ]);
      // Get the current set of occupied table codes from the latest tables state
      // We read it lazily here so we can cross-filter stale service calls
      setTables((currentTables) => {
        const occupiedTableCodes = new Set(
          currentTables.filter((t) => t.isOccupied).map((t) => t.tableCode)
        );

        setServiceCalls(
          (serviceRes || [])
            .filter((c) => c.status !== "done")
            // Drop any service call whose table is no longer occupied
            .filter((c) => occupiedTableCodes.has(`T${c.table_number}`))
            .map((c) => ({
              id: c.id,
              tableCode: `T${c.table_number}`,
              type: c.type,
              status: c.status,
              createdAt: new Date(c.created_at),
              rating: c.rating,
              comment: c.comment,
            }))
        );

        return currentTables; // no change to tables
      });
      if (salesRes === null) {
        setTodaySales(null);
      } else if (typeof salesRes?.total === "number") {
        setTodaySales(salesRes.total);
      }
      if (takeawayRes) {
        setTakeawaySummary(takeawayRes);
      }
      if (waitlistRes && Array.isArray(waitlistRes.waitlist)) {
        const waiting = waitlistRes.waitlist.filter((w: any) => w.status === "waiting").length;
        setWaitlistCount(waiting);
      }
    } finally {
      refreshLockRef.current = false;
    }
  };

  const refreshSlowMetrics = async () => {
    const profitRes = await api<any>("/api/admin/analytics/profit-engineering", {
      suppressErrorLog: true,
    }).catch(() => null);
    if (profitRes?.profit_engineering) {
      setProfitMetrics(profitRes.profit_engineering);
    }
  };

  const scheduleSocketRefresh = () => {
    if (socketRefreshTimerRef.current) {
      clearTimeout(socketRefreshTimerRef.current);
    }
    socketRefreshTimerRef.current = setTimeout(() => {
      refreshDashboard().catch(() => { });
    }, 300);
  };

  useEffect(() => {
    let isActive = true;
    if (!initialProcessed) {
      const load = async () => {
        try {
          await refreshDashboard();
        } catch {
          if (!isActive) return;
          setActiveOrders([]);
          setOrders([]);
          setTables([]);
          setServiceCalls([]);
        } finally {
          if (isActive) setIsLoading(false);
          setTimeout(() => {
            if (isActive) refreshSlowMetrics().catch(() => { });
          }, 100);
        }
      };
      load();
    } else {
      // Seed the kitchen Activity Feed from the already-loaded active orders
      setOrders(buildPendingOrders(initialProcessed.activeOrders || []));
      // Trigger background refresh to get latest data (crucial when navigating back from table bill page)
      const load = async () => {
        try {
          await refreshDashboard();
        } catch {
          // ignore
        } finally {
          setTimeout(() => {
            if (isActive) refreshSlowMetrics().catch(() => { });
          }, 100);
        }
      };
      load();
    }
    return () => { isActive = false; };
  }, [initialProcessed]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      refreshDashboard().catch(() => { });
    }, 30000);
    return () => window.clearInterval(timer);
  }, []);

  // Auto-free sessions that have been occupied for 15+ minutes with zero orders placed
  useEffect(() => {
    const autoFreeIdle = async () => {
      const idleTables = tables.filter((t) => {
        if (!t.isOccupied || !t.activeSessionId) return false;
        const mins = getMinutesDiff(t.seatedAt);
        const hasAnyOrder = activeOrders.some((o) => o.table_id === t.id);
        return mins >= 15 && !hasAnyOrder && (t.itemsCount === 0 || t.itemsCount == null);
      });
      for (const t of idleTables) {
        try {
          await api(`/api/admin/sessions/${t.activeSessionId}/end`, { method: "POST" });
        } catch {
          // silently skip — will retry next tick
        }
      }
      if (idleTables.length > 0) {
        await refreshDashboard().catch(() => {});
        toast(`${idleTables.length} idle table${idleTables.length > 1 ? "s" : ""} auto-freed (no orders in 15 min)`, { icon: "🪑" });
      }
    };
    const autoFreeTimer = window.setInterval(autoFreeIdle, 60000);
    return () => window.clearInterval(autoFreeTimer);
  }, [tables, activeOrders]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onFocus = () => refreshDashboard().catch(() => { });
    const onVis = () => {
      if (document.visibilityState === "visible") {
        refreshDashboard().catch(() => { });
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const base = process.env.NEXT_PUBLIC_EVENT_SERVICE_URL?.trim();
    if (!base) return;

    const getRealtimeToken = async (): Promise<string | null> => {
      try {
        // Shared with the 401 handler in api.ts so two refreshes never race.
        return (await refreshAccessToken()) || null;
      } catch {
        return null;
      }
    };

    const cleanup = connectEventSocket({
      baseUrl: base,
      getToken: getRealtimeToken,
      onMessage: (msg: EventSocketMessage) => {
        if (msg?.type === "order.created" || msg?.type === "order.updated") {
          const rawData = msg?.data as ActiveOrder;
          const orderId = rawData?.id || rawData?.order_id;
          if (!rawData || !orderId) return;
          const data = applyStatusOverride(rawData);
          // If the incoming status is a terminal/done status and it's not already
          // in our list, there's nothing to add. Just trigger a background refresh.
          const terminalStatus = data.status === "served" || data.status === "completed" || data.status === "cancelled";
          setActiveOrders((prev) => {
            const alreadyTracked = prev.some(o => (o.id || o.order_id) === orderId);
            if (terminalStatus && !alreadyTracked) {
              // Don't add a finished order we've never seen — it's irrelevant
              setOrders(buildPendingOrders(prev));
              return prev;
            }
            const next = upsertOrder(prev, data);
            setOrders(buildPendingOrders(next));
            return next;
          });
          scheduleSocketRefresh();
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
          scheduleSocketRefresh();
        }
      },
    });

    return () => {
      if (socketRefreshTimerRef.current) {
        clearTimeout(socketRefreshTimerRef.current);
      }
      cleanup();
    };
  }, []);

  const occupiedCount = tables.filter((t) => t.isOccupied).length;
  const totalTables = tables.length;
  const uniqueFloors = Array.from(new Set(tables.map((t) => t.floorName || "Main Floor").filter(Boolean))) as string[];
  const totalSales = todaySales;

  // `orders` has one row per item. Accept, cancel, serve and KOT all act on a
  // whole order, so the kitchen list and its counts work per order.
  const kitchenOrders = (() => {
    const byId = new Map<
      string,
      {
        orderId: string;
        tableCode: string;
        orderedAt: Date;
        status: OrderStatus;
        dailyOrderNumber?: number | null;
        items: { key: string; name: string; quantity: number }[];
      }
    >();
    for (const row of orders) {
      let group = byId.get(row.orderId);
      if (!group) {
        group = {
          orderId: row.orderId,
          tableCode: row.tableCode,
          orderedAt: row.orderedAt,
          status: row.status,
          dailyOrderNumber: row.dailyOrderNumber,
          items: [],
        };
        byId.set(row.orderId, group);
      }
      group.items.push({ key: row.id, name: row.itemName, quantity: row.quantity });
    }
    return Array.from(byId.values());
  })();

  const pendingOrdersCount = kitchenOrders.filter((o) => o.status === "pending").length;
  const cookingOrdersCount = kitchenOrders.filter((o) => o.status === "cooking").length;
  const delayedOrdersCount = kitchenOrders.filter(
    (o) => o.status === "pending" && getMinutesDiff(o.orderedAt) > 10
  ).length;

  const activeServiceCallsCount = serviceCalls.filter((c) => c.status !== "done").length;

  const billRequestedCount = Array.from(
    new Set(serviceCalls.filter((c) => c.type === "bill").map((c) => c.tableCode))
  ).length;

  const longSittingCount = tables.filter(
    (t) => t.isOccupied && getMinutesDiff(t.seatedAt) > 90
  ).length;

  const filteredTables = tables
    .filter((table) =>
      table.tableCode.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter((table) => {
      if (selectedFloor !== "All Floors" && table.floorName !== selectedFloor) return false;
      return true;
    })
    .filter((table) => {
      if (tableFilter === "all") return true;
      if (tableFilter === "occupied") return table.isOccupied;
      if (tableFilter === "free") return !table.isOccupied && !table.needsCleaning;
      if (tableFilter === "bill_requested")
        return serviceCalls.some((c) => c.type === "bill" && c.tableCode === table.tableCode);
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

  const buildTableTimeline = (table: StaffTable) => {
    const tableOrders = activeOrders
      .filter((o) => o.table_id === table.id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const hasSeated = Boolean(table.isOccupied && table.seatedAt);

    // For reception dine-in (isTakeaway) tables, derive status from takeawayStatus
    // since "ready" orders are no longer injected into activeOrders
    const tw = table.isTakeaway ? table.takeawayStatus : undefined;
    const hasAccepted =
      tableOrders.some((o) => o.status === "accepted" || o.status === "ready" || o.status === "served") ||
      (tw === "preparing" || tw === "ready" || tw === "completed");
    const hasKitchen =
      tableOrders.some((o) => o.status === "pending" || o.status === "accepted" || o.status === "preparing" || o.status === "ready") ||
      (tw === "preparing" || tw === "ready" || tw === "completed");
    const hasServed =
      tableOrders.some((o) => o.status === "served") ||
      (tw === "ready" || tw === "completed");
    const hasPaid = isTablePaid(table);
    return [
      { key: "seated", label: "Seated", done: hasSeated },
      { key: "accepted", label: "Accepted", done: hasAccepted },
      { key: "kitchen", label: "Kitchen", done: hasKitchen },
      { key: "served", label: "Served", done: hasServed },
      { key: "paid", label: "Paid", done: hasPaid },
    ];
  };

  const handleAccept = async (orderId: string) => {
    if (orderActionPending[orderId]) return;
    const previous = activeOrders;
    statusOverridesRef.current.set(orderId, { status: "accepted", at: Date.now() });
    const next = activeOrders.map((o) =>
      (o.id || o.order_id) === orderId ? { ...o, status: "accepted" } : o
    );
    setActiveOrders(next);
    setOrders(buildPendingOrders(next));
    setOrderActionPending((prev) => ({ ...prev, [orderId]: true }));
    try {
      const isTakeaway = activeOrders.some(o => ((o.id || o.order_id) === orderId) && o.is_takeaway);
      if (isTakeaway) {
        // Takeaway doesn't have 'accepted' status — map to 'preparing' instead
        const url = `/api/admin/takeaway/orders/${orderId}/status`;
        await api(url, {
          method: "PATCH",
          body: JSON.stringify({ status: "preparing" }),
        });
      } else {
        await api(`/api/admin/orders/${orderId}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: "accepted" }),
        });
      }
      refreshLiveData().catch(() => { });
    } catch {
      setActiveOrders(previous);
      setOrders(buildPendingOrders(previous));
      statusOverridesRef.current.delete(orderId);
      toast.error("Unable to accept order");
    } finally {
      setOrderActionPending((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const handleServe = async (orderId: string) => {
    if (orderActionPending[orderId]) return;
    const previous = activeOrders;
    statusOverridesRef.current.set(orderId, { status: "served", at: Date.now() });
    const next = activeOrders.map((o) =>
      (o.id || o.order_id) === orderId ? { ...o, status: "served" } : o
    );
    setActiveOrders(next);
    setOrders(buildPendingOrders(next));
    setOrderActionPending((prev) => ({ ...prev, [orderId]: true }));
    try {
      const isTakeaway = activeOrders.some(o => ((o.id || o.order_id) === orderId) && o.is_takeaway);
      if (isTakeaway) {
        // For dine-in reception orders, use 'ready' (not 'completed' — that would auto-free the table)
        const url = `/api/admin/takeaway/orders/${orderId}/status`;
        await api(url, {
          method: "PATCH",
          body: JSON.stringify({ status: "ready" }),
        });
      } else {
        await api(`/api/admin/orders/${orderId}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: "served" }),
        });
      }
      refreshLiveData().catch(() => { });
    } catch {
      setActiveOrders(previous);
      setOrders(buildPendingOrders(previous));
      statusOverridesRef.current.delete(orderId);
      toast.error("Unable to mark order served");
    } finally {
      setOrderActionPending((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const handleReject = async (orderId: string) => {
    if (orderActionPending[orderId]) return;
    const previous = activeOrders;
    const next = activeOrders.map((o) =>
      (o.id || o.order_id) === orderId ? { ...o, status: "cancelled" } : o
    );
    setActiveOrders(next);
    setOrders(buildPendingOrders(next));
    setOrderActionPending((prev) => ({ ...prev, [orderId]: true }));
    try {
      const isTakeaway = activeOrders.some(o => ((o.id || o.order_id) === orderId) && o.is_takeaway);
      if (isTakeaway) {
        await api(`/api/admin/takeaway/orders/${orderId}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: "cancelled" }),
        });
      } else {
        // Allowed until the kitchen starts cooking; needs no manager PIN.
        await api(`/api/admin/orders/${orderId}/cancel-unstarted`, { method: "POST" });
      }
      refreshLiveData().catch(() => { });
    } catch {
      setActiveOrders(previous);
      setOrders(buildPendingOrders(previous));
      toast.error("Couldn't cancel the order. The kitchen may have started it.");
    } finally {
      setOrderActionPending((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  /** The table has been cleaned and can seat the next party. */
  const handleMarkClean = async (tableId: string) => {
    const t = tables.find((x) => x.id === tableId);
    setTables((prev) => prev.map((x) => (x.id === tableId ? { ...x, needsCleaning: false } : x)));
    try {
      await api(`/api/admin/tables/${tableId}/clean`, { method: "POST" });
      toast.success(`${t?.tableCode ?? "Table"} is ready for guests`);
      await refreshDashboard();
    } catch (err: any) {
      setTables((prev) => prev.map((x) => (x.id === tableId ? { ...x, needsCleaning: true } : x)));
      toast.error(err?.message || "Couldn't mark the table clean");
    }
  };

  const handleFreeTable = async (tableId: string) => {
    const tableToFree = tables.find(t => t.id === tableId);
    if (!tableToFree) return;
    if (!tableToFree.activeSessionId) return;

    try {
      if (tableToFree.isTakeaway) {
        await api(`/api/admin/takeaway/orders/${tableToFree.activeSessionId}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: "completed" }),
        });
      } else {
        await api(`/api/admin/sessions/${tableToFree.activeSessionId}/end`, {
          method: "POST",
        });
      }
    } catch (err: any) {
      const status = err?.status;
      const msg = String(err?.message || "").toLowerCase();
      if (status === 409 && (msg.includes("mark paid") || msg.includes("pending bill") || msg.includes("unpaid"))) {
        // Fallback: if API still rejects, open the payment modal
        const total = tableToFree.currentTotal || 0;
        setFreeTableModal({
          isOpen: true,
          tableId: tableToFree.id,
          tableCode: tableToFree.tableCode,
          sessionId: tableToFree.activeSessionId!,
          totalAmount: total,
          currentTotal: total,
          selectedPayment: "cash",
          isProcessing: false,
          isTakeaway: tableToFree.isTakeaway,
        });
        return;
      }
      toast.error(err?.message || "Failed to free table");
      return;
    }

    await refreshDashboard();
    toast.success("Table freed");
    setOpenMenuId(null);
  };

  const requestFreeTable = (tableId: string) => {
    const tableToFree = tables.find(t => t.id === tableId);
    if (!tableToFree) return;
    setOpenMenuId(null);

    // Check if there is an unpaid balance for this table
    const total = tableToFree.currentTotal || 0;
    const hasUnpaidBalance = total > 0 && !isTablePaid(tableToFree);

    if (hasUnpaidBalance && tableToFree.activeSessionId) {
      // Show inline modal: let staff choose payment + free the table in one tap
      setFreeTableModal({
        isOpen: true,
        tableId: tableToFree.id,
        tableCode: tableToFree.tableCode,
        sessionId: tableToFree.activeSessionId,
        totalAmount: total,
        currentTotal: total,
        selectedPayment: "cash",
        isProcessing: false,
        isTakeaway: tableToFree.isTakeaway,
      });
    } else {
      // No balance — just confirm and free
      setConfirmAction({
        title: `Free ${tableToFree.tableCode}?`,
        message: tableToFree.isTakeaway ? "This will complete the active takeaway order immediately." : "This will end the active session immediately.",
        onConfirm: async () => handleFreeTable(tableId),
      });
    }
  };

  const handleConfirmFreeWithPayment = async () => {
    if (!freeTableModal || freeTableModal.isProcessing) return;
    setFreeTableModal(prev => prev ? { ...prev, isProcessing: true } : null);
    try {
      // 1. Mark the bill as paid via the payments API
      const paymentPayload: any = {
        status: "paid",
        payment_mode: freeTableModal.selectedPayment,
        reason: "staff_free_table",
      };
      if (freeTableModal.isTakeaway) {
        paymentPayload.takeaway_order_id = freeTableModal.sessionId;
      } else {
        paymentPayload.session_id = freeTableModal.sessionId;
      }
      await api(`/api/admin/payments/status`, {
        method: "POST",
        body: JSON.stringify(paymentPayload),
      });

      // 2. End the session (free the table) or complete the takeaway
      if (freeTableModal.isTakeaway) {
        await api(`/api/admin/takeaway/orders/${freeTableModal.sessionId}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: "completed" }),
        });
      } else {
        await api(`/api/admin/sessions/${freeTableModal.sessionId}/end`, {
          method: "POST",
        });
      }

      setFreeTableModal(null);
      await refreshDashboard();
      toast.success(`${freeTableModal.tableCode} — bill paid · table needs cleaning`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to settle and free table");
      setFreeTableModal(prev => prev ? { ...prev, isProcessing: false } : null);
    }
  };

  const markBillPrinted = async (tableId: string) => {
    const table = tables.find((t) => t.id === tableId);
    if (!table?.activeSessionId) return;

    const tableOrders = activeOrders.filter((o) => o.table_id === table.id);
    const billItems: Array<{ name: string; qty: number; amount: number }> = [];
    const orderRefs: Array<{ dailyOrderNumber?: number | null; orderNumber?: number | null }> = [];
    let total = 0;
    for (const order of tableOrders) {
      orderRefs.push({ dailyOrderNumber: order.daily_order_number, orderNumber: order.order_number });
      for (const item of order.items || []) {
        const lineTotal = item.price * item.quantity;
        total += lineTotal;
        billItems.push({
          name: item.variant_label
            ? `${item.menu_item_name} (${item.variant_label})`
            : item.menu_item_name,
          qty: item.quantity,
          amount: lineTotal,
        });
      }
    }

    try {
      const me = await api<{ name?: string }>("/api/admin/me", { method: "GET", suppressErrorLog: true }).catch(() => null);
      await printBillTicket({
        tableCode: table.tableCode,
        printedAt: new Date().toLocaleString(),
        staffName: me?.name || "NA",
        orderRefs,
        items: billItems,
        total,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to print bill";
      toast.error(msg);
      return;
    }

    await api(`/api/admin/payments/status`, {
      method: "POST",
      body: JSON.stringify({
        session_id: table.activeSessionId,
        status: "paid",
        payment_mode: "cash",
        reason: "printed_bill_close",
        amount: Number(total.toFixed(2)),
      }),
    });

    await api(`/api/admin/sessions/${table.activeSessionId}/end`, {
      method: "POST",
    });

    toast.success("Bill printed and table closed");
    await refreshDashboard();
    setOpenMenuId(null);
  };

  const printOrderKOT = async (orderId: string) => {
    const source = activeOrders.find((o) => (o.id || o.order_id) === orderId);
    if (!source) {
      toast.error("Order not found for printing");
      return;
    }
    try {
      await printKitchenTicket({
        orderId,
        tableCode: `T${source.table_number}`,
        placedAt: new Date(source.created_at).toLocaleString(),
        orderNumber: source.order_number,
        dailyOrderNumber: source.daily_order_number,
        items: (source.items || []).map((i) => ({
          name: i.variant_label ? `${i.menu_item_name} (${i.variant_label})` : i.menu_item_name,
          qty: i.quantity,
        })),
      });
      toast.success("Kitchen ticket sent");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to print ticket";
      toast.error(msg);
    }
  };

  const executeMoveTable = async (targetTableId: string) => {
    if (!activeTableId) return;

    const sourceTable = tables.find((t) => t.id === activeTableId);
    const targetTable = tables.find((t) => t.id === targetTableId);
    if (!sourceTable || !targetTable) return;

    if (!sourceTable.activeSessionId) return;

    try {
      await api("/api/admin/table-move", {
        method: "POST",
        body: JSON.stringify({
          session_id: sourceTable.activeSessionId,
          target_table_id: targetTableId,
        }),
      });

      await refreshDashboard();

      setShowMoveModal(false);
      setActiveTableId(null);
      setOpenMenuId(null);
    } catch (err: any) {
      setConfirmAction({
        title: "Move failed",
        message: err?.message || "Failed to move table",
        onConfirm: async () => Promise.resolve(),
        confirmText: "OK",
        hideCancel: true,
      });
    }
  };

  const handleMoveTable = async (targetTableId: string) => {
    if (!activeTableId) return;
    const sourceTable = tables.find((t) => t.id === activeTableId);
    const targetTable = tables.find((t) => t.id === targetTableId);
    if (!sourceTable || !targetTable) return;

    setConfirmAction({
      title: `Move ${sourceTable.tableCode} to ${targetTable.tableCode}?`,
      message: "Guests and active orders will be relocated to the selected table.",
      onConfirm: async () => executeMoveTable(targetTableId),
    });
  };

  const mergeTableInto = async (targetTableId: string, closeAfter: boolean) => {
    if (!activeTableId) return;

    const sourceTable = tables.find((t) => t.id === activeTableId);
    const targetTable = tables.find((t) => t.id === targetTableId);
    if (!sourceTable || !targetTable) return;

    const sourceSessionId =
      sourceTable.activeSessionId ||
      activeOrders.find((o) => o.table_id === sourceTable.id)?.session_id;
    const targetSessionId =
      targetTable.activeSessionId ||
      activeOrders.find((o) => o.table_id === targetTable.id)?.session_id;

    if (!sourceSessionId || !targetSessionId) {
      setConfirmAction({
        title: "Merge unavailable",
        message: "Could not resolve active sessions for selected tables. Please try again.",
        onConfirm: async () => Promise.resolve(),
        confirmText: "OK",
        hideCancel: true,
      });
      await refreshDashboard().catch(() => { });
      return;
    }

    try {
      await api("/api/admin/bills/merge", {
        method: "POST",
        body: JSON.stringify({
          session_id: sourceSessionId,
          target_session_id: targetSessionId,
        }),
      });
      await refreshDashboard();
      if (closeAfter) {
        setShowMergeModal(false);
        setActiveTableId(null);
        setOpenMenuId(null);
      }
    } catch (err: any) {
      setConfirmAction({
        title: "Merge failed",
        message: err?.message || "Failed to merge bills",
        onConfirm: async () => Promise.resolve(),
        confirmText: "OK",
        hideCancel: true,
      });
    }
  };

  const handleMergeTable = async (targetTableId: string) => {
    setIsMerging(true);
    try {
      await mergeTableInto(targetTableId, true);
    } finally {
      setIsMerging(false);
    }
  };

  const handleMergeSelectedTables = async () => {
    if (!activeTableId || selectedMergeTableIds.length === 0) return;
    setIsMerging(true);
    try {
      for (const targetTableId of selectedMergeTableIds) {
         
        await mergeTableInto(targetTableId, false);
      }
      await refreshDashboard();
      setShowMergeModal(false);
      setActiveTableId(null);
      setOpenMenuId(null);
      setSelectedMergeTableIds([]);
    } finally {
      setIsMerging(false);
    }
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

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <StaffSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="staff-topbar bg-white border-b border-gray-200 flex items-center px-8 z-10 animate-pulse">
            <div className="h-6 w-32 bg-gray-200 rounded" />
          </header>
          <div className="p-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-24 border border-slate-200 bg-white rounded-xl animate-pulse" />)}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className="h-28 border border-slate-200 bg-white rounded-2xl animate-pulse" />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex h-screen overflow-hidden bg-[#FAFAF7] text-[#0F1117]"
      onClick={() => setOpenMenuId(null)}
    >
      <StaffSidebar />

      <div className="flex-1 flex flex-col min-w-0 relative">
        <header className="shrink-0 border-b border-[#E8E8E3] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-8 py-4">
            <div className="flex items-center gap-3">
              <h1 className="text-[22px] font-bold leading-none tracking-[-0.02em] text-[#0F1117]">Floor overview</h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[12px] font-medium leading-none text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Live
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <dl className="hidden items-stretch overflow-hidden rounded-xl border border-[#E8E8E3] bg-white lg:flex">
                {(() => {
                  const money = (n?: number) => `₹${(n || 0).toLocaleString("en-IN")}`;
                  const orders = (n?: number) => (n ? `${n} ${n === 1 ? "order" : "orders"}` : null);
                  const used = totalTables ? Math.round((occupiedCount / totalTables) * 100) : 0;
                  const cells: { label: string; body: React.ReactNode; tone?: string }[] = [];

                  if (totalSales !== null) {
                    cells.push({
                      label: "Today's sales",
                      body: (
                        <span className={totalSales ? "text-[#0F1117]" : "text-[#9CA3AF]"}>{money(totalSales)}</span>
                      ),
                    });
                  }
                  if (takeawaySummary) {
                    for (const [label, rev, count] of [
                      ["Takeaway", takeawaySummary.takeout_revenue, takeawaySummary.takeout_count],
                      ["Delivery", takeawaySummary.delivery_revenue, takeawaySummary.delivery_count],
                    ] as const) {
                      cells.push({
                        label,
                        body: (
                          <span className="flex items-baseline gap-1.5">
                            <span className={rev || count ? "text-[#0F1117]" : "text-[#9CA3AF]"}>{money(rev)}</span>
                            {orders(count) && <span className="text-[12px] font-medium text-[#6B7280]">{orders(count)}</span>}
                          </span>
                        ),
                      });
                    }
                  }
                  cells.push({
                    label: "Tables in use",
                    body: (
                      <span className="flex items-center gap-2.5">
                        <span className="flex items-baseline gap-1">
                          <span className={occupiedCount ? "text-[#0F1117]" : "text-[#9CA3AF]"}>{occupiedCount}</span>
                          <span className="text-[12px] font-medium text-[#6B7280]">of {totalTables}</span>
                        </span>
                        <span className="block h-1 w-14 overflow-hidden rounded-full bg-[#F3F3EF]" aria-hidden>
                          <span className="block h-full rounded-full bg-[#fe5c13]" style={{ width: `${used}%` }} />
                        </span>
                      </span>
                    ),
                  });
                  cells.push({
                    label: "Waitlist",
                    body: waitlistCount > 0 ? (
                      <span className="text-[#fe5c13]">{waitlistCount} waiting</span>
                    ) : (
                      <span className="text-[#9CA3AF]">None</span>
                    ),
                  });

                  return cells.map((c, i) => (
                    <div key={c.label} className={`flex flex-col justify-center px-5 py-2.5 ${i > 0 ? "border-l border-[#E8E8E3]" : ""}`}>
                      <dt className="text-[12px] font-medium leading-none text-[#6B7280]">{c.label}</dt>
                      <dd className="mt-1.5 whitespace-nowrap text-[15px] font-semibold leading-none tabular-nums tracking-[-0.01em]">
                        {c.body}
                      </dd>
                    </div>
                  ));
                })()}
              </dl>

              <Link
                href="/staff/takeaway?new=1"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#fe5c13] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#e44e0b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fe5c13]/40 focus-visible:ring-offset-2"
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
                New order
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-[#E8E8E3] bg-[#FAFAF7] px-8 py-3 lg:grid-cols-4">
            {[
              { label: "Pending orders", count: pendingOrdersCount, Icon: ChefHat, hot: pendingOrdersCount > 5, tone: "text-[#fe5c13]", tint: "border-[#fe5c13]/25 bg-[#FFF8F3]" },
              { label: "Bill requests", count: billRequestedCount, Icon: Receipt, hot: billRequestedCount > 0, tone: "text-indigo-600", tint: "border-indigo-200 bg-indigo-50/50" },
              { label: "Service calls", count: activeServiceCallsCount, Icon: Bell, hot: activeServiceCallsCount > 0, tone: "text-sky-600", tint: "border-sky-200 bg-sky-50/50" },
              { label: "Long sitting", count: longSittingCount, Icon: Clock, hot: longSittingCount > 0, tone: "text-rose-600", tint: "border-rose-200 bg-rose-50/50" },
            ].map(({ label, count, Icon, hot, tone, tint }) => (
              <div
                key={label}
                className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 ${hot ? tint : "border-[#E8E8E3] bg-white"}`}
              >
                <span className="flex items-center gap-2.5 text-[13px] font-medium text-[#0F1117]">
                  <Icon className={`h-4 w-4 ${hot ? tone : "text-[#9CA3AF]"}`} />
                  {label}
                </span>
                <span className={`text-[15px] font-semibold tabular-nums ${hot ? tone : count > 0 ? "text-[#0F1117]" : "text-[#C4C4BE]"}`}>
                  {count}
                </span>
              </div>
            ))}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-[#FAFAF7]">
          <div className="px-8 pt-6 empty:hidden">
            <SetupChecklist />
          </div>
          <div className="flex flex-col">
            <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-[#E8E8E3] bg-[#FAFAF7]/95 px-8 py-3 backdrop-blur">
              <div className="flex flex-wrap items-center gap-3">
                {uniqueFloors.length > 1 && (
                  <div className="inline-flex h-9 items-center gap-0.5 rounded-xl bg-[#F3F3EF] p-1" role="tablist" aria-label="Floor">
                    {["All Floors", ...uniqueFloors].map((floor) => (
                      <button
                        key={floor}
                        role="tab"
                        aria-selected={selectedFloor === floor}
                        onClick={() => setSelectedFloor(floor)}
                        className={`flex h-7 items-center whitespace-nowrap rounded-lg px-3 text-[12px] font-medium transition-all ${selectedFloor === floor ? "bg-white font-semibold text-[#0F1117] shadow-[0_1px_2px_rgba(15,17,23,0.06)]" : "text-[#6B7280] hover:text-[#0F1117]"}`}
                      >
                        {floor === "All Floors" ? "All floors" : floor}
                      </button>
                    ))}
                  </div>
                )}

                <div className="inline-flex h-9 items-center gap-0.5 rounded-xl bg-[#F3F3EF] p-1" role="tablist" aria-label="Table status">
                  {(
                    [
                      ["all", "All tables"],
                      ["occupied", "Occupied"],
                      ["free", "Free"],
                      ["bill_requested", "Bill requested"],
                    ] as [TableFilter, string][]
                  ).map(([f, label]) => (
                    <button
                      key={f}
                      role="tab"
                      aria-selected={tableFilter === f}
                      onClick={() => setTableFilter(f)}
                      className={`flex h-7 items-center whitespace-nowrap rounded-lg px-3 text-[12px] font-medium transition-all ${tableFilter === f ? "bg-white font-semibold text-[#0F1117] shadow-[0_1px_2px_rgba(15,17,23,0.06)]" : "text-[#6B7280] hover:text-[#0F1117]"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="ml-auto flex shrink-0 items-center gap-2">
                <div className="w-44 shrink-0">
                  <CustomSelect
                    value={tableSort}
                    onChange={(val: TableSort) => setTableSort(val)}
                    buttonClassName="!h-9 !min-h-[36px] !py-0 !rounded-xl !border-[#E8E8E3] !bg-white !text-[13px] !font-medium !text-[#0F1117]"
                    options={[
                      { value: "table", label: "Table number" },
                      { value: "total", label: "Bill value" },
                      { value: "seated", label: "Time seated" },
                    ]}
                  />
                </div>
                <div className="relative w-60">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Find a table"
                    aria-label="Find a table"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-9 w-full rounded-xl border border-[#E8E8E3] bg-white pl-9 pr-3.5 text-[13px] text-[#0F1117] outline-none transition-colors placeholder:text-[#9CA3AF] hover:border-[#D6D6CF] focus:border-[#fe5c13]"
                  />
                </div>
              </div>
            </div>

            <div className="px-8 py-6">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {filteredTables.length === 0 && (
                  <div className="col-span-full rounded-2xl border border-dashed border-[#D6D6CF] bg-white py-16 text-center">
                    <p className="text-[15px] font-semibold text-[#0F1117]">No tables match these filters</p>
                    <p className="mt-1 text-[14px] text-[#6B7280]">Try another floor or status, or clear the search.</p>
                  </div>
                )}

                {filteredTables.map((table) => {
                  const isFree = !table.isOccupied;
                  const isDisabled = table.isEnabled === false;
                  const seatedMinutes = getMinutesDiff(table.seatedAt);
                  const isBillRequested = serviceCalls.some((c) => c.type === "bill" && c.tableCode === table.tableCode);
                  const isPaid = isTablePaid(table);
                  const activeOrdersForTable = kitchenOrders.filter((o) => o.tableCode === table.tableCode && (o.status === "pending" || o.status === "cooking")).length;
                  const timeStr = seatedMinutes < 60 ? `${seatedMinutes}m` : `${Math.floor(seatedMinutes / 60)}h ${seatedMinutes % 60}m`;
                  const timeline = table.isOccupied ? buildTableTimeline(table) : [];
                  const current = [...timeline].reverse().find((s) => s.done);
                  const eta = (() => {
                    const first = activeOrders.find((o) => o.table_id === table.id && (o.status === "pending" || o.status === "accepted" || o.status === "preparing"));
                    return first?.estimated_prep_minutes ? `${first.estimated_prep_minutes}m` : null;
                  })();

                  const seats = table.capacity && table.capacity > 0 ? table.capacity : 4;
                  const tone: SketchTone = isDisabled
                    ? "idle"
                    : isFree
                      ? table.needsCleaning ? "cleaning" : "idle"
                      : isBillRequested ? "bill" : isPaid ? "paid" : "occupied";

                  let accent = "bg-transparent";
                  if (isDisabled) accent = "bg-transparent";
                  else if (isFree && table.needsCleaning) accent = "bg-sky-400";
                  else if (!isFree && isBillRequested) accent = "bg-indigo-500";
                  else if (!isFree && isPaid) accent = "bg-emerald-500";
                  else if (!isFree) accent = "bg-[#fe5c13]";

                  const shell = isDisabled
                    ? "border-dashed border-[#E8E8E3] bg-transparent"
                    : isBillRequested
                      ? "border-indigo-300 bg-white ring-2 ring-indigo-500/15"
                      : isFree
                        ? "border-[#E8E8E3] bg-white"
                        : "border-[#E8E8E3] bg-white hover:border-[#D6D6CF] hover:shadow-[0_6px_20px_-12px_rgba(15,17,23,0.18)]";

                  return (
                    <div
                      key={table.id}
                      className={`relative w-full rounded-2xl ${openMenuId === table.id ? "z-30 overflow-visible" : "z-0 overflow-hidden"} ${table.isOccupied ? "bg-[#F3F3EF]" : ""}`}
                    >
                      {table.isOccupied && (
                        <div className="absolute inset-y-0 right-0 flex w-[140px] items-center justify-end gap-2 rounded-r-2xl px-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markBillPrinted(table.id);
                            }}
                            className="flex h-12 w-12 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl bg-indigo-600 text-white transition-colors hover:bg-indigo-700 shadow-sm"
                          >
                            <Receipt className="h-4 w-4" />
                            <span className="text-[11px] font-medium">Bill</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openMarkPaid(table.id);
                            }}
                            disabled={isPaid}
                            className="flex h-12 w-12 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl bg-emerald-600 text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40 shadow-sm"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-[11px] font-medium">Paid</span>
                          </button>
                        </div>
                      )}

                      <motion.div
                        drag={table.isOccupied ? "x" : false}
                        dragConstraints={{ left: -130, right: 0 }}
                        dragElastic={{ left: 0.12, right: 0.02 }}
                        dragTransition={{ bounceStiffness: 600, bounceDamping: 32 }}
                        whileTap={table.isOccupied ? { cursor: "grabbing" } : undefined}
                        onDragStart={() => {
                          isDraggingRef.current = true;
                        }}
                        onDragEnd={() => {
                          setTimeout(() => {
                            isDraggingRef.current = false;
                          }, 120);
                        }}
                        onClick={() => {
                          if (isDraggingRef.current) return;
                          if (openMenuId === table.id) {
                            setOpenMenuId(null);
                            return;
                          }
                          if (table.isOccupied && table.activeSessionId) {
                            router.push(`/staff/table/${table.activeSessionId}`);
                          }
                        }}
                        className={`relative flex h-full min-h-[154px] w-full flex-col rounded-2xl border transition-[border-color,box-shadow] duration-150 ${shell} ${table.isOccupied ? "cursor-pointer" : ""} ${openMenuId === table.id ? "z-40 overflow-visible" : "overflow-hidden"}`}
                      >
                        <div className={`absolute inset-x-0 top-0 h-[3px] ${accent}`} />

                        {isBillRequested && (
                          <div className="flex items-center gap-2 border-b border-indigo-100 bg-indigo-50 px-5 py-2 text-[12px] font-semibold text-indigo-700">
                            <Bell className="h-3.5 w-3.5 animate-[wiggle_1s_ease-in-out_infinite] motion-reduce:animate-none" />
                            Bill requested
                          </div>
                        )}

                        <div className="flex flex-1 flex-col p-4">
                          <div className="flex min-h-[28px] items-center justify-between gap-2">
                            {isDisabled ? (
                              <span className="text-[12px] font-medium text-[#9CA3AF]">Not in use</span>
                            ) : isFree ? (
                              table.needsCleaning ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 text-sky-700 px-2.5 py-1 text-[11px] font-semibold"><span className="h-1.5 w-1.5 rounded-full bg-sky-500" /> Needs cleaning</span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-1 text-[11px] font-semibold"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Free</span>
                              )
                            ) : isPaid ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                                <Check className="h-3 w-3 stroke-[2.5]" /> Paid
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF4EC] text-[#C2410C] px-2.5 py-1 text-[11px] font-semibold"><span className="h-1.5 w-1.5 rounded-full bg-[#fe5c13]" /> Seated</span>
                            )}

                            {table.isOccupied && (
                              <div className="relative z-20 -mr-1.5">
                              <div className="relative">
                                <button
                                  aria-label={`Actions for ${table.tableCode}`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setOpenMenuId(openMenuId === table.id ? null : table.id);
                                  }}
                                  className="rounded-lg p-1.5 text-[#9CA3AF] transition-colors hover:bg-[#F3F3EF] hover:text-[#0F1117]"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </button>

                                <AnimatePresence>
                                  {openMenuId === table.id && (
                                    <motion.div
                                      initial={{ opacity: 0, y: 4 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: 4 }}
                                      transition={{ duration: 0.12 }}
                                      className="absolute right-0 top-full z-50 mt-1.5 w-48 overflow-hidden rounded-xl border border-[#E8E8E3] bg-white p-1.5 shadow-[0_18px_40px_-16px_rgba(15,17,23,0.35)]"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <button onClick={() => { setActiveTableId(table.id); setShowMoveModal(true); setOpenMenuId(null); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[14px] text-[#374151] hover:bg-[#FAFAF7]">
                                        <ArrowRightLeft className="h-4 w-4 text-[#9CA3AF]" /> Move table
                                      </button>
                                      <button onClick={() => { setActiveTableId(table.id); setSelectedMergeTableIds([]); setShowMergeModal(true); setOpenMenuId(null); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[14px] text-[#374151] hover:bg-[#FAFAF7]">
                                        <Merge className="h-4 w-4 text-[#9CA3AF]" /> Merge bill
                                      </button>
                                      <div className="my-1 border-t border-[#F0F0EB]" />
                                      <button onClick={() => { setConfirmAction({
                                        title: `Print and close ${table.tableCode}?`,
                                        message: "This will mark bill action and end the active session.",
                                        onConfirm: async () => markBillPrinted(table.id),
                                      }); setOpenMenuId(null); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[14px] text-[#374151] hover:bg-[#FAFAF7]">
                                        <Receipt className="h-4 w-4 text-[#9CA3AF]" /> Print bill
                                      </button>
                                      <button disabled={isPaid} onClick={() => openMarkPaid(table.id)} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[14px] text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent">
                                        <CheckCircle2 className="h-4 w-4" /> {isPaid ? "Paid" : "Mark paid"}
                                      </button>
                                      <button onClick={() => { requestFreeTable(table.id); setOpenMenuId(null); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[14px] text-[#374151] hover:bg-rose-50 hover:text-rose-700">
                                        <LogOut className="h-4 w-4 text-[#9CA3AF]" /> Free table
                                      </button>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                              </div>
                            )}
                          </div>

                          <div className={`mt-2 flex h-[104px] items-center justify-center rounded-xl border ${isDisabled ? "border-dashed border-[#E8E8E3]" : "border-[#F0F0EB] bg-[#FAFAF7]"}`}>
                            <TableSketch
                              number={table.tableCode}
                              seats={seats}
                              enabled={!isDisabled}
                              tone={tone}
                              filledSeats={table.guests || undefined}
                              maxWidth={190}
                            />
                          </div>

                          {table.isOccupied ? (
                            <div className="mt-auto pt-4">
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="text-[20px] font-bold tabular-nums tracking-[-0.02em] text-[#0F1117]">
                                  ₹{(table.currentTotal ?? 0).toLocaleString("en-IN")}
                                </span>
                                <span className="inline-flex items-center gap-1 text-[12px] font-medium tabular-nums text-[#6B7280]" title="Time since seated">
                                  <Clock className="h-3.5 w-3.5 text-[#9CA3AF]" /> {timeStr}
                                </span>
                              </div>
                              <p className="mt-1.5 text-[12px] font-medium text-[#6B7280]">
                                {table.guests ? `${table.guests} ${table.guests === 1 ? "guest" : "guests"}` : null}
                                {table.guests && (table.itemsCount ?? 0) > 0 ? ", " : ""}
                                {(table.itemsCount ?? 0) > 0 ? `${table.itemsCount} ${table.itemsCount === 1 ? "item" : "items"}` : !table.guests ? "No items yet" : ""}
                                {eta ? `, ready in ${eta}` : ""}
                              </p>
                              {timeline.length > 0 && (
                                <div className="mt-3.5">
                                  <div className="flex gap-1" aria-hidden>
                                    {timeline.map((step) => (
                                      <span key={`${table.id}-${step.key}`} className={`h-1 flex-1 rounded-full ${step.done ? "bg-emerald-500" : "bg-[#E8E8E3]"}`} />
                                    ))}
                                  </div>
                                  <p className="mt-2 flex items-center justify-between text-[12px] font-medium text-[#6B7280]">
                                    <span>{current ? current.label : "Waiting"}</span>
                                    {activeOrdersForTable > 0 && (
                                      <span className="font-semibold text-[#fe5c13]">
                                        {activeOrdersForTable} in kitchen
                                      </span>
                                    )}
                                  </p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="mt-auto pt-4">
                              {!isDisabled && table.needsCleaning ? (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleMarkClean(table.id); }}
                                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#E8E8E3] bg-white px-3 text-[12px] font-semibold text-[#0F1117] transition-colors hover:border-[#D6D6CF]"
                                >
                                  <Check className="h-3.5 w-3.5 text-sky-600" strokeWidth={2.5} /> Mark clean
                                </button>
                              ) : (
                                <div className="flex items-center justify-between">
                                  <span className={`text-[12px] font-medium ${isDisabled ? "text-[#C4C4BE]" : "text-[#6B7280]"}`}>
                                    {table.floorName || (uniqueFloors.length > 1 ? "Main Floor" : "Ground")}
                                  </span>
                                  <span className={`text-[12px] font-medium ${isDisabled ? "text-[#C4C4BE]" : "text-[#9CA3AF]"}`}>
                                    {isDisabled ? "Turned off" : "Ready to seat"}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    </div>
                  );
                })}
              </div>
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
                <div className="mb-6 flex flex-col items-center justify-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center text-lg font-bold text-gray-700 shadow-sm">
                      {tables.find((t) => t.id === activeTableId)?.tableCode}
                    </div>
                    <div className="flex flex-col items-center justify-center gap-1">
                      <motion.div animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                         <ArrowRight className="w-5 h-5 text-gray-400" />
                      </motion.div>
                      <span className="text-xs font-medium text-gray-500">Move to</span>
                    </div>
                    <div className="w-14 h-14 rounded-full bg-transparent border-2 border-dashed border-gray-300 flex items-center justify-center text-lg font-bold text-gray-400">
                      ?
                    </div>
                  </div>
                </div>
                <h4 className="text-xs font-medium text-gray-500 mb-4">Select destination</h4>
                <div className="grid grid-cols-4 gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                  {tables.filter((t) => !t.isOccupied && !t.needsCleaning).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleMoveTable(t.id)}
                      className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-xl hover:border-gray-900 hover:bg-gray-50 hover:shadow-md transition-all group"
                    >
                      <span className="text-xl font-bold text-gray-700 group-hover:text-gray-900">{t.tableCode}</span>
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full mt-1">Free</span>
                    </button>
                  ))}
                  {tables.filter((t) => !t.isOccupied && !t.needsCleaning).length === 0 && (
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
                {selectedMergeTableIds.length > 0 && (
                  <div className="mb-6 flex flex-col items-center justify-center p-4 bg-amber-50/50 rounded-xl border border-amber-100">
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 rounded-full bg-white border-2 border-dashed border-gray-300 flex items-center justify-center text-lg font-bold text-gray-700 shadow-sm relative">
                        {tables.find((t) => t.id === activeTableId)?.tableCode}
                      </div>
                      <div className="flex flex-col items-center justify-center gap-1">
                        <motion.div animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                           <ArrowRight className="w-5 h-5 text-amber-500" />
                        </motion.div>
                        <span className="text-xs font-medium text-amber-600">Merge</span>
                      </div>
                      <div className="flex -space-x-4">
                        {selectedMergeTableIds.map((id, i) => (
                           <div key={id} className="w-14 h-14 rounded-full bg-amber-100 border-2 border-white flex items-center justify-center text-lg font-bold text-amber-700 shadow-sm relative" style={{ zIndex: 10 - i }}>
                             {tables.find((t) => t.id === id)?.tableCode}
                           </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <h4 className="text-xs font-medium text-gray-500 mb-4">Select target table</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                  {tables.filter((t) => t.isOccupied && t.id !== activeTableId).map((t) => (
                    <button
                      key={t.id}
                      disabled={isMerging}
                      onClick={() =>
                        setSelectedMergeTableIds((prev) =>
                          prev.includes(t.id) ? prev.filter((id) => id !== t.id) : [...prev, t.id]
                        )
                      }
                      className={`w-full flex items-center justify-between p-3 border rounded-xl transition-all group disabled:opacity-60 disabled:cursor-not-allowed ${selectedMergeTableIds.includes(t.id)
                        ? "border-amber-500 bg-amber-50/60"
                        : "border-gray-200 hover:border-amber-500 hover:bg-amber-50/50"
                        }`}
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
                      {selectedMergeTableIds.includes(t.id) ? (
                        <span className="text-xs font-semibold text-amber-700">Selected</span>
                      ) : (
                        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-amber-500" />
                      )}
                    </button>
                  ))}
                  {tables.filter((t) => t.isOccupied && t.id !== activeTableId).length === 0 && (
                    <div className="py-8 text-center text-gray-500 text-sm bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      No other occupied tables to merge with.
                    </div>
                  )}
                </div>
                <button
                  disabled={isMerging || selectedMergeTableIds.length === 0}
                  onClick={handleMergeSelectedTables}
                  className="mt-4 w-full rounded-xl bg-gray-900 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isMerging ? "Merging..." : `Merge Selected (${selectedMergeTableIds.length})`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {confirmAction && (
        <div className="absolute inset-0 z-[80] bg-gray-900/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">{confirmAction.title}</h3>
              <p className="text-sm text-gray-500 mt-1">{confirmAction.message}</p>
            </div>
            <div className="px-6 py-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirmAction(null)}
                style={{ display: confirmAction.hideCancel ? "none" : "inline-flex" }}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                {confirmAction.cancelText || "Cancel"}
              </button>
              <button
                onClick={async () => {
                  const action = confirmAction.onConfirm;
                  setConfirmAction(null);
                  await action();
                }}
                className={`px-4 py-2 rounded-lg text-white text-sm font-semibold ${confirmAction.destructive ? "bg-rose-600 hover:bg-rose-700" : "bg-gray-900 hover:bg-gray-800"}`}
              >
                {confirmAction.confirmText || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {sidebarVisible && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 380, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="z-10 hidden flex-col overflow-hidden whitespace-nowrap border-l border-[#E8E8E3] bg-white xl:flex"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-[#F0F0EB] px-5 pb-4 pt-7">
              <h3 className="font-display text-[20px] leading-none text-[#0F1117]">Activity</h3>
              <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-[#F3F3EF] p-1" role="tablist">
                {(
                  [
                    ["kitchen", "Kitchen", pendingOrdersCount],
                    ["service", "Service", activeServiceCallsCount],
                  ] as const
                ).map(([id, label, count]) => (
                  <button
                    key={id}
                    role="tab"
                    aria-selected={activeSidebarTab === id}
                    onClick={() => setActiveSidebarTab(id)}
                    className={`flex items-center justify-center gap-2 rounded-lg py-1.5 text-[13px] font-medium transition-colors ${activeSidebarTab === id ? "bg-white text-[#0F1117] shadow-[0_1px_2px_rgba(15,17,23,0.08)]" : "text-[#6B7280] hover:text-[#0F1117]"}`}
                  >
                    {label}
                    {count > 0 && <span className="tabular-nums text-[#9CA3AF]">{count}</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {activeSidebarTab === "kitchen" ? (
                <div className="divide-y divide-[#F0F0EB]">
                  {kitchenOrders.length === 0 && (
                    <p className="px-5 py-12 text-center text-[14px] text-[#6B7280]">No orders waiting on the kitchen.</p>
                  )}
                  <AnimatePresence mode="popLayout">
                    {kitchenOrders.map((order) => {
                      const minutes = getMinutesDiff(order.orderedAt);
                      const delayed = order.status === "pending" && minutes > 10;
                      const busy = Boolean(orderActionPending[order.orderId]);
                      const statusLabel = order.status === "cooking" ? "Cooking" : delayed ? "Delayed" : "New";
                      const dot = order.status === "cooking" ? "bg-blue-500" : delayed ? "bg-rose-500" : "bg-amber-500";
                      return (
                        <motion.div
                          key={order.orderId}
                          layout
                          initial={{ opacity: 0, x: 16 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -16 }}
                          className={`px-5 py-4 ${delayed ? "bg-rose-50/40" : ""}`}
                        >
                          <div className="flex items-center justify-between gap-3 text-[13px]">
                            <span className="flex items-center gap-2 text-[#6B7280]">
                              <span className="font-medium text-[#0F1117]">{order.tableCode}</span>
                              {order.dailyOrderNumber != null && <span className="tabular-nums">#{order.dailyOrderNumber}</span>}
                              <span>{getTimeAgo(order.orderedAt)}</span>
                            </span>
                            <span className={`flex items-center gap-1.5 ${delayed ? "font-medium text-rose-700" : "text-[#4B5563]"}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                              {statusLabel}
                            </span>
                          </div>
                          <ul className="mt-2 space-y-1" aria-label={`Items in ${order.tableCode} order`}>
                            {order.items.map((item) => (
                              <li key={item.key} className="flex gap-1.5 whitespace-normal text-[15px] leading-snug text-[#0F1117]">
                                <span className="w-7 shrink-0 tabular-nums text-[#9CA3AF]">{item.quantity}×</span>
                                <span>{item.name}</span>
                              </li>
                            ))}
                          </ul>
                          <div className="mt-3 flex gap-2">
                            {order.status === "pending" ? (
                              <>
                                <button
                                  onClick={() => handleAccept(order.orderId)}
                                  disabled={busy}
                                  className="h-9 flex-1 rounded-lg bg-[#0F1117] text-[13px] font-medium text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {busy ? "Updating" : "Accept"}
                                </button>
                                <button
                                  onClick={() => handleReject(order.orderId)}
                                  disabled={busy}
                                  className="h-9 rounded-lg border border-[#E8E8E3] px-3 text-[13px] font-medium text-[#4B5563] transition-colors hover:border-rose-200 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleServe(order.orderId)}
                                disabled={busy}
                                className="h-9 flex-1 rounded-lg bg-[#0F1117] text-[13px] font-medium text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {busy ? "Updating" : "Mark served"}
                              </button>
                            )}
                            <button
                              onClick={() => printOrderKOT(order.orderId)}
                              title="Print kitchen ticket"
                              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#E8E8E3] px-3 text-[13px] font-medium text-[#4B5563] transition-colors hover:border-[#D6D6CF] hover:text-[#0F1117]"
                            >
                              <Printer className="h-4 w-4 text-[#9CA3AF]" /> KOT
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="divide-y divide-[#F0F0EB]">
                  {serviceCalls.filter((c) => c.status !== "done").length === 0 && (
                    <p className="px-5 py-12 text-center text-[14px] text-[#6B7280]">No guests are waiting for staff.</p>
                  )}
                  <AnimatePresence mode="popLayout">
                    {serviceCalls.filter((c) => c.status !== "done").map((call) => {
                      const low = call.type === "low-rating";
                      const Icon = low ? Frown : call.type === "waiter" ? Bell : call.type === "water" ? Droplets : call.type === "bill" ? Receipt : AlertTriangle;
                      const title = low
                        ? `Low rating, ${call.rating}/5`
                        : call.type === "bill"
                          ? "Asked for the bill"
                          : call.type === "water"
                            ? "Asked for water"
                            : call.type === "waiter"
                              ? "Called a waiter"
                              : call.type === "cleaning"
                                ? "Needs cleaning"
                                : "Needs help";
                      return (
                        <motion.div
                          key={call.id}
                          layout
                          initial={{ opacity: 0, x: 16 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -16 }}
                          className={`px-5 py-4 ${low ? "bg-rose-50/50" : ""}`}
                        >
                          <div className="flex items-center justify-between text-[13px] text-[#6B7280]">
                            <span className="font-medium text-[#0F1117]">{call.tableCode}</span>
                            <span>{getTimeAgo(call.createdAt)}</span>
                          </div>
                          <div className="mt-2 flex items-start gap-2.5">
                            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${low ? "text-rose-600" : "text-[#9CA3AF]"}`} />
                            <div className="whitespace-normal">
                              <p className={`text-[15px] ${low ? "font-medium text-rose-900" : "text-[#0F1117]"}`}>{title}</p>
                              <p className="mt-0.5 text-[13px] text-[#6B7280]">
                                {call.status === "attending"
                                  ? low ? "A manager is on it" : "Someone is on it"
                                  : low ? "Needs a manager visit" : "Waiting for staff"}
                              </p>
                              {low && call.comment && (
                                <p className="mt-2 rounded-lg bg-white px-3 py-2 text-[13px] leading-relaxed text-[#374151]">“{call.comment}”</p>
                              )}
                            </div>
                          </div>
                          <div className="mt-3 flex gap-2">
                            {call.status === "open" ? (
                              <>
                                <button
                                  onClick={() => handleServiceCallStatus(call.id, "attending")}
                                  className="h-9 flex-1 rounded-lg bg-[#0F1117] text-[13px] font-medium text-white transition-colors hover:bg-black"
                                >
                                  Attend
                                </button>
                                <button
                                  onClick={() => handleServiceCallStatus(call.id, "done")}
                                  className="h-9 flex-1 rounded-lg border border-[#E8E8E3] text-[13px] font-medium text-[#374151] transition-colors hover:border-[#D6D6CF] hover:text-[#0F1117]"
                                >
                                  Done
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleServiceCallStatus(call.id, "done")}
                                className="h-9 w-full rounded-lg bg-[#0F1117] text-[13px] font-medium text-white transition-colors hover:bg-black"
                              >
                                Mark resolved
                              </button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>

            <div className="border-t border-[#F0F0EB] p-4">
              <button
                onClick={() => router.push("/staff/kitchen")}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#E8E8E3] text-[14px] font-medium text-[#374151] transition-colors hover:border-[#D6D6CF] hover:text-[#0F1117]"
              >
                Open kitchen display
                <ArrowRight className="h-4 w-4 text-[#9CA3AF]" />
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Free Table — Inline Payment Modal */}
      {freeTableModal?.isOpen && (
        <div className="absolute inset-0 z-[90] bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="text-base font-bold text-gray-900">Free {freeTableModal.tableCode}</h3>
                <p className="text-xs text-gray-500 mt-0.5">Unpaid bill — choose payment to continue</p>
              </div>
              <button
                onClick={() => setFreeTableModal(null)}
                disabled={freeTableModal.isProcessing}
                className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Bill Amount */}
            <div className="px-6 py-4">
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 mb-5">
                <span className="text-sm font-semibold text-emerald-800">Bill Total</span>
                <span className="text-xl font-bold text-emerald-700">
                  ₹{freeTableModal.totalAmount.toLocaleString()}
                </span>
              </div>

              <div className="mb-5">
                <LoyaltyPanel
                  sessionId={freeTableModal.isTakeaway ? undefined : freeTableModal.sessionId}
                  takeawayOrderId={freeTableModal.isTakeaway ? freeTableModal.sessionId : undefined}
                  onBillChanged={async ({ newTotal }) => {
                    let next = newTotal;
                    if (next === undefined) {
                      const res = await api<{ breakdown?: { total: number | string } }>(`/api/admin/bills/session/${freeTableModal.sessionId}`, { noCache: true }).catch(() => null);
                      if (res?.breakdown) next = Number(res.breakdown.total);
                    }
                    if (next !== undefined) setFreeTableModal(prev => prev ? { ...prev, totalAmount: next as number } : null);
                  }}
                />
              </div>

              {/* Payment Method */}
              <p className="text-xs font-medium text-gray-400 mb-2">Payment method</p>
              <div className="grid grid-cols-3 gap-2 mb-6">
                {(["cash", "card", "upi"] as const).map((method) => (
                  <button
                    key={method}
                    onClick={() =>
                      setFreeTableModal(prev => prev ? { ...prev, selectedPayment: method } : null)
                    }
                    disabled={freeTableModal.isProcessing}
                    className={`py-2.5 rounded-xl border text-xs font-medium transition-all ${
                      freeTableModal.selectedPayment === method
                        ? "bg-gray-900 text-white border-gray-900 shadow-sm"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    {method === "cash" ? "💵 Cash" : method === "card" ? "💳 Card" : "📱 UPI"}
                  </button>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => setFreeTableModal(null)}
                  disabled={freeTableModal.isProcessing}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmFreeWithPayment}
                  disabled={freeTableModal.isProcessing}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  {freeTableModal.isProcessing ? (
                    "Processing..."
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Mark Paid & Free Table
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mark Paid — payment type prompt */}
      {markPaidModal && (
        <div className="absolute inset-0 z-[90] bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="text-base font-bold text-gray-900">Mark {markPaidModal.tableCode} as paid</h3>
                <p className="text-xs text-gray-500 mt-0.5">Choose how the guest paid</p>
              </div>
              <button onClick={() => setMarkPaidModal(null)} disabled={markPaidModal.isProcessing} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 disabled:opacity-40">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4">
              <div className="grid grid-cols-3 gap-2 mb-6">
                {(["cash", "card", "upi"] as const).map((method) => (
                  <button
                    key={method}
                    onClick={() => setMarkPaidModal((prev) => (prev ? { ...prev, selectedPayment: method } : null))}
                    disabled={markPaidModal.isProcessing}
                    className={`py-2.5 rounded-xl border text-xs font-medium transition-all ${
                      markPaidModal.selectedPayment === method
                        ? "bg-gray-900 text-white border-gray-900 shadow-sm"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    {method === "cash" ? "💵 Cash" : method === "card" ? "💳 Card" : "📱 UPI"}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setMarkPaidModal(null)} disabled={markPaidModal.isProcessing} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40">
                  Cancel
                </button>
                <button onClick={confirmMarkPaid} disabled={markPaidModal.isProcessing} className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-sm disabled:opacity-60 flex items-center justify-center gap-1.5">
                  {markPaidModal.isProcessing ? "Processing..." : (<><CheckCircle2 className="w-4 h-4" /> Confirm Paid</>)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
