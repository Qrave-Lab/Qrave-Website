"use client";

import StaffSidebar from "@/app/components/StaffSidebar";
import { api } from "@/app/lib/api";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { printBillTicket } from "@/app/lib/posPrinter";
import { logReprint } from "@/app/lib/reprintAudit";

// ─── Types ────────────────────────────────────────────────────────────────────

type TaxInvoice = {
  id: string;
  invoice_number: string;
  invoice_date: string;
  financial_year: string;
  session_id?: string;
  customer_name: string;
  customer_gstin: string;
  customer_phone: string;
  subtotal: number;
  discount: number;
  service_charge: number;
  taxable_value: number;
  cgst: number;
  sgst: number;
  total_tax: number;
  grand_total: number;
  line_items?: any[];
  status: "active" | "void" | string;
};

type CreditNote = {
  id: string;
  invoice_id: string;
  reason: string;
  refund_amount: number;
  created_at: string;
};

type GenerateInvoiceForm = {
  session_id: string;
  customer_name: string;
  customer_gstin: string;
  customer_phone: string;
};

type RecentOrderInfo = {
  id: string;
  type: string;
  name: string;
  amount: number;
  created_at: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtINR = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const today = () => new Date().toISOString().slice(0, 10);
const nDaysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const STATUS_STYLES: Record<string, string> = {
  active:
    "bg-emerald-50 text-emerald-700 border border-emerald-200",
  void: "bg-slate-100 text-slate-500 border border-slate-200",
};

// ─── Credit Note Modal ────────────────────────────────────────────────────────

function CreditNoteModal({
  invoice,
  onClose,
  onSuccess,
}: {
  invoice: TaxInvoice;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState(String(invoice.grand_total));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Please enter a reason");
      return;
    }
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      toast.error("Enter a valid refund amount");
      return;
    }
    if (parsed > invoice.grand_total) {
      toast.error("Refund amount exceeds invoice total");
      return;
    }
    setIsSubmitting(true);
    try {
      await api(`/api/admin/invoices/tax/${invoice.id}/credit-note`, {
        method: "POST",
        body: JSON.stringify({ reason, refund_amount: parsed }),
      });
      toast.success("Credit note issued successfully");
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || "Failed to issue credit note");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-rose-100 p-2">
              <RotateCcw className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                Issue Credit Note
              </h2>
              <p className="text-xs text-slate-500">{invoice.invoice_number}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-slate-100 text-slate-400"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Reason
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Describe the reason for the credit note..."
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-rose-400 focus:outline-none resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Refund Amount (₹)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              max={invoice.grand_total}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-800 focus:border-rose-400 focus:outline-none"
            />
            <p className="text-xs text-slate-400 mt-1">
              Max: {fmtINR(invoice.grand_total)}
            </p>
          </div>
        </div>

        <div className="px-6 pb-5 space-y-2">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-black text-white hover:bg-rose-700 disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            Issue Credit Note
          </button>
          <button
            onClick={onClose}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Invoice Detail Drawer ────────────────────────────────────────────────────

function InvoiceDetailDrawer({
  invoice,
  onClose,
  onVoid,
  onCreditNote,
}: {
  invoice: TaxInvoice;
  onClose: () => void;
  onVoid: (id: string) => void;
  onCreditNote: (inv: TaxInvoice) => void;
}) {
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);

  useEffect(() => {
    setLoadingNotes(true);
    api<CreditNote[]>(
      `/api/admin/invoices/tax/${invoice.id}/credit-notes`
    )
      .then((data) => setCreditNotes(Array.isArray(data) ? data : []))
      .catch(() => setCreditNotes([]))
      .finally(() => setLoadingNotes(false));
  }, [invoice.id]);

  const handlePrint = async () => {
    // Parse line_items if it's a string (from DB JSONB) or use as array
    let parsedLines = invoice.line_items || [];
    if (typeof parsedLines === "string") {
      try { parsedLines = JSON.parse(parsedLines); } catch { parsedLines = []; }
    }

    const mappedLines = parsedLines.map((li: any) => ({
      name: li.menu_item_name || "Item",
      hsn_code: li.hsn_code || "0000",
      qty: li.quantity || 1,
      rate: li.rate ? parseFloat(li.rate) : 0,
      taxable_value: li.taxable_value ? parseFloat(li.taxable_value) : 0,
      gst_rate: li.gst_rate ? parseFloat(li.gst_rate) : 0,
      cgst: li.cgst ? parseFloat(li.cgst) : 0,
      sgst: li.sgst ? parseFloat(li.sgst) : 0,
      total: li.total ? parseFloat(li.total) : 0,
    }));

    // Fallback if no line items
    const fallbackItems = mappedLines.length > 0 ? [] : [{ name: "Food & Beverage", qty: 1, amount: invoice.taxable_value }];

    // Set posPrinter override to tax_invoice template temporarily via local storage if needed
    // The posPrinter uses getBillTemplate() which reads localStorage.
    const oldTemplate = localStorage.getItem("qrave_bill_template");
    localStorage.setItem("qrave_bill_template", "tax_invoice");

    try {
      await printBillTicket({
        tableCode: "---",
        printedAt: new Date(invoice.invoice_date).toLocaleString("en-IN"),
        staffName: "Admin",
        items: fallbackItems,
        total: invoice.grand_total,
        gstin: invoice.customer_gstin || "29ABCDE1234F1Z5", // Fallback to restaurant GSTIN if customer doesn't have one
        invoiceNumber: invoice.invoice_number,
        financialYear: invoice.financial_year,
        cgst: invoice.cgst,
        sgst: invoice.sgst,
        taxableValue: invoice.taxable_value,
        lineItems: mappedLines.length > 0 ? mappedLines : undefined,
        isDuplicate: true,
        reprintAuditFn: async () => {
          await logReprint({
            invoiceId: invoice.id,
            sessionId: invoice.session_id,
            cashierName: "Admin User",
            reprintType: "invoice"
          });
        }
      });
      toast.success("Printed duplicate invoice!");
    } catch (e: any) {
      toast.error(e?.message || "Failed to print invoice");
    } finally {
      if (oldTemplate) localStorage.setItem("qrave_bill_template", oldTemplate);
      else localStorage.removeItem("qrave_bill_template");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="h-full w-full max-w-lg bg-white shadow-2xl flex flex-col overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 hover:bg-slate-200 text-slate-500 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h2 className="text-base font-black text-slate-900">
                {invoice.invoice_number}
              </h2>
              <p className="text-xs text-slate-500">
                {fmtDate(invoice.invoice_date)} • FY {invoice.financial_year}
              </p>
            </div>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${STATUS_STYLES[invoice.status] || "bg-slate-100 text-slate-500"}`}
          >
            {invoice.status}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 px-6 py-5 space-y-5">
          {/* Customer */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-black text-slate-400 uppercase tracking-wide mb-2">
              Customer Details
            </p>
            <p className="text-sm font-bold text-slate-800">
              {invoice.customer_name || "Walk-in Customer"}
            </p>
            {invoice.customer_gstin && (
              <p className="text-xs text-slate-500 mt-0.5">
                GSTIN: {invoice.customer_gstin}
              </p>
            )}
            {invoice.customer_phone && (
              <p className="text-xs text-slate-500 mt-0.5">
                📞 {invoice.customer_phone}
              </p>
            )}
          </div>

          {/* Financial breakdown */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-black text-slate-400 uppercase tracking-wide mb-3">
              Financial Breakdown
            </p>
            <div className="space-y-2">
              {[
                { label: "Subtotal", value: invoice.subtotal },
                {
                  label: "Discount",
                  value: -invoice.discount,
                  cls: "text-rose-600",
                },
                { label: "Service Charge", value: invoice.service_charge },
                { label: "Taxable Value", value: invoice.taxable_value },
                { label: "CGST", value: invoice.cgst },
                { label: "SGST", value: invoice.sgst },
                { label: "Total Tax", value: invoice.total_tax },
              ].map(({ label, value, cls }) => (
                <div
                  key={label}
                  className="flex justify-between text-sm text-slate-600"
                >
                  <span>{label}</span>
                  <span className={`font-semibold ${cls || ""}`}>
                    {value < 0 ? `-${fmtINR(Math.abs(value))}` : fmtINR(value)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between border-t pt-2 text-base font-black text-slate-900">
                <span>Grand Total</span>
                <span>{fmtINR(invoice.grand_total)}</span>
              </div>
            </div>
          </div>

          {/* Credit Notes */}
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-wide mb-2">
              Credit Notes
            </p>
            {loadingNotes ? (
              <div className="flex h-10 items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-slate-300" />
              </div>
            ) : creditNotes.length === 0 ? (
              <p className="text-sm text-slate-400 py-2">
                No credit notes issued for this invoice.
              </p>
            ) : (
              <div className="space-y-2">
                {creditNotes.map((cn) => (
                  <div
                    key={cn.id}
                    className="rounded-xl border border-rose-100 bg-rose-50 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-rose-700">
                        -{fmtINR(cn.refund_amount)}
                      </span>
                      <span className="text-xs text-slate-400">
                        {fmtDate(cn.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{cn.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-slate-200 px-6 py-4 space-y-2">
          <button
            onClick={handlePrint}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            <Printer className="h-4 w-4" />
            Print Invoice
          </button>
          {invoice.status === "active" && (
            <>
              <button
                onClick={() => onCreditNote(invoice)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 hover:bg-rose-100"
              >
                <RotateCcw className="h-4 w-4" />
                Issue Credit Note
              </button>
              <button
                onClick={() => onVoid(invoice.id)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50"
              >
                <XCircle className="h-4 w-4" />
                Void Invoice
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Generate Invoice Modal ────────────────────────────────────────────────────

function GenerateInvoiceModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [form, setForm] = useState({
    customer_name: "",
    customer_gstin: "",
    customer_phone: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentOrders, setRecentOrders] = useState<RecentOrderInfo[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    setLoadingOrders(true);
    api<RecentOrderInfo[]>("/api/admin/orders/recent-completed")
      .then((data) => setRecentOrders(data || []))
      .catch((err) => toast.error("Failed to load recent orders"))
      .finally(() => setLoadingOrders(false));
  }, []);

  const handleSubmit = async () => {
    if (!selectedOrderId) {
      toast.error("Please select an order");
      return;
    }
    const order = recentOrders.find(o => o.id === selectedOrderId);
    if (!order) return;

    setIsSubmitting(true);
    try {
      await api("/api/admin/invoices/tax", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          session_id: order.type === "dine_in" ? order.id : undefined,
          takeaway_order_id: order.type === "takeaway" ? order.id : undefined,
        }),
      });
      toast.success("Tax invoice generated!");
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-100 p-2">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-base font-black text-slate-900">
              Generate Tax Invoice
            </h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100 text-slate-400">
            <XCircle className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Completed Session / Order *
            </label>
            {loadingOrders ? (
              <div className="mt-1.5 h-[42px] w-full animate-pulse rounded-xl bg-slate-100" />
            ) : (
              <select
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                className="mt-1.5 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 shadow-sm focus:border-blue-400 focus:outline-none"
              >
                <option value="" disabled>
                  Select a completed order...
                </option>
                {recentOrders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} - {fmtINR(o.amount)} ({(new Date(o.created_at)).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})
                  </option>
                ))}
              </select>
            )}
          </div>
          {[
            { key: "customer_name", label: "Customer Name", placeholder: "Optional" },
            { key: "customer_gstin", label: "Customer GSTIN", placeholder: "15-char GSTIN (optional)" },
            { key: "customer_phone", label: "Customer Phone", placeholder: "+91..." },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                {label}
              </label>
              <input
                type="text"
                value={(form as any)[key]}
                onChange={(e) =>
                  setForm((f) => ({ ...f, [key]: e.target.value }))
                }
                placeholder={placeholder}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-blue-400 focus:outline-none"
              />
            </div>
          ))}
        </div>
        <div className="px-6 pb-5 space-y-2">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Generate Invoice
          </button>
          <button onClick={onClose} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export default function InvoicesPage() {
  const restaurantName = "Qrave";

  const [invoices, setInvoices] = useState<TaxInvoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState(nDaysAgo(90));
  const [toDate, setToDate] = useState(today());
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "void">("all");

  // Modal state
  const [selectedInvoice, setSelectedInvoice] = useState<TaxInvoice | null>(null);
  const [creditNoteTarget, setCreditNoteTarget] = useState<TaxInvoice | null>(null);
  const [showGenerate, setShowGenerate] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = async (pg = 1, showSpinner = true) => {
    if (showSpinner) setIsLoading(true);
    else setIsRefreshing(true);
    try {
      const params = new URLSearchParams({
        from: fromDate,
        to: toDate,
        page: String(pg),
        limit: String(PAGE_SIZE),
      });
      const res = await api<{
        invoices: TaxInvoice[];
        total: number;
        page: number;
      }>(`/api/admin/invoices/tax?${params.toString()}`);
      setInvoices(res.invoices || []);
      setTotal(res.total || 0);
      setPage(pg);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load invoices");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const checkRoleAndLoad = async () => {
    setIsLoading(true);
    try {
      const me = await api<{ role?: string }>("/api/admin/me");
      const r = String(me?.role || "").toLowerCase();
      if (r === "owner" || r === "manager") {
        setHasAccess(true);
        load(1, false);
      } else {
        setHasAccess(false);
        setIsLoading(false);
      }
    } catch (err) {
      setHasAccess(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkRoleAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (statusFilter !== "all" && inv.status !== statusFilter) return false;
      if (!q) return true;
      return (
        inv.invoice_number.toLowerCase().includes(q) ||
        (inv.customer_name || "").toLowerCase().includes(q) ||
        (inv.customer_gstin || "").toLowerCase().includes(q) ||
        (inv.customer_phone || "").toLowerCase().includes(q)
      );
    });
  }, [invoices, search, statusFilter]);

  const handleExportCSV = () => {
    const params = new URLSearchParams({ from: fromDate, to: toDate });
    const url = `/api/proxy/api/admin/invoices/tax/export.csv?${params.toString()}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoices_${fromDate}_to_${toDate}.csv`;
    a.click();
  };

  const [voidInvoiceModal, setVoidInvoiceModal] = useState<{ isOpen: boolean; invoiceId: string | null }>({ isOpen: false, invoiceId: null });
  const [voidReason, setVoidReason] = useState("");

  const promptVoidInvoice = (id: string) => {
    setVoidReason("");
    setVoidInvoiceModal({ isOpen: true, invoiceId: id });
  };

  const executeVoid = async () => {
    const id = voidInvoiceModal.invoiceId;
    if (!id) return;
    
    if (!voidReason.trim()) {
      toast.error("Please enter a reason to void this invoice");
      return;
    }

    const pin = window.prompt("Enter Manager PIN to void invoice:");
    if (!pin) {
      toast.error("Manager PIN is required to void an invoice");
      return;
    }

    setVoidInvoiceModal({ isOpen: false, invoiceId: null });

    try {
      await api(`/api/admin/invoices/tax/${id}/void`, {
        method: "POST",
        body: JSON.stringify({ reason: voidReason }),
      });
      toast.success("Invoice voided");
      setSelectedInvoice(null);
      load(page, false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to void invoice");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        <StaffSidebar />
        <main className="flex-1 p-8">
          <div className="mx-auto max-w-7xl">
            {hasAccess === false ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="mb-4 rounded-full bg-rose-100 p-4">
                  <XCircle className="h-10 w-10 text-rose-600" />
                </div>
                <h2 className="text-xl font-black text-slate-900">Access Denied</h2>
                <p className="mt-2 text-sm text-slate-600">Your role does not have permission to view Tax Invoices.</p>
              </div>
            ) : (
              <>
                {/* ─── Header ─────────────────────────────────────────────── */}
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-blue-100 p-2 text-blue-600">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-slate-900">
                    Tax Invoices
                  </h1>
                  <p className="text-sm text-slate-500">
                    GST invoices, credit notes &amp; export
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => load(page, false)}
                  disabled={isRefreshing}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                  Refresh
                </button>
                <button
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export CSV
                </button>
                <button
                  onClick={() => setShowGenerate(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-sm"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Generate Invoice
                </button>
              </div>
            </div>

            {/* ─── Filters ─────────────────────────────────────────────── */}
            <div className="mb-6 flex flex-wrap items-end gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search invoice #, customer, GSTIN…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2.5 text-sm text-slate-700 shadow-sm focus:border-blue-400 focus:outline-none"
                />
              </div>

              {/* Date range */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2.5 text-sm text-slate-700 shadow-sm focus:border-blue-400 focus:outline-none"
                  />
                </div>
                <span className="text-xs text-slate-400 font-bold">to</span>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2.5 text-sm text-slate-700 shadow-sm focus:border-blue-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Status filter */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as typeof statusFilter)
                  }
                  className="appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-8 py-2.5 text-sm font-semibold text-slate-700 shadow-sm focus:border-blue-400 focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="void">Void</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* ─── Stats strip ─────────────────────────────────────────── */}
            <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {
                  label: "Total Invoices",
                  value: total,
                  color: "text-slate-900",
                },
                {
                  label: "Active",
                  value: invoices.filter((i) => i.status === "active").length,
                  color: "text-emerald-700",
                },
                {
                  label: "Void",
                  value: invoices.filter((i) => i.status === "void").length,
                  color: "text-slate-500",
                },
                {
                  label: "Revenue (page)",
                  value: fmtINR(
                    invoices
                      .filter((i) => i.status === "active")
                      .reduce((s, i) => s + (i.grand_total || 0), 0)
                  ),
                  color: "text-blue-700",
                },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                >
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                    {label}
                  </p>
                  <p className={`text-xl font-black mt-1 ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* ─── Table ───────────────────────────────────────────────── */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              {isLoading ? (
                <div className="flex h-64 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col h-64 items-center justify-center gap-2 text-slate-400">
                  <FileText className="h-10 w-10 opacity-30" />
                  <p className="text-sm font-bold">No invoices found</p>
                  <p className="text-xs">
                    Try changing the date range or search query.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px]">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        {[
                          "Invoice #",
                          "Date",
                          "Customer",
                          "Grand Total",
                          "CGST",
                          "SGST",
                          "Status",
                          "",
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-wider"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filtered.map((inv) => (
                        <tr
                          key={inv.id}
                          className="hover:bg-slate-50 transition-colors group"
                        >
                          <td className="px-4 py-3">
                            <span className="text-sm font-black text-slate-900 font-mono">
                              {inv.invoice_number}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                            {fmtDate(inv.invoice_date)}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-semibold text-slate-800">
                              {inv.customer_name || "Walk-in"}
                            </p>
                            {inv.customer_gstin && (
                              <p className="text-xs text-slate-400 font-mono">
                                {inv.customer_gstin}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm font-black text-slate-900">
                            {fmtINR(inv.grand_total)}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {fmtINR(inv.cgst)}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {fmtINR(inv.sgst)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-black uppercase tracking-wider ${STATUS_STYLES[inv.status] || "bg-slate-100 text-slate-500"}`}
                            >
                              {inv.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setSelectedInvoice(inv)}
                              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              View
                              <ExternalLink className="h-3 w-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {!isLoading && total > PAGE_SIZE && (
                <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
                  <p className="text-xs text-slate-500">
                    Showing {(page - 1) * PAGE_SIZE + 1}–
                    {Math.min(page * PAGE_SIZE, total)} of {total} invoices
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => load(page - 1)}
                      disabled={page === 1}
                      className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <span className="text-xs font-bold text-slate-600">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => load(page + 1)}
                      disabled={page >= totalPages}
                      className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {selectedInvoice && (
          <InvoiceDetailDrawer
            key="detail"
            invoice={selectedInvoice}
            onClose={() => setSelectedInvoice(null)}
            onVoid={promptVoidInvoice}
            onCreditNote={(inv) => {
              setSelectedInvoice(null);
              setCreditNoteTarget(inv);
            }}
          />
        )}
        {creditNoteTarget && (
          <CreditNoteModal
            key="credit"
            invoice={creditNoteTarget}
            onClose={() => setCreditNoteTarget(null)}
            onSuccess={() => {
              setCreditNoteTarget(null);
              load(page, false);
            }}
          />
        )}
        {showGenerate && (
          <GenerateInvoiceModal
            key="generate"
            onClose={() => setShowGenerate(false)}
            onSuccess={() => {
              setShowGenerate(false);
              load(1, false);
            }}
          />
        )}
      </AnimatePresence>

      {/* Void Invoice Modal */}
      {voidInvoiceModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-2 text-lg font-bold text-slate-900">Void Invoice</h3>
            <p className="mb-4 text-sm text-slate-500">Please provide a reason. Manager PIN required.</p>
            <input
              type="text"
              placeholder="Reason for voiding..."
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-rose-500 mb-6"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setVoidInvoiceModal({ isOpen: false, invoiceId: null })}
                className="flex-1 rounded-xl bg-slate-100 py-3 font-semibold text-slate-700 hover:bg-slate-200"
              >
                Back
              </button>
              <button
                onClick={executeVoid}
                className="flex-1 rounded-xl bg-rose-600 py-3 font-bold text-white shadow hover:bg-rose-700"
              >
                Void Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
