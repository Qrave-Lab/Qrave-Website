"use client";

import StaffSidebar from "@/app/components/StaffSidebar";
import { api, requestManagerPin } from "@/app/lib/api";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ChevronRight,
  Phone,
  Plus,
  X,
  ArrowRight,
  CheckCircle2,
  Download,
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

import { Select } from "@/app/components/ui/Select";
import { DateRangePicker } from "@/app/components/ui/DateRangePicker";
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

const STATUS_STYLES: Record<string, { label: string; pill: string; dot: string }> = {
  active: { label: "Active", pill: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  void: { label: "Void", pill: "bg-[#F3F3EF] text-[#6B7280]", dot: "bg-[#9CA3AF]" },
};

function StatusPill({ status }: { status: string }) {
  const s = STATUS_STYLES[status] || { label: status, pill: "bg-[#F3F3EF] text-[#6B7280]", dot: "bg-[#9CA3AF]" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium leading-none ${s.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F1117]/40 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.15 }}
        className="w-full max-w-md rounded-2xl border border-[#E8E8E3] bg-white shadow-[0_24px_60px_-20px_rgba(15,17,23,0.35)]"
      >
        <div className="flex items-start justify-between border-b border-[#F0F0EB] px-6 py-4">
          <div>
            <h2 className="text-[17px] font-bold text-[#0F1117]">Issue credit note</h2>
            <p className="mt-1 text-[12px] tabular-nums text-[#9CA3AF]">{invoice.invoice_number}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-[#9CA3AF] transition-colors hover:bg-[#F3F3EF] hover:text-[#0F1117]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <label htmlFor="cn-reason" className="mb-2 block text-[13px] font-medium text-[#4B5563]">Reason</label>
            <textarea
              id="cn-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Why is this amount being refunded?"
              className="w-full resize-none rounded-xl border border-[#E8E8E3] bg-white px-3.5 py-2.5 text-[13px] text-[#0F1117] outline-none placeholder:text-[#9CA3AF] hover:border-[#D6D6CF] focus:border-rose-400"
            />
          </div>
          <div>
            <label htmlFor="cn-amount" className="mb-2 block text-[13px] font-medium text-[#4B5563]">Refund amount</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] text-[#9CA3AF]">₹</span>
              <input
                id="cn-amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                max={invoice.grand_total}
                className="h-11 w-full rounded-xl border border-[#E8E8E3] bg-white pl-8 pr-3.5 text-[15px] font-medium tabular-nums text-[#0F1117] outline-none hover:border-[#D6D6CF] focus:border-rose-400"
              />
            </div>
            <p className="mt-1.5 text-[12px] tabular-nums text-[#9CA3AF]">Up to {fmtINR(invoice.grand_total)}</p>
          </div>
        </div>

        <div className="flex gap-2 border-t border-[#F0F0EB] px-6 py-4">
          <button
            onClick={onClose}
            className="h-10 flex-1 rounded-xl border border-[#E8E8E3] bg-white text-[13px] font-semibold text-[#374151] transition-colors hover:border-[#D6D6CF] hover:text-[#0F1117]"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 text-[13px] font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            Issue credit note
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
    <div className="fixed inset-0 z-50 flex justify-end">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-[#0F1117]/30 backdrop-blur-xs"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="relative z-10 flex h-full w-full max-w-lg flex-col border-l border-[#E8E8E3] bg-white shadow-[0_20px_60px_-15px_rgba(15,17,23,0.3)]"
      >
        <div className="flex items-center justify-between gap-4 border-b border-[#E8E8E3] px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              aria-label="Back to invoices"
              className="rounded-lg p-1.5 text-[#6B7280] transition-colors hover:bg-[#F3F3EF] hover:text-[#0F1117]"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h2 className="text-[17px] font-bold tabular-nums text-[#0F1117]">{invoice.invoice_number}</h2>
              <p className="mt-1 text-[12px] tabular-nums text-[#9CA3AF]">
                {fmtDate(invoice.invoice_date)}, FY {invoice.financial_year}
              </p>
            </div>
          </div>
          <StatusPill status={invoice.status} />
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto bg-[#FAFAF7] px-6 py-5">
          <div className="rounded-xl border border-[#E8E8E3] bg-white p-4">
            <p className="text-[12px] font-medium text-[#6B7280]">Customer</p>
            <p className="mt-1.5 text-[14px] font-semibold text-[#0F1117]">{invoice.customer_name || "Walk-in customer"}</p>
            {invoice.customer_gstin && (
              <p className="mt-1 text-[12px] tabular-nums tracking-wide text-[#6B7280]">GSTIN {invoice.customer_gstin}</p>
            )}
            {invoice.customer_phone && (
              <p className="mt-1 flex items-center gap-1.5 text-[12px] tabular-nums text-[#6B7280]">
                <Phone className="h-3.5 w-3.5 text-[#9CA3AF]" /> {invoice.customer_phone}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-[#E8E8E3] bg-white p-4">
            <p className="mb-3 text-[12px] font-medium text-[#6B7280]">Amounts</p>
            <div className="space-y-2 text-[13px]">
              {[
                { label: "Subtotal", value: invoice.subtotal },
                { label: "Discount", value: -invoice.discount, cls: "text-emerald-700", hide: !invoice.discount },
                { label: "Service charge", value: invoice.service_charge, hide: !invoice.service_charge },
                { label: "Taxable value", value: invoice.taxable_value },
                { label: "CGST", value: invoice.cgst },
                { label: "SGST", value: invoice.sgst },
              ]
                .filter((r) => !r.hide)
                .map(({ label, value, cls }) => (
                  <div key={label} className="flex justify-between text-[#6B7280]">
                    <span>{label}</span>
                    <span className={`tabular-nums ${cls || "text-[#374151]"}`}>
                      {value < 0 ? `−${fmtINR(Math.abs(value))}` : fmtINR(value)}
                    </span>
                  </div>
                ))}
              <div className="flex justify-between border-t border-dashed border-[#E8E8E3] pt-2 text-[#6B7280]">
                <span>Total GST</span>
                <span className="tabular-nums text-[#374151]">{fmtINR(invoice.total_tax)}</span>
              </div>
              <div className="flex items-baseline justify-between border-t border-[#E8E8E3] pt-3">
                <span className="text-[14px] font-semibold text-[#0F1117]">Total</span>
                <span className="text-[20px] font-bold tabular-nums tracking-[-0.02em] text-[#0F1117]">
                  {fmtINR(invoice.grand_total)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-[12px] font-medium text-[#6B7280]">Credit notes</p>
            {loadingNotes ? (
              <div className="flex h-10 items-center gap-2 text-[13px] text-[#9CA3AF]">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading
              </div>
            ) : creditNotes.length === 0 ? (
              <p className="text-[13px] text-[#9CA3AF]">None issued for this invoice.</p>
            ) : (
              <div className="space-y-2">
                {creditNotes.map((cn) => (
                  <div key={cn.id} className="rounded-xl border border-[#E8E8E3] bg-white p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold tabular-nums text-rose-700">−{fmtINR(cn.refund_amount)}</span>
                      <span className="text-[12px] tabular-nums text-[#9CA3AF]">{fmtDate(cn.created_at)}</span>
                    </div>
                    <p className="mt-1 text-[13px] text-[#4B5563]">{cn.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2 border-t border-[#E8E8E3] bg-white px-6 py-4">
          <button
            onClick={handlePrint}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#fe5c13] text-[14px] font-semibold text-white transition-colors hover:bg-[#e44e0b]"
          >
            <Printer className="h-4 w-4" />
            Print duplicate
          </button>
          {invoice.status === "active" && (
            <div className="flex gap-2">
              <button
                onClick={() => onCreditNote(invoice)}
                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-[#E8E8E3] bg-white text-[13px] font-semibold text-[#0F1117] transition-colors hover:border-[#D6D6CF] hover:bg-[#FAFAF7]"
              >
                <RotateCcw className="h-4 w-4 text-[#6B7280]" />
                Credit note
              </button>
              <button
                onClick={() => onVoid(invoice.id)}
                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white text-[13px] font-semibold text-rose-700 transition-colors hover:border-rose-300 hover:bg-rose-50"
              >
                <XCircle className="h-4 w-4" />
                Void invoice
              </button>
            </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F1117]/40 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.15 }}
        className="w-full max-w-md rounded-2xl border border-[#E8E8E3] bg-white shadow-[0_24px_60px_-20px_rgba(15,17,23,0.35)]"
      >
        <div className="flex items-start justify-between border-b border-[#F0F0EB] px-6 py-4">
          <div>
            <h2 className="text-[17px] font-bold text-[#0F1117]">Generate tax invoice</h2>
            <p className="mt-1 text-[12px] text-[#9CA3AF]">For a completed dine-in or takeaway order.</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-[#9CA3AF] transition-colors hover:bg-[#F3F3EF] hover:text-[#0F1117]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <span className="mb-2 block text-[13px] font-medium text-[#4B5563]">
              Completed order <span className="text-[#fe5c13]">*</span>
            </span>
            {loadingOrders ? (
              <div className="h-10 w-full animate-pulse rounded-xl bg-[#F3F3EF]" />
            ) : (
              <Select
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                aria-label="Completed order"
                placeholder="Choose a completed order"
                className="h-10 w-full rounded-xl border border-[#E8E8E3] bg-white px-3.5 text-[13px] font-medium text-[#0F1117] outline-none hover:border-[#D6D6CF]"
              >
                <option value="" disabled hidden>
                  Choose a completed order
                </option>
                {recentOrders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}, {fmtINR(o.amount)} ({new Date(o.created_at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })})
                  </option>
                ))}
              </Select>
            )}
          </div>
          {[
            { key: "customer_name", label: "Customer name", placeholder: "Optional" },
            { key: "customer_gstin", label: "Customer GSTIN", placeholder: "15 characters, optional" },
            { key: "customer_phone", label: "Customer phone", placeholder: "Optional" },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label htmlFor={`gi-${key}`} className="mb-2 block text-[13px] font-medium text-[#4B5563]">{label}</label>
              <input
                id={`gi-${key}`}
                type="text"
                value={(form as any)[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="h-10 w-full rounded-xl border border-[#E8E8E3] bg-white px-3.5 text-[13px] text-[#0F1117] outline-none placeholder:text-[#9CA3AF] hover:border-[#D6D6CF] focus:border-[#fe5c13]"
              />
            </div>
          ))}
        </div>

        <div className="flex gap-2 border-t border-[#F0F0EB] px-6 py-4">
          <button
            onClick={onClose}
            className="h-10 flex-1 rounded-xl border border-[#E8E8E3] bg-white text-[13px] font-semibold text-[#374151] transition-colors hover:border-[#D6D6CF] hover:text-[#0F1117]"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#fe5c13] text-[13px] font-semibold text-white transition-colors hover:bg-[#e44e0b] disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Generate invoice
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

    const pin = await requestManagerPin();
    if (!pin) {
      toast.error("Manager PIN is required to void an invoice");
      return;
    }

    setVoidInvoiceModal({ isOpen: false, invoiceId: null });

    try {
      await api(`/api/admin/invoices/tax/${id}/void`, {
        method: "POST",
        headers: { "X-Manager-Pin": pin },
        body: JSON.stringify({ reason: voidReason, pin }),
      });
      toast.success("Invoice voided");
      setSelectedInvoice(null);
      load(page, false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to void invoice");
    }
  };

  const counts = {
    all: invoices.length,
    active: invoices.filter((i) => i.status === "active").length,
    void: invoices.filter((i) => i.status === "void").length,
  };
  const activeValue = invoices
    .filter((i) => i.status === "active")
    .reduce((s, i) => s + (i.grand_total || 0), 0);
  const activeTax = invoices
    .filter((i) => i.status === "active")
    .reduce((s, i) => s + (i.total_tax || 0), 0);
  const quickRanges: [string, number][] = [
    ["Last 7 days", 7],
    ["Last 30 days", 30],
    ["Last 90 days", 90],
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[#FAFAF7] text-[#0F1117]">
      <StaffSidebar />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {hasAccess === false ? (
          <div className="m-auto max-w-sm rounded-2xl border border-[#E8E8E3] bg-white px-8 py-10 text-center">
            <XCircle className="mx-auto h-6 w-6 text-rose-500" />
            <h2 className="mt-3 text-[17px] font-bold text-[#0F1117]">You can&apos;t view tax invoices</h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[#6B7280]">
              Only owners and managers can see invoices. Ask one of them to open this page.
            </p>
          </div>
        ) : (
          <>
            <header className="shrink-0 border-b border-[#E8E8E3] bg-white px-8 py-4">
              <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                <div className="flex items-center gap-3">
                  <h1 className="text-[22px] font-bold leading-none tracking-[-0.02em] text-[#0F1117]">Tax invoices</h1>
                  {!isLoading && (
                    <span className="rounded-full bg-[#F3F3EF] px-2.5 py-1 text-[12px] font-medium leading-none tabular-nums text-[#6B7280]">
                      {total} {total === 1 ? "invoice" : "invoices"}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => load(page, false)}
                    disabled={isRefreshing}
                    aria-label="Refresh invoices"
                    title="Refresh invoices"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E8E8E3] bg-white text-[#6B7280] transition-colors hover:border-[#D6D6CF] hover:bg-[#FAFAF7] hover:text-[#0F1117] disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#E8E8E3] bg-white px-3.5 text-[13px] font-semibold text-[#0F1117] transition-colors hover:border-[#D6D6CF] hover:bg-[#FAFAF7]"
                  >
                    <Download className="h-4 w-4 text-[#6B7280]" /> Export CSV
                  </button>
                  <button
                    onClick={() => setShowGenerate(true)}
                    className="ml-1 inline-flex h-10 items-center gap-2 rounded-xl bg-[#fe5c13] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#e44e0b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fe5c13]/40 focus-visible:ring-offset-2"
                  >
                    <Plus className="h-4 w-4" strokeWidth={2.5} /> Generate invoice
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className="relative w-72">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                  <input
                    type="text"
                    placeholder="Search invoice, customer or GSTIN"
                    aria-label="Search invoices"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9 w-full rounded-xl border border-[#E8E8E3] bg-white pl-9 pr-3 text-[13px] text-[#0F1117] outline-none transition-colors placeholder:text-[#9CA3AF] hover:border-[#D6D6CF] focus:border-[#fe5c13]"
                  />
                </div>

                <div className="inline-flex h-9 items-center gap-0.5 rounded-xl bg-[#F3F3EF] p-1" role="tablist" aria-label="Invoice status">
                  {(
                    [
                      ["all", "All"],
                      ["active", "Active"],
                      ["void", "Void"],
                    ] as const
                  ).map(([id, label]) => {
                    const on = statusFilter === id;
                    return (
                      <button
                        key={id}
                        role="tab"
                        aria-selected={on}
                        onClick={() => setStatusFilter(id)}
                        className={`flex h-7 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-[12px] font-medium transition-colors ${on ? "bg-white font-semibold text-[#0F1117] shadow-[0_1px_2px_rgba(15,17,23,0.06)]" : "text-[#6B7280] hover:text-[#0F1117]"}`}
                      >
                        {label}
                        <span className={`tabular-nums ${on ? "text-[#6B7280]" : "text-[#9CA3AF]"}`}>{counts[id]}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="ml-auto flex flex-wrap items-center gap-2">
                  <div className="inline-flex h-9 items-center gap-0.5 rounded-xl bg-[#F3F3EF] p-1" role="tablist" aria-label="Quick ranges">
                    {quickRanges.map(([label, days]) => {
                      const on = fromDate === nDaysAgo(days) && toDate === today();
                      return (
                        <button
                          key={label}
                          role="tab"
                          aria-selected={on}
                          onClick={() => {
                            setFromDate(nDaysAgo(days));
                            setToDate(today());
                          }}
                          className={`flex h-7 items-center whitespace-nowrap rounded-lg px-3 text-[12px] font-medium transition-colors ${on ? "bg-white font-semibold text-[#0F1117] shadow-[0_1px_2px_rgba(15,17,23,0.06)]" : "text-[#6B7280] hover:text-[#0F1117]"}`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <DateRangePicker
                    from={fromDate}
                    to={toDate}
                    onChange={(f, t) => {
                      setFromDate(f);
                      setToDate(t);
                    }}
                  />
                </div>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-8 py-6">
              <dl className="grid grid-cols-2 overflow-hidden rounded-2xl border border-[#E8E8E3] bg-white md:grid-cols-4">
                {[
                  { label: "Invoices in range", value: String(total), tone: "text-[#0F1117]" },
                  { label: "Active", value: String(counts.active), tone: counts.active ? "text-emerald-700" : "text-[#9CA3AF]" },
                  { label: "Void", value: String(counts.void), tone: counts.void ? "text-[#0F1117]" : "text-[#9CA3AF]" },
                  { label: "Value of active invoices", value: fmtINR(activeValue), tone: "text-[#0F1117]", note: `${fmtINR(activeTax)} GST${totalPages > 1 ? ", this page" : ""}` },
                ].map((k, i) => (
                  <div key={k.label} className={`px-6 py-5 ${i > 0 ? "border-l border-[#F0F0EB]" : ""} ${i > 1 ? "border-t border-[#F0F0EB] md:border-t-0" : ""}`}>
                    <dt className="text-[12px] font-medium text-[#6B7280]">{k.label}</dt>
                    <dd className={`mt-1.5 text-[20px] font-bold tabular-nums tracking-[-0.02em] ${k.tone}`}>{k.value}</dd>
                    {k.note && <p className="mt-1 text-[12px] tabular-nums text-[#9CA3AF]">{k.note}</p>}
                  </div>
                ))}
              </dl>

              <section className="mt-6 overflow-hidden rounded-2xl border border-[#E8E8E3] bg-white">
                {isLoading ? (
                  <div className="flex h-64 items-center justify-center gap-2 text-[14px] text-[#6B7280]">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading invoices
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                    <FileText className="h-6 w-6 text-[#C4C4BE]" />
                    <p className="mt-3 text-[15px] font-semibold text-[#0F1117]">
                      {search ? "No invoices match your search" : "No invoices in this range"}
                    </p>
                    <p className="mt-1 max-w-sm text-[13px] text-[#6B7280]">
                      {search ? "Try an invoice number, customer name or GSTIN." : "Pick a wider date range, or generate an invoice for a completed order."}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] border-collapse text-left">
                      <thead>
                        <tr className="border-b border-[#F0F0EB] text-[12px] text-[#6B7280]">
                          <th className="px-6 py-3 font-medium">Invoice</th>
                          <th className="px-6 py-3 font-medium">Customer</th>
                          <th className="px-6 py-3 text-right font-medium">CGST</th>
                          <th className="px-6 py-3 text-right font-medium">SGST</th>
                          <th className="px-6 py-3 text-right font-medium">Total</th>
                          <th className="px-6 py-3 font-medium">Status</th>
                          <th className="px-6 py-3 font-medium"><span className="sr-only">Open</span></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F0F0EB]">
                        {filtered.map((inv) => {
                          const isVoid = inv.status === "void";
                          return (
                            <tr
                              key={inv.id}
                              onClick={() => setSelectedInvoice(inv)}
                              className="group cursor-pointer transition-colors hover:bg-[#FAFAF7]"
                            >
                              <td className="px-6 py-4">
                                <p className={`text-[14px] font-semibold tabular-nums ${isVoid ? "text-[#9CA3AF] line-through decoration-[#C4C4BE]" : "text-[#0F1117]"}`}>
                                  {inv.invoice_number}
                                </p>
                                <p className="mt-0.5 text-[12px] tabular-nums text-[#9CA3AF]">{fmtDate(inv.invoice_date)}</p>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-[13px] font-medium text-[#0F1117]">{inv.customer_name || "Walk-in customer"}</p>
                                {inv.customer_gstin && (
                                  <p className="mt-0.5 text-[12px] tabular-nums tracking-wide text-[#9CA3AF]">{inv.customer_gstin}</p>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right text-[13px] tabular-nums text-[#4B5563]">{fmtINR(inv.cgst)}</td>
                              <td className="px-6 py-4 text-right text-[13px] tabular-nums text-[#4B5563]">{fmtINR(inv.sgst)}</td>
                              <td className={`px-6 py-4 text-right text-[15px] font-semibold tabular-nums ${isVoid ? "text-[#9CA3AF]" : "text-[#0F1117]"}`}>
                                {fmtINR(inv.grand_total)}
                              </td>
                              <td className="px-6 py-4">
                                <StatusPill status={inv.status} />
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-[#6B7280] transition-colors group-hover:text-[#0F1117]">
                                  View <ChevronRight className="h-3.5 w-3.5" />
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {!isLoading && total > PAGE_SIZE && (
                  <div className="flex items-center justify-between border-t border-[#F0F0EB] px-6 py-3">
                    <p className="text-[12px] tabular-nums text-[#6B7280]">
                      {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} invoices
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => load(page - 1)}
                        disabled={page === 1}
                        aria-label="Previous page"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E8E8E3] bg-white text-[#6B7280] transition-colors hover:border-[#D6D6CF] hover:text-[#0F1117] disabled:opacity-40"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                      <span className="text-[12px] font-medium tabular-nums text-[#4B5563]">
                        Page {page} of {totalPages}
                      </span>
                      <button
                        onClick={() => load(page + 1)}
                        disabled={page >= totalPages}
                        aria-label="Next page"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E8E8E3] bg-white text-[#6B7280] transition-colors hover:border-[#D6D6CF] hover:text-[#0F1117] disabled:opacity-40"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </main>

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

      {voidInvoiceModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0F1117]/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[#E8E8E3] bg-white p-6 shadow-[0_24px_60px_-20px_rgba(15,17,23,0.35)]">
            <h3 className="text-[17px] font-bold text-[#0F1117]">Void this invoice?</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[#6B7280]">
              Voiding can&apos;t be undone. Add a reason; a manager PIN is needed next.
            </p>
            <label className="mb-2 mt-5 block text-[13px] font-medium text-[#4B5563]" htmlFor="void-reason">Reason</label>
            <input
              id="void-reason"
              type="text"
              placeholder="Wrong customer details, duplicate bill…"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              autoFocus
              className="h-10 w-full rounded-xl border border-[#E8E8E3] bg-white px-3.5 text-[13px] text-[#0F1117] outline-none placeholder:text-[#9CA3AF] hover:border-[#D6D6CF] focus:border-rose-400"
            />
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setVoidInvoiceModal({ isOpen: false, invoiceId: null })}
                className="h-10 flex-1 rounded-xl border border-[#E8E8E3] bg-white text-[13px] font-semibold text-[#374151] transition-colors hover:border-[#D6D6CF] hover:text-[#0F1117]"
              >
                Keep invoice
              </button>
              <button
                onClick={executeVoid}
                className="h-10 flex-1 rounded-xl bg-rose-600 text-[13px] font-semibold text-white transition-colors hover:bg-rose-700"
              >
                Void invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
