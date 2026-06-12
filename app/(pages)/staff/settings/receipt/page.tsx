"use client";

import React, { useEffect, useState } from "react";
import SettingsPageLayout from "@/app/components/settings/SettingsPageLayout";
import { getBillTemplate, setBillTemplate, type BillTemplate } from "@/app/lib/posPrinter";
import { Check, Receipt } from "lucide-react";
import { toast } from "react-hot-toast";

const TEMPLATES: { id: BillTemplate; name: string; description: string; preview: string }[] = [
  {
    id: "classic",
    name: "Classic",
    description: "The standard default layout.",
    preview: "------------------\n1x Burger    10.00\n1x Fries      5.00\n------------------\nTOTAL        15.00",
  },
  {
    id: "minimalist",
    name: "Minimalist",
    description: "Clean, less lines, more whitespace.",
    preview: "\n1x Burger    10.00\n1x Fries      5.00\n\nTotal        15.00\n",
  },
  {
    id: "detailed",
    name: "Detailed",
    description: "Multi-line item breakdown.",
    preview: "Burger\n1 x 10.00    10.00\nFries\n1 x 5.00      5.00\n------------------\nTOTAL        15.00",
  },
  {
    id: "modern",
    name: "Modern",
    description: "Centered headers and asterisk lines.",
    preview: "******************\n1 Burger     10.00\n1 Fries       5.00\n******************\nTOTAL:       15.00",
  },
  {
    id: "compact",
    name: "Compact",
    description: "Dense spacing to save thermal paper.",
    preview: "1x Burger      10.00\n1x Fries        5.00\n------------------\nTOT:         15.00",
  },
  {
    id: "elegant",
    name: "Elegant",
    description: "Double border accents for a premium feel.",
    preview: "==================\n1x Burger    10.00\n1x Fries      5.00\n------------------\nTotal Due    15.00\n==================",
  },
];

export default function ReceiptSettingsPage() {
  const [selected, setSelected] = useState<BillTemplate>("classic");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setSelected(getBillTemplate());
    setMounted(true);
  }, []);

  const handleSelect = (id: BillTemplate) => {
    setSelected(id);
    setBillTemplate(id);
    toast.success("Receipt template updated");
  };

  if (!mounted) return null;

  return (
    <SettingsPageLayout
      title="Receipts & Billing"
      description="Choose how printed bills are formatted for your customers."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => handleSelect(t.id)}
            className={`relative flex flex-col items-start p-6 rounded-2xl border text-left transition-all ${
              selected === t.id
                ? "border-emerald-500 bg-emerald-50/30 shadow-md ring-1 ring-emerald-500"
                : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
            }`}
          >
            {selected === t.id && (
              <div className="absolute top-4 right-4 h-6 w-6 bg-emerald-500 rounded-full flex items-center justify-center">
                <Check className="h-3.5 w-3.5 text-white" />
              </div>
            )}
            <div className={`p-2.5 rounded-xl ${selected === t.id ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-600"}`}>
              <Receipt className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-bold text-slate-900 text-base">{t.name}</h3>
            <p className="mt-1 text-sm text-slate-500">{t.description}</p>
            
            <div className="mt-6 w-full p-4 bg-[#F7F2EB] rounded-lg border border-[#EDE5D8]">
              <pre className="text-[10px] sm:text-xs text-[#3D2B1F] font-mono leading-relaxed whitespace-pre-wrap">
                {t.preview}
              </pre>
            </div>
          </button>
        ))}
      </div>
    </SettingsPageLayout>
  );
}
