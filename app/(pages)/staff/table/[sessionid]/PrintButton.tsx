"use client";

import { Printer } from "lucide-react";
import { api } from "@/app/lib/api";

export function PrintButton({ sessionId }: { sessionId?: string }) {
  const handlePrint = async () => {
    if (typeof window !== "undefined") {
      if (sessionId) {
        try {
          await api(`/api/admin/sessions/${sessionId}/end`, { method: "POST" });
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
