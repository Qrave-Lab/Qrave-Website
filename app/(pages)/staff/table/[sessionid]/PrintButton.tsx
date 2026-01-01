"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  const handlePrint = () => {
    if (typeof window !== "undefined") {
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
