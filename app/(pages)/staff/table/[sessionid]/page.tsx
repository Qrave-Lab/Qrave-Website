"use client";

import { useEffect, useMemo, useState, use } from "react";
import { useRouter } from "next/navigation";
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
  Receipt
} from "lucide-react";
import { PrintButton } from "./PrintButton"; 
import { api } from "@/app/lib/api";
import ConfirmModal from "@/app/components/ui/ConfirmModal";

type OrderStatus =
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

type OrdersBySessionResponse = {
  orders: ActiveOrder[];
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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string>("");
  const [taxPercent, setTaxPercent] = useState<number>(5);
  const [servicePercent, setServicePercent] = useState<number>(0);
  const [serviceCalls, setServiceCalls] = useState<any[]>([]);
  const [isTakeaway, setIsTakeaway] = useState(false);

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

  // Menu State
  const [showMenu, setShowMenu] = useState(false);

  const firstRowByOrder = useMemo(() => {
    const map: Record<string, string> = {};
    for (const it of items) {
      if (!map[it.orderId]) map[it.orderId] = it.id;
    }
    return map;
  }, [items]);

  const isServedOrCompleted = (s: OrderStatus) => s === "served" || s === "completed";
  const isBillable = (s: OrderStatus) => s === "accepted" || s === "preparing" || s === "ready" || isServedOrCompleted(s);
  const allOrdersServed = orders.length > 0 && orders.every((o) => isServedOrCompleted(o.status));
  const isPaid = orders.length > 0 && orders.every((o) => o.status === "completed");

  const { subtotal, serviceCharge, tax, total } = useMemo(() => {
    const billable = items.filter((i) => isBillable(i.status));
    const sub = billable.reduce((sum, item) => sum + item.quantity * item.rate, 0);
    const service = Math.round(sub * (servicePercent / 100));
    const taxAmount = Math.round((sub + service) * (taxPercent / 100));
    return { subtotal: sub, serviceCharge: service, tax: taxAmount, total: sub + service + taxAmount };
  }, [items, taxPercent, servicePercent]);

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
      // Fallback: Check if it's a takeaway/reception order, searching all statuses so we don't drop completed orders
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
                 variant_label: i.variant_label || null
              }))
           }]
        } as AdminBillResponse;
      } else {
        throw new Error("Session not found");
      }
    }

    const billRes = initialBillRes;

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

  // Actions
  const refreshOrders = async () => {
    await loadBillData();
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

  const getBreakdown = (orderId: string) => api<any>(`/api/admin/orders/${orderId}/breakdown`);

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
    if (!allOrdersServed) return;
    if (!restaurantId) return;

    setIsProcessing(true);
    try {
      for (const o of orders) {
        if (o.status !== "completed" && o.status !== "served") {
          throw new Error("All orders must be served before closing.");
        }
      }
      
      if (isTakeaway) {
         await api(`/api/admin/takeaway/orders/${sessionid}/status`, {
            method: "PATCH",
            body: JSON.stringify({
               status: "completed",
               payment_status: "paid",
               payment_mode: paymentMethod,
            }),
         });
      } else {
         await api("/api/admin/payments/status", {
            method: "POST",
            body: JSON.stringify({
               session_id: sessionid,
               status: "paid",
               payment_mode: paymentMethod,
               reason: "table_checkout",
            }),
         });
         await Promise.all(billSessionIds.map((id) => api(`/api/admin/sessions/${id}/end`, { method: "POST", suppressErrorLog: true }).catch(() => {})));
      }
      
      await refreshOrders();
      setIsCheckoutOpen(false);
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

  const statusConfig = (status: OrderStatus) => {
    switch (status) {
      case "pending": return { label: "Pending", className: "bg-amber-100 text-amber-800 border-amber-200", icon: <Clock className="w-3.5 h-3.5" /> };
      case "accepted":
      case "preparing":
      case "ready":
        return { label: "Cooking", className: "bg-blue-100 text-blue-800 border-blue-200", icon: <ChefHat className="w-3.5 h-3.5" /> };
      case "served": return { label: "Served", className: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: <CheckCircle2 className="w-3.5 h-3.5" /> };
      case "completed": return { label: "Closed", className: "bg-slate-100 text-slate-700 border-slate-200", icon: <CheckCircle2 className="w-3.5 h-3.5" /> };
      case "cancelled": return { label: "Cancelled", className: "bg-rose-100 text-rose-800 border-rose-200", icon: <XCircle className="w-3.5 h-3.5" /> };
      default: return { label: status, className: "bg-gray-100 text-gray-700 border-gray-200", icon: <Clock className="w-3.5 h-3.5" /> };
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center py-10 px-4 print:bg-white print:p-0" onClick={() => setShowMenu(false)}>
      <div className="w-full max-w-4xl bg-white shadow-xl shadow-gray-200/50 rounded-2xl border border-gray-100 overflow-hidden print:shadow-none print:border-none print:rounded-none relative">
        
        {/* === PAYMENT SUCCESS BANNER (Print Only) === */}
        <div className="hidden print:block text-center border-b border-gray-200 py-2">
            <h1 className="text-xl font-bold uppercase tracking-widest">{bill?.restaurantName || "Restaurant"}</h1>
            <p className="text-xs">Original Tax Invoice</p>
        </div>

        {/* === CONTROL BAR (Screen Only) === */}
        <div className="bg-white border-b border-gray-100 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isPaid ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-600'}`}>
                {isPaid ? <CheckCircle2 className="w-5 h-5" /> : <UtensilsCrossed className="w-5 h-5" />}
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Table {bill?.tableCode || "T-"}</h2>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {isPaid ? "PAID" : "Payment Pending"}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {isPaid ? (
               <PrintButton sessionId={sessionid} />
            ) : (
               <>
                 <button 
                  onClick={() => setIsCheckoutOpen(true)}
                  className="bg-gray-900 hover:bg-gray-800 text-white px-5 py-2 rounded-lg text-sm font-bold shadow-lg shadow-gray-200 transition-all flex items-center gap-2"
                 >
                   <CreditCard className="w-4 h-4" />
                   Checkout
                 </button>
                 
                 {/* Table Actions Menu */}
                 <div className="relative">
                   <button 
                    onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
                   >
                     <MoreVertical className="w-5 h-5" />
                   </button>
                   
                   {showMenu && (
                     <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-20 animate-in fade-in zoom-in-95">
                        <div className="py-1">
                          <button 
                            className="w-full text-left px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                            onClick={openRelocate}
                          >
                            <ArrowRightLeft className="w-4 h-4 text-gray-400" />
                            Relocate Table
                          </button>
                          <button 
                            className="w-full text-left px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                            onClick={openMerge}
                          >
                            <Merge className="w-4 h-4 text-gray-400" />
                            Merge Bill
                          </button>
                        </div>
                     </div>
                   )}
                 </div>
               </>
            )}
          </div>
        </div>

        {/* === SERVICE CALLS (if any) === */}
        {serviceCalls.length > 0 && (
          <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between gap-4 print:hidden">
            <div className="text-xs font-bold text-gray-700">
              Service Requests:{" "}
              <span className="ml-1 rounded-full bg-amber-100 text-amber-800 px-2 py-0.5">
                {serviceCalls.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
              {serviceCalls.slice(0, 4).map((c: any) => (
                <button
                  key={c.id}
                  onClick={() => closeServiceCall(c.id)}
                  className="px-3 py-1.5 rounded-full border border-amber-200 bg-amber-50 text-amber-800 text-[11px] font-semibold hover:bg-amber-100 transition-colors"
                  title="Mark done"
                >
                  {String(c.type).toUpperCase()} • T{c.table_number}
                </button>
              ))}
              {serviceCalls.length > 4 && (
                <span className="text-[11px] text-gray-400 self-center">
                  +{serviceCalls.length - 4} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* === MAIN CONTENT (Two Pane Layout) === */}
        <div className="flex flex-col lg:flex-row items-start font-sans pb-10 print:pb-0">
          
          {/* THERMAL RECEIPT UI */}
          <div className="w-full lg:w-[380px] bg-white sm:border-r border-gray-200 relative pb-6 font-mono text-gray-800 print:w-full print:border-none print:max-w-none shrink-0">
             <div className="p-8 flex flex-col">
                <div className="text-center mb-6">
                   <h1 className="text-2xl font-black tracking-tighter uppercase text-black">{bill?.restaurantName || "Restaurant"}</h1>
                   {bill?.restaurantAddress && <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1.5 leading-relaxed">{bill.restaurantAddress}</p>}
                </div>
                
                <div className="border-t-[1.5px] border-dashed border-gray-300 py-3 mb-3 text-[11px] font-bold flex justify-between uppercase tracking-wider text-black">
                   <div className="space-y-1">
                     <p>Bill: {bill?.billNumber || "BILL-"}</p>
                     <p>Table: {bill?.tableCode || "T-"}</p>
                   </div>
                   <div className="text-right space-y-1">
                     <p>{(bill?.createdAt || new Date()).toLocaleDateString("en-IN")}</p>
                     <p>{(bill?.createdAt || new Date()).toLocaleTimeString("en-IN", {hour: '2-digit', minute:'2-digit'})}</p>
                   </div>
                </div>

                <div className="border-t-[1.5px] border-dashed border-gray-300 border-b-[1.5px] py-2 mb-4 flex text-[12px] font-black uppercase tracking-widest text-black">
                   <div className="w-7/12">Item</div>
                   <div className="w-2/12 text-center">Qty</div>
                   <div className="w-3/12 text-right">Amt</div>
                </div>

                <div className="space-y-4 mb-6">
                   {items.map((item) => (
                      <div key={item.id} className={`flex text-xs ${item.status === 'cancelled' ? 'line-through text-gray-400' : 'text-black font-bold'}`}>
                         <div className="w-7/12 pr-2 whitespace-pre-wrap leading-tight">
                             {item.name}
                         </div>
                         <div className="w-2/12 text-center">{item.quantity}</div>
                         <div className="w-3/12 text-right">₹{(item.quantity * item.rate).toFixed(2)}</div>
                      </div>
                   ))}
                </div>

                <div className="border-t-[1.5px] border-dashed border-gray-300 pt-4 space-y-2 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                    <div className="flex justify-between">
                       <span>Subtotal</span>
                       <span className="text-black">₹{subtotal.toFixed(2)}</span>
                    </div>
                    {serviceCharge > 0 && (
                      <div className="flex justify-between">
                         <span>Service ({servicePercent}%)</span>
                         <span className="text-black">₹{serviceCharge.toFixed(2)}</span>
                      </div>
                    )}
                    {tax > 0 && (
                      <div className="flex justify-between">
                         <span>Taxes ({taxPercent}%)</span>
                         <span className="text-black">₹{tax.toFixed(2)}</span>
                      </div>
                    )}
                </div>

                <div className="border-t-[1.5px] border-black mt-4 pt-4 flex justify-between items-center text-xl font-black uppercase tracking-widest text-black">
                    <span>Total Due</span>
                    <span>₹{total.toFixed(2)}</span>
                </div>
                
                {isPaid && (
                   <div className="mt-8 text-center border-[3px] rounded-md border-black text-black py-2.5 text-xl font-black uppercase tracking-widest print:block shadow-sm">
                      ** PAID **
                   </div>
                )}
                
                <div className="mt-10 text-center text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                   *** Thank you, visit again! ***
                </div>
             </div>
          </div>

          {/* INTERACTIVE STAFF ACTIONS (Screen Only) */}
          <div className="flex-1 w-full p-6 print:hidden bg-gray-50/50 min-h-full space-y-6">
             <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Order Management</h3>
                <span className="text-xs font-semibold text-gray-500">{items.length} total items</span>
             </div>
             
             <div className="grid gap-3">
               {items.map((item, index) => {
                  const amount = item.quantity * item.rate;
                  const config = statusConfig(item.status);
                  const isCancelled = item.status === 'cancelled';
                  const isFirstRow = firstRowByOrder[item.orderId] === item.id;
                  const orderForItem = orders.find((o) => o.id === item.orderId);

                  return (
                    <div key={item.id} className={`bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-opacity ${isCancelled ? 'opacity-50' : ''}`}>
                       
                       <div className="flex items-start gap-4">
                          <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 font-black flex items-center justify-center shrink-0 text-sm">
                             {index + 1}
                          </div>
                          <div>
                             <h4 className={`font-bold text-gray-900 ${isCancelled ? 'line-through text-gray-500' : ''}`}>{item.name}</h4>
                             <div className="text-xs text-gray-500 font-medium mt-1 flex items-center gap-3">
                                <span className="bg-gray-100 px-2 py-0.5 rounded-md">Qty: {item.quantity}</span>
                                <span>₹{(item.rate).toFixed(2)}</span>
                                {isFirstRow && orderForItem?.daily_order_number != null && (
                                   <span className="text-orange-600 font-bold ml-1">KOT #{orderForItem.daily_order_number}</span>
                                )}
                             </div>
                          </div>
                       </div>
                       
                       <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto border-t sm:border-t-0 border-gray-100 pt-3 sm:pt-0">
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${config.className}`}>
                             {config.icon}{config.label}
                          </span>
                          
                          {!isPaid && isFirstRow && (
                             <div className="flex gap-2">
                                {(item.status === "pending" || item.status === "accepted" || item.status === "preparing" || item.status === "ready") && (
                                   <>
                                      {item.status === "pending" && (
                                         <button
                                           onClick={() => updateOrderStatus(item.orderId, "accepted")}
                                           className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold transition-all"
                                         >
                                           Accept
                                         </button>
                                      )}
                                      <button
                                        onClick={() => cancelOrder(item.orderId)}
                                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all"
                                        title="Cancel order"
                                      >
                                        <XCircle className="w-4 h-4" />
                                      </button>
                                   </>
                                )}
                                {(item.status === "accepted" || item.status === "preparing" || item.status === "ready") && (
                                   <button
                                     onClick={() => updateOrderStatus(item.orderId, "served")}
                                     className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 shadow-md transition-all"
                                   >
                                     Serve
                                   </button>
                                )}
                             </div>
                          )}
                          {!isPaid && !isFirstRow && (item.status === "pending" || item.status === "accepted" || item.status === "preparing" || item.status === "ready") && (
                             <button
                               onClick={() => cancelOrderItem(item)}
                               className="px-2 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all text-xs font-bold"
                               title="Cancel this item"
                             >
                               Remove
                             </button>
                          )}
                       </div>
                       
                    </div>
                  );
               })}
             </div>
          </div>
        </div>

        {/* === CHECKOUT MODAL (Overlay) === */}
        {isCheckoutOpen && (
           <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 transition-all">
              <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 overflow-hidden ring-1 ring-black/5 animate-in fade-in slide-in-from-bottom-10">
                 
                 <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-gray-900">Select Payment Method</h3>
                        <p className="text-xs text-gray-500">Total Due: ₹{total.toFixed(2)}</p>
                    </div>
                    <button onClick={() => setIsCheckoutOpen(false)} className="p-1 rounded-full hover:bg-gray-200 text-gray-500"><X className="w-5 h-5"/></button>
                 </div>

                 <div className="p-6 space-y-3">
                    <button 
                        onClick={() => setPaymentMethod('cash')}
                        className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${paymentMethod === 'cash' ? 'border-gray-900 bg-gray-50 ring-1 ring-gray-900' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center"><Banknote className="w-5 h-5"/></div>
                            <span className="font-bold text-gray-700">Cash</span>
                        </div>
                        {paymentMethod === 'cash' && <div className="w-4 h-4 rounded-full bg-gray-900"/>}
                    </button>

                    <button 
                        onClick={() => setPaymentMethod('card')}
                        className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${paymentMethod === 'card' ? 'border-gray-900 bg-gray-50 ring-1 ring-gray-900' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><CreditCard className="w-5 h-5"/></div>
                            <span className="font-bold text-gray-700">Credit/Debit Card</span>
                        </div>
                         {paymentMethod === 'card' && <div className="w-4 h-4 rounded-full bg-gray-900"/>}
                    </button>

                    <button 
                        onClick={() => setPaymentMethod('upi')}
                        className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${paymentMethod === 'upi' ? 'border-gray-900 bg-gray-50 ring-1 ring-gray-900' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center"><Smartphone className="w-5 h-5"/></div>
                            <span className="font-bold text-gray-700">UPI / QR Scan</span>
                        </div>
                         {paymentMethod === 'upi' && <div className="w-4 h-4 rounded-full bg-gray-900"/>}
                    </button>
                 </div>

                 <div className="p-6 pt-0">
                    <button 
                        disabled={!paymentMethod || isProcessing || !allOrdersServed}
                        onClick={handleCheckout}
                        className="w-full bg-gray-900 hover:bg-black text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" /> Processing...
                            </>
                        ) : (
                            <>
                                Mark as Paid & Close
                            </>
                        )}
                    </button>
                    {!allOrdersServed && (
                      <p className="mt-3 text-xs text-rose-600 font-semibold">
                        All orders must be marked Served before you can close the bill.
                      </p>
                    )}
                 </div>

              </div>
           </div>
        )}

        {/* === RELOCATE TABLE MODAL === */}
        {showRelocate && (
          <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 transition-all print:hidden">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 overflow-hidden ring-1 ring-black/5 animate-in fade-in slide-in-from-bottom-10">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-gray-900">Relocate Table</h3>
                  <p className="text-xs text-gray-500">Move this session to a different table.</p>
                </div>
                <button onClick={() => setShowRelocate(false)} className="p-1 rounded-full hover:bg-gray-200 text-gray-500">
                  <X className="w-5 h-5"/>
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Target Table</label>
                  <select
                    value={targetTableId}
                    onChange={(e) => setTargetTableId(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-gray-50 border border-gray-200 text-sm font-semibold outline-none focus:ring-4 focus:ring-gray-200/60"
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
                  className="w-full bg-gray-900 hover:bg-black text-white py-3.5 rounded-xl font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Transfer
                </button>
              </div>
            </div>
          </div>
        )}

        {confirmRelocate && (
          <div className="absolute inset-0 z-[55] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 print:hidden">
            <div className="bg-white w-full max-w-sm rounded-2xl border border-gray-200 shadow-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-900">Confirm Relocation</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Move this session to{" "}
                  <span className="font-bold">
                    T{tables.find((t) => t.id === targetTableId)?.table_number}
                  </span>
                  ?
                </p>
              </div>
              <div className="px-5 py-4 flex justify-end gap-2">
                <button
                  onClick={() => setConfirmRelocate(false)}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setConfirmRelocate(false);
                    await submitRelocate();
                  }}
                  className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-black"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* === MERGE BILL MODAL === */}
        {showMerge && (
          <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 transition-all print:hidden">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 overflow-hidden ring-1 ring-black/5 animate-in fade-in slide-in-from-bottom-10">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-gray-900">Merge Bills</h3>
                  <p className="text-xs text-gray-500">Combine two tables into one bill (tables remain active).</p>
                </div>
                <button onClick={() => setShowMerge(false)} className="p-1 rounded-full hover:bg-gray-200 text-gray-500">
                  <X className="w-5 h-5"/>
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Merge With</label>
                  <select
                    value={targetSessionId}
                    onChange={(e) => setTargetSessionId(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-gray-50 border border-gray-200 text-sm font-semibold outline-none focus:ring-4 focus:ring-gray-200/60"
                  >
                    <option value="">Select a table…</option>
                    {activeSessions.map((s) => (
                      <option key={s.session_id} value={s.session_id}>
                        T{s.table_number}
                      </option>
                    ))}
                  </select>
                  {activeSessions.length === 0 && (
                    <p className="text-xs text-gray-400 mt-2">No other active tables found.</p>
                  )}
                </div>

                <button
                  disabled={!targetSessionId || isMerging}
                  onClick={submitMerge}
                  className="w-full bg-gray-900 hover:bg-black text-white py-3.5 rounded-xl font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isMerging ? "Merging..." : "Merge"}
                </button>
              </div>
            </div>
          </div>
        )}
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
    </div>
  );
}
