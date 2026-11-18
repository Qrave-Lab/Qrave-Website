"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    AlertTriangle,
    Package,
    Bike,
    Plus,
    X,
    Search,
    ChevronDown,
    Check,
    Loader2,
    Phone,
    MapPin,
    StickyNote,
    User,
    Trash2,
    ArrowLeft,
    Clock,
    CheckCircle2,
    AlertCircle,
    RefreshCw,
    Utensils,
    ShoppingBag,
} from "lucide-react";
import StaffSidebar from "@/app/components/StaffSidebar";
import { CustomSelect } from "@/app/components/ui/CustomSelect";
import { api } from "@/app/lib/api";
import { normalizePaymentMode } from "@/app/lib/payment-status";
import toast from "react-hot-toast";
import TakeawayRewardPicker, { redeemOnTakeaway, takeawayRewardTotals, type TakeawayReward } from "@/app/components/billing/TakeawayRewardPicker";

/* ─── Types ────────────────────────────────────────────────────────────── */
type MenuItem = {
    id: string;
    name: string;
    price: number;
    categoryId: string;
    isArchived: boolean;
    isOutOfStock: boolean;
    gst_rate?: number;
};

type CartItem = {
    menuItemId: string;
    menuItemName: string;
    variantLabel?: string;
    quantity: number;
    unitPrice: number;
    gst_rate?: number;
};

type DeliveryZone = {
    id: string;
    name: string;
    distance_km?: number;
    fee: number;
    estimated_minutes?: number;
};

type TakeawayOrderItem = {
    id: string;
    menu_item_name: string;
    variant_label?: string;
    quantity: number;
    unit_price: number;
    total_price: number;
};

type TakeawayOrder = {
    id: string;
    order_type: "takeout" | "delivery" | "dine_in_reception";
    table_number?: number;
    status: string;
    payment_status?: "unpaid" | "partially_paid" | "paid" | "refunded" | "voided";
    customer_name?: string;
    customer_phone?: string;
    delivery_address?: string;
    delivery_zone?: string;
    delivery_fee: number;
    subtotal: number;
    tax_amount: number;
    total: number;
    payment_mode?: string;
    notes?: string;
    created_at: string;
    items: TakeawayOrderItem[];
};

type PaymentMode = "cash" | "card" | "upi" | "online" | "later";

const RECEPTION_PREFIX = "[RECEPTION_DINEIN]";

const extractReceptionTable = (order: Pick<TakeawayOrder, "order_type" | "notes" | "table_number">): number | null => {
    if (typeof order.table_number === "number" && Number.isFinite(order.table_number)) return order.table_number;
    const raw = String(order.notes || "");
    const m = raw.match(/\[RECEPTION_DINEIN\]\s*T(\d+)/i);
    if (!m) return null;
    const n = Number(m[1]);
    return Number.isFinite(n) ? n : null;
};

const isReceptionDineInOrder = (order: Pick<TakeawayOrder, "order_type" | "notes">): boolean => {
    if (order.order_type === "dine_in_reception") return true;
    const raw = String(order.notes || "");
    return order.order_type === "takeout" && raw.includes(RECEPTION_PREFIX);
};


const STATUS_META: Record<string, { label: string; color: string; dot: string }> = {
    pending: { label: "Pending", color: "bg-amber-50 text-amber-800", dot: "bg-amber-500" },
    preparing: { label: "Preparing", color: "bg-blue-50 text-blue-700", dot: "bg-blue-500" },
    ready: { label: "Ready", color: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
    completed: { label: "Completed", color: "bg-[#F3F3EF] text-[#4B5563]", dot: "bg-[#9CA3AF]" },
    cancelled: { label: "Cancelled", color: "bg-rose-50 text-rose-700", dot: "bg-rose-400" },
};

const NEXT_STATUS: Record<string, string> = {
    pending: "preparing",
    preparing: "ready",
    ready: "completed",
};

const fmtCur = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

// Card wording for payment, e.g. "Paid by UPI" or "Not paid yet".
const paymentText = (status?: string, mode?: string): { text: string; due: boolean } => {
    const s = String(status || "").toLowerCase();
    const m = String(mode || "").toLowerCase();
    if (s === "paid") {
        if (m === "cash") return { text: "Paid in cash", due: false };
        if (m === "card") return { text: "Paid by card", due: false };
        if (m === "upi") return { text: "Paid by UPI", due: false };
        if (m === "online") return { text: "Paid online", due: false };
        return { text: "Paid", due: false };
    }
    if (s === "partially_paid") return { text: "Partly paid", due: true };
    if (s === "refunded") return { text: "Refunded", due: false };
    if (s === "voided") return { text: "Voided", due: false };
    return { text: "Not paid yet", due: true };
};

function TakeawaySkeleton() {
    return (
        <div className="flex h-screen w-full bg-[#F8FAFC] overflow-hidden">
            <StaffSidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between z-20 sticky top-0">
                    <div>
                        <div className="h-6 w-48 bg-slate-200 rounded animate-pulse mb-2" />
                        <div className="h-3 w-32 bg-slate-100 rounded animate-pulse" />
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto p-6">
                    <div className="flex gap-2 mb-6">
                        {[1, 2, 3, 4].map(i => <div key={i} className="h-8 w-20 bg-slate-200 rounded-xl animate-pulse" />)}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 animate-pulse">
                                <div className="h-4 w-1/3 bg-slate-200 rounded mb-4" />
                                <div className="h-8 w-full bg-slate-100 rounded mb-2" />
                                <div className="h-4 w-2/3 bg-slate-100 rounded" />
                            </div>
                        ))}
                    </div>
                </main>
            </div>
        </div>
    );
}

