"use client";

import StaffSidebar from "@/app/components/StaffSidebar";
import { api } from "@/app/lib/api";
import {
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  History,
  Lock,
  MinusCircle,
  PlusCircle,
  RefreshCw,
  Search,
  ShieldAlert,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

type CashDrawerEvent = {
  id: string;
  event_type: string;
  amount: number;
  note: string;
  user_name: string;
  created_at: string;
};

type CashDrawerSummary = {
  opening_float: number;
  total_cash_in: number;
  total_cash_out: number;
  total_sales: number;
  expected_cash: number;
  is_open: boolean;
  opened_at?: string;
  events: CashDrawerEvent[];
  last_closed_amount?: number;
  last_expected_amount?: number;
  last_discrepancy?: number;
  last_closed_at?: string;
  last_closed_by?: string;
};

type ActiveShift = {
  id: string;
  user_name: string;
  role: string;
  is_clocked_in: boolean;
};

const CustomDatePicker = ({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const parseLocalDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    return new Date(dateStr);
  };

  const initialDate = value ? parseLocalDate(value) : new Date();
  const [viewDate, setViewDate] = useState(initialDate);

  useEffect(() => {
    if (value) {
      setViewDate(parseLocalDate(value));
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleSelectDay = (e: React.MouseEvent, day: number, isCurrentMonth: 'prev' | 'curr' | 'next') => {
    e.preventDefault();
    let selectedYear = year;
    let selectedMonth = month;
    if (isCurrentMonth === 'prev') {
      selectedMonth = month - 1;
      if (selectedMonth < 0) {
        selectedMonth = 11;
        selectedYear = year - 1;
      }
    } else if (isCurrentMonth === 'next') {
      selectedMonth = month + 1;
      if (selectedMonth > 11) {
        selectedMonth = 0;
        selectedYear = year + 1;
      }
    }

    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${selectedYear}-${pad(selectedMonth + 1)}-${pad(day)}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const cells: { day: number; type: 'prev' | 'curr' | 'next'; isSelected: boolean; isToday: boolean }[] = [];

  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    cells.push({
      day: d,
      type: 'prev',
      isSelected: false,
      isToday: false,
    });
  }

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  for (let d = 1; d <= daysInMonth; d++) {
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`;
    cells.push({
      day: d,
      type: 'curr',
      isSelected: value === dateStr,
      isToday: todayStr === dateStr,
    });
  }

  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({
      day: d,
      type: 'next',
      isSelected: false,
      isToday: false,
    });
  }

  const monthsList = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return "Select Date";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const year = parts[0];
      const month = parts[1];
      const day = parts[2];
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  };

  return (
    <div className="flex-1 min-w-[200px] relative" ref={containerRef}>
      <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-1.5 pl-1">
        {label}
      </label>
      
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-11 items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 transition-all hover:border-slate-300 focus-within:border-[#fe5c13] focus-within:ring-4 focus-within:ring-[#fe5c13]/10 shadow-sm cursor-pointer select-none"
      >
        <div className="flex items-center gap-2.5">
          <Calendar className="h-4.5 w-4.5 text-slate-400 transition-colors" />
          <span className="text-xs font-bold text-slate-700">
            {formatDisplayDate(value)}
          </span>
        </div>
        <svg className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isOpen && (
        <div className="absolute top-[105%] left-0 z-50 w-[280px] rounded-2xl border border-slate-150 bg-white p-4 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-100 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <div className="text-xs font-black text-slate-800 uppercase tracking-wider">
              {monthsList[month]} {year}
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-100 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <span key={i} className="text-[10px] font-black uppercase tracking-wider text-slate-400 py-1">
                {d}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, idx) => {
              const isSelected = cell.isSelected;
              const isCurr = cell.type === 'curr';
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => handleSelectDay(e, cell.day, cell.type)}
                  className={`
                    h-8 w-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center relative
                    ${isSelected 
                      ? "bg-[#fe5c13] text-white shadow-md shadow-[#fe5c13]/25 scale-105" 
                      : isCurr 
                        ? "text-slate-700 hover:bg-slate-100" 
                        : "text-slate-300 hover:bg-slate-50"
                    }
                  `}
                >
                  {cell.day}
                  {cell.isToday && !isSelected && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-[#fe5c13]" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                const today = new Date();
                const pad = (n: number) => String(n).padStart(2, '0');
                const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
                onChange(todayStr);
                setIsOpen(false);
              }}
              className="text-[10px] font-black uppercase tracking-wider text-[#fe5c13] hover:text-[#e04f0f] transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setIsOpen(false);
              }}
              className="text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function CashDrawerPage() {
  const [summary, setSummary] = useState<CashDrawerSummary | null>(null);
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Form states
  const [amount, setAmount] = useState<string>("");
  const [note, setNote] = useState<string>("");

  // Modal open states
  const [openModalType, setOpenModalType] = useState<
    "open" | "cash_in" | "cash_out" | "close" | null
  >(null);

  // Historical explorer states
  const [activeTab, setActiveTab] = useState<"today" | "history">("today");
  const [rangeStart, setRangeStart] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [rangeEnd, setRangeEnd] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [rangeEvents, setRangeEvents] = useState<CashDrawerEvent[]>([]);
  const [isRangeLoading, setIsRangeLoading] = useState(false);
  const [hasQueriedRange, setHasQueriedRange] = useState(false);

  const fetchDrawerData = async () => {
    try {
      const [sumRes, shiftRes, meRes] = await Promise.all([
        api<CashDrawerSummary>("/api/admin/cash-drawer/summary"),
        api<{ shift: ActiveShift | null; is_clocked_in: boolean }>(
          "/api/admin/shifts/active",
        ).catch(() => ({ shift: null, is_clocked_in: false })),
        api<{ role?: string }>("/api/admin/me").catch(() => null),
      ]);

      if (sumRes) {
        setSummary(sumRes);
      }
      if (shiftRes?.is_clocked_in && shiftRes.shift) {
        setActiveShift(shiftRes.shift);
      } else {
        setActiveShift(null);
      }
      if (meRes?.role) {
        setUserRole(meRes.role);
      }
    } catch {
      toast.error("Failed to load cash drawer logs");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDrawerData();
  }, []);

  const handleQueryRange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRangeLoading(true);
    try {
      const startIso = new Date(rangeStart + "T00:00:00Z").toISOString();
      const endIso = new Date(rangeEnd + "T23:59:59Z").toISOString();
      const data = await api<CashDrawerEvent[]>(
        `/api/admin/cash-drawer/events/range?start=${startIso}&end=${endIso}`,
      );
      if (data) {
        setRangeEvents(data);
        setHasQueriedRange(true);
      }
    } catch {
      toast.error("Failed to load historical audits");
    } finally {
      setIsRangeLoading(false);
    }
  };

  const downloadPDFReport = (
    events: CashDrawerEvent[],
    start: string,
    end: string,
  ) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error(
        "Popup blocker blocked the report generation. Please allow popups.",
      );
      return;
    }

    let rangeCashIn = 0;
    let rangeCashOut = 0;
    let rangeSales = 0;
    let rangeShortages = 0;
    let rangeOverages = 0;
    let rangeClosingCount = 0;

    events.forEach((ev) => {
      if (ev.event_type === "cash_in") rangeCashIn += ev.amount;
      if (ev.event_type === "cash_out") rangeCashOut += ev.amount;
      if (ev.event_type === "sale") rangeSales += ev.amount;
      if (ev.event_type === "close") {
        rangeClosingCount++;
        const match = (ev.note || "").match(
          /\[Discrepancy: ([^ ]+) of ₹([^ ]+) /,
        );
        if (match) {
          const type = match[1].toLowerCase();
          const amtStr = match[2].replace(/,/g, "").replace(/₹/g, "");
          const amt = parseFloat(amtStr);
          if (!isNaN(amt)) {
            if (type.includes("shortage")) rangeShortages += amt;
            if (type.includes("overage")) rangeOverages += amt;
          }
        }
      }
    });

    const formattedStart = new Date(start).toLocaleDateString("en-IN", {
      dateStyle: "medium",
    });
    const formattedEnd = new Date(end).toLocaleDateString("en-IN", {
      dateStyle: "medium",
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>Cash Drawer Audit Report: ${formattedStart} - ${formattedEnd}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;900&display=swap');
            body {
              font-family: 'Inter', sans-serif;
              color: #0f172a;
              padding: 40px;
              margin: 0;
              background-color: #ffffff;
            }
            .header-container {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 24px;
              margin-bottom: 30px;
            }
            .title {
              font-size: 24px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin: 0;
            }
            .subtitle {
              font-size: 13px;
              color: #64748b;
              margin-top: 4px;
              font-weight: 600;
            }
            .meta-info {
              text-align: right;
              font-size: 12px;
              color: #64748b;
              font-weight: 500;
            }
            .grid-summary {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 16px;
              margin-bottom: 35px;
            }
            .card {
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 16px;
              background-color: #f8fafc;
            }
            .card-title {
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              color: #94a3b8;
              margin: 0 0 6px 0;
              letter-spacing: 0.5px;
            }
            .card-value {
              font-size: 18px;
              font-weight: 900;
              margin: 0;
            }
            .table-container {
              margin-top: 30px;
            }
            .table-title {
              font-size: 12px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 12px;
              color: #475569;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              text-align: left;
              font-size: 11px;
            }
            th {
              background-color: #f1f5f9;
              padding: 10px 12px;
              font-weight: 700;
              text-transform: uppercase;
              color: #475569;
              border-bottom: 1px solid #cbd5e1;
            }
            td {
              padding: 12px 12px;
              border-bottom: 1px solid #e2e8f0;
            }
            .badge {
              display: inline-block;
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 9px;
              font-weight: 700;
              text-transform: uppercase;
            }
            .badge-open { background-color: #e0e7ff; color: #4338ca; }
            .badge-close { background-color: #ffe4e6; color: #be123c; }
            .badge-cash_in { background-color: #d1fae5; color: #047857; }
            .badge-cash_out { background-color: #fef3c7; color: #b45309; }
            .badge-sale { background-color: #e0f2fe; color: #0369a1; }
            .badge-discrepancy {
              background-color: #fff1f2;
              color: #e11d48;
              border: 1px solid #fecdd3;
              font-weight: 800;
              padding: 3px 6px;
              border-radius: 4px;
              margin-top: 4px;
              display: inline-block;
            }
            .badge-discrepancy-over {
              background-color: #fef3c7;
              color: #d97706;
              border: 1px solid #fde68a;
              font-weight: 800;
              padding: 3px 6px;
              border-radius: 4px;
              margin-top: 4px;
              display: inline-block;
            }
            .note-cell {
              max-width: 250px;
              word-break: break-all;
            }
            .discrepancy-banner {
              border-radius: 12px;
              padding: 16px;
              margin-bottom: 30px;
              font-size: 12px;
            }
            .discrepancy-red {
              background-color: #fff5f5;
              border: 1px solid #feb2b2;
              color: #9b2c2c;
            }
            .discrepancy-orange {
              background-color: #fffaf0;
              border: 1px solid #fbd38d;
              color: #dd6b20;
            }
            .discrepancy-green {
              background-color: #f0fff4;
              border: 1px solid #9ae6b4;
              color: #22543d;
            }
            @media print {
              body { padding: 0; }
              .card { background-color: #f8fafc !important; print-color-adjust: exact; }
              th { background-color: #f1f5f9 !important; print-color-adjust: exact; }
              .badge-open { background-color: #e0e7ff !important; print-color-adjust: exact; }
              .badge-close { background-color: #ffe4e6 !important; print-color-adjust: exact; }
              .badge-cash_in { background-color: #d1fae5 !important; print-color-adjust: exact; }
              .badge-cash_out { background-color: #fef3c7 !important; print-color-adjust: exact; }
              .badge-sale { background-color: #e0f2fe !important; print-color-adjust: exact; }
              .badge-discrepancy { background-color: #fff1f2 !important; print-color-adjust: exact; }
              .badge-discrepancy-over { background-color: #fef3c7 !important; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div>
              <h1 class="title">Cash Drawer Audit Report</h1>
              <div class="subtitle">Range: ${formattedStart} to ${formattedEnd}</div>
            </div>
            <div class="meta-info">
              <div>Generated: ${new Date().toLocaleString("en-IN")}</div>
              <div>Audited Closings: ${rangeClosingCount}</div>
            </div>
          </div>

          ${
            rangeShortages > 0 || rangeOverages > 0
              ? `
            <div class="discrepancy-banner ${rangeShortages > 0 ? "discrepancy-red" : "discrepancy-orange"}">
              <strong>🚨 CRITICAL CASH RECONCILIATION SUMMARY:</strong> Over this date range, there was a total accumulated 
              <strong>shortage of ₹${rangeShortages.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong> and an 
              <strong>overage of ₹${rangeOverages.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>.
            </div>
          `
              : `
            <div class="discrepancy-banner discrepancy-green">
              <strong>✨ HEALTHY CASH RECONCILIATION SUMMARY:</strong> Till is perfectly reconciled. No cash shortages or surpluses detected in this range!
            </div>
          `
          }

          <div class="grid-summary">
            <div class="card">
              <h3 class="card-title">Total Cash In</h3>
              <p class="card-value" style="color: #059669;">+₹${rangeCashIn.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
            </div>
            <div class="card">
              <h3 class="card-title">Total Cash Out</h3>
              <p class="card-value" style="color: #d97706;">-₹${rangeCashOut.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
            </div>
            <div class="card">
              <h3 class="card-title">Total Sales (Cash)</h3>
              <p class="card-value" style="color: #0284c7;">₹${rangeSales.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
            </div>
            <div class="card" style="background-color: #0f172a; color: #ffffff;">
              <h3 class="card-title" style="color: #94a3b8;">Net Discrepancy</h3>
              <p class="card-value" style="color: ${rangeShortages > rangeOverages ? "#f43f5e" : "#10b981"};">
                ${rangeShortages > rangeOverages ? "-" : "+"}₹${Math.abs(rangeOverages - rangeShortages).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div class="table-container">
            <h2 class="table-title">Full Transaction & Audit Log</h2>
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Audited By</th>
                  <th>Event Type</th>
                  <th>Amount</th>
                  <th>Reason / Context</th>
                </tr>
              </thead>
              <tbody>
                ${events
                  .map((ev) => {
                    const typeClass = "badge-" + ev.event_type;
                    const isNegative =
                      ev.event_type === "cash_out" || ev.event_type === "close";
                    const noteText = ev.note || "";
                    const match = noteText.match(/^\[Discrepancy: ([^\]]+)\]/);
                    let noteHtml = ev.note || "--";

                    if (match) {
                      const discrepancyDetail = match[1];
                      const userNote = noteText.replace(
                        /^\[Discrepancy: [^\]]+\]\s*/,
                        "",
                      );
                      const isShortage = discrepancyDetail
                        .toLowerCase()
                        .includes("shortage");
                      noteHtml = `
                      <div>
                        <div class="${isShortage ? "badge-discrepancy" : "badge-discrepancy-over"}">
                          ⚠️ ${discrepancyDetail}
                        </div>
                        ${userNote ? `<div style="margin-top: 4px; font-weight: 600;">${userNote}</div>` : ""}
                      </div>
                    `;
                    }

                    return `
                    <tr>
                      <td style="color: #64748b;">${new Date(ev.created_at).toLocaleString("en-IN")}</td>
                      <td style="font-weight: 600;">${ev.user_name}</td>
                      <td><span class="badge ${typeClass}">${ev.event_type}</span></td>
                      <td style="font-weight: 700;">${isNegative ? "-" : "+"}₹${ev.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                      <td class="note-cell">${noteHtml}</td>
                    </tr>
                  `;
                  })
                  .join("")}
              </tbody>
            </table>
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const handleRecordEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openModalType) return;
    const parsedAmt = parseFloat(amount);
    if (isNaN(parsedAmt) || parsedAmt < 0) {
      toast.error("Please enter a valid non-negative amount");
      return;
    }

    let finalNote = note;
    if (openModalType === "close" && summary) {
      const diff = parsedAmt - summary.expected_cash;
      if (diff !== 0) {
        const isShortage = diff < 0;
        const discrepancyText = `[Discrepancy: ${isShortage ? "Shortage" : "Overage"} of ${fmtINR(Math.abs(diff))} (Expected: ${fmtINR(summary.expected_cash)}, Actual: ${fmtINR(parsedAmt)})]`;
        finalNote = discrepancyText + (note ? " " + note : "");
      }
    }

    setIsActionLoading(true);
    try {
      await api("/api/admin/cash-drawer/event", {
        method: "POST",
        body: JSON.stringify({
          event_type: openModalType,
          amount: parsedAmt,
          note: finalNote,
          shift_id: activeShift?.id || "",
        }),
      });

      toast.success(
        openModalType === "open"
          ? "Cash drawer opened successfully"
          : openModalType === "close"
            ? "Cash drawer closed successfully"
            : "Transaction logged successfully",
      );

      setAmount("");
      setNote("");
      setOpenModalType(null);
      await fetchDrawerData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to record event");
    } finally {
      setIsActionLoading(false);
    }
  };

  const getEventBadgeClass = (type: string) => {
    switch (type) {
      case "open":
        return "bg-indigo-100 text-indigo-700 border-indigo-200";
      case "close":
        return "bg-rose-100 text-rose-700 border-rose-200";
      case "cash_in":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "cash_out":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "sale":
        return "bg-sky-100 text-sky-700 border-sky-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const fmtINR = (n: number) =>
    `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
      <StaffSidebar />
      <div className="flex-1 flex flex-col min-w-0 relative">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shrink-0 shadow-sm flex flex-col">
          <div className="flex items-start justify-between px-8 py-6">
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-900">Cash Drawer Management</h2>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mt-1">
                <span className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  Track shift floats, cash-in/out, and till drops.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {summary && summary.is_open ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setOpenModalType("cash_in")}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-4 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 shadow-sm"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Cash In
                  </button>
                  <button
                    onClick={() => setOpenModalType("cash_out")}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-white px-4 py-2 text-xs font-bold text-amber-700 hover:bg-amber-50 shadow-sm"
                  >
                    <MinusCircle className="h-4 w-4" />
                    Cash Out
                  </button>
                  <button
                    onClick={() => setOpenModalType("close")}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 shadow-sm"
                  >
                    <Lock className="h-4 w-4" />
                    Close Drawer
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 border border-slate-200">
                    <Lock className="h-4 w-4" />
                    Closed
                  </div>
                  <button
                    onClick={() => {
                      setOpenModalType("open");
                      if (summary && summary.last_closed_amount !== undefined) {
                        setAmount(summary.last_closed_amount.toString());
                      } else {
                        setAmount("");
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-sm hover:bg-slate-800 transition-all"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Open Drawer
                  </button>
                </div>
              )}
              <div className="h-6 w-px bg-slate-200 mx-1"></div>
              <button
                onClick={fetchDrawerData}
                className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>

          {/* Stats Row inside header */}
          {summary && summary.is_open && (
            <div className="px-8 pb-6">
              <div className="flex bg-slate-50 border border-slate-200 rounded-xl divide-x divide-slate-200 shadow-sm overflow-hidden">
                <div className="flex-1 p-5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Opening Float</p>
                  <p className="mt-1 text-2xl font-black text-slate-900">{fmtINR(summary.opening_float)}</p>
                </div>
                <div className="flex-1 p-5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Cash In-Out</p>
                  <p className="mt-1 text-2xl font-black text-slate-900 flex items-center gap-1.5">
                    <span className="text-emerald-600">+{summary.total_cash_in}</span>
                    <span className="text-slate-300 text-sm">/</span>
                    <span className="text-amber-600">-{summary.total_cash_out}</span>
                  </p>
                </div>
                <div className="flex-1 p-5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Sales (Cash)</p>
                  <p className="mt-1 text-2xl font-black text-sky-600">{fmtINR(summary.total_sales)}</p>
                </div>
                <div className="flex-1 p-5 bg-slate-900 text-white relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent"></div>
                  <div className="relative">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Expected Cash In Till</p>
                    <p className="mt-1 text-2xl font-black text-orange-500">{fmtINR(summary.expected_cash)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!summary?.is_open && summary?.last_discrepancy !== undefined && summary.last_discrepancy !== 0 && (
            <div className="px-8 pb-6">
              <div className={`rounded-xl border p-4 shadow-sm flex items-center justify-between gap-4 ${
                summary.last_discrepancy < 0 
                  ? "border-rose-200 bg-rose-50/50 text-rose-900" 
                  : "border-amber-200 bg-amber-50/50 text-amber-900"
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 shadow-sm border ${
                    summary.last_discrepancy < 0 
                      ? "bg-rose-100 text-rose-600 border-rose-200" 
                      : "bg-amber-100 text-amber-600 border-amber-200"
                  }`}>
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider">
                      UNRESOLVED TILL DISCREPANCY DETECTED
                    </h4>
                    <p className="text-xs font-bold mt-0.5">
                      The previous shift closed with a {summary.last_discrepancy < 0 ? "Shortage" : "Overage"} of {fmtINR(Math.abs(summary.last_discrepancy))}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                   <p className="text-[10px] font-semibold uppercase">
                      Expected: {fmtINR(summary.last_expected_amount || 0)} | Counted: {fmtINR(summary.last_closed_amount || 0)}
                   </p>
                   <p className="text-[10px] opacity-75 mt-0.5 font-medium">
                      Closed by <span className="font-bold">{summary.last_closed_by || "Unknown"}</span> on {new Date(summary.last_closed_at!).toLocaleString("en-IN")}
                   </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab Selector */}
          {((userRole || "").toLowerCase() === "owner" || (userRole || "").toLowerCase() === "manager") && (
            <div className="flex gap-6 border-t border-slate-200 px-8 bg-white">
              <button
                onClick={() => setActiveTab("today")}
                className={`pb-3 pt-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
                  activeTab === "today"
                    ? "border-[#fe5c13] text-[#fe5c13]"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Today's Live Ledger
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`pb-3 pt-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
                  activeTab === "history"
                    ? "border-[#fe5c13] text-[#fe5c13]"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Historical Audits Explorer
              </button>
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50">
          {isLoading ? (
            <div className="flex min-h-[50vh] items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Clock className="h-8 w-8 animate-spin text-orange-500" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Syncing Till Float...</p>
              </div>
            </div>
          ) : (
            <div className="h-full">
              {activeTab === "today" ? (
                <div className="bg-white min-h-full">
                  <div className="border-b px-8 py-5 flex items-center justify-between bg-white">
                    <div className="flex items-center gap-2">
                      <History className="h-4.5 w-4.5 text-slate-400" />
                      <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Today's Audit Ledger</h2>
                    </div>
                    {!summary?.is_open && (
                      <span className="inline-flex rounded-full bg-slate-100 border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-500">
                        DRAWER LOCKED
                      </span>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">
                          <th className="px-8 py-4 w-40">Time</th>
                          <th className="px-8 py-4 w-48">Logged By</th>
                          <th className="px-8 py-4 w-40">Event Type</th>
                          <th className="px-8 py-4 w-48">Amount</th>
                          <th className="px-8 py-4">Note / Context</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                        {!summary || summary.events.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-8 py-12 text-center text-slate-400 font-bold uppercase tracking-wider">
                              No cash drawer activity recorded today.
                            </td>
                          </tr>
                        ) : (
                          summary.events.map((ev) => (
                            <tr key={ev.id} className="hover:bg-slate-50/40 transition-colors">
                              <td className="px-8 py-4 font-extrabold text-slate-400">
                                {new Date(ev.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                              </td>
                              <td className="px-8 py-4 font-bold text-slate-900">{ev.user_name}</td>
                              <td className="px-8 py-4">
                                <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${getEventBadgeClass(ev.event_type)}`}>
                                  {ev.event_type}
                                </span>
                              </td>
                              <td className="px-8 py-4 font-extrabold text-slate-800">
                                {ev.event_type === "cash_out" || ev.event_type === "close" ? "-" : "+"}
                                {fmtINR(ev.amount)}
                              </td>
                              <td className="px-8 py-4 font-semibold text-slate-455 break-all max-w-[400px]">
                                {(() => {
                                  const noteText = ev.note || "";
                                  const match = noteText.match(/^\[Discrepancy: ([^\]]+)\]/);
                                  if (match) {
                                    const discrepancyDetail = match[1];
                                    const userNote = noteText.replace(/^\[Discrepancy: [^\]]+\]\s*/, "");
                                    const isShortage = discrepancyDetail.toLowerCase().includes("shortage");
                                    return (
                                      <div className="space-y-1">
                                        <div className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-black uppercase border ${
                                          isShortage ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                                        }`}>
                                          <ShieldAlert className="h-3 w-3" />
                                          {discrepancyDetail}
                                        </div>
                                        {userNote && <p className="text-xs font-semibold text-slate-700">{userNote}</p>}
                                      </div>
                                    );
                                  }
                                  return ev.note || "--";
                                })()}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-8 space-y-6">
                  {/* Range Query form */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <form onSubmit={handleQueryRange} className="flex flex-wrap items-end gap-4">
                      <CustomDatePicker
                        label="Start Date"
                        value={rangeStart}
                        onChange={setRangeStart}
                      />
                      <CustomDatePicker
                        label="End Date"
                        value={rangeEnd}
                        onChange={setRangeEnd}
                      />
                      <button
                        type="submit"
                        disabled={isRangeLoading}
                        className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm disabled:opacity-50 transition-all"
                      >
                        <Search className="h-4 w-4" />
                        {isRangeLoading ? "Searching..." : "Search Audits"}
                      </button>
                    </form>
                  </div>

                  {hasQueriedRange && (
                    <div className="space-y-6">
                      {/* Range Aggregate stats card */}
                      {(() => {
                        let rCashIn = 0;
                        let rCashOut = 0;
                        let rSales = 0;
                        let rShortages = 0;
                        let rOverages = 0;
                        let rClosings = 0;

                        rangeEvents.forEach(ev => {
                          if (ev.event_type === "cash_in") rCashIn += ev.amount;
                          if (ev.event_type === "cash_out") rCashOut += ev.amount;
                          if (ev.event_type === "sale") rSales += ev.amount;
                          if (ev.event_type === "close") {
                            rClosings++;
                            const match = (ev.note || "").match(/\[Discrepancy: ([^ ]+) of ₹([^ ]+) /);
                            if (match) {
                              const type = match[1].toLowerCase();
                              const amtStr = match[2].replace(/,/g, "").replace(/₹/g, "");
                              const amt = parseFloat(amtStr);
                              if (!isNaN(amt)) {
                                if (type.includes("shortage")) rShortages += amt;
                                if (type.includes("overage")) rOverages += amt;
                              }
                            }
                          }
                        });

                        return (
                          <>
                            <div className="flex flex-wrap justify-between items-center gap-2">
                              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                                Audits Result ({rangeEvents.length} entries, {rClosings} closings)
                              </h3>
                              <button
                                onClick={() => downloadPDFReport(rangeEvents, rangeStart, rangeEnd)}
                                className="inline-flex items-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 text-xs font-black uppercase tracking-wider shadow-sm transition-all"
                              >
                                <FileText className="h-4.5 w-4.5" />
                                Download PDF Report
                              </button>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Cash In</p>
                                <p className="mt-1 text-2xl font-black text-emerald-600">+{fmtINR(rCashIn)}</p>
                              </div>
                              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Cash Out</p>
                                <p className="mt-1 text-2xl font-black text-amber-600">-{fmtINR(rCashOut)}</p>
                              </div>
                              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Sales (Cash)</p>
                                <p className="mt-1 text-2xl font-black text-sky-600">{fmtINR(rSales)}</p>
                              </div>
                              <div className="rounded-2xl border border-slate-200 bg-slate-900 p-5 shadow-md text-white">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Net Discrepancies</p>
                                <p className={`mt-1 text-2xl font-black ${
                                  rShortages > rOverages ? 'text-rose-500' : 'text-emerald-500'
                                }`}>
                                  {rShortages > rOverages ? '-' : '+'}
                                  {fmtINR(Math.abs(rOverages - rShortages))}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-1 uppercase font-semibold">
                                  Shortages: {fmtINR(rShortages)} | Overages: {fmtINR(rOverages)}
                                </p>
                              </div>
                            </div>
                          </>
                        );
                      })()}

                      {/* Historical Audit table */}
                      <div className="bg-white min-h-full flex flex-col mt-6 border-t border-slate-100">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">
                                <th className="px-8 py-4">Date & Time</th>
                                <th className="px-8 py-4">Logged By</th>
                                <th className="px-8 py-4">Event Type</th>
                                <th className="px-8 py-4">Amount</th>
                                <th className="px-8 py-4">Note / Context</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700 text-xs bg-white">
                              {rangeEvents.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="px-8 py-12 text-center text-slate-400 font-bold uppercase tracking-wider">
                                    No drawer activity audited in this range.
                                  </td>
                                </tr>
                              ) : (
                                rangeEvents.map((ev) => (
                                  <tr key={ev.id} className="hover:bg-slate-50/40 transition-colors group">
                                    <td className="px-8 py-4">
                                      <span className="font-extrabold text-slate-800 block">
                                        {new Date(ev.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                      </span>
                                      <span className="text-[10px] text-slate-450 font-semibold uppercase tracking-wider">
                                        {new Date(ev.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                                      </span>
                                    </td>
                                    <td className="px-8 py-4">
                                      <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 border border-slate-200/60">
                                          {ev.user_name.substring(0,2).toUpperCase()}
                                        </div>
                                        <span className="font-bold text-slate-900">{ev.user_name}</span>
                                      </div>
                                    </td>
                                    <td className="px-8 py-4">
                                      <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${getEventBadgeClass(ev.event_type)}`}>
                                        {ev.event_type}
                                      </span>
                                    </td>
                                    <td className="px-8 py-4 font-extrabold text-sm">
                                      <span className={ev.event_type === "cash_out" || ev.event_type === "close" ? "text-amber-600" : "text-emerald-600"}>
                                        {ev.event_type === "cash_out" || ev.event_type === "close" ? "-" : "+"}
                                        {fmtINR(ev.amount)}
                                      </span>
                                    </td>
                                    <td className="px-8 py-4 font-semibold text-slate-455 break-all max-w-[250px]">
                                      {(() => {
                                        const noteText = ev.note || "";
                                        const match = noteText.match(/^\[Discrepancy: ([^\]]+)\]/);
                                        if (match) {
                                          const discrepancyDetail = match[1];
                                          const userNote = noteText.replace(/^\[Discrepancy: [^\]]+\]\s*/, "");
                                          const isShortage = discrepancyDetail.toLowerCase().includes("shortage");
                                          return (
                                            <div className="space-y-1">
                                              <div className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-black uppercase border ${
                                                isShortage ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                                              }`}>
                                                <ShieldAlert className="h-3 w-3" />
                                                {discrepancyDetail}
                                              </div>
                                              {userNote && <p className="text-xs font-semibold text-slate-700">{userNote}</p>}
                                            </div>
                                          );
                                        }
                                        return ev.note || "--";
                                      })()}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

            {/* Reconciliation Modal */}
            {openModalType && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
                <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl border border-slate-100 overflow-y-auto relative">
                  <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-base font-black text-slate-900 uppercase tracking-widest">
                      {openModalType === "open" && "Open Cash Drawer"}
                      {openModalType === "close" && "Close & Reconcile"}
                      {openModalType === "cash_in" && "Log Cash-In"}
                      {openModalType === "cash_out" && "Log Cash-Out"}
                    </h3>
                  </div>

                  <form onSubmit={handleRecordEvent} className="space-y-4">
                    

                    {openModalType === "close" && summary && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 mb-4 text-xs">
                        <div className="flex justify-between font-bold text-slate-600 mb-1">
                          <span>Expected Cash in Drawer:</span>
                          <span className="text-orange-500 font-extrabold">
                            {fmtINR(summary.expected_cash)}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-1">
                          Reconciliation: Count the actual cash in the till
                          below. Any shortage or surplus will be flagged in the
                          audit logs.
                        </p>
                      </div>
                    )}

                    {openModalType === "close" &&
                      summary &&
                      amount &&
                      (() => {
                        const parsedAmt = parseFloat(amount);
                        if (isNaN(parsedAmt) || parsedAmt < 0) return null;
                        const diff = parsedAmt - summary.expected_cash;
                        if (diff === 0) {
                          return (
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 mb-4 text-xs flex items-center gap-2 text-emerald-800 font-bold">
                              <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
                              Till is perfectly balanced! No discrepancy.
                            </div>
                          );
                        }
                        const isShortage = diff < 0;
                        const absDiff = Math.abs(diff);
                        return (
                          <div
                            className={`rounded-xl border p-3.5 mb-4 text-xs ${
                              isShortage
                                ? "border-rose-200 bg-rose-50 text-rose-800"
                                : "border-amber-200 bg-amber-50 text-amber-800"
                            }`}
                          >
                            <div className="flex items-center gap-2 font-black uppercase text-[10px] mb-1">
                              <ShieldAlert className="h-4 w-4" />
                              Till Discrepancy Detected
                            </div>
                            <p className="font-bold">
                              Difference:{" "}
                              <span className="font-extrabold">
                                {isShortage ? "Shortage" : "Overage"} of{" "}
                                {fmtINR(absDiff)}
                              </span>
                            </p>
                            <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-1">
                              Expected: {fmtINR(summary.expected_cash)} |
                              Actual: {fmtINR(parsedAmt)}
                            </p>
                            <p className="text-[9px] font-semibold text-rose-600 mt-2">
                              ⚠️ WARNING: This discrepancy will be logged
                              permanently in the audit ledger and reported to
                              the owner/manager.
                            </p>
                          </div>
                        );
                      })()}

                    <div>
                      <label className="text-xs font-black uppercase tracking-wider text-slate-400">
                        {openModalType === "open" && "Starting Float (₹)"}
                        {openModalType === "close" && "Actual Cash Counted (₹)"}
                        {openModalType === "cash_in" && "Amount to Add (₹)"}
                        {openModalType === "cash_out" &&
                          "Amount to Withdraw (₹)"}
                      </label>
                      <input
                        type="number"
                        required
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-sm focus:border-orange-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-black uppercase tracking-wider text-slate-400">
                        Reason / Auditing Notes
                      </label>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder={
                          openModalType === "open"
                            ? "Opening shift notes..."
                            : openModalType === "close"
                              ? "Till reconciliation remarks..."
                              : "Add verification context..."
                        }
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm focus:border-orange-500 focus:outline-none h-20 resize-none"
                      />
                    </div>

                    <div className="flex gap-2 pt-3 border-t">
                      <button
                        type="button"
                        onClick={() => {
                          setOpenModalType(null);
                          setAmount("");
                          setNote("");
                        }}
                        className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 shadow-sm"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isActionLoading}
                        className="flex-1 rounded-xl bg-[#fe5c13] py-3 text-xs font-black uppercase tracking-wider text-white hover:brightness-95 shadow-md shadow-[#fe5c13]/20 disabled:opacity-50"
                      >
                        {isActionLoading ? "Recording..." : "Audit Transaction"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
      </div>
    </div>
  );
}
