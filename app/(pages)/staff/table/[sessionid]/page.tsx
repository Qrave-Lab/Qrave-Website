"use client";
import { toast } from "react-hot-toast";

import { useEffect, useMemo, useState, use } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  XCircle,
  UtensilsCrossed,
  ChefHat,
  ArrowLeft,
  CreditCard,
  Banknote,
  Smartphone,
  X,
  Loader2,
  MoreVertical,
  ArrowRightLeft,
  Merge,
  Printer,
  RefreshCw,
  BellRing,
  Layers,
  Check,
  Tag,
  Coins,
  Percent,
  Edit,
  Search,
} from "lucide-react";
import { api, requestManagerPin } from "@/app/lib/api";
import ConfirmModal from "@/app/components/ui/ConfirmModal";
import { printBillTicket } from "@/app/lib/posPrinter";

type OrderStatus =
  | "cart"
  | "pending"
  | "accepted"
  | "preparing"
  | "ready"
  | "served"
  | "completed"
  | "cancelled";

type PaymentMethod = "cash" | "card" | "upi" | null;

type BillItem = {
  id: string;
  orderId: string;
  menuItemId: string;
  variantId: string;
  name: string;
  quantity: number;
  rate: number;
  status: OrderStatus;
};

type BillData = {
  restaurantName: string;
  restaurantAddress?: string;
  tableCode: string;
  billNumber: string;
  createdAt: Date;
  items: BillItem[];
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
  id: string;
  status: OrderStatus;
  created_at: string;
  session_id: string;
  table_id: string;
  table_number: number;
  order_number?: number | null;
  daily_order_number?: number | null;
  items: ActiveOrderItem[];
};

type AdminBillResponse = {
  group_id?: string | null;
  sessions: { session_id: string; table_id: string; table_number: number }[];
  orders: ActiveOrder[];
};

type ActiveSessionsResponse = {
  sessions: { session_id: string; table_id: string; table_number: number }[];
};

