"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
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
} from "lucide-react";
import StaffSidebar from "@/app/components/StaffSidebar";
import { api } from "@/app/lib/api";
import { normalizePaymentMode, paymentStatusLabel } from "@/app/lib/payment-status";
import toast from "react-hot-toast";

/* ─── Types ────────────────────────────────────────────────────────────── */
type MenuItem = {
    id: string;
    name: string;
    price: number;
    categoryId: string;
    isArchived: boolean;
    isOutOfStock: boolean;
};

type CartItem = {
    menuItemId: string;
    menuItemName: string;
    variantLabel?: string;
    quantity: number;
    unitPrice: number;
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
    pending: { label: "Pending", color: "bg-amber-100 text-amber-800 border-amber-200", dot: "bg-amber-500" },
    preparing: { label: "Preparing", color: "bg-blue-100 text-blue-800 border-blue-200", dot: "bg-blue-500" },
    ready: { label: "Ready", color: "bg-emerald-100 text-emerald-800 border-emerald-200", dot: "bg-emerald-500" },
    completed: { label: "Completed", color: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" },
    cancelled: { label: "Cancelled", color: "bg-rose-100 text-rose-700 border-rose-200", dot: "bg-rose-400" },
};

const NEXT_STATUS: Record<string, string> = {
    pending: "preparing",
    preparing: "ready",
    ready: "completed",
};

const fmtCur = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

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
export default function TakeawayPage() {
    const router = useRouter();
    const [role, setRole] = useState("");
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [zones, setZones] = useState<DeliveryZone[]>([]);
    const [orders, setOrders] = useState<TakeawayOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [showNewOrder, setShowNewOrder] = useState(false);
    const [statusFilter, setStatusFilter] = useState("active");
    const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
    const [searchMenu, setSearchMenu] = useState("");
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
    const [taxPercent, setTaxPercent] = useState<number>(0);

    // New order form
    const [orderType, setOrderType] = useState<"takeout" | "delivery" | "dine_in_reception">("takeout");
    const [tableNumber, setTableNumber] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
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
        try {
            const apiStatus = sf === "all" ? "" : sf;
            const url = apiStatus ? `/api/admin/takeaway/orders?status=${apiStatus}` : "/api/admin/takeaway/orders";
            const res = await api<{ orders: TakeawayOrder[] }>(url);
            const fetched = res?.orders || [];
            setOrders(fetched.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        } catch {
            // silent
        }
    }, [statusFilter]);

    useEffect(() => {
        let mounted = true;
        const init = async () => {
            try {
                const [me, menuRes, zonesRes, ordersRes] = await Promise.all([
                    api<{ role?: string; tax_percent?: number }>("/api/admin/me"),
                    api<{ items?: MenuItem[] }>("/api/admin/menu"),
                    api<{ zones?: DeliveryZone[] }>("/api/admin/delivery/zones"),
                    api<{ orders: TakeawayOrder[] }>("/api/admin/takeaway/orders?status=active"),
                ]);
                if (!mounted) return;
                const r = (me?.role || "").toLowerCase();
                if (!["owner", "manager", "cashier"].includes(r)) {
                    router.replace("/staff");
                    return;
                }
                setRole(r);
                setTaxPercent(me?.tax_percent || 0);
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
        return () => { mounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
            return [...prev, { menuItemId: item.id, menuItemName: item.name, quantity: 1, unitPrice: item.price }];
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
    const computedTax = cartTotal * (taxPercent / 100);
    const finalTotal = cartTotal + computedTax + deliveryFee;

    const resetForm = () => {
        setOrderType("takeout");
        setTableNumber("");
        setCustomerName("");
        setCustomerPhone("");
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

            await api("/api/admin/takeaway/orders", {
                method: "POST",
                body: JSON.stringify(payload),
            });
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
                            customer_name: customerName || null,
                            customer_phone: customerPhone || null,
                            delivery_address: null,
                            delivery_zone: null,
                            delivery_fee: 0,
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
        } catch {
            toast.error("Failed to update order");
        } finally {
            setUpdatingOrderId(null);
        }
    };

    if (isLoading) {
        return <TakeawaySkeleton />;
    }

    return (
        <div className="flex h-screen w-full bg-[#F8FAFC] text-slate-900 overflow-hidden font-sans">
            <StaffSidebar />

            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <header className="bg-white border-b border-slate-200 pt-5 px-8 z-20 sticky top-0 flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                                <div className="p-1.5 bg-orange-50 rounded-lg text-[#fe5c13]">
                                    <Bike className="w-5 h-5" />
                                </div>
                                Takeaway & Delivery
                            </h1>
                            <p className="text-xs text-slate-500 mt-1">Take walk-in and delivery orders</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => loadOrders()}
                                className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors shadow-sm"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setShowNewOrder(true)}
                                className="flex items-center gap-2 bg-[#fe5c13] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-orange-600 active:scale-95 transition-all shadow-sm"
                            >
                                <Plus className="w-4 h-4" /> New Order
                            </button>
                        </div>
                    </div>

                    {/* Integrated Status filter tabs */}
                    <div className="flex gap-6">
                        {[
                            { key: "active", label: "Active" },
                            { key: "completed", label: "Completed" },
                            { key: "cancelled", label: "Cancelled" },
                            { key: "", label: "All Orders" },
                        ].map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setStatusFilter(tab.key)}
                                className={`pb-3 text-sm font-bold border-b-2 transition-all ${
                                    statusFilter === tab.key
                                        ? "border-[#fe5c13] text-[#fe5c13]"
                                        : "border-transparent text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-8">

                    {/* Orders grid */}
                    {orders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                            <Package className="w-12 h-12 mb-3 opacity-40" />
                            <p className="text-lg font-bold">No orders yet</p>
                            <p className="text-sm mt-1">New orders will appear here.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {orders.map(order => {
                                const sm = STATUS_META[order.status] || STATUS_META.pending;
                                const nextSt = NEXT_STATUS[order.status];
                                const isExpanded = expandedOrder === order.id;
                                return (
                                    <div
                                        key={order.id}
                                        className="bg-white border border-slate-200/70 rounded-2xl p-5 hover:shadow-lg transition-all shadow-sm flex flex-col h-full"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-start justify-between mb-4">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${sm.color}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />
                                                            {sm.label}
                                                        </span>
                                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${order.order_type === "delivery"
                                                            ? "bg-orange-50 text-[#fe5c13] border-orange-100"
                                                            : isReceptionDineInOrder(order)
                                                                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                                                : "bg-slate-50 text-slate-600 border-slate-200"
                                                            }`}>
                                                            {order.order_type === "delivery"
                                                                ? "🛵 Delivery"
                                                                : isReceptionDineInOrder(order)
                                                                    ? `🍽 Reception Dine-In${extractReceptionTable(order) ? ` · T${extractReceptionTable(order)}` : ""}`
                                                                    : "📦 Takeout"}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] font-medium text-slate-400 mt-2">
                                                        {new Date(order.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                                                        {" · "}
                                                        {new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xl font-black text-slate-900 tracking-tight">{fmtCur(order.total)}</p>
                                                    <p className="text-[10px] font-bold uppercase tracking-wider mt-0.5 text-slate-400">{paymentStatusLabel(order.payment_status, order.payment_mode)}</p>
                                                </div>
                                            </div>

                                            {/* Customer info */}
                                            {(order.customer_name || order.customer_phone) && (
                                                <div className="flex items-center gap-3 mb-3 text-xs font-medium text-slate-600 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                                                    {order.customer_name && (
                                                        <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-slate-400" /> {order.customer_name}</span>
                                                    )}
                                                    {order.customer_phone && (
                                                        <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" /> {order.customer_phone}</span>
                                                    )}
                                                </div>
                                            )}
                                            {order.delivery_zone && (
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-[#fe5c13] mb-3 bg-orange-50/50 p-2.5 rounded-lg border border-orange-100">
                                                    <MapPin className="w-3.5 h-3.5" /> {order.delivery_zone} {order.delivery_fee > 0 && `· +${fmtCur(order.delivery_fee)}`}
                                                </div>
                                            )}

                                            {/* Items toggle */}
                                            <button
                                                onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                                                className="w-full flex items-center justify-between text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors mt-2 p-1.5 -ml-1.5 rounded-md hover:bg-slate-50"
                                            >
                                                <span>{order.items.length} item{order.items.length !== 1 ? "s" : ""}</span>
                                                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
                                            </button>

                                            <AnimatePresence initial={false}>
                                                {isExpanded && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: "auto", opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.2, ease: "easeInOut" }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="mt-2 space-y-1 border-t border-slate-100 pt-3">
                                                            {order.items.map(it => (
                                                                <div key={it.id} className="flex justify-between text-xs text-slate-700">
                                                                    <span><span className="font-bold">{it.quantity}×</span> {it.menu_item_name}{it.variant_label ? ` (${it.variant_label})` : ""}</span>
                                                                    <span className="font-semibold text-slate-900">{fmtCur(it.total_price)}</span>
                                                                </div>
                                                            ))}
                                                            {(order.tax_amount > 0 || order.delivery_fee > 0) && (
                                                                <div className="border-t border-dashed border-slate-100 pt-2 mt-2 space-y-1">
                                                                    {order.tax_amount > 0 && (
                                                                        <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                                                                            <span>Tax</span><span>{fmtCur(order.tax_amount)}</span>
                                                                        </div>
                                                                    )}
                                                                    {order.delivery_fee > 0 && (
                                                                        <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                                                                            <span>Delivery fee</span><span>{fmtCur(order.delivery_fee)}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            {order.notes && (
                                                <div className="mt-3 flex items-start gap-1.5 text-xs text-slate-500 italic bg-amber-50/50 p-2.5 rounded-lg border border-amber-100/50">
                                                    <StickyNote className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" /> {order.notes}
                                                </div>
                                            )}
                                        </div>

                                        {/* Action buttons */}
                                        <div className="mt-5 pt-4 border-t border-slate-100 flex gap-2.5 mt-auto">
                                            {nextSt && (
                                                <button
                                                    onClick={() => updateStatus(order.id, nextSt)}
                                                    disabled={updatingOrderId === order.id}
                                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50"
                                                >
                                                    {updatingOrderId === order.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                    )}
                                                    Mark {STATUS_META[nextSt]?.label}
                                                </button>
                                            )}
                                            {order.status !== "cancelled" && order.status !== "completed" && (
                                                <button
                                                    onClick={() => updateStatus(order.id, "cancelled")}
                                                    disabled={updatingOrderId === order.id}
                                                    className="px-4 rounded-xl border border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition-colors shadow-sm disabled:opacity-50"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
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
                            className="relative w-full max-w-lg bg-white shadow-2xl flex flex-col h-full overflow-hidden"
                        >
                            {/* Panel Header */}
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-base font-black text-slate-900">New Order</h2>
                            <button onClick={resetForm} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 space-y-5">
                            {/* Order type */}
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Order Type</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(["takeout", "delivery", "dine_in_reception"] as const).map(t => (
                                        <button
                                            key={t}
                                            onClick={() => { setOrderType(t); setSelectedZone(null); }}
                                            className={`py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border transition-all ${orderType === t
                                                ? "bg-[#fe5c13] text-gray-900 border-[#fe5c13] shadow-sm shadow-[#fe5c13]/30"
                                                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                                                }`}
                                        >
                                            {t === "takeout" ? <Package className="w-4 h-4" /> : t === "delivery" ? <Bike className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                                            {t === "takeout" ? "Takeout" : t === "delivery" ? "Delivery" : "Reception"}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {orderType === "dine_in_reception" && (
                                <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1.5">Table Number *</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={tableNumber}
                                        onChange={(e) => setTableNumber(e.target.value)}
                                        placeholder="e.g. 12"
                                        className="w-full px-3 py-2.5 text-sm bg-white border border-emerald-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 transition-all"
                                    />
                                    <p className="text-[11px] text-emerald-700 font-semibold">Reception-assisted dine-in order. Food will be billed as table service.</p>
                                </div>
                            )}

                            {/* Customer details */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Customer Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                        <input
                                            value={customerName}
                                            onChange={e => setCustomerName(e.target.value)}
                                            placeholder="Optional"
                                            className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-yellow-50 focus:border-[#fe5c13] transition-all"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Phone</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                        <input
                                            value={customerPhone}
                                            onChange={e => setCustomerPhone(e.target.value)}
                                            placeholder="Optional"
                                            inputMode="tel"
                                            className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-yellow-50 focus:border-[#fe5c13] transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Delivery fields */}
                            {orderType === "delivery" && (
                                <div className="space-y-3 p-4 bg-slate-50/50 border border-slate-200 rounded-xl">
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-[#fe5c13] mb-1.5">Delivery Address *</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-3 w-3.5 h-3.5 text-[#fe5c13]" />
                                            <textarea
                                                value={deliveryAddress}
                                                onChange={e => setDeliveryAddress(e.target.value)}
                                                placeholder="Full delivery address"
                                                rows={2}
                                                className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-[#fe5c13] rounded-xl outline-none focus:ring-2 focus:ring-yellow-100 focus:border-[#fe5c13] transition-all resize-none"
                                            />
                                        </div>
                                    </div>
                                    {zones.length > 0 && (
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#fe5c13] mb-1.5">Delivery Zone / Fee</label>
                                            <div className="space-y-1">
                                                <button
                                                    onClick={() => setSelectedZone(null)}
                                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm border transition-all ${!selectedZone ? "bg-[#fe5c13] text-gray-900 border-[#fe5c13]" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                                        }`}
                                                >
                                                    <span>No zone (manual)</span>
                                                    {!selectedZone && <Check className="w-3.5 h-3.5" />}
                                                </button>
                                                {zones.map(z => (
                                                    <button
                                                        key={z.id}
                                                        onClick={() => setSelectedZone(z)}
                                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm border transition-all ${selectedZone?.id === z.id ? "bg-[#fe5c13] text-gray-900 border-[#fe5c13]" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                                            }`}
                                                    >
                                                        <span className="flex items-center gap-2">
                                                            {z.name}
                                                            {z.distance_km && <span className="text-[10px] opacity-70">{z.distance_km}km</span>}
                                                            {z.estimated_minutes && (
                                                                <span className="flex items-center gap-0.5 text-[10px] opacity-70">
                                                                    <Clock className="w-2.5 h-2.5" /> {z.estimated_minutes}min
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
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Add Items</label>
                                <div className="relative mb-2">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                    <input
                                        value={searchMenu}
                                        onChange={e => setSearchMenu(e.target.value)}
                                        placeholder="Search menu..."
                                        className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-yellow-50 focus:border-[#fe5c13] transition-all"
                                    />
                                </div>
                                <div className="max-h-48 overflow-y-auto border border-slate-100 rounded-xl">
                                    {filteredMenu.length === 0 ? (
                                        <div className="p-4 text-center text-xs text-slate-400">No items found</div>
                                    ) : (
                                        filteredMenu.map(item => {
                                            const inCart = cart.find(c => c.menuItemId === item.id);
                                            return (
                                                <div
                                                    key={item.id}
                                                    className="flex items-center justify-between px-3 py-2 hover:bg-slate-50 border-b border-slate-50 last:border-b-0 transition-colors"
                                                >
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                                                        <p className="text-xs text-slate-400">{fmtCur(item.price)}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        {inCart ? (
                                                            <>
                                                                <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 font-bold hover:bg-slate-200 transition-colors text-sm">−</button>
                                                                <span className="w-6 text-center text-sm font-black text-slate-900">{inCart.quantity}</span>
                                                                <button onClick={() => addToCart(item)} className="w-6 h-6 rounded-lg bg-[#fe5c13] flex items-center justify-center text-gray-900 font-bold hover:brightness-95 transition-colors text-sm">+</button>
                                                            </>
                                                        ) : (
                                                            <button onClick={() => addToCart(item)} className="w-6 h-6 rounded-full bg-[#fe5c13] flex items-center justify-center text-gray-900 hover:brightness-95 transition-colors">
                                                                <Plus className="w-3.5 h-3.5" />
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
                                <div className="border border-slate-200 rounded-xl overflow-hidden">
                                    <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                        <span className="text-xs font-black text-slate-700">Cart ({cart.length} items)</span>
                                        <button onClick={() => setCart([])} className="text-[10px] text-rose-500 font-bold flex items-center gap-1 hover:text-rose-700 transition-colors">
                                            <Trash2 className="w-3 h-3" /> Clear
                                        </button>
                                    </div>
                                    {cart.map(c => (
                                        <div key={c.menuItemId} className="flex items-center justify-between px-3 py-2 border-b border-slate-100 last:border-b-0">
                                            <span className="text-sm text-slate-700">{c.quantity}× {c.menuItemName}</span>
                                            <span className="text-sm font-bold text-slate-900">{fmtCur(c.quantity * c.unitPrice)}</span>
                                        </div>
                                    ))}
                                    <div className="px-3 py-2 bg-slate-50 border-t border-slate-100">
                                        <div className="flex justify-between text-xs text-slate-500">
                                            <span>Subtotal</span><span>{fmtCur(cartTotal)}</span>
                                        </div>
                                        {computedTax > 0 && (
                                            <div className="flex justify-between text-xs text-slate-500">
                                                <span>Tax ({taxPercent}%)</span><span>+{fmtCur(computedTax)}</span>
                                            </div>
                                        )}
                                        {deliveryFee > 0 && (
                                            <div className="flex justify-between text-xs text-slate-500">
                                                <span>Delivery fee ({selectedZone?.name})</span><span>+{fmtCur(deliveryFee)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-sm font-black text-slate-900 mt-1">
                                            <span>Est. Total</span><span>{fmtCur(finalTotal)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Payment & notes */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Payment Mode</label>
                                    <select
                                        value={paymentMode}
                                        onChange={e => setPaymentMode(e.target.value as PaymentMode)}
                                        className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-yellow-50 focus:border-[#fe5c13] transition-all"
                                    >
                                        <option value="later">Mark Later</option>
                                        <option value="cash">Cash</option>
                                        <option value="card">Card</option>
                                        <option value="upi">UPI</option>
                                        <option value="online">Online</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Notes</label>
                                <textarea
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="Special instructions, allergies, etc."
                                    rows={2}
                                    className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-yellow-50 focus:border-[#fe5c13] transition-all resize-none"
                                />
                            </div>
                        </div>

                        {/* Panel Footer */}
                        <div className="px-6 py-4 border-t border-slate-100 bg-white">
                            <button
                                onClick={handleSubmit}
                                disabled={isCreating || cart.length === 0}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#fe5c13] text-gray-900 text-sm font-black hover:brightness-95 transition-all shadow-sm shadow-[#fe5c13]/30 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
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