/* ─── Component ─────────────────────────────────────────────────────────── */
export default function TakeawayClient({ initialData }: { initialData?: any }) {
    const router = useRouter();

    const initialProcessed = useMemo(() => {
        if (!initialData) return null;
        const { me, menuRes, zonesRes, ordersRes } = initialData;
        const r = (me?.role || "").toLowerCase();
        const taxPercent = me?.tax_percent || 0;
        const restNameStr = JSON.stringify(initialData?.me || {});
        const menuItems = (menuRes as any)?.filter?.((i: MenuItem) => !i.isArchived && !i.isOutOfStock) ??
            (menuRes as any)?.items?.filter((i: MenuItem) => !i.isArchived && !i.isOutOfStock) ?? [];
        const zones = zonesRes?.zones || [];
        const fetched = ordersRes?.orders || [];
        const orders = fetched.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return { role: r, taxPercent, menuItems, zones, orders, restNameStr };
    }, [initialData]);

    const [role, setRole] = useState(initialProcessed?.role || "");
    const [menuItems, setMenuItems] = useState<MenuItem[]>(initialProcessed?.menuItems || []);
    const [zones, setZones] = useState<DeliveryZone[]>(initialProcessed?.zones || []);
    const [orders, setOrders] = useState<TakeawayOrder[]>(initialProcessed?.orders || []);
    const [isLoading, setIsLoading] = useState(!initialProcessed);
    const [isOrdersLoading, setIsOrdersLoading] = useState(false);

    const [isCreating, setIsCreating] = useState(false);
    const [showNewOrder, setShowNewOrder] = useState(false);
    const [statusFilter, setStatusFilter] = useState("active");
    const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
    const [searchMenu, setSearchMenu] = useState("");
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
    const [taxPercent, setTaxPercent] = useState<number>(initialProcessed?.taxPercent || 0);
    const [restName, setRestName] = useState<string>(initialProcessed?.restNameStr || "Unknown");

    // New order form
    const [orderType, setOrderType] = useState<"takeout" | "delivery" | "dine_in_reception">("takeout");
    const [tableNumber, setTableNumber] = useState("");
    const [tables, setTables] = useState<any[]>([]);
    const [activeSessions, setActiveSessions] = useState<any[]>([]);
    const [loadingTables, setLoadingTables] = useState(false);

    const fetchTables = async () => {
        setLoadingTables(true);
        try {
            const [tablesRes, sessionsRes] = await Promise.all([
                api<any[]>("/api/admin/tables").catch(() => []),
                api<{ sessions: any[] }>("/api/admin/sessions/active").catch(() => ({ sessions: [] })),
            ]);
            if (Array.isArray(tablesRes)) {
                setTables(tablesRes);
            }
            if (sessionsRes?.sessions) {
                setActiveSessions(sessionsRes.sessions);
            }
        } catch (err) {
            console.error("Failed to load tables", err);
        } finally {
            setLoadingTables(false);
        }
    };

    useEffect(() => {
        if (showNewOrder && orderType === "dine_in_reception") {
            void fetchTables();
        }
    }, [showNewOrder, orderType]);

    const occupiedTableIds = useMemo(() => {
        const set = new Set<string>();
        for (const s of activeSessions) {
            if (s.table_id) set.add(s.table_id);
        }
        return set;
    }, [activeSessions]);

    const occupiedTableNumbers = useMemo(() => {
        const set = new Set<number>();
        for (const t of tables) {
            if (occupiedTableIds.has(t.id)) {
                set.add(t.table_number);
            }
        }
        for (const o of orders) {
            if (o.status === "completed" || o.status === "cancelled") continue;
            let tn = o.table_number;
            if (!tn && o.notes?.includes("[RECEPTION_DINEIN]")) {
                const m = o.notes.match(/\[RECEPTION_DINEIN\]\s*T(\d+)/i);
                if (m) tn = parseInt(m[1], 10);
            }
            if (tn) set.add(tn);
        }
        return set;
    }, [tables, occupiedTableIds, orders]);

    const availableTables = useMemo(() => {
        return tables
            .filter((t) => t.is_enabled !== false && !occupiedTableNumbers.has(t.table_number))
            .sort((a, b) => a.table_number - b.table_number);
    }, [tables, occupiedTableNumbers]);
    
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [deliveryAddressId, setDeliveryAddressId] = useState<string | null>(null);
  const [customerAddresses, setCustomerAddresses] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Reset customer id if phone changes manually
  const handlePhoneChange = (val: string) => {
    setCustomerPhone(val);
    setLoyaltyReward(null);
    if (customerId) setCustomerId(null);
    if (val.length > 3) {
      api<any>(`/api/admin/customers/search?q=${val}`).then(res => {
        const customers = res.customers || [];
        // Auto-fill if exact match found
        const exactMatch = customers.find((c: any) => c.phone === val);
        if (exactMatch) {
          selectCustomer(exactMatch);
        } else {
          setSearchResults(customers);
        }
      }).catch(console.error);
    } else {
      setSearchResults([]);
    }
  };

  const selectCustomer = async (c: any) => {
    setCustomerId(c.id);
    setCustomerName(c.name);
    setCustomerPhone(c.phone);
    setSearchResults([]);
    
    try {
      const res = await api<any>(`/api/admin/customers/${c.id}/addresses`);
      if (res.addresses) {
        setCustomerAddresses(res.addresses);
        if (res.addresses.length > 0) {
          setDeliveryAddressId(res.addresses[0].id);
          setDeliveryAddress(res.addresses[0].address_line);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    // Opt-in: sign this customer up for the loyalty card with this order.
    const [joinLoyalty, setJoinLoyalty] = useState(false);
    // A loyalty reward to take off this order (applied right after it's created).
    const [loyaltyReward, setLoyaltyReward] = useState<TakeawayReward | null>(null);
    const [deliveryAddress, setDeliveryAddress] = useState("");
    const [selectedZone, setSelectedZone] = useState<DeliveryZone | null>(null);
    const [paymentMode, setPaymentMode] = useState<PaymentMode>("later");
    const [notes, setNotes] = useState("");
    const [cart, setCart] = useState<CartItem[]>([]);

    /* ─── Load data ─────────────────────────────────────────────────────── */

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("new") === "1") {
        setShowNewOrder(true);
        // Clean up the URL so it doesn't reopen on refresh
        window.history.replaceState({}, '', '/staff/takeaway');
      }
    }
  }, []);
    const loadOrders = useCallback(async (sf = statusFilter) => {
        setIsOrdersLoading(true);
        try {
            const apiStatus = sf === "all" ? "" : sf;
            const url = apiStatus ? `/api/admin/takeaway/orders?status=${apiStatus}` : "/api/admin/takeaway/orders";
            const res = await api<{ orders: TakeawayOrder[] }>(url);
            const fetched = res?.orders || [];
            setOrders(fetched.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        } catch {
            // silent
        } finally {
            setIsOrdersLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        let mounted = true;
        if (!initialProcessed) {
          const init = async () => {
              try {
                  const [me, menuRes, zonesRes, ordersRes] = await Promise.all([
                      api<{ role?: string; tax_percent?: number; restaurant?: string }>("/api/admin/me"),
                      api<{ items?: MenuItem[] }>("/api/admin/menu"),
                      api<{ zones?: DeliveryZone[] }>("/api/admin/delivery/zones"),
                      api<{ orders: TakeawayOrder[] }>("/api/admin/takeaway/orders?status=active"),
                  ]);
                  if (!mounted) return;
                  const r = (me?.role || "").toLowerCase();
                  if (!["admin", "owner", "manager", "cashier"].includes(r)) {
                      router.replace("/staff");
                      return;
                  }
                  setRole(r);
                  setTaxPercent(me?.tax_percent || 0);
                  setRestName(me?.restaurant || "Unknown");
                  setMenuItems((menuRes as any)?.filter?.((i: MenuItem) => !i.isArchived && !i.isOutOfStock) ??
                      (menuRes as any)?.items?.filter((i: MenuItem) => !i.isArchived && !i.isOutOfStock) ?? []);
                  setZones(zonesRes?.zones || []);
                  const fetched = ordersRes?.orders || [];
                  setOrders(fetched.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
              } catch {
                  router.replace("/staff");
              } finally {
                  if (mounted) setIsLoading(false);
              }
          };
          init();
        } else {
            if (!["admin", "owner", "manager", "cashier"].includes(initialProcessed.role)) {
                router.replace("/staff");
            }
        }
        return () => { mounted = false; };
    }, [initialProcessed, router]);

    useEffect(() => {
        loadOrders(statusFilter);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter]);

    /* ─── Menu search ───────────────────────────────────────────────────── */
    const filteredMenu = useMemo(() =>
        menuItems.filter(m => m.name.toLowerCase().includes(searchMenu.toLowerCase())).slice(0, 20),
        [menuItems, searchMenu]
    );

    const addToCart = (item: MenuItem) => {
        setCart(prev => {
            const existing = prev.find(c => c.menuItemId === item.id);
            if (existing) return prev.map(c => c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c);
            return [...prev, { menuItemId: item.id, menuItemName: item.name, quantity: 1, unitPrice: item.price, gst_rate: item.gst_rate }];
        });
    };

    const updateQty = (menuItemId: string, delta: number) => {
        setCart(prev => {
            const updated = prev.map(c => c.menuItemId === menuItemId ? { ...c, quantity: c.quantity + delta } : c);
            return updated.filter(c => c.quantity > 0);
        });
    };

    const cartTotal = cart.reduce((sum, c) => sum + c.quantity * c.unitPrice, 0);
    const deliveryFee = orderType === "delivery" ? (selectedZone?.fee ?? 0) : 0;
    const computedTax = cart.reduce((sum, c) => {
        const rate = c.gst_rate !== undefined && c.gst_rate !== null ? c.gst_rate : taxPercent;
        return sum + (c.quantity * c.unitPrice * (rate / 100));
    }, 0);
    const rewardTotals = takeawayRewardTotals(cartTotal, computedTax, deliveryFee, loyaltyReward);
    const finalTotal = loyaltyReward ? rewardTotals.total : cartTotal + computedTax + deliveryFee;

    const resetForm = () => {
        setOrderType("takeout");
        setTableNumber("");
        setCustomerName("");
        setCustomerPhone("");
        setJoinLoyalty(false);
        setLoyaltyReward(null);
        setDeliveryAddress("");
        setSelectedZone(null);
        setPaymentMode("later");
        setNotes("");
        setCart([]);
        setSearchMenu("");
        setShowNewOrder(false);
    };

    /* ─── Submit new order ──────────────────────────────────────────────── */
    const handleSubmit = async () => {
        if (cart.length === 0) { toast.error("Add at least one item"); return; }
        if (orderType === "delivery" && !deliveryAddress.trim()) { toast.error("Delivery address required"); return; }
        if (orderType === "dine_in_reception") {
            const tn = Number(tableNumber);
            if (!Number.isFinite(tn) || tn <= 0) {
                toast.error("Table number is required for reception dine-in");
                return;
            }
        }
        setIsCreating(true);
        try {
            const normalizedNotes = notes?.trim() || "";
            const receptionNote =
                orderType === "dine_in_reception"
                    ? `${RECEPTION_PREFIX} T${Number(tableNumber)}${normalizedNotes ? ` ${normalizedNotes}` : ""}`
                    : normalizedNotes;

            const payload = {
                order_type: orderType,
                table_number: orderType === "dine_in_reception" ? Number(tableNumber) : null,
                customer_name: customerName || null,
                customer_phone: customerPhone || null,
                delivery_address: orderType === "delivery" ? deliveryAddress : null,
                delivery_zone: orderType === "delivery" ? selectedZone?.name ?? null : null,
                delivery_fee: deliveryFee,
                tax_amount: computedTax,
                payment_mode: normalizePaymentMode(paymentMode),
                notes: receptionNote || null,
                items: cart.map(c => ({
                    menu_item_id: c.menuItemId,
                    menu_item_name: c.menuItemName,
                    variant_label: c.variantLabel ?? null,
                    quantity: c.quantity,
                    unit_price: c.unitPrice,
                })),
            };

            const order = await api<{ id?: string }>("/api/admin/takeaway/orders", {
                method: "POST",
                body: JSON.stringify(payload),
            });
            // Points land when the order is paid. A loyalty problem never blocks the sale.
            if (joinLoyalty && customerPhone && order?.id) {
                await api("/api/admin/crm/loyalty/attach", {
                    method: "POST",
                    body: JSON.stringify({ phone: customerPhone, name: customerName || "", takeaway_order_id: order.id }),
                    suppressErrorLog: true,
                }).catch((e: Error) => toast.error(`Loyalty: ${e.message}`));
            }
            // Take the chosen reward off before the order is paid or invoiced.
            if (loyaltyReward && order?.id) {
                await redeemOnTakeaway(order.id, customerPhone, loyaltyReward.id).catch((e: Error) =>
                    toast.error(`Reward not applied: ${e.message} The order is saved at full price.`)
                );
            }
            toast.success("Order created!");
            resetForm();
            await loadOrders();
        } catch (err: any) {
            const msg = String(err?.message || "");
            const needsCompatRetry =
                orderType === "dine_in_reception" &&
                msg.includes("order_type must be 'takeout' or 'delivery'");

            if (needsCompatRetry) {
                try {
                    const normalizedNotes = notes?.trim() || "";
                    const compatNote = `${RECEPTION_PREFIX} T${Number(tableNumber)}${normalizedNotes ? ` ${normalizedNotes}` : ""}`;
                    await api("/api/admin/takeaway/orders", {
                        method: "POST",
                        body: JSON.stringify({
                            order_type: "takeout",
                            table_number: null,
                            customer_id: customerId || null,
                            delivery_address_id: deliveryAddressId || null,
                            customer_name: customerName || null,
                            customer_phone: customerPhone || null,
                            delivery_address: null,
                            delivery_zone: null,
                            delivery_fee: 0,
                            tax_amount: computedTax,
                            payment_mode: normalizePaymentMode(paymentMode),
                            notes: compatNote,
                            items: cart.map(c => ({
                                menu_item_id: c.menuItemId,
                                menu_item_name: c.menuItemName,
                                variant_label: c.variantLabel ?? null,
                                quantity: c.quantity,
                                unit_price: c.unitPrice,
                            })),
                        }),
                    });
                    toast.success("Order created (compat mode)");
                    resetForm();
                    await loadOrders();
                    return;
                } catch (retryErr: any) {
                    toast.error(retryErr?.message || "Failed to create order");
                }
            } else {
                toast.error(err?.message || "Failed to create order");
            }
        } finally {
            setIsCreating(false);
        }
    };

    /* ─── Update order status ───────────────────────────────────────────── */
    const updateStatus = async (orderId: string, newStatus: string) => {
        setUpdatingOrderId(orderId);
        try {
            await api(`/api/admin/takeaway/orders/${orderId}/status`, {
                method: "PATCH",
                body: JSON.stringify({ status: newStatus }),
            });
            toast.success(`Order marked ${newStatus}`);
            await loadOrders();
        } catch (e: any) {
            toast.error(e?.message || "Failed to update order");
        } finally {
            setUpdatingOrderId(null);
        }
    };

    if (isLoading) {
        return <TakeawaySkeleton />;
    }

    return (
        <div className="flex h-screen w-full overflow-hidden bg-[#FAFAF7] text-[#0F1117]">
            <StaffSidebar />

            <div className="flex min-w-0 flex-1 flex-col">
                <header className="sticky top-0 z-20 border-b border-[#E8E8E3] bg-white px-8 pt-4">
                    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                        <div className="flex items-center gap-3">
                            <h1 className="text-[22px] font-bold leading-none tracking-[-0.02em] text-[#0F1117]">
                                Takeaway and delivery
                            </h1>
                            {!isOrdersLoading && (
                                <span className="rounded-full bg-[#F3F3EF] px-2.5 py-1 text-[12px] font-medium leading-none tabular-nums text-[#6B7280]">
                                    {orders.length} {orders.length === 1 ? "order" : "orders"}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => loadOrders()}
                                aria-label="Refresh orders"
                                title="Refresh orders"
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E8E8E3] bg-white text-[#6B7280] transition-colors hover:border-[#D6D6CF] hover:bg-[#FAFAF7] hover:text-[#0F1117]"
                            >
                                <RefreshCw className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setShowNewOrder(true)}
                                className="ml-1 inline-flex h-10 items-center gap-2 rounded-xl bg-[#fe5c13] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#e44e0b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fe5c13]/40 focus-visible:ring-offset-2"
                            >
                                <Plus className="h-4 w-4" strokeWidth={2.5} /> New order
                            </button>
                        </div>
                    </div>

                    <nav className="mt-4 flex gap-7" role="tablist" aria-label="Order status">
                        {[
                            { key: "active", label: "Active" },
                            { key: "completed", label: "Completed" },
                            { key: "cancelled", label: "Cancelled" },
                            { key: "", label: "All orders" },
                        ].map((tab) => (
                            <button
                                key={tab.key}
                                role="tab"
                                aria-selected={statusFilter === tab.key}
                                onClick={() => setStatusFilter(tab.key)}
                                className={`-mb-px border-b-2 pb-3 text-[14px] transition-colors ${statusFilter === tab.key
                                    ? "border-[#fe5c13] font-semibold text-[#0F1117]"
                                    : "border-transparent font-medium text-[#6B7280] hover:text-[#0F1117]"
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </header>

                <main className="flex-1 overflow-y-auto px-8 py-6">
                    {isOrdersLoading ? (
                        <div className="flex items-center justify-center gap-2 py-24 text-[14px] text-[#6B7280]">
                            <Loader2 className="h-4 w-4 animate-spin" /> Loading orders
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="mx-auto mt-10 max-w-sm rounded-2xl border border-dashed border-[#D6D6CF] bg-white px-8 py-12 text-center">
                            <Package className="mx-auto h-6 w-6 text-[#C4C4BE]" />
                            <p className="mt-3 text-[15px] font-semibold text-[#0F1117]">
                                {statusFilter === "active" ? "No active orders" : statusFilter === "completed" ? "No completed orders yet" : statusFilter === "cancelled" ? "No cancelled orders" : "No orders yet"}
                            </p>
                            <p className="mt-1 text-[13px] text-[#6B7280]">Takeaway, delivery and counter dine-in orders show up here.</p>
                            {statusFilter === "active" && (
                                <button
                                    onClick={() => setShowNewOrder(true)}
                                    className="mt-5 inline-flex h-9 items-center gap-2 rounded-xl border border-[#E8E8E3] bg-white px-3.5 text-[13px] font-semibold text-[#0F1117] transition-colors hover:border-[#D6D6CF] hover:bg-[#FAFAF7]"
                                >
                                    <Plus className="h-4 w-4 text-[#6B7280]" /> New order
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {orders.map((order) => {
                                const sm = STATUS_META[order.status] || STATUS_META.pending;
                                const nextSt = NEXT_STATUS[order.status];
                                const isExpanded = expandedOrder === order.id;
                                const isDelivery = order.order_type === "delivery";
                                const isDineIn = isReceptionDineInOrder(order);
                                const dineTable = isDineIn ? extractReceptionTable(order) : null;
                                const TypeIcon = isDelivery ? Bike : isDineIn ? Utensils : ShoppingBag;
                                const typeLabel = isDelivery ? "Delivery" : isDineIn ? (dineTable ? `Dine-in, table ${dineTable}` : "Dine-in") : "Takeout";
                                const created = new Date(order.created_at);
                                const isToday = created.toDateString() === new Date().toDateString();
                                const when = `${created.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}${isToday ? "" : `, ${created.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}`;
                                const busy = updatingOrderId === order.id;
                                const cleanNotes = String(order.notes || "").replace(/\[RECEPTION_DINEIN\]\s*T?\d*/i, "").trim();
                                const preview = order.items.slice(0, 2).map((it) => `${it.quantity}× ${it.menu_item_name}`).join(", ");
                                const more = order.items.length - 2;
                                const nextLabel =
                                    nextSt === "preparing"
                                        ? "Start preparing"
                                        : nextSt === "ready"
                                            ? "Mark ready"
                                            : nextSt === "completed"
                                                ? isDelivery ? "Mark delivered" : isDineIn ? "Mark served" : "Mark collected"
                                                : `Mark ${STATUS_META[nextSt]?.label?.toLowerCase()}`;
                                const done = order.status === "completed" || order.status === "cancelled";

                                return (
                                    <article
                                        key={order.id}
                                        className={`flex h-full flex-col rounded-2xl border border-[#E8E8E3] bg-white transition-shadow hover:shadow-[0_6px_20px_-12px_rgba(15,17,23,0.18)] ${done ? "opacity-80" : ""}`}
                                    >
                                        <div className="flex-1 px-5 pb-4 pt-5">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F3F3EF] text-[#4B5563]">
                                                        <TypeIcon className="h-[18px] w-[18px]" />
                                                    </span>
                                                    <div className="min-w-0">
                                                        <p className="truncate text-[14px] font-semibold text-[#0F1117]">{typeLabel}</p>
                                                        <p className="mt-0.5 text-[12px] tabular-nums text-[#6B7280]">{when}</p>
                                                    </div>
                                                </div>
                                                <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium leading-none ${sm.color}`}>
                                                    <span className={`h-1.5 w-1.5 rounded-full ${sm.dot}`} />
                                                    {sm.label}
                                                </span>
                                            </div>

                                            <div className="mt-4 flex items-baseline justify-between gap-3">
                                                <p className="text-[22px] font-bold leading-none tracking-[-0.02em] tabular-nums text-[#0F1117]">{fmtCur(order.total)}</p>
                                                {(() => {
                                                    const pay = paymentText(order.payment_status, order.payment_mode);
                                                    return <p className={`text-[12px] font-medium ${pay.due && !done ? "text-amber-700" : "text-[#6B7280]"}`}>{pay.text}</p>;
                                                })()}
                                            </div>

                                            {(order.customer_name || order.customer_phone || order.delivery_zone) && (
                                                <div className="mt-4 space-y-1.5 text-[13px] text-[#374151]">
                                                    {(order.customer_name || order.customer_phone) && (
                                                        <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                                            {order.customer_name && (
                                                                <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-[#9CA3AF]" /> {order.customer_name}</span>
                                                            )}
                                                            {order.customer_phone && (
                                                                <span className="flex items-center gap-1.5 tabular-nums"><Phone className="h-3.5 w-3.5 text-[#9CA3AF]" /> {order.customer_phone}</span>
                                                            )}
                                                        </p>
                                                    )}
                                                    {order.delivery_zone && (
                                                        <p className="flex items-center gap-1.5">
                                                            <MapPin className="h-3.5 w-3.5 text-[#9CA3AF]" />
                                                            <span>
                                                                {order.delivery_zone}
                                                                {order.delivery_fee > 0 ? <span className="text-[#6B7280]">{`, ${fmtCur(order.delivery_fee)} delivery fee`}</span> : null}
                                                            </span>
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            <button
                                                onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                                                aria-expanded={isExpanded}
                                                className="mt-4 flex w-full items-center justify-between gap-3 rounded-xl bg-[#FAFAF7] px-3 py-2.5 text-left transition-colors hover:bg-[#F3F3EF]"
                                            >
                                                <span className="min-w-0">
                                                    <span className="block text-[12px] font-semibold text-[#0F1117]">
                                                        {order.items.length} {order.items.length === 1 ? "item" : "items"}
                                                    </span>
                                                    {!isExpanded && preview && (
                                                        <span className="mt-0.5 block truncate text-[12px] text-[#6B7280]">
                                                            {preview}{more > 0 ? ` +${more} more` : ""}
                                                        </span>
                                                    )}
                                                </span>
                                                <ChevronDown className={`h-4 w-4 shrink-0 text-[#9CA3AF] transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                                            </button>

                                            <AnimatePresence initial={false}>
                                                {isExpanded && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: "auto", opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.18, ease: "easeOut" }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="space-y-1.5 px-3 pt-3">
                                                            {order.items.map((it) => (
                                                                <div key={it.id} className="flex justify-between gap-3 text-[13px] text-[#374151]">
                                                                    <span className="min-w-0">
                                                                        <span className="tabular-nums text-[#9CA3AF]">{it.quantity}×</span> {it.menu_item_name}
                                                                        {it.variant_label ? <span className="text-[#6B7280]"> ({it.variant_label})</span> : null}
                                                                    </span>
                                                                    <span className="shrink-0 font-medium tabular-nums text-[#0F1117]">{fmtCur(it.total_price)}</span>
                                                                </div>
                                                            ))}
                                                            {(order.tax_amount > 0 || order.delivery_fee > 0) && (
                                                                <div className="mt-2 space-y-1 border-t border-dashed border-[#E8E8E3] pt-2">
                                                                    {order.tax_amount > 0 && (
                                                                        <div className="flex justify-between text-[12px] text-[#6B7280]">
                                                                            <span>Tax</span><span className="tabular-nums">{fmtCur(order.tax_amount)}</span>
                                                                        </div>
                                                                    )}
                                                                    {order.delivery_fee > 0 && (
                                                                        <div className="flex justify-between text-[12px] text-[#6B7280]">
                                                                            <span>Delivery fee</span><span className="tabular-nums">{fmtCur(order.delivery_fee)}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            {cleanNotes && (
                                                <p className="mt-3 flex items-start gap-1.5 text-[12px] leading-relaxed text-[#6B7280]">
                                                    <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#9CA3AF]" /> {cleanNotes}
                                                </p>
                                            )}
                                        </div>

                                        {!done && (
                                            <div className="flex items-center gap-2 border-t border-[#F0F0EB] px-5 py-3">
                                                {nextSt && (
                                                    <button
                                                        onClick={() => updateStatus(order.id, nextSt)}
                                                        disabled={busy}
                                                        className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#0F1117] px-3 text-[13px] font-semibold text-white transition-colors hover:bg-black disabled:opacity-50"
                                                    >
                                                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                                        {nextLabel}
                                                    </button>
                                                )}
                                                {order.status === "pending" && (
                                                    <button
                                                        onClick={() => updateStatus(order.id, "ready")}
                                                        disabled={busy}
                                                        title="Skip preparing and mark this order ready"
                                                        className="inline-flex h-9 items-center justify-center rounded-lg border border-[#E8E8E3] bg-white px-3 text-[13px] font-semibold text-[#374151] transition-colors hover:border-[#D6D6CF] hover:text-[#0F1117] disabled:opacity-50"
                                                    >
                                                        Ready now
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => updateStatus(order.id, "cancelled")}
                                                    disabled={busy}
                                                    aria-label="Cancel order"
                                                    title="Cancel order"
                                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#9CA3AF] transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        )}
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </main>
            </div>

            {/* ─── New Order Side Panel ────────────────────────────────────────── */}
            <AnimatePresence>
                {showNewOrder && (
                    <div className="fixed inset-0 z-50 flex justify-end">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 bg-black/30 backdrop-blur-sm"
                            onClick={resetForm}
                        />
                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="relative w-full max-w-lg bg-white shadow-[0_20px_60px_-15px_rgba(15,17,23,0.3)] border-l border-[#E8E8E3] flex flex-col h-full overflow-hidden"
                        >
                            {/* Panel Header */}
                            <div className="px-6 py-4.5 border-b border-[#E8E8E3] bg-[#FAFAF7] flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FEF3C7] text-[#fe5c13] shadow-2xs">
                                        <Plus className="h-4 w-4 stroke-[2.5]" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-[#0F1117] leading-none">New order</h2>
                                        <p className="text-[11px] text-[#6B7280] mt-1 leading-none">
                                            {orderType === "takeout" ? "Takeaway" : orderType === "delivery" ? "Home delivery" : "Dine-in at the counter"}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={resetForm}
                                    className="p-1.5 rounded-xl text-[#6B7280] hover:text-[#0F1117] hover:bg-[#F3F3EF] transition-all"
                                    aria-label="Close"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-5">
                                {/* Order type */}
                                <div>
                                    <label className="block text-[13px] font-medium text-[#4B5563] mb-2">Order type</label>
                                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#F3F3EF] rounded-2xl border border-[#E8E8E3]">
                                        {(["takeout", "delivery", "dine_in_reception"] as const).map(t => {
                                            const isActive = orderType === t;
                                            return (
                                                <button
                                                    key={t}
                                                    type="button"
                                                    onClick={() => { setOrderType(t); setSelectedZone(null); }}
                                                    className={`py-2.5 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                                        isActive
                                                            ? "bg-[#fe5c13] text-white"
                                                            : "text-[#6B7280] hover:text-[#0F1117] hover:bg-white/60"
                                                    }`}
                                                >
                                                    {t === "takeout" ? <ShoppingBag className="w-4 h-4" /> : t === "delivery" ? <Bike className="w-4 h-4" /> : <Utensils className="w-4 h-4" />}
                                                    {t === "takeout" ? "Takeout" : t === "delivery" ? "Delivery" : "Dine-in"}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {orderType === "dine_in_reception" && (
                                    <div className="space-y-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4 shadow-2xs">
                                        <div className="flex items-center justify-between">
                                            <label className="block text-[12px] font-semibold text-emerald-950 flex items-center gap-1.5">
                                                <span>Select Table</span>
                                                <span className="text-[#fe5c13]">*</span>
                                            </label>
                                            <div className="flex items-center gap-1.5">
                                                {tableNumber ? (
                                                    <span className="text-[11px] font-bold text-white bg-emerald-600 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                                                        <Check className="w-3 h-3 stroke-[2.5]" />
                                                        Table T{tableNumber} Selected
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full">
                                                        {loadingTables ? "Checking tables..." : `${availableTables.length} Available`}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Quick-Select Table Pills */}
                                        {loadingTables ? (
                                            <div className="flex gap-2 py-1">
                                                {[1, 2, 3, 4, 5].map((n) => (
                                                    <div key={n} className="h-9 w-14 rounded-xl bg-emerald-100/70 animate-pulse" />
                                                ))}
                                            </div>
                                        ) : availableTables.length > 0 ? (
                                            <div className="space-y-1">
                                                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto no-scrollbar p-1">
                                                    {availableTables.map((t) => {
                                                        const isSelected = String(tableNumber) === String(t.table_number);
                                                        return (
                                                            <button
                                                                key={t.id}
                                                                type="button"
                                                                onClick={() => setTableNumber(isSelected ? "" : String(t.table_number))}
                                                                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 select-none shadow-2xs ${
                                                                    isSelected
                                                                        ? "bg-emerald-600 text-white border border-emerald-600"
                                                                        : "bg-white text-[#0F1117] border border-emerald-200/90 hover:bg-emerald-50/90 hover:border-emerald-300"
                                                                }`}
                                                            >
                                                                {isSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />}
                                                                <span>T{t.table_number}</span>
                                                                {t.capacity ? (
                                                                    <span className={`text-[10px] font-medium ${isSelected ? "text-emerald-100" : "text-[#6B7280]"}`}>
                                                                        ({t.capacity}p)
                                                                    </span>
                                                                ) : null}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-xs text-amber-800 font-medium bg-[#FFFBF0] border border-amber-200 rounded-xl p-3 flex items-center gap-2">
                                                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                                                <span>All tables are currently occupied or none configured.</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                                        {/* Customer details */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[13px] font-medium text-[#4B5563] mb-1.5">Customer name</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                                            <input
                                                value={customerName}
                                                onChange={e => setCustomerName(e.target.value)}
                                                placeholder="Optional"
                                                className="w-full pl-9 pr-3.5 py-2.5 text-[13px] bg-[#FAFAF7] border border-[#E8E8E3] rounded-xl outline-none focus:bg-white focus:border-[#fe5c13] focus:ring-2 focus:ring-[#fe5c13]/15 transition-all text-[#0F1117] placeholder:text-[#9CA3AF] shadow-2xs"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[13px] font-medium text-[#4B5563] mb-1.5">Phone</label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                                            <input
                                                value={customerPhone}
                                                onChange={e => handlePhoneChange(e.target.value)}
                                                placeholder="Optional"
                                                inputMode="tel"
                                                className="w-full pl-9 pr-3.5 py-2.5 text-[13px] bg-[#FAFAF7] border border-[#E8E8E3] rounded-xl outline-none focus:bg-white focus:border-[#fe5c13] focus:ring-2 focus:ring-[#fe5c13]/15 transition-all text-[#0F1117] placeholder:text-[#9CA3AF] shadow-2xs"
                                            />
                                            {searchResults.length > 0 && (
                                                <div className="absolute z-10 w-full mt-1 bg-white border border-[#E8E8E3] rounded-xl shadow-xl max-h-48 overflow-y-auto">
                                                    {searchResults.map(c => (
                                                        <div key={c.id} onClick={() => selectCustomer(c)} className="px-3.5 py-2 text-sm hover:bg-[#FAFAF7] cursor-pointer border-b border-[#E8E8E3] last:border-0">
                                                            <div className="font-semibold text-[#0F1117]">{c.phone}</div>
                                                            {c.name && <div className="text-[11px] text-[#6B7280]">{c.name}</div>}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        {customerPhone.replace(/\D/g, "").length >= 8 && (
                                            <label className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[#6B7280] cursor-pointer">
                                                <input type="checkbox" checked={joinLoyalty} onChange={(e) => setJoinLoyalty(e.target.checked)} className="h-3.5 w-3.5 rounded text-[#fe5c13] focus:ring-[#fe5c13]" />
                                                Add to loyalty card (customer agreed)
                                            </label>
                                        )}
                                        <TakeawayRewardPicker
                                            key={customerPhone.replace(/\D/g, "")}
                                            phone={customerPhone}
                                            value={loyaltyReward}
                                            onChange={setLoyaltyReward}
                                        />
                                    </div>
                                </div>

                                {/* Delivery fields */}
                                {orderType === "delivery" && (
                                    <div className="space-y-3.5 p-4 bg-[#FAFAF7] border border-[#E8E8E3] rounded-2xl shadow-2xs">
                                        <div>
                                            <label className="block text-[13px] font-medium text-[#4B5563] mb-1.5">Delivery address <span className="text-[#fe5c13]">*</span></label>
                                            <div className="relative">
                                                <MapPin className="absolute left-3 top-3 w-4 h-4 text-[#fe5c13]" />
                                                <textarea
                                                    value={deliveryAddress}
                                                    onChange={e => setDeliveryAddress(e.target.value)}
                                                    placeholder="Full delivery address"
                                                    rows={2}
                                                    className="w-full pl-9 pr-3.5 py-2.5 text-[13px] bg-white border border-[#E8E8E3] rounded-xl outline-none focus:border-[#fe5c13] focus:ring-2 focus:ring-[#fe5c13]/15 transition-all text-[#0F1117] placeholder:text-[#9CA3AF] resize-none shadow-2xs"
                                                />
                                            </div>
                                        </div>
                                        {zones.length > 0 && (
                                            <div>
                                                <label className="block text-[13px] font-medium text-[#4B5563] mb-1.5">Delivery zone / fee</label>
                                                <div className="space-y-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedZone(null)}
                                                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13px] border transition-all cursor-pointer ${
                                                            !selectedZone
                                                                ? "bg-[#fe5c13] text-white border-[#fe5c13] shadow-xs font-semibold"
                                                                : "bg-white text-[#0F1117] border-[#E8E8E3] hover:bg-[#F3F3EF] font-medium"
                                                        }`}
                                                    >
                                                        <span>No zone (manual)</span>
                                                        {!selectedZone && <Check className="w-4 h-4" strokeWidth={2.5} />}
                                                    </button>
                                                    {zones.map(z => (
                                                        <button
                                                            key={z.id}
                                                            type="button"
                                                            onClick={() => setSelectedZone(z)}
                                                            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13px] border transition-all cursor-pointer ${
                                                                selectedZone?.id === z.id
                                                                    ? "bg-[#fe5c13] text-white border-[#fe5c13] shadow-xs font-semibold"
                                                                    : "bg-white text-[#0F1117] border-[#E8E8E3] hover:bg-[#F3F3EF] font-medium"
                                                            }`}
                                                        >
                                                            <span className="flex items-center gap-2">
                                                                {z.name}
                                                                {z.distance_km && <span className="text-[10px] opacity-75">{z.distance_km}km</span>}
                                                                {z.estimated_minutes && (
                                                                    <span className="flex items-center gap-0.5 text-[10px] opacity-75">
                                                                        <Clock className="w-3 h-3" /> {z.estimated_minutes}min
                                                                    </span>
                                                                )}
                                                            </span>
                                                            <span className="font-bold">{fmtCur(z.fee)}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Menu search & items */}
                                <div>
                                    <label className="block text-[13px] font-medium text-[#4B5563] mb-1.5">Add items</label>
                                    <div className="relative mb-2">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                                        <input
                                            value={searchMenu}
                                            onChange={e => setSearchMenu(e.target.value)}
                                            placeholder="Search menu..."
                                            className="w-full pl-9 pr-3.5 py-2.5 text-[13px] bg-[#FAFAF7] border border-[#E8E8E3] rounded-xl outline-none focus:bg-white focus:border-[#fe5c13] focus:ring-2 focus:ring-[#fe5c13]/15 transition-all text-[#0F1117] placeholder:text-[#9CA3AF] shadow-2xs"
                                        />
                                    </div>
                                    <div className="max-h-52 overflow-y-auto border border-[#E8E8E3] rounded-2xl bg-white divide-y divide-[#E8E8E3] shadow-2xs">
                                        {filteredMenu.length === 0 ? (
                                            <div className="p-5 text-center text-xs text-[#9CA3AF]">No items found</div>
                                        ) : (
                                            filteredMenu.map(item => {
                                                const inCart = cart.find(c => c.menuItemId === item.id);
                                                return (
                                                    <div
                                                        key={item.id}
                                                        className="flex items-center justify-between px-3.5 py-2.5 hover:bg-[#FAFAF7] transition-colors"
                                                    >
                                                        <div>
                                                            <p className="text-[13px] font-semibold text-[#0F1117]">{item.name}</p>
                                                            <p className="text-[12px] font-medium text-[#6B7280]">{fmtCur(item.price)}</p>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            {inCart ? (
                                                                <div className="flex items-center gap-1 bg-[#F3F3EF] p-1 rounded-xl border border-[#E8E8E3]">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => updateQty(item.id, -1)}
                                                                        className="w-6 h-6 rounded-lg bg-white flex items-center justify-center text-[#0F1117] font-bold hover:bg-[#E8E8E3] transition-colors text-sm shadow-2xs cursor-pointer"
                                                                    >
                                                                        −
                                                                    </button>
                                                                    <span className="w-6 text-center text-xs font-bold text-[#0F1117] tabular-nums">{inCart.quantity}</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => addToCart(item)}
                                                                        className="w-6 h-6 rounded-lg bg-[#fe5c13] flex items-center justify-center text-white font-bold hover:bg-[#e44e0b] transition-colors text-sm shadow-2xs cursor-pointer"
                                                                    >
                                                                        +
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => addToCart(item)}
                                                                    className="h-7 px-2.5 rounded-lg bg-[#FFFBF0] border border-[#fe5c13]/30 text-[#fe5c13] hover:bg-[#fe5c13] hover:text-white font-semibold text-[11px] transition-all flex items-center gap-1 cursor-pointer"
                                                                >
                                                                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                                                    <span>Add</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>

                                {/* Cart summary */}
                                {cart.length > 0 && (
                                    <div className="border border-[#E8E8E3] rounded-2xl overflow-hidden bg-white shadow-2xs">
                                        <div className="px-4 py-2.5 bg-[#FAFAF7] border-b border-[#E8E8E3] flex items-center justify-between">
                                            <span className="text-xs font-bold text-[#0F1117]">Order Cart ({cart.length} {cart.length === 1 ? "item" : "items"})</span>
                                            <button
                                                type="button"
                                                onClick={() => setCart([])}
                                                className="text-[11px] text-rose-500 font-semibold flex items-center gap-1 hover:text-rose-700 transition-colors cursor-pointer"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" /> Clear
                                            </button>
                                        </div>
                                        <div className="divide-y divide-[#E8E8E3] max-h-48 overflow-y-auto">
                                            {cart.map(c => (
                                                <div key={c.menuItemId} className="flex items-center justify-between px-4 py-2 text-[13px]">
                                                    <span className="text-[#0F1117] font-medium">{c.quantity}× {c.menuItemName}</span>
                                                    <span className="font-bold text-[#0F1117] tabular-nums">{fmtCur(c.quantity * c.unitPrice)}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="px-4 py-3 bg-[#FAFAF7] border-t border-[#E8E8E3] space-y-1.5">
                                            <div className="flex justify-between text-xs text-[#6B7280]">
                                                <span>Subtotal</span><span className="font-medium text-[#0F1117] tabular-nums">{fmtCur(cartTotal)}</span>
                                            </div>
                                            {loyaltyReward && rewardTotals.discount > 0 && (
                                                <div className="flex justify-between text-xs text-emerald-700 font-medium">
                                                    <span>Reward: {loyaltyReward.name}</span><span className="tabular-nums">−{fmtCur(rewardTotals.discount)}</span>
                                                </div>
                                            )}
                                            {computedTax > 0 && (
                                                <div className="flex justify-between text-xs text-[#6B7280]">
                                                    <span>Tax ({taxPercent}%)</span><span className="font-medium text-[#0F1117] tabular-nums">+{fmtCur(loyaltyReward ? rewardTotals.tax : computedTax)}</span>
                                                </div>
                                            )}
                                            {deliveryFee > 0 && (
                                                <div className="flex justify-between text-xs text-[#6B7280]">
                                                    <span>Delivery fee ({selectedZone?.name})</span><span className="font-medium text-[#0F1117] tabular-nums">+{fmtCur(deliveryFee)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between text-sm font-bold text-[#0F1117] pt-2 border-t border-[#E8E8E3] mt-1">
                                                <span>Estimated Total</span><span className="tabular-nums text-[#fe5c13]">{fmtCur(finalTotal)}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Payment */}
                                <div>
                                    <label className="block text-[13px] font-medium text-[#4B5563] mb-1.5">Payment mode</label>
                                    <CustomSelect
                                        value={paymentMode}
                                        onChange={(val: string) => setPaymentMode(val as PaymentMode)}
                                        buttonClassName="!bg-[#FAFAF7] !border-[#E8E8E3] !h-[42px] !rounded-xl !text-[13px] !text-[#0F1117] !shadow-2xs"
                                        options={[
                                            { value: "later", label: "Mark Later" },
                                            { value: "cash", label: "Cash" },
                                            { value: "card", label: "Card" },
                                            { value: "upi", label: "UPI" },
                                            { value: "online", label: "Online" },
                                        ]}
                                        theme="orange"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[13px] font-medium text-[#4B5563] mb-1.5">Notes</label>
                                    <textarea
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                        placeholder="Special instructions, allergies, etc."
                                        rows={2}
                                        className="w-full px-3.5 py-2.5 text-[13px] bg-[#FAFAF7] border border-[#E8E8E3] rounded-xl outline-none focus:bg-white focus:border-[#fe5c13] focus:ring-2 focus:ring-[#fe5c13]/15 transition-all text-[#0F1117] placeholder:text-[#9CA3AF] resize-none shadow-2xs"
                                    />
                                </div>
                            </div>

                            {/* Panel Footer */}
                            <div className="px-6 py-4.5 border-t border-[#E8E8E3] bg-[#FAFAF7]">
                                <button
                                    onClick={handleSubmit}
                                    disabled={isCreating || cart.length === 0}
                                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-[#fe5c13] to-[#e44e0b] text-white text-[14px] font-semibold shadow-md shadow-orange-500/25 hover:shadow-lg hover:shadow-orange-500/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[2.5]" />}
                                    {isCreating ? "Creating..." : `Place Order · ${fmtCur(finalTotal)}`}
                                </button>
                            </div>
                    </motion.div>
                </div>
            )}
            </AnimatePresence>
        </div>
    );
}