export default function TableBillPage({ params }: { params: Promise<{ sessionid: string }> }) {
  const router = useRouter();
  const { sessionid } = use(params);
  const [bill, setBill] = useState<BillData | null>(null);
  const [orders, setOrders] = useState<ActiveOrder[]>([]);
  const [items, setItems] = useState<BillItem[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "split">(null);
  const [splitAmounts, setSplitAmounts] = useState({ cash: "", card: "", upi: "" });
  const [isProcessing, setIsProcessing] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string>("");
  const [taxPercent, setTaxPercent] = useState<number>(5);
  const [servicePercent, setServicePercent] = useState<number>(0);
  const [serviceCalls, setServiceCalls] = useState<any[]>([]);
  const [isTakeaway, setIsTakeaway] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<"all" | "cooking" | "served" | "cancelled">("all");

  const [showRelocate, setShowRelocate] = useState(false);
  const [tables, setTables] = useState<{ id: string; table_number: number; is_enabled: boolean }[]>([]);
  const [targetTableId, setTargetTableId] = useState<string>("");
  const [showMerge, setShowMerge] = useState(false);
  const [activeSessions, setActiveSessions] = useState<{ session_id: string; table_number: number }[]>([]);
  const [targetSessionId, setTargetSessionId] = useState<string>("");
  const [isMerging, setIsMerging] = useState(false);
  const [billSessionIds, setBillSessionIds] = useState<string[]>([]);
  const [confirmRelocate, setConfirmRelocate] = useState(false);
  const [noticeModal, setNoticeModal] = useState<{ title: string; message: string } | null>(null);
  const [billBreakdown, setBillBreakdown] = useState<any>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const [isDiscountOpen, setIsDiscountOpen] = useState(false);
  const [discountTab, setDiscountTab] = useState<"flat" | "coupon">("flat");
  const [discountValue, setDiscountValue] = useState("");
  const [discountError, setDiscountError] = useState("");
  const [isDiscountSubmitting, setIsDiscountSubmitting] = useState(false);
  const [promoCouponCode, setPromoCouponCode] = useState("");

  const [isWaiveOpen, setIsWaiveOpen] = useState(false);
  const [waiveReason, setWaiveReason] = useState("");
  const [waivePin, setWaivePin] = useState("");
  const [waiveError, setWaiveError] = useState("");
  const [isWaiveSubmitting, setIsWaiveSubmitting] = useState(false);

  const [isEditItemsOpen, setIsEditItemsOpen] = useState(false);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMenuItem, setSelectedMenuItem] = useState<any | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [addQty, setAddQty] = useState(1);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editItemsError, setEditItemsError] = useState("");

  const firstRowByOrder = useMemo(() => {
    const map: Record<string, string> = {};
    for (const it of items) {
      if (!map[it.orderId]) map[it.orderId] = it.id;
    }
    return map;
  }, [items]);

  const filteredMenuItems = useMemo(() => {
    if (!searchQuery.trim()) return menuItems;
    const q = searchQuery.toLowerCase();
    return menuItems.filter((m) => m.name.toLowerCase().includes(q));
  }, [menuItems, searchQuery]);

  const isServedOrCompleted = (s: OrderStatus) =>
    s === "served" || s === "completed" || s === "cancelled" || s === "ready";

  const isBillable = (s: OrderStatus) =>
    s === "accepted" || s === "preparing" || s === "ready" || s === "served" || s === "completed";

  const activeOrders = useMemo(
    () => orders.filter((o) => o.status !== "cancelled" && o.status !== "cart"),
    [orders],
  );

  const allOrdersServed =
    activeOrders.length === 0 || activeOrders.every((o) => isServedOrCompleted(o.status));

  const isPaid =
    orders.length > 0 && orders.every((o) => o.status === "completed");

  const { subtotal, serviceCharge, tax, total } = useMemo(() => {
    if (billBreakdown) {
      return {
        subtotal: Number(billBreakdown.subtotal),
        serviceCharge: Number(billBreakdown.service_charge),
        tax: Number(billBreakdown.tax),
        total: Number(billBreakdown.total),
      };
    }
    const billable = items.filter((i) => isBillable(i.status));
    const sub = billable.reduce((sum, item) => sum + item.quantity * item.rate, 0);
    const service = Math.round(sub * (servicePercent / 100));
    const taxAmount = Math.round((sub + service) * (taxPercent / 100));
    return { subtotal: sub, serviceCharge: service, tax: taxAmount, total: sub + service + taxAmount };
  }, [items, taxPercent, servicePercent, billBreakdown]);

  const pendingCookingCount = useMemo(() => {
    return items.filter(
      (i) => i.status === "pending" || i.status === "accepted" || i.status === "preparing" || i.status === "ready"
    ).length;
  }, [items]);

  const servedCount = useMemo(() => {
    return items.filter((i) => i.status === "served" || i.status === "completed").length;
  }, [items]);

  const filteredItems = useMemo(() => {
    if (selectedFilter === "all") return items;
    if (selectedFilter === "cooking") {
      return items.filter(
        (i) => i.status === "pending" || i.status === "accepted" || i.status === "preparing" || i.status === "ready"
      );
    }
    if (selectedFilter === "served") {
      return items.filter((i) => i.status === "served" || i.status === "completed");
    }
    if (selectedFilter === "cancelled") {
      return items.filter((i) => i.status === "cancelled");
    }
    return items;
  }, [items, selectedFilter]);

  const playPrinterSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.7);
      gain.gain.setValueAtTime(0.008, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.7);
    } catch {
      // ignore
    }
  };

  const handlePrint = async () => {
    if (isPrinting) return;
    setIsPrinting(true);
    playPrinterSound();

    // Trigger local backend system print after slide animation completes
    setTimeout(async () => {
      try {
        await api(`/api/admin/sessions/${sessionid}/end`, { method: "POST", suppressErrorLog: true });
        await printBillTicket({
          tableCode: bill?.tableCode || "T-",
          printedAt: new Date().toLocaleString(),
          staffName: "Staff",
          items: items.map((i) => ({
            name: i.name,
            qty: i.quantity,
            amount: i.quantity * i.rate,
          })),
          total: total,
        });
      } catch {
        // best effort
      }
      window.print();
      setIsPrinting(false);
    }, 600);
  };

  const loadBillData = async () => {
    let initialBillRes: AdminBillResponse | null = null;
    let me: any = null;
    let calls: any[] = [];

    try {
      if (isTakeaway) throw new Error("Known Takeaway Order - Skip to Fallback");

      const [resB, resM, resC] = await Promise.all([
        api<AdminBillResponse>(`/api/admin/bills/session/${sessionid}`, { suppressErrorLog: true }),
        api<{ restaurant?: string; address?: string | null; restaurant_id?: string; tax_percent?: number; service_charge?: number }>("/api/admin/me"),
        api<any[]>(`/api/admin/service-calls`),
      ]);
      initialBillRes = resB;
      me = resM;
      calls = resC;
      setIsTakeaway(false);
    } catch {
      const [takeawayRes, resM, resC] = await Promise.all([
        api<{ orders: any[] }>("/api/admin/takeaway/orders").catch(() => ({ orders: [] })),
        api<{ restaurant?: string; address?: string | null; restaurant_id?: string; tax_percent?: number; service_charge?: number }>("/api/admin/me"),
        api<any[]>(`/api/admin/service-calls`),
      ]);
      me = resM;
      calls = resC;

      const tw = (takeawayRes?.orders || []).find((o: any) => o.id === sessionid);
      if (tw) {
        setIsTakeaway(true);
        let tableNum = parseInt(String(tw.table_number || ""), 10);
        const notes = String(tw.notes || "");
        if (isNaN(tableNum) && notes.includes("[RECEPTION_DINEIN]")) {
          const m = notes.match(/\[RECEPTION_DINEIN\]\s*T(\d+)/i);
          if (m) tableNum = parseInt(m[1], 10);
        }

        initialBillRes = {
          sessions: [{ session_id: tw.id, table_id: "", table_number: tableNum || 0 }],
          orders: [{
            id: tw.id,
            status: tw.status === "pending" || tw.status === "preparing" ? "accepted" : tw.status === "ready" ? "served" : tw.status,
            created_at: tw.created_at,
            session_id: tw.id,
            table_id: "",
            table_number: tableNum || 0,
            order_number: tw.order_number,
            daily_order_number: tw.daily_order_number,
            items: (tw.items || []).map((i: any) => ({
              menu_item_id: i.menu_item_id || "",
              variant_id: i.variant_id || "",
              quantity: i.quantity || 1,
              price: i.unit_price || 0,
              menu_item_name: i.menu_item_name || "",
              variant_label: i.variant_label || null,
            })),
          }],
        } as AdminBillResponse;
      } else {
        throw new Error("Session not found");
      }
    }

    const billRes = initialBillRes;
    if (billRes && (billRes as any).breakdown) {
      setBillBreakdown((billRes as any).breakdown);
    } else {
      setBillBreakdown(null);
    }

    const nextOrders = (billRes?.orders || []) as ActiveOrder[];
    setOrders(nextOrders);
    const tableNumber = nextOrders[0]?.table_number;
    const createdAt = nextOrders[0]?.created_at ? new Date(nextOrders[0].created_at) : new Date();
    setRestaurantId(me?.restaurant_id || "");
    setTaxPercent(typeof me?.tax_percent === "number" ? me.tax_percent : 5);
    setServicePercent(typeof me?.service_charge === "number" ? me.service_charge : 0);
    const mergedSessionIds = (billRes?.sessions || []).map((s) => String(s.session_id));
    setBillSessionIds(mergedSessionIds.length > 0 ? mergedSessionIds : [String(sessionid)]);
    setServiceCalls((calls || []).filter((c: any) => mergedSessionIds.includes(String(c.session_id))));

    const mappedItems: BillItem[] = [];
    for (const order of nextOrders) {
      for (const item of order.items || []) {
        const suffix = item.variant_label ? ` (${item.variant_label})` : "";
        mappedItems.push({
          id: `${order.id}-${item.menu_item_id}-${item.variant_id}`,
          orderId: order.id,
          menuItemId: item.menu_item_id,
          variantId: item.variant_id,
          name: `${item.menu_item_name}${suffix}`,
          quantity: item.quantity,
          rate: item.price,
          status: order.status || "pending",
        });
      }
    }

    setItems(mappedItems);
    const tableCodeLabel =
      (billRes?.sessions || []).length > 0
        ? (billRes.sessions || [])
            .map((s) => `T${s.table_number}`)
            .join(" + ")
        : tableNumber
        ? `T${tableNumber}`
        : "T-";
    setBill({
      restaurantName: me?.restaurant || "Restaurant",
      restaurantAddress: me?.address || undefined,
      tableCode: tableCodeLabel,
      billNumber: `BILL-${sessionid.slice(0, 6).toUpperCase()}`,
      createdAt,
      items: mappedItems,
    });
  };

  useEffect(() => {
    let isActive = true;
    const load = async () => {
      try {
        await loadBillData();
        if (!isActive) return;
      } catch {
        if (!isActive) return;
        setBill(null);
        setOrders([]);
        setItems([]);
      }
    };
    load();
    return () => {
      isActive = false;
    };
  }, [sessionid]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      loadBillData().catch(() => {});
    }, 4000);
    return () => window.clearInterval(timer);
  }, [sessionid]);

  const refreshOrders = async () => {
    setIsRefreshing(true);
    try {
      await loadBillData();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    const prevOrders = orders;
    const prevItems = items;
    setOrders((curr) => curr.map((o) => (o.id === orderId ? { ...o, status } : o)));
    setItems((curr) => curr.map((it) => (it.orderId === orderId ? { ...it, status } : it)));
    try {
      const targetStatus = isTakeaway && status === "served" ? "ready" : status;
      const url = isTakeaway ? `/api/admin/takeaway/orders/${orderId}/status` : `/api/admin/orders/${orderId}/status`;
      await api(url, {
        method: "PATCH",
        body: JSON.stringify({ status: targetStatus }),
      });
      await refreshOrders();
    } catch {
      setOrders(prevOrders);
      setItems(prevItems);
    }
  };

  const serveAllPendingOrders = async () => {
    for (const o of activeOrders) {
      if (o.status !== "served" && o.status !== "completed") {
        await updateOrderStatus(o.id, "served");
      }
    }
  };

  const cancelOrder = async (orderId: string) => {
    await api(`/api/admin/orders/${orderId}/cancel`, {
      method: "POST",
    });
    await refreshOrders();
  };

  const cancelOrderItem = async (item: BillItem) => {
    await api(`/api/admin/orders/${item.orderId}/cancel-item`, {
      method: "POST",
      body: JSON.stringify({
        menu_item_id: item.menuItemId,
        variant_id: item.variantId || null,
        quantity: 1,
      }),
    });
    await refreshOrders();
  };


  
  const handleCheckout = async () => {
    if (!paymentMethod) return;
    if (!restaurantId) return;

    const isSplitPayment = paymentMethod === "split";
    const checkoutAmount = Number((billBreakdown?.total ?? total).toFixed(2));
    const splitTotal =
      (parseFloat(splitAmounts.cash) || 0) +
      (parseFloat(splitAmounts.card) || 0) +
      (parseFloat(splitAmounts.upi) || 0);

    if (isSplitPayment) {
      if (splitTotal <= 0) {
        toast.error("Split payment amounts must be greater than zero");
        return;
      }
      if (Math.abs(splitTotal - checkoutAmount) > 0.01) {
        toast.error("Split amounts must exactly match the bill total");
        return;
      }
    }

    setIsProcessing(true);
    try {
      for (const o of activeOrders) {
        if (o.status !== "completed" && o.status !== "served") {
          try {
            await api(isTakeaway ? `/api/admin/takeaway/orders/${o.id}/status` : `/api/admin/orders/${o.id}/status`, {
              method: "PATCH",
              body: JSON.stringify({ status: "served" }),
            });
          } catch {
            // continue
          }
        }
      }

      if (isTakeaway) {
        const payload: any = {
          status: "completed",
          payment_status: "paid",
          amount: checkoutAmount,
        };
        if (isSplitPayment) {
          payload.payment_mode = "split";
          payload.payments = [
            { mode: "cash", amount: parseFloat(splitAmounts.cash) || 0 },
            { mode: "card", amount: parseFloat(splitAmounts.card) || 0 },
            { mode: "upi", amount: parseFloat(splitAmounts.upi) || 0 },
          ].filter((p) => p.amount > 0);
        } else {
          payload.payment_mode = paymentMethod;
        }
        await api(`/api/admin/takeaway/orders/${sessionid}/status`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        const checkoutAmount = Number((billBreakdown?.total ?? total).toFixed(2));
        await api("/api/admin/payments/status", {
          method: "POST",
          body: JSON.stringify({
            session_id: sessionid,
            status: "paid",
            payment_mode: paymentMethod,
            reason: "table_checkout",
            amount: checkoutAmount,
          }),
        });
        await Promise.all(
          billSessionIds.map((id) => api(`/api/admin/sessions/${id}/end`, { method: "POST", suppressErrorLog: true }).catch(() => {}))
        );
      }

      await refreshOrders();
      setIsCheckoutOpen(false);
      // Directly trigger printer animation for complete experience
      handlePrint();
    } finally {
      setIsProcessing(false);
    }
  };

  const openRelocate = async () => {
    setShowMenu(false);
    setShowRelocate(true);
    try {
      const t = await api<{ id: string; table_number: number; is_enabled: boolean }[]>(`/api/admin/tables`);
      setTables(Array.isArray(t) ? t : []);
    } catch {
      setTables([]);
    }
  };

  const submitRelocate = async () => {
    if (!targetTableId) return;
    try {
      await api(`/api/admin/table-move`, {
        method: "POST",
        body: JSON.stringify({ session_id: sessionid, target_table_id: targetTableId }),
      });
      setShowRelocate(false);
      setTargetTableId("");
      await refreshOrders();
    } catch (err: any) {
      const msg = err?.message || "Failed to move table";
      setNoticeModal({ title: "Move failed", message: msg });
    }
  };

  const closeServiceCall = async (id: string) => {
    await api(`/api/admin/service-calls/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "done" }),
    });
    const calls = await api<any[]>(`/api/admin/service-calls`);
    setServiceCalls((calls || []).filter((c: any) => billSessionIds.includes(String(c.session_id))));
  };

  const openMerge = async () => {
    setShowMenu(false);
    setShowMerge(true);
    setTargetSessionId("");
    try {
      const res = await api<ActiveSessionsResponse>(`/api/admin/sessions/active`);
      const unique = new Map<string, number>();
      for (const s of res?.sessions || []) {
        if (s?.session_id && typeof s?.table_number === "number") {
          unique.set(String(s.session_id), s.table_number);
        }
      }
      for (const sid of billSessionIds) {
        unique.delete(String(sid));
      }
      setActiveSessions(
        Array.from(unique.entries())
          .map(([sid, tn]) => ({ session_id: sid, table_number: tn }))
          .sort((a, b) => a.table_number - b.table_number)
      );
    } catch {
      setActiveSessions([]);
    }
  };

  const submitMerge = async () => {
    if (!targetSessionId) return;
    setIsMerging(true);
    try {
      await api(`/api/admin/bills/merge`, {
        method: "POST",
        body: JSON.stringify({ session_id: sessionid, target_session_id: targetSessionId }),
      });
      setShowMerge(false);
      await refreshOrders();
    } catch (err: any) {
      setNoticeModal({ title: "Merge failed", message: err?.message || "Failed to merge bills" });
    } finally {
      setIsMerging(false);
    }
  };

  const loadMenu = async () => {
    try {
      const data = await api<any[]>("/api/customer/menu");
      const flatItems: any[] = [];
      data.forEach((cat: any) => {
        if (cat.items) {
          cat.items.forEach((item: any) => {
            flatItems.push({
              ...item,
              categoryName: cat.name,
            });
          });
        }
      });
      setMenuItems(flatItems);
    } catch (err) {
      console.error("Failed to load menu", err);
    }
  };

  const handleEditOrder = () => {
    setIsEditItemsOpen(true);
    if (menuItems.length === 0) {
      loadMenu();
    }
  };

  const handleAddItemToOrder = async () => {
    if (!selectedMenuItem) return;
    setIsAddingItem(true);
    setEditItemsError("");

    try {
      let cartOrder = orders.find((o) => o.status === "cart");
      let cartOrderId = cartOrder?.id;

      if (!cartOrderId) {
        const res = await api<{ order_id: string }>("/api/customer/orders", {
          method: "POST",
          body: JSON.stringify({ session_id: sessionid }),
        });
        cartOrderId = res.order_id;
      }

      let itemPrice = selectedMenuItem.price;
      if (selectedVariantId && selectedMenuItem.variants) {
        const variant = selectedMenuItem.variants.find((v: any) => v.id === selectedVariantId);
        if (variant) {
          itemPrice = variant.price;
        }
      }

      await api("/api/customer/orders/items", {
        method: "POST",
        body: JSON.stringify({
          order_id: cartOrderId,
          menu_item_id: selectedMenuItem.id,
          variant_id: selectedVariantId || null,
          quantity: addQty,
          price: itemPrice,
        }),
      });

      await api("/api/customer/orders/finalize", {
        method: "POST",
        body: JSON.stringify({ order_id: cartOrderId }),
      });

      setSelectedMenuItem(null);
      setSelectedVariantId("");
      setAddQty(1);
      setSearchQuery("");
      await refreshOrders();
    } catch (err: any) {
      console.error(err);
      setEditItemsError(err.message || "Failed to add item to order");
    } finally {
      setIsAddingItem(false);
    }
  };

  const handleApplyDiscount = async () => {
    if (discountTab === "coupon") {
      if (!promoCouponCode.trim()) {
        setDiscountError("Please enter a coupon code");
        return;
      }
      if (orders.length === 0) {
        setDiscountError("No orders found to apply coupon");
        return;
      }

      setIsDiscountSubmitting(true);
      setDiscountError("");

      try {
        await api("/api/customer/orders/apply-coupon", {
          method: "POST",
          body: JSON.stringify({
            order_id: orders[0].id,
            code: promoCouponCode.trim(),
          }),
        });
        setIsDiscountOpen(false);
        await refreshOrders();
      } catch (err: any) {
        console.error(err);
        setDiscountError(err.message || "Failed to apply coupon");
      } finally {
        setIsDiscountSubmitting(false);
      }
      return;
    }

    if (!discountValue || isNaN(Number(discountValue)) || Number(discountValue) < 0) {
      setDiscountError("Please enter a valid positive discount amount");
      return;
    }
    if (orders.length === 0) {
      setDiscountError("No orders found to apply discount");
      return;
    }

    setIsDiscountSubmitting(true);
    setDiscountError("");

    try {
      await api("/api/admin/orders/discount", {
        method: "POST",
        body: JSON.stringify({
          order_id: orders[0].id,
          value: Number(discountValue),
        }),
      });
      setIsDiscountOpen(false);
      await refreshOrders();
    } catch (err: any) {
      console.error(err);
      setDiscountError(err.message || "Failed to apply discount");
    } finally {
      setIsDiscountSubmitting(false);
    }
  };

  const handleWaiveOff = async () => {
    if (!waiveReason.trim()) {
      setWaiveError("Please enter a reason for waiving the bill");
      return;
    }
    if (!waivePin.trim()) {
      setWaiveError("Please enter Manager PIN");
      return;
    }

    setIsWaiveSubmitting(true);
    setWaiveError("");

    try {
      await Promise.all(
        billSessionIds.map((id) =>
          api(`/api/admin/sessions/${id}/comp`, {
            method: "POST",
            body: JSON.stringify({
              pin: waivePin,
              reason: waiveReason,
            }),
          })
        )
      );
      setIsWaiveOpen(false);
      await refreshOrders();
    } catch (err: any) {
      console.error(err);
      setWaiveError(err.message || "Failed to waive off bill");
    } finally {
      setIsWaiveSubmitting(false);
    }
  };

  const statusConfig = (status: OrderStatus) => {
    switch (status) {
      case "pending":
        return {
          label: "Pending",
          className: "bg-amber-50 text-amber-800 border-amber-200 shadow-xs",
          badgeBg: "bg-amber-500",
          icon: <Clock className="w-3.5 h-3.5 text-amber-650" />,
        };
      case "accepted":
      case "preparing":
      case "ready":
        return {
          label: "Cooking",
          className: "bg-blue-50 text-blue-800 border-blue-200 shadow-xs",
          badgeBg: "bg-blue-500",
          icon: <ChefHat className="w-3.5 h-3.5 text-blue-600" />,
        };
      case "served":
        return {
          label: "Served",
          className: "bg-emerald-50 text-emerald-800 border-emerald-200 shadow-xs font-bold",
          badgeBg: "bg-emerald-600",
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
        };
      case "completed":
        return {
          label: "Closed",
          className: "bg-slate-100 text-slate-600 border-slate-200 shadow-xs",
          badgeBg: "bg-slate-400",
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />,
        };
      case "cancelled":
        return {
          label: "Cancelled",
          className: "bg-rose-55/60 text-rose-700 border-rose-200 shadow-xs",
          badgeBg: "bg-rose-500",
          icon: <XCircle className="w-3.5 h-3.5 text-rose-500" />,
        };
      default:
        return {
          label: status,
          className: "bg-slate-100 text-slate-750 border-slate-200",
          badgeBg: "bg-slate-400",
          icon: <Clock className="w-3.5 h-3.5" />,
        };
    }
  };

  return (
    <div
      className="h-screen w-screen bg-[#F8FAFC] text-slate-900 flex flex-col overflow-hidden select-none font-sans print:bg-white print:h-auto print:overflow-visible"
      onClick={() => setShowMenu(false)}
    >
      {/* === TOP APP BAR (Minimal & Professional, No Gradients/Emojis) === */}
      <header className="h-14 px-6 bg-white border-b border-slate-200 shrink-0 flex items-center justify-between z-30">
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.back()}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </motion.button>

          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-slate-900 tracking-tight">
              Table {bill?.tableCode || "T-"}
            </span>
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${
                isPaid
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-amber-50 text-amber-800 border-amber-200"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isPaid ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
              {isPaid ? "Paid" : "Active"}
            </span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={refreshOrders}
            className="w-8 h-8 rounded-lg border border-slate-250 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-slate-900" : ""}`} />
          </button>

          <button
            onClick={handlePrint}
            disabled={isPrinting}
            className="h-8 px-3 rounded-lg border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-650" />
            <span>Print Bill</span>
          </button>

          {!isPaid && (
            <button
              onClick={() => setIsCheckoutOpen(true)}
              className="h-8 px-4 rounded-lg bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center gap-1.5 transition-all"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Checkout</span>
            </button>
          )}

          {/* More actions dropdown */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="w-8 h-8 rounded-lg border border-slate-250 hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: 5 }}
                  className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden z-50 p-1"
                >
                  <button
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded flex items-center gap-2.5 transition-colors"
                    onClick={openRelocate}
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400" />
                    Relocate Table
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded flex items-center gap-2.5 transition-colors"
                    onClick={openMerge}
                  >
                    <Merge className="w-3.5 h-3.5 text-slate-400" />
                    Merge Bill
                  </button>
                  {!isPaid && (
                    <>
                      <button
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded flex items-center gap-2.5 transition-colors"
                        onClick={() => {
                          setShowMenu(false);
                          handleEditOrder();
                        }}
                      >
                        <Edit className="w-3.5 h-3.5 text-slate-400" />
                        Modify Items
                      </button>
                      {orders.length > 0 && (
                        <button
                          className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded flex items-center gap-2.5 transition-colors"
                          onClick={() => {
                            setDiscountValue("");
                            setDiscountError("");
                            setIsDiscountOpen(true);
                            setShowMenu(false);
                          }}
                        >
                          <Percent className="w-3.5 h-3.5 text-slate-400" />
                          Apply Discount
                        </button>
                      )}
                      <button
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded flex items-center gap-2.5 transition-colors"
                        onClick={() => {
                          setWaiveReason("");
                          setWaivePin("");
                          setWaiveError("");
                          setIsWaiveOpen(true);
                          setShowMenu(false);
                        }}
                      >
                        <Coins className="w-3.5 h-3.5 text-rose-400" />
                        Waive Off Bill
                      </button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* === SERVICE CALLS BANNER (No Gradients) === */}
      {serviceCalls.length > 0 && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
            <BellRing className="w-4 h-4 text-amber-600 animate-pulse" />
            <span>Service Request:</span>
            <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.5 rounded font-black">
              {serviceCalls.length}
            </span>
          </div>
          <div className="flex gap-2">
            {serviceCalls.map((c: any) => (
              <button
                key={c.id}
                onClick={() => closeServiceCall(c.id)}
                className="px-2.5 py-0.5 rounded bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold transition-colors flex items-center gap-1"
              >
                <span>{String(c.type).toUpperCase()}</span>
                <span>• T{c.table_number}</span>
                <Check className="w-3 h-3 ml-0.5" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* === SPLIT PANEL === */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-6 gap-6">
        {/* LEFT COLUMN: THERMAL RECEIPT AREA (With fly-up animation) */}
        <div className="w-full lg:w-[380px] shrink-0 flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 text-slate-700 flex items-center justify-between shrink-0">
            <span className="text-xs font-bold uppercase tracking-wider">Bill Preview</span>
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="text-[10px] font-bold text-slate-700 hover:text-black border border-slate-350 hover:bg-slate-100 px-2.5 py-1 rounded transition-colors flex items-center gap-1"
            >
              <Printer className="w-3 h-3 text-slate-600" />
              Print
            </button>
          </div>

          {/* Paper container wrapper with overflow-hidden for flying effect */}
          <div className="flex-1 overflow-hidden relative p-4 bg-slate-100/50">
            <AnimatePresence mode="wait">
              <motion.div
                key={isPrinting ? "printing-receipt" : "normal-receipt"}
                initial={isPrinting ? { y: 0, opacity: 1 } : { y: 50, opacity: 0 }}
                animate={isPrinting ? { y: -700, opacity: 0 } : { y: 0, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: isPrinting ? 0.75 : 0.45,
                  ease: isPrinting ? "easeIn" : "easeOut",
                }}
                className="w-full bg-white p-6 flex flex-col font-mono text-slate-900 text-[10px] space-y-4 border border-slate-250 select-none shadow-sm relative min-h-full"
                style={{
                  clipPath:
                    "polygon(0% 0%, 5% 1%, 10% 0%, 15% 1%, 20% 0%, 25% 1%, 30% 0%, 35% 1%, 40% 0%, 45% 1%, 50% 0%, 55% 1%, 60% 0%, 65% 1%, 70% 0%, 75% 1%, 80% 0%, 85% 1%, 90% 0%, 95% 1%, 100% 0%, 100% 100%, 95% 99%, 90% 100%, 85% 99%, 80% 100%, 75% 99%, 70% 100%, 65% 99%, 60% 100%, 55% 99%, 50% 100%, 45% 99%, 40% 100%, 35% 99%, 30% 100%, 25% 99%, 20% 100%, 15% 99%, 10% 100%, 5% 99%, 0% 100%)",
                }}
              >
                {/* Paper Body */}
                <div className="text-center pb-2 border-b border-dashed border-slate-300">
                  <h2 className="text-base font-black tracking-tight uppercase text-black">
                    {bill?.restaurantName || "Restaurant"}
                  </h2>
                  {bill?.restaurantAddress && (
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-1 leading-relaxed">
                      {bill.restaurantAddress}
                    </p>
                  )}
                  <div className="inline-block mt-1 text-[8px] font-bold text-slate-600 tracking-wider">
                    TAX INVOICE
                  </div>
                </div>

                <div className="py-2 text-[10px] font-bold flex justify-between uppercase tracking-wider text-slate-800">
                  <div className="space-y-0.5">
                    <p>BILL: {bill?.billNumber || "BILL-"}</p>
                    <p>TABLE: {bill?.tableCode || "T-"}</p>
                  </div>
                  <div className="text-right space-y-0.5">
                    <p>{(bill?.createdAt || new Date()).toLocaleDateString("en-IN")}</p>
                    <p>
                      {(bill?.createdAt || new Date()).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                <div className="border-b border-dashed border-slate-300 pb-1 flex text-[10px] font-black uppercase tracking-widest text-slate-700">
                  <div className="w-7/12">Item</div>
                  <div className="w-2/12 text-center">Qty</div>
                  <div className="w-3/12 text-right">Amt</div>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
                  {items.map((item) => {
                    const isCancelled = item.status === "cancelled";
                    return (
                      <div
                        key={item.id}
                        className={`flex text-[11px] ${
                          isCancelled ? "line-through text-slate-400 opacity-60" : "text-slate-900 font-bold"
                        }`}
                      >
                        <div className="w-7/12 pr-1 whitespace-pre-wrap leading-tight">{item.name}</div>
                        <div className="w-2/12 text-center">{item.quantity}</div>
                        <div className="w-3/12 text-right">₹{(item.quantity * item.rate).toFixed(2)}</div>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-dashed border-slate-300 pt-3 space-y-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="text-slate-900 font-bold">₹{subtotal.toFixed(2)}</span>
                  </div>
                  {serviceCharge > 0 && (
                    <div className="flex justify-between">
                      <span>Service ({servicePercent}%)</span>
                      <span className="text-slate-900 font-bold">₹{serviceCharge.toFixed(2)}</span>
                    </div>
                  )}
                  {tax > 0 && (
                    <div className="flex justify-between">
                      <span>GST ({taxPercent}%)</span>
                      <span className="text-slate-900 font-bold">₹{tax.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="border-t-2 border-black pt-3 flex justify-between items-center text-sm font-black uppercase tracking-wider text-black">
                  <span>TOTAL DUE</span>
                  <span className="text-base">₹{total.toFixed(2)}</span>
                </div>

                {isPaid ? (
                  <div className="mt-3 text-center border-2 border-slate-700 bg-slate-50 text-slate-800 py-1.5 rounded text-xs font-black uppercase tracking-widest">
                    PAID IN FULL
                  </div>
                ) : (
                  <div className="mt-3 text-center text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                    * THANK YOU, VISIT AGAIN *
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Quick print bar */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex gap-2 shrink-0">
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex-1 py-2.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-250 text-slate-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Receipt
            </button>
            {!isPaid && (
              <button
                onClick={() => setIsCheckoutOpen(true)}
                className="flex-1 py-2.5 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <CreditCard className="w-3.5 h-3.5" />
                Pay & Close
              </button>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: KOT ITEMS LIST */}
        <div className="flex-1 flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Section Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 shrink-0">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Order Management
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {items.length} Total Items • {pendingCookingCount} Unserved
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {pendingCookingCount > 0 && !isPaid && (
                <button
                  onClick={serveAllPendingOrders}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-750 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-all"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark All Served</span>
                </button>
              )}

              {/* Minimal filter tabs */}
              <div className="flex p-0.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600">
                <button
                  onClick={() => setSelectedFilter("all")}
                  className={`px-3 py-1 rounded-md transition-all ${
                    selectedFilter === "all" ? "bg-white text-slate-900 shadow-xs" : "hover:text-slate-900"
                  }`}
                >
                  All ({items.length})
                </button>
                <button
                  onClick={() => setSelectedFilter("cooking")}
                  className={`px-3 py-1 rounded-md transition-all ${
                    selectedFilter === "cooking" ? "bg-white text-slate-900 shadow-xs" : "hover:text-slate-900"
                  }`}
                >
                  Unserved ({pendingCookingCount})
                </button>
              </div>
            </div>
          </div>

          {/* Cards List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-slate-50/50">
            {filteredItems.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 space-y-1">
                <Layers className="w-8 h-8 stroke-1" />
                <p className="text-xs font-semibold">No items match the current filter</p>
              </div>
            ) : (
              filteredItems.map((item, index) => {
                const config = statusConfig(item.status);
                const isCancelled = item.status === "cancelled";
                const isFirstRow = firstRowByOrder[item.orderId] === item.id;
                const orderForItem = orders.find((o) => o.id === item.orderId);

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, delay: index * 0.02 }}
                    className={`bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isCancelled ? "opacity-40 bg-slate-50" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-8 h-8 rounded bg-slate-100 text-slate-700 font-bold flex items-center justify-center shrink-0 text-xs">
                        {index + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className={`font-bold text-sm text-slate-950 ${isCancelled ? "line-through text-slate-400" : ""}`}>
                            {item.name}
                          </h4>
                          {isFirstRow && orderForItem?.daily_order_number != null && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200/60">
                              KOT #{orderForItem.daily_order_number}
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-3">
                          <span className="bg-slate-100 text-slate-700 font-bold px-1.5 py-0.5 rounded text-[10px]">
                            Qty: {item.quantity}
                          </span>
                          <span className="font-semibold text-slate-600">₹{item.rate.toFixed(2)} each</span>
                          <span className="font-black text-slate-900">
                            ₹{(item.quantity * item.rate).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto border-t sm:border-t-0 border-slate-100 pt-3.5 sm:pt-0">
                      <span className={`inline-flex items-center gap-1 rounded border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${config.className}`}>
                        {config.icon}
                        {config.label}
                      </span>

                      {!isPaid && isFirstRow && (
                        <div className="flex items-center gap-2">
                          {(item.status === "pending" ||
                            item.status === "accepted" ||
                            item.status === "preparing" ||
                            item.status === "ready") && (
                            <>
                              {item.status === "pending" && (
                                <button
                                  onClick={() => updateOrderStatus(item.orderId, "accepted")}
                                  className="px-3 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-250 text-xs font-bold transition-all shadow-xs"
                                >
                                  Accept
                                </button>
                              )}
                              <button
                                onClick={() => cancelOrder(item.orderId)}
                                className="p-1 rounded text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-all"
                                title="Cancel order"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {(item.status === "accepted" ||
                            item.status === "preparing" ||
                            item.status === "ready") && (
                            <button
                              onClick={() => updateOrderStatus(item.orderId, "served")}
                              className="px-3.5 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Serve</span>
                            </button>
                          )}
                        </div>
                      )}

                      {!isPaid &&
                        !isFirstRow &&
                        (item.status === "pending" ||
                          item.status === "accepted" ||
                          item.status === "preparing" ||
                          item.status === "ready") && (
                          <button
                            onClick={() => cancelOrderItem(item)}
                            className="px-2 py-1 rounded text-rose-600 hover:bg-rose-50 transition-all text-xs font-bold"
                            title="Cancel this item"
                          >
                            Remove
                          </button>
                        )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* === CHECKOUT DIALOG (No Gradients) === */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="bg-white w-full max-w-sm rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
            >
              <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Select Payment Method</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Table {bill?.tableCode} • Due:{" "}
                    <span className="font-bold text-slate-900">₹{total.toFixed(2)}</span>
                  </p>
                </div>
                <button
                  onClick={() => setIsCheckoutOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-200/60 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-5 space-y-2.5">
                <button
                  onClick={() => setPaymentMethod("cash")}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                    paymentMethod === "cash"
                      ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900"
                      : "border-slate-200 hover:border-slate-350"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded bg-slate-100 text-slate-800 flex items-center justify-center">
                      <Banknote className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <span className="font-bold text-slate-900 text-xs block">Cash</span>
                    </div>
                  </div>
                  {paymentMethod === "cash" && <div className="w-3.5 h-3.5 rounded-full bg-slate-900" />}
                </button>

                <button
                  onClick={() => setPaymentMethod("card")}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                    paymentMethod === "card"
                      ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900"
                      : "border-slate-200 hover:border-slate-350"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded bg-slate-100 text-slate-800 flex items-center justify-center">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <span className="font-bold text-slate-900 text-xs block">Credit / Debit Card</span>
                    </div>
                  </div>
                  {paymentMethod === "card" && <div className="w-3.5 h-3.5 rounded-full bg-slate-900" />}
                </button>

                <button
                  onClick={() => setPaymentMethod("upi")}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                    paymentMethod === "upi"
                      ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900"
                      : "border-slate-200 hover:border-slate-350"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded bg-slate-100 text-slate-800 flex items-center justify-center">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <span className="font-bold text-slate-900 text-xs block">UPI / QR Scan</span>
                    </div>
                  </div>
                  {paymentMethod === "upi" && <div className="w-3.5 h-3.5 rounded-full bg-slate-900" />}
                </button>

                <button
                  onClick={() => setPaymentMethod("split")}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                    paymentMethod === "split"
                      ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900"
                      : "border-slate-200 hover:border-slate-350"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded bg-slate-100 text-slate-800 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <span className="font-bold text-slate-900 text-xs block">Split Tender</span>
                    </div>
                  </div>
                  {paymentMethod === "split" && <div className="w-3.5 h-3.5 rounded-full bg-slate-900" />}
                </button>
              </div>

              {paymentMethod === "split" && (
                <div className="px-5 pb-5">
                  <div className="space-y-3 p-4 border border-slate-200 rounded-xl bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-20 text-xs font-bold text-slate-600 flex items-center gap-1">Cash</div>
                      <input
                        type="number"
                        value={splitAmounts.cash}
                        onChange={(e) => setSplitAmounts({ ...splitAmounts, cash: e.target.value })}
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-20 text-xs font-bold text-slate-600 flex items-center gap-1">Card</div>
                      <input
                        type="number"
                        value={splitAmounts.card}
                        onChange={(e) => setSplitAmounts({ ...splitAmounts, card: e.target.value })}
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-20 text-xs font-bold text-slate-600 flex items-center gap-1">UPI</div>
                      <input
                        type="number"
                        value={splitAmounts.upi}
                        onChange={(e) => setSplitAmounts({ ...splitAmounts, upi: e.target.value })}
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold mt-2 pt-2 border-t border-slate-200">
                      <span className="text-slate-500">
                        Split Total: ₹{((parseFloat(splitAmounts.cash) || 0) + (parseFloat(splitAmounts.card) || 0) + (parseFloat(splitAmounts.upi) || 0)).toFixed(2)}
                      </span>
                      <span className={Math.abs(((billBreakdown?.total ?? total) - ((parseFloat(splitAmounts.cash) || 0) + (parseFloat(splitAmounts.card) || 0) + (parseFloat(splitAmounts.upi) || 0)))) < 0.01 ? "text-emerald-600" : "text-rose-600"}>
                        Remaining: ₹{((billBreakdown?.total ?? total) - ((parseFloat(splitAmounts.cash) || 0) + (parseFloat(splitAmounts.card) || 0) + (parseFloat(splitAmounts.upi) || 0))).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-5 pt-0">
                <button
                  disabled={!paymentMethod || isProcessing || (paymentMethod === "split" && Math.abs((billBreakdown?.total ?? total) - ((parseFloat(splitAmounts.cash) || 0) + (parseFloat(splitAmounts.card) || 0) + (parseFloat(splitAmounts.upi) || 0))) > 0.01)}
                  onClick={handleCheckout}
                  className="w-full bg-slate-900 hover:bg-black text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Mark as Paid & Close
                    </>
                  )}
                </button>
                
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* === RELOCATE TABLE === */}
      <AnimatePresence>
        {showRelocate && (
          <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-white w-full max-w-sm rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
            >
              <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Relocate Table</h3>
                  <p className="text-xs text-slate-500">Move this session to a different table.</p>
                </div>
                <button
                  onClick={() => setShowRelocate(false)}
                  className="p-1 rounded-full hover:bg-slate-200 text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Target Table
                  </label>
                  <select
                    value={targetTableId}
                    onChange={(e) => setTargetTableId(e.target.value)}
                    className="w-full h-11 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold outline-none focus:ring-4 focus:ring-slate-150"
                  >
                    <option value="">Select a table…</option>
                    {tables
                      .filter((t) => t.is_enabled)
                      .sort((a, b) => a.table_number - b.table_number)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          T{t.table_number}
                        </option>
                      ))}
                  </select>
                </div>

                <button
                  disabled={!targetTableId}
                  onClick={() => setConfirmRelocate(true)}
                  className="w-full bg-slate-900 hover:bg-black text-white py-3 rounded-xl font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Transfer Table
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmRelocate && (
          <div className="fixed inset-0 z-[55] bg-black/30 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-white w-full max-w-xs rounded-2xl border border-slate-200 shadow-xl overflow-hidden p-5 space-y-4"
            >
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Confirm Relocation</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Move session to{" "}
                  <span className="font-bold text-slate-900">
                    T{tables.find((t) => t.id === targetTableId)?.table_number}
                  </span>
                  ?
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setConfirmRelocate(false)}
                  className="px-3 py-2 rounded border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setConfirmRelocate(false);
                    await submitRelocate();
                  }}
                  className="px-4 py-2 rounded bg-slate-900 text-white text-xs font-bold hover:bg-black"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* === MERGE BILLS === */}
      <AnimatePresence>
        {showMerge && (
          <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-white w-full max-w-sm rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
            >
              <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Merge Bills</h3>
                  <p className="text-xs text-slate-500">Combine another table into this bill.</p>
                </div>
                <button
                  onClick={() => setShowMerge(false)}
                  className="p-1 rounded-full hover:bg-slate-250 text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Merge With
                  </label>
                  <select
                    value={targetSessionId}
                    onChange={(e) => setTargetSessionId(e.target.value)}
                    className="w-full h-11 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold outline-none focus:ring-4 focus:ring-slate-150"
                  >
                    <option value="">Select a table…</option>
                    {activeSessions.map((s) => (
                      <option key={s.session_id} value={s.session_id}>
                        T{s.table_number}
                      </option>
                    ))}
                  </select>
                  {activeSessions.length === 0 && (
                    <p className="text-xs text-slate-400 mt-2">No other active tables found.</p>
                  )}
                </div>

                <button
                  disabled={!targetSessionId || isMerging}
                  onClick={submitMerge}
                  className="w-full bg-slate-900 hover:bg-black text-white py-3 rounded-xl font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {isMerging ? "Merging..." : "Merge Bills"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDiscountOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-white w-full max-w-sm rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
            >
              <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Discounts & Coupons</h3>
                  <p className="text-xs text-slate-500">Apply a flat reduction or a promo coupon code.</p>
                </div>
                <button
                  onClick={() => setIsDiscountOpen(false)}
                  className="p-1 rounded-full hover:bg-slate-250 text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tab Selector */}
              <div className="flex border-b border-slate-100 bg-slate-50/50 p-1.5 gap-1 shrink-0">
                <button
                  onClick={() => { setDiscountTab("flat"); setDiscountError(""); }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                    discountTab === "flat" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-950"
                  }`}
                >
                  Flat Discount
                </button>
                <button
                  onClick={() => { setDiscountTab("coupon"); setDiscountError(""); }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                    discountTab === "coupon" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-950"
                  }`}
                >
                  Promo Coupon
                </button>
              </div>

              <div className="p-5 space-y-4">
                {discountTab === "flat" ? (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Discount Amount (₹)
                    </label>
                    <input
                      type="number"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      placeholder="e.g. 100"
                      className="w-full h-11 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500"
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Coupon Code
                    </label>
                    <input
                      type="text"
                      value={promoCouponCode}
                      onChange={(e) => setPromoCouponCode(e.target.value)}
                      placeholder="e.g. SAVE20"
                      className="w-full h-11 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold outline-none uppercase focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500"
                    />
                  </div>
                )}

                {discountError && (
                  <p className="text-[10px] text-rose-500 font-bold">{discountError}</p>
                )}

                <button
                  disabled={isDiscountSubmitting}
                  onClick={handleApplyDiscount}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {isDiscountSubmitting
                    ? "Applying..."
                    : discountTab === "flat"
                    ? "Apply Discount"
                    : "Apply Coupon Code"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEditItemsOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-white w-full max-w-sm rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Modify Order Items</h3>
                  <p className="text-xs text-slate-500">Add or remove items on the current bill.</p>
                </div>
                <button
                  onClick={() => setIsEditItemsOpen(false)}
                  className="p-1 rounded-full hover:bg-slate-250 text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-5 flex-1">
                {/* Current Items Section */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Current Bill Items
                  </label>
                  <div className="max-h-44 overflow-y-auto space-y-2 pr-1 border border-slate-100 rounded-lg p-2 bg-slate-50/50">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200/85">
                        <div>
                          <p className="text-xs font-bold text-slate-900">{item.name}</p>
                          <p className="text-[10px] text-slate-500 font-medium">Qty: {item.quantity} • ₹{item.rate} each</p>
                        </div>
                        <button
                          onClick={() => cancelOrderItem(item)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 hover:text-rose-700 transition-colors"
                          title="Remove item"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {items.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-4">No items in this bill.</p>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4 space-y-4">
                  {/* Add New Item section */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Add New Item
                    </label>
                    
                    <div className="space-y-3 relative">
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search for dishes, drinks..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full h-10 pl-9 pr-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                        />
                      </div>

                      {!selectedMenuItem ? (
                        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                          {filteredMenuItems.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => setSelectedMenuItem(item)}
                              className="flex items-center text-left gap-3 p-2 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all bg-white group"
                            >
                              {item.image_url ? (
                                <img src={item.image_url} alt={item.name} className="w-12 h-12 rounded-lg object-cover shrink-0 shadow-sm" />
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                  <UtensilsCrossed className="w-5 h-5 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-slate-900 truncate">{item.name}</p>
                                <p className="text-[10px] font-semibold text-indigo-600 mt-0.5">₹{item.price}</p>
                                {item.categoryName && <p className="text-[9px] text-slate-400 truncate mt-0.5">{item.categoryName}</p>}
                              </div>
                            </button>
                          ))}
                          {filteredMenuItems.length === 0 && (
                            <div className="text-center py-6 text-xs text-slate-400 font-medium">
                              No items found matching "{searchQuery}"
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-3 rounded-xl border border-indigo-200 bg-indigo-50/50">
                          <div className="flex items-center gap-3">
                            {selectedMenuItem.image_url ? (
                              <img src={selectedMenuItem.image_url} alt={selectedMenuItem.name} className="w-12 h-12 rounded-lg object-cover shadow-sm" />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center shadow-sm">
                                <UtensilsCrossed className="w-5 h-5 text-indigo-400" />
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-bold text-slate-900">{selectedMenuItem.name}</p>
                              <p className="text-[11px] font-semibold text-indigo-600">₹{selectedMenuItem.price}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => { setSelectedMenuItem(null); setSelectedVariantId(""); }}
                            className="w-8 h-8 rounded-full bg-white border border-indigo-100 flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 hover:border-rose-100 text-slate-400 transition-all shadow-sm"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedMenuItem?.variants && selectedMenuItem.variants.length > 0 && (
                    <div className="space-y-1 animate-fadeIn">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Choose Variant
                      </label>
                      <select
                        value={selectedVariantId}
                        onChange={(e) => setSelectedVariantId(e.target.value)}
                        className="w-full h-11 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold outline-none focus:ring-4 focus:ring-indigo-100"
                      >
                        <option value="">Select variant…</option>
                        {selectedMenuItem.variants.map((v: any) => (
                          <option key={v.id} value={v.id}>
                            {v.label} - ₹{v.price}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                    <span className="text-xs font-bold text-slate-700">Quantity</span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setAddQty(Math.max(1, addQty - 1))}
                        className="w-7 h-7 rounded-lg bg-white border border-slate-250 hover:bg-slate-100 text-slate-800 font-bold flex items-center justify-center text-sm"
                      >
                        -
                      </button>
                      <span className="text-xs font-bold text-slate-900 w-6 text-center">{addQty}</span>
                      <button
                        onClick={() => setAddQty(addQty + 1)}
                        className="w-7 h-7 rounded-lg bg-white border border-slate-250 hover:bg-slate-100 text-slate-800 font-bold flex items-center justify-center text-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {editItemsError && (
                    <p className="text-[10px] text-rose-500 font-bold">{editItemsError}</p>
                  )}

                  <button
                    disabled={!selectedMenuItem || isAddingItem}
                    onClick={handleAddItemToOrder}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    {isAddingItem ? "Adding..." : "Add Item to Bill"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isWaiveOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-white w-full max-w-sm rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
            >
              <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Waive Off Bill</h3>
                  <p className="text-xs text-slate-500">Comp the table's active orders to ₹0.00.</p>
                </div>
                <button
                  onClick={() => setIsWaiveOpen(false)}
                  className="p-1 rounded-full hover:bg-slate-250 text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Manager PIN
                  </label>
                  <input
                    type="password"
                    value={waivePin}
                    onChange={(e) => setWaivePin(e.target.value)}
                    placeholder="Enter PIN"
                    maxLength={6}
                    className="w-full h-11 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold outline-none focus:ring-4 focus:ring-rose-100 focus:border-rose-500 tracking-widest text-center"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Reason for waiving
                  </label>
                  <textarea
                    value={waiveReason}
                    onChange={(e) => setWaiveReason(e.target.value)}
                    placeholder="e.g. Complimentary drink promo, client satisfaction"
                    rows={3}
                    className="w-full p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold outline-none focus:ring-4 focus:ring-rose-100 focus:border-rose-500 resize-none"
                  />
                  {waiveError && (
                    <p className="text-[10px] text-rose-500 font-bold mt-1">{waiveError}</p>
                  )}
                </div>

                <button
                  disabled={isWaiveSubmitting}
                  onClick={handleWaiveOff}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-xl font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {isWaiveSubmitting ? "Waiving..." : "Confirm Waive Off"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        open={Boolean(noticeModal)}
        title={noticeModal?.title || ""}
        message={noticeModal?.message || ""}
        confirmText="OK"
        hideCancel
        onClose={() => setNoticeModal(null)}
        onConfirm={() => setNoticeModal(null)}
      />
    </div>
  );
}
