"use client";

import React, { useEffect, useState } from "react";
import SettingsPageLayout from "@/app/components/settings/SettingsPageLayout";
import { getBillTemplate, setBillTemplate, type BillTemplate } from "@/app/lib/posPrinter";
import { Check, Receipt } from "lucide-react";
import { toast } from "react-hot-toast";

const TEMPLATES: { id: BillTemplate; name: string; description: string; preview: string }[] = [
  {
    id: "cafe",
    name: "Cafe",
    description: "Lots of spacing, minimalist, tip & sign lines.",
    preview: "          THE COFFEE SHOP         \n==================================\n\n1x Latte                  $   6.50\n1x Croissant              $   4.00\n\n==================================\nSubtotal                  $  10.50\nTax                       $   0.50\nTOTAL                     $  11.00\n\nTip:  ___________________________\n\nSign: ___________________________\n\n       Thank you, come again!    ",
  },
  {
    id: "fine_dining",
    name: "Fine Dining",
    description: "Elegant, centered layout with subtle dotted lines.",
    preview: "             L'ETOILE             \n..................................\n\n   1   Steak Frites          45.00\n   2   Wine Glass            24.00\n\n..................................\n          Subtotal:          69.00\n          Tax     :           3.45\n\n        GRAND TOTAL:         72.45\n..................................\n        Served by: John         ",
  },
  {
    id: "retail",
    name: "Retail Grid",
    description: "Classic column-based supermarket format.",
    preview: "          SUPERMART INC           \nTable: T4                         \n----------------------------------\nItem                  Qty    Total\n----------------------------------\nGourmet Burger\n  1 @ 15.00                  15.00\nSweet Potato Fries\n  2 @ 5.00                   10.00\n----------------------------------\nTOTAL DUE:                  $25.00\n----------------------------------\n         Items Sold: 3           ",
  },
  {
    id: "fast_food",
    name: "Fast Food",
    description: "Huge order numbers for quick calling out.",
    preview: "==================================\n         ORDER # 56         \n==================================\nT4 | 12:30 PM | Cashier: Sarah\n----------------------------------\n1  BURGER                  10.00\n2  FRIES                   10.00\n1  COLA                     3.00\n----------------------------------\nDUE:                       23.00\n==================================",
  },
  {
    id: "tax_invoice",
    name: "Tax Invoice",
    description: "Explicit tax breakdown for official documentation.",
    preview: "           TAX INVOICE            \n----------------------------------\nTable: T4    Served: Alex\n----------------------------------\nItem           Qty   Rate    Value\n----------------------------------\nBurger           1  10.00    10.00\nFries            2   5.00    10.00\n----------------------------------\nSubtotal                   20.00\nCGST (2.5%)                 0.50\nSGST (2.5%)                 0.50\n----------------------------------\nGRAND TOTAL                21.00\n----------------------------------\n      GSTIN: 29ABCDE1234F1Z5      ",
  },
  {
    id: "compact",
    name: "Compact",
    description: "Super dense formatting to save thermal paper.",
    preview: "QRAVE POS\nT4 | 12:30PM | By: John\n----------------------------------\n1x Burger                  10.00\n2x Fries                   10.00\n----------------------------------\nTOT:                       20.00\nThx!",
  },
];

export default function ReceiptSettingsPage() {
  const [selected, setSelected] = useState<BillTemplate>("retail");
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
