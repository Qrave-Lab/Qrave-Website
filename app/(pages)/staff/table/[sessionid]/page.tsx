"use client";

import { useMemo, useState } from "react";
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

type ItemStatus = "pending" | "accepted" | "served" | "rejected";
type PaymentMethod = "cash" | "card" | "upi" | null;

type BillItem = {
  id: string;
  name: string;
  quantity: number;
  rate: number;
  status: ItemStatus;
};

type BillData = {
  restaurantName: string;
  restaurantAddress?: string;
  tableCode: string;
  billNumber: string;
  createdAt: Date;
  items: BillItem[];
};

function getMockBill(): BillData {
  const items: BillItem[] = [
    { id: "1", name: "Smash Burger Double Patty", quantity: 2, rate: 349, status: "pending" },
    { id: "2", name: "Truffle Parmesan Fries", quantity: 1, rate: 249, status: "accepted" },
    { id: "3", name: "Classic Tiramisu", quantity: 1, rate: 299, status: "served" },
  ];

  return {
    restaurantName: "NOIR.",
    restaurantAddress: "MG Road, Kochi, Kerala",
    tableCode: "T3",
    billNumber: "BILL-000123",
    createdAt: new Date(),
    items,
  };
}

export default function TableBillPage({ params }: { params: { sessionId: string } }) {
  const router = useRouter();
  const initialBill = getMockBill();
  
  // State
  const [items, setItems] = useState<BillItem[]>(initialBill.items);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Menu State
  const [showMenu, setShowMenu] = useState(false);

  // Calculations
  const { subtotal, tax, total } = useMemo(() => {
    const billable = items.filter((i) => i.status === "accepted" || i.status === "served");
    const sub = billable.reduce((sum, item) => sum + item.quantity * item.rate, 0);
    const taxAmount = Math.round(sub * 0.05);
    return { subtotal: sub, tax: taxAmount, total: sub + taxAmount };
  }, [items]);

  // Actions
  const updateStatus = (id: string, status: ItemStatus) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
  };

  const handleCheckout = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsPaid(true);
      setIsCheckoutOpen(false);
    }, 1500);
  };

  const statusConfig = (status: ItemStatus) => {
    switch (status) {
      case "pending": return { label: "Pending", className: "bg-amber-100 text-amber-800 border-amber-200", icon: <Clock className="w-3.5 h-3.5" /> };
      case "accepted": return { label: "Cooking", className: "bg-blue-100 text-blue-800 border-blue-200", icon: <ChefHat className="w-3.5 h-3.5" /> };
      case "served": return { label: "Served", className: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: <CheckCircle2 className="w-3.5 h-3.5" /> };
      case "rejected": return { label: "Rejected", className: "bg-rose-100 text-rose-800 border-rose-200", icon: <XCircle className="w-3.5 h-3.5" /> };
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center py-10 px-4 print:bg-white print:p-0" onClick={() => setShowMenu(false)}>
      <div className="w-full max-w-4xl bg-white shadow-xl shadow-gray-200/50 rounded-2xl border border-gray-100 overflow-hidden print:shadow-none print:border-none print:rounded-none relative">
        
        {/* === PAYMENT SUCCESS BANNER (Print Only) === */}
        <div className="hidden print:block text-center border-b border-gray-200 py-2">
            <h1 className="text-xl font-bold uppercase tracking-widest">{initialBill.restaurantName}</h1>
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
                <h2 className="text-sm font-bold text-gray-900">Table {initialBill.tableCode}</h2>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {isPaid ? "PAID" : "Payment Pending"}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {isPaid ? (
               <PrintButton />
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
                            onClick={() => alert("Feature available on Floor Dashboard")}
                          >
                            <ArrowRightLeft className="w-4 h-4 text-gray-400" />
                            Relocate Table
                          </button>
                          <button 
                            className="w-full text-left px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                            onClick={() => alert("Feature available on Floor Dashboard")}
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

        {/* === BILL CONTENT === */}
        <div className="p-8">
          {/* Header Section */}
          <header className="flex flex-col sm:flex-row items-start justify-between gap-6 mb-8">
            <div className="print:hidden"> 
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">{initialBill.restaurantName}</h1>
              <p className="text-sm text-gray-500 mt-1 font-medium">{initialBill.restaurantAddress}</p>
            </div>
            
            <div className="w-full sm:w-auto flex justify-between sm:block text-right space-y-1">
              <div className="inline-flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 print:border-none print:px-0">
                <Receipt className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-mono font-semibold text-gray-700">{initialBill.billNumber}</span>
              </div>
              <p className="text-xs text-gray-500 font-medium">
                {initialBill.createdAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
              </p>
              {isPaid && (
                  <div className="print:block hidden mt-2 border-2 border-gray-900 px-2 py-1 inline-block">
                      <span className="font-black text-xl">PAID</span>
                  </div>
              )}
            </div>
          </header>

          <hr className="border-dashed border-gray-200 mb-6" />

          {/* Table */}
          <section className="mb-8">
            <div className="overflow-hidden rounded-lg border border-gray-200 print:border-none">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px]">
                    <th className="text-left py-3 px-4 font-semibold w-12">#</th>
                    <th className="text-left py-3 px-4 font-semibold">Item Details</th>
                    <th className="text-center py-3 px-4 font-semibold w-20">Qty</th>
                    <th className="text-right py-3 px-4 font-semibold w-24">Rate</th>
                    <th className="text-right py-3 px-4 font-semibold w-28">Amount</th>
                    <th className="text-left py-3 px-4 font-semibold w-32 print:hidden">Status</th>
                    <th className="text-right py-3 px-4 font-semibold w-40 print:hidden">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item, index) => {
                    const amount = item.quantity * item.rate;
                    const config = statusConfig(item.status);
                    const isRejected = item.status === 'rejected';

                    return (
                      <tr key={item.id} className={`group hover:bg-gray-50/50 transition-colors ${isRejected ? 'opacity-50 print:hidden' : ''}`}>
                        <td className="py-4 px-4 text-gray-400 font-medium">{index + 1}</td>
                        <td className="py-4 px-4">
                          <span className={`font-semibold text-gray-900 block ${isRejected ? 'line-through' : ''}`}>{item.name}</span>
                        </td>
                        <td className="py-4 px-4 text-center text-gray-600 font-medium">{item.quantity}</td>
                        <td className="py-4 px-4 text-right text-gray-600">₹{item.rate}</td>
                        <td className="py-4 px-4 text-right font-bold text-gray-900">₹{amount}</td>

                        <td className="py-4 px-4 print:hidden">
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${config.className}`}>
                            {config.icon}{config.label}
                          </span>
                        </td>

                        <td className="py-4 px-4 text-right print:hidden">
                          {!isPaid && (
                              <div className="flex justify-end items-center gap-2">
                                {item.status === "pending" && (
                                  <>
                                    <button onClick={() => updateStatus(item.id, "accepted")} className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-[11px] font-semibold transition-all"><CheckCircle2 className="w-3.5 h-3.5" />Accept</button>
                                    <button onClick={() => updateStatus(item.id, "rejected")} className="p-1.5 rounded-md text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all"><XCircle className="w-4 h-4" /></button>
                                  </>
                                )}
                                {item.status === "accepted" && (
                                  <button onClick={() => updateStatus(item.id, "served")} className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-[11px] font-semibold hover:bg-blue-700 shadow-sm transition-colors">Mark Served</button>
                                )}
                              </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Totals Section */}
          <section className="flex flex-col items-end">
            <div className="w-full sm:w-72 bg-gray-50 rounded-xl p-5 border border-gray-100 print:bg-transparent print:border-none print:p-0">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-medium">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Tax (5%)</span>
                  <span className="font-medium">₹{tax.toFixed(2)}</span>
                </div>
                <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                  <span className="text-base font-bold text-gray-900">Total Bill</span>
                  <span className="text-xl font-bold text-gray-900">₹{total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </section>

          <footer className="mt-12 text-center text-xs text-gray-400 print:mt-8">
            <p>Thank you for dining at {initialBill.restaurantName}</p>
            {isPaid && <p className="mt-1 font-mono uppercase">** PAID VIA {paymentMethod?.toUpperCase()} **</p>}
          </footer>
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
                        disabled={!paymentMethod || isProcessing}
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
                 </div>

              </div>
           </div>
        )}

      </div>
    </div>
  );
}