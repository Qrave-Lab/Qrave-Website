"use client";

import { Printer } from "lucide-react";
import { api } from "@/app/lib/api";
import { printBillTicket } from "@/app/lib/posPrinter";

export function PrintButton({ 
  sessionId, 
  tableCode, 
  items, 
  total 
}: { 
  sessionId?: string; 
  tableCode?: string;
  items?: any[];
  total?: number;
}) {
  const handlePrint = async () => {
    if (typeof window !== "undefined") {
      const me = await api<{ name?: string }>("/api/admin/me", { method: "GET", suppressErrorLog: true }).catch(() => null);

      if (sessionId) {
        try {
          await api(`/api/admin/sessions/${sessionId}/end`, { method: "POST", suppressErrorLog: true });
          await printBillTicket({
            tableCode: tableCode || "T-",
            printedAt: new Date().toLocaleString(),
            staffName: me?.name || "NA",
            items,
            total,
          });
        } catch {
          // best effort
        }
      }
      window.print();
    }
  };

  return (
    <button
      onClick={handlePrint}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 print:hidden"
    >
      <Printer className="w-4 h-4" />
      Print bill
    </button>
  );
}
