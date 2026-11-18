"use client";

import React, { useEffect, useMemo, useState } from "react";
import SettingsPageLayout from "@/app/components/settings/SettingsPageLayout";
import { 
  getBillConfig, 
  setBillConfig, 
  generateBillText, 
  type BillConfig, 
  type BillTemplate,
  DEFAULT_BILL_CONFIG 
} from "@/app/lib/posPrinter";
import { api } from "@/app/lib/api";
import { Check, Loader2, Printer, QrCode, RotateCcw, Store } from "lucide-react";
import { toast } from "react-hot-toast";
import { QRCodeSVG } from "qrcode.react";
import Barcode from "react-barcode";

const MOCK_SAMPLE_ITEMS = [
  { name: "Caesar Salad", qty: 2, amount: 240.00 },
  { name: "Grilled Salmon", qty: 1, amount: 480.00 },
  { name: "Cheesecake", qty: 1, amount: 180.00 },
  { name: "Sparkling Water", qty: 2, amount: 120.00 }
];

const PRESETS: { id: BillTemplate; name: string; config: Partial<BillConfig> }[] = [
  {
    id: "dinefine",
    name: "DineFine",
    config: {
      templateId: "dinefine",
      showLogo: true,
      showRestaurantName: true,
      showAddress: true,
      showPhone: true,
      showWebsite: true,
      showReceiptNumber: true,
      showTable: true,
      showCashier: true,
      showGuests: true,
      showTaxBreakdown: true,
      showGstin: false,
      showTipNotice: false,
      showFooterText: true,
      showBarcode: true,
      showQrCode: false,
    }
  },
  {
    id: "cafe",
    name: "Cafe & Bistro",
    config: {
      templateId: "cafe",
      showLogo: true,
      showRestaurantName: true,
      showAddress: true,
      showPhone: true,
      showWebsite: false,
      showReceiptNumber: true,
      showTable: true,
      showCashier: true,
      showGuests: false,
      showTaxBreakdown: true,
      showTipNotice: false,
      showFooterText: true,
      showBarcode: false,
      showQrCode: true,
    }
  },
  {
    id: "tax_invoice",
    name: "Tax Invoice",
    config: {
      templateId: "tax_invoice",
      showLogo: true,
      showRestaurantName: true,
      showAddress: true,
      showPhone: true,
      showWebsite: true,
      showGstin: true,
      showReceiptNumber: true,
      showTable: true,
      showCashier: true,
      showGuests: true,
      showTaxBreakdown: true,
      showTipNotice: false,
      showFooterText: true,
      showBarcode: true,
      showQrCode: false,
    }
  },
  {
    id: "fast_food",
    name: "Fast Food",
    config: {
      templateId: "fast_food",
      showLogo: true,
      showRestaurantName: true,
      showAddress: false,
      showPhone: true,
      showWebsite: false,
      showReceiptNumber: true,
      showTable: false,
      showCashier: false,
      showGuests: false,
      showTaxBreakdown: false,
      showTipNotice: false,
      showFooterText: true,
      showBarcode: true,
      showQrCode: false,
    }
  }
];


const PRESET_NOTES: Record<string, string> = {
  dinefine: "Full details with a barcode",
  cafe: "Friendly, with a UPI QR",
  tax_invoice: "GST-ready, shows GSTIN",
  fast_food: "Short and quick",
};

/* ---------- Pieces (Qrave palette) ---------- */

const FIELD =
  "h-9 w-full rounded-lg border border-[#E8E8E3] bg-white px-3 text-[13px] text-[#0F1117] outline-none transition-colors placeholder:text-[#9CA3AF] hover:border-[#D6D6CF] focus:border-[#fe5c13]";
const BTN_SECONDARY =
  "inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-xl border border-[#E8E8E3] bg-white px-3.5 text-[13px] font-semibold text-[#374151] transition-colors hover:border-[#D6D6CF] hover:text-[#0F1117] disabled:opacity-50";

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#E8E8E3] bg-white">
      <div className="border-b border-[#F0F0EB] px-6 py-4">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-[#0F1117]">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-[#6B7280]">{description}</p>}
      </div>
      <div className="px-6 py-2">{children}</div>
    </section>
  );
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fe5c13]/40 focus-visible:ring-offset-2 ${checked ? "bg-[#fe5c13]" : "bg-[#D6D6CF]"}`}
    >
      <span className={`absolute left-0.5 h-4 w-4 rounded-full bg-white shadow-[0_1px_2px_rgba(15,17,23,0.2)] transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`} />
    </button>
  );
}

function ToggleRow({
  title,
  hint,
  checked,
  onToggle,
  leading,
  children,
}: {
  title: string;
  hint?: string;
  checked: boolean;
  onToggle: () => void;
  leading?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="py-3.5">
      <div className="flex items-center gap-3">
        {leading}
        <div className="min-w-0 flex-1">
          <p className={`text-[14px] font-semibold ${checked ? "text-[#0F1117]" : "text-[#6B7280]"}`}>{title}</p>
          {hint && <p className="mt-0.5 text-[12px] leading-snug text-[#9CA3AF]">{hint}</p>}
        </div>
        <Switch checked={checked} onChange={onToggle} label={`Print ${title.toLowerCase()}`} />
      </div>
      {checked && children && <div className="mt-2.5">{children}</div>}
    </div>
  );
}

export default function ReceiptSettingsPage() {
  const [config, setConfig] = useState<BillConfig>(DEFAULT_BILL_CONFIG);
  const [activeTab, setActiveTab] = useState<"store" | "order">("store");
  const [mounted, setMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedConfig, setSavedConfig] = useState<BillConfig | null>(null);

  // Remember the loaded template so we can tell when something changed.
  useEffect(() => {
    if (mounted && savedConfig === null) setSavedConfig(config);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);
  const isDirty = useMemo(() => !!savedConfig && JSON.stringify(config) !== JSON.stringify(savedConfig), [config, savedConfig]);

  useEffect(() => {
    // 1. Load saved receipt configuration from local terminal
    const savedConfig = getBillConfig();

    // 2. Fetch live store profile & cloud-saved bill config from backend
    api<any>("/api/admin/me", { method: "GET", suppressErrorLog: true })
      .then((me) => {
        if (me) {
          const backendBillConfig = me.theme_config?.bill_config;
          if (backendBillConfig) {
            setBillConfig(backendBillConfig);
          }
          const baseConfig = backendBillConfig || savedConfig;
          setConfig((prev) => {
            const merged = { ...prev, ...baseConfig };
            // Clean up old GST/registration text in favor of Thank You
            if (!merged.footerText || merged.footerText.includes("GST APPLICABLE") || merged.footerText.includes("RULE 46") || merged.footerText.includes("THANK YOU FOR DINING")) {
              merged.footerText = "THANK YOU, VISIT AGAIN!";
            }
            if (merged.secondaryNotice && (merged.secondaryNotice.includes("INVOICE") || merged.secondaryNotice.includes("PLEASE COME AGAIN"))) {
              merged.secondaryNotice = "";
            }
            // Auto-populate store details from backend
            const badNames = ["DINEFINE RESTAURANT", "GRAND BISTRO PVT LTD"];
            const badAddrs = ["123 CULINARY AVENUE", "BLOCK 4, METRO HUB"];
            const badPhones = ["(555) 123-4567", "+91 98765 43210"];
            const badWebs = ["WWW.DINEFINE.COM", "GRANDBISTRO.IN"];

            if (me.restaurant && (!merged.restaurantName || badNames.includes(merged.restaurantName))) merged.restaurantName = me.restaurant;
            if (me.address && (!merged.addressLine1 || badAddrs.includes(merged.addressLine1))) merged.addressLine1 = me.address;
            if (me.phone && (!merged.storePhone || badPhones.includes(merged.storePhone))) merged.storePhone = me.phone;
            if (me.website && (!merged.storeWebsite || badWebs.includes(merged.storeWebsite))) merged.storeWebsite = me.website;
            if (merged.addressLine2 === "DOWNTOWN DISTRICT" || merged.addressLine2 === "BANGALORE, KA 560001") merged.addressLine2 = "";
            
            if (me.logo_url) merged.logoUrl = me.logo_url;
            if (me.gst_number && !merged.gstin) {
              merged.gstin = me.gst_number;
              merged.showGstin = false;
            }
            if (me.currency) merged.currencySymbol = me.currency;
            if (typeof me.tax_percent === "number") merged.taxPercent = me.tax_percent;
            return merged;
          });
        } else {
          setConfig(savedConfig);
        }
      })
      .catch(() => {
        setConfig(savedConfig);
      })
      .finally(() => {
        setMounted(true);
      });
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    // 1. Save locally for instant offline POS printing
    setBillConfig(config);

    // 2. Persist to the backend database so all staff terminals share the template
    try {
      const me = await api<any>("/api/admin/me", { method: "GET", suppressErrorLog: true }).catch(() => null);
      const existingTheme = (me && typeof me.theme_config === "object" && me.theme_config) ? me.theme_config : {};
      
      await api("/api/admin/update-details", {
        method: "PATCH",
        body: JSON.stringify({
          theme_config: {
            ...existingTheme,
            bill_config: config,
          }
        })
      });
      toast.success("Receipt layout saved");
      setSavedConfig(config);
    } catch {
      toast.success("Saved on this device only. Other terminals will get it once you save while online.");
      setSavedConfig(config);
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyPreset = (preset: typeof PRESETS[0]) => {
    setConfig(prev => ({
      ...prev,
      ...preset.config,
      templateId: preset.id,
    }));
    
  };

  const handlePrintTest = async () => {
    try {
      const { printBillTicket } = await import("@/app/lib/posPrinter");
      const mockTicketInput = {
        tableCode: config.tableCode || "12",
        printedAt: "30/09/2025 20:15",
        staffName: config.staffName || "MARIA G.",
        orderRefs: [{ dailyOrderNumber: Number(config.receiptNumber) || 42 }],
        items: MOCK_SAMPLE_ITEMS,
        total: 1020.00,
      };
      await printBillTicket(mockTicketInput);
      toast.success("Test receipt sent to the printer");
    } catch (e: any) {
      toast.error(e.message || "Failed to trigger print test");
    }
  };

  if (!mounted) {
    return (
      <SettingsPageLayout title="Receipts" description="Choose what prints on your customer bills" maxWidth="max-w-6xl">
        <div className="grid animate-pulse grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <div className="h-36 rounded-2xl border border-[#E8E8E3] bg-white" />
            <div className="h-80 rounded-2xl border border-[#E8E8E3] bg-white" />
          </div>
          <div className="h-[560px] rounded-2xl border border-[#E8E8E3] bg-white" />
        </div>
      </SettingsPageLayout>
    );
  }

  // Compute live subtotal, tax, and total
  const subtotal = MOCK_SAMPLE_ITEMS.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = (subtotal * ((config.taxPercent || 5) / 100));
  const grandTotal = subtotal + taxAmount;
  const cur = config.currencySymbol || "₹";

  const set = <K extends keyof BillConfig>(k: K, v: BillConfig[K]) => setConfig((p) => ({ ...p, [k]: v }));
  const toggle = (k: keyof BillConfig) => setConfig((p) => ({ ...p, [k]: !p[k] }));

  return (
    <SettingsPageLayout
      title="Receipts"
      description="Choose what prints on your customer bills"
      maxWidth="max-w-6xl"
      action={
        <>
          {isDirty && !isSaving && (
            <span className="hidden items-center gap-1.5 text-[13px] text-[#6B7280] lg:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Unsaved changes
            </span>
          )}
          {isDirty && !isSaving && savedConfig ? (
            <button type="button" onClick={() => setConfig(savedConfig)} className={BTN_SECONDARY}>
              Discard
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setConfig(DEFAULT_BILL_CONFIG);
                toast.success("Reset to the default layout. Save to keep it.");
              }}
              title="Go back to the default layout. Nothing is saved until you press Save."
              className={BTN_SECONDARY}
            >
              <RotateCcw className="h-4 w-4 text-[#6B7280]" /> Reset
            </button>
          )}
          <button type="button" onClick={handlePrintTest} className={BTN_SECONDARY}>
            <Printer className="h-4 w-4 text-[#6B7280]" /> Print test
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#fe5c13] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#e44e0b] disabled:cursor-not-allowed disabled:bg-[#F3F3EF] disabled:text-[#9CA3AF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fe5c13]/40 focus-visible:ring-offset-2"
          >
            {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving</> : isDirty ? "Save" : "Saved"}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Controls */}
        <div className="min-w-0 space-y-6">
          <Section title="Start from a layout" description="Picks which details print. You can change any of them below.">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4" role="radiogroup" aria-label="Receipt layout">
              {PRESETS.map((p) => {
                const on = config.templateId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => handleApplyPreset(p)}
                    className={`relative flex flex-col items-start rounded-xl border px-3.5 py-3 text-left transition-colors ${on ? "border-[#fe5c13] bg-[#FFF4EC]" : "border-[#E8E8E3] bg-white hover:border-[#D6D6CF]"}`}
                  >
                    <span className="text-[14px] font-semibold text-[#0F1117]">{p.name}</span>
                    <span className="mt-0.5 text-[12px] leading-snug text-[#6B7280]">{PRESET_NOTES[p.id]}</span>
                    {on && (
                      <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#fe5c13] text-white">
                        <Check className="h-2.5 w-2.5" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title="Header" description="Your restaurant's details at the top of the bill.">
            <div className="divide-y divide-[#F0F0EB]">
              <ToggleRow
                title="Logo"
                hint={config.logoUrl ? "Prints in black and white." : "Add a logo in Restaurant profile. A fork-and-knife icon prints until then."}
                checked={config.showLogo}
                onToggle={() => toggle("showLogo")}
                leading={
                  config.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={config.logoUrl} alt="" className="h-9 w-9 rounded-lg border border-[#E8E8E3] bg-white object-contain p-0.5 grayscale" />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E8E8E3] bg-[#FAFAF7] text-[#9CA3AF]">
                      <Store className="h-4 w-4" />
                    </span>
                  )
                }
              />
              <ToggleRow title="Restaurant name" checked={config.showRestaurantName} onToggle={() => toggle("showRestaurantName")}>
                <input value={config.restaurantName} onChange={(e) => set("restaurantName", e.target.value)} placeholder="Your restaurant" aria-label="Restaurant name" className={FIELD} />
              </ToggleRow>
              <ToggleRow title="Address" checked={config.showAddress} onToggle={() => toggle("showAddress")}>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input value={config.addressLine1} onChange={(e) => set("addressLine1", e.target.value)} placeholder="Street and area" aria-label="Address line 1" className={FIELD} />
                  <input value={config.addressLine2} onChange={(e) => set("addressLine2", e.target.value)} placeholder="City and PIN code" aria-label="Address line 2" className={FIELD} />
                </div>
              </ToggleRow>
              <ToggleRow title="Phone" checked={config.showPhone} onToggle={() => toggle("showPhone")}>
                <input value={config.storePhone} onChange={(e) => set("storePhone", e.target.value)} placeholder="080 4567 1234" aria-label="Phone" inputMode="tel" className={FIELD} />
              </ToggleRow>
              <ToggleRow title="Website or social handle" checked={config.showWebsite} onToggle={() => toggle("showWebsite")}>
                <input value={config.storeWebsite} onChange={(e) => set("storeWebsite", e.target.value)} placeholder="spiceroute.in or @spiceroute" aria-label="Website or social handle" className={FIELD} />
              </ToggleRow>
              <ToggleRow title="GSTIN" hint="Needed on tax invoices." checked={config.showGstin} onToggle={() => toggle("showGstin")}>
                <input value={config.gstin} onChange={(e) => set("gstin", e.target.value)} placeholder="29ABCDE1234F1Z5" aria-label="GSTIN" spellCheck={false} className={`${FIELD} uppercase tracking-wide`} />
              </ToggleRow>
            </div>
          </Section>

          <Section title="Order details" description="Filled in from each order when the bill prints.">
            <div className="divide-y divide-[#F0F0EB]">
              <ToggleRow title="Receipt number" checked={config.showReceiptNumber} onToggle={() => toggle("showReceiptNumber")}>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-[#6B7280]">Starts with</span>
                  <input value={config.receiptPrefix} onChange={(e) => set("receiptPrefix", e.target.value)} placeholder="R-" aria-label="Receipt number prefix" className={`${FIELD} w-24`} />
                  <span className="text-[12px] tabular-nums text-[#9CA3AF]">for example {config.receiptPrefix || "R-"}{config.receiptNumber || "2547"}</span>
                </div>
              </ToggleRow>
              <ToggleRow title="Date and time" hint="When the bill was printed." checked={config.showDateTime} onToggle={() => toggle("showDateTime")} />
              <ToggleRow title="Table number" checked={config.showTable} onToggle={() => toggle("showTable")} />
              <ToggleRow title="Server name" hint="The staff member who took the order." checked={config.showCashier} onToggle={() => toggle("showCashier")} />
              <ToggleRow title="Number of guests" checked={config.showGuests} onToggle={() => toggle("showGuests")} />
              <ToggleRow title="Tax line" hint={`Shows tax at ${config.taxPercent}%, from Restaurant profile.`} checked={config.showTaxBreakdown} onToggle={() => toggle("showTaxBreakdown")} />
            </div>
          </Section>

          <Section title="Footer" description="Messages and codes at the bottom of the bill.">
            <div className="divide-y divide-[#F0F0EB]">
              <ToggleRow title="Thank-you message" checked={config.showFooterText} onToggle={() => toggle("showFooterText")}>
                <input value={config.footerText} onChange={(e) => set("footerText", e.target.value)} placeholder="THANK YOU, VISIT AGAIN!" aria-label="Thank-you message" className={FIELD} />
              </ToggleRow>
              <ToggleRow title="Tip or service note" checked={config.showTipNotice} onToggle={() => toggle("showTipNotice")}>
                <input value={config.tipNotice} onChange={(e) => set("tipNotice", e.target.value)} placeholder="Service charge is optional" aria-label="Tip or service note" className={FIELD} />
              </ToggleRow>
              <ToggleRow title="Barcode" hint="Encodes the receipt number for quick lookup." checked={config.showBarcode} onToggle={() => toggle("showBarcode")} />
              <ToggleRow
                title="UPI payment QR"
                hint="Guests scan to pay the exact amount."
                checked={config.showQrCode}
                onToggle={() => toggle("showQrCode")}
                leading={
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E8E8E3] bg-[#FAFAF7] text-[#6B7280]">
                    <QrCode className="h-4 w-4" />
                  </span>
                }
              />
            </div>
          </Section>
        </div>

        {/* Preview: the receipt itself is unchanged */}
        <aside className="xl:sticky xl:top-0">
          <div className="rounded-2xl border border-[#E8E8E3] bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-[#F0F0EB] px-5 py-3.5">
              <div>
                <h2 className="text-[14px] font-semibold text-[#0F1117]">Bill preview</h2>
                <p className="mt-0.5 text-[12px] text-[#6B7280]">Sample order. Updates as you go.</p>
              </div>
              <span className="rounded-full bg-[#F3F3EF] px-2.5 py-1 text-[12px] font-medium leading-none text-[#6B7280]">80 mm</span>
            </div>
            <div className="flex max-h-[calc(100vh-220px)] justify-center overflow-y-auto bg-[#FAFAF7] px-4 py-7">
            <div className="w-full max-w-[310px] bg-[#FAF8F5] text-[#1A1A1A] font-mono shadow-[0_20px_50px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.06)] border border-[#EDE8E1] px-5 pt-6 pb-7 relative select-none shrink-0">
              
              {/* Top Jagged Cut */}
              <div 
                className="absolute -top-[5px] left-0 right-0 h-[6px] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjYiIHZpZXdCb3g9IjAgMCA4IDYiPjxwYXRoIGQ9Ik0wIDZMNCAwTDggNloiIGZpbGw9IiNGQUY4RjUiLz48L3N2Zz4=')] bg-repeat-x pointer-events-none"
              />

              {/* BRANDING SECTION */}
              <div className="text-center space-y-1">
                {config.showLogo && (
                  <div className="flex justify-center mb-2">
                    {config.logoUrl ? (
                      <img 
                        src={config.logoUrl} 
                        alt="Restaurant Logo" 
                        className="w-12 h-12 object-contain mx-auto filter grayscale contrast-200" 
                      />
                    ) : (
                      /* Fork & Knife Icon matching reference */
                      <svg className="w-8 h-8 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M7 2v6a3 3 0 0 0 3 3v11" />
                        <path d="M4 2v6a3 3 0 0 0 3 3" />
                        <path d="M7 2v5" />
                        <path d="M17 2v20" />
                        <path d="M17 2a3.5 3.5 0 0 1 3.5 3.5v5.5a2 2 0 0 1-2 2h-1.5" />
                      </svg>
                    )}
                  </div>
                )}
                
                {config.showRestaurantName && (
                  <h1 className="text-base font-bold tracking-wider uppercase leading-tight font-mono">
                    {config.restaurantName || "DINEFINE RESTAURANT"}
                  </h1>
                )}
                
                {config.showAddress && (
                  <>
                    {config.addressLine1 && (
                      <p className="text-[10px] tracking-wide text-black/80 font-medium">
                        {config.addressLine1}
                      </p>
                    )}
                    {config.addressLine2 && (
                      <p className="text-[10px] tracking-wide text-black/80 font-medium">
                        {config.addressLine2}
                      </p>
                    )}
                  </>
                )}

                {config.showPhone && config.storePhone && (
                  <p className="text-[10px] tracking-wider text-black font-semibold">
                    PHONE: {config.storePhone}
                  </p>
                )}

                {config.showWebsite && config.storeWebsite && (
                  <p className="text-[10px] tracking-wider text-black font-semibold">
                    {config.storeWebsite}
                  </p>
                )}

                {config.showGstin && config.gstin && (
                  <p className="text-[9px] tracking-widest text-black/70 font-semibold mt-0.5">
                    GSTIN: {config.gstin}
                  </p>
                )}
              </div>

              {/* DIVIDER */}
              <div className="border-b-[1.5px] border-black my-2.5" />

              {/* METADATA GRID */}
              <div className="space-y-1 text-[11px] leading-tight font-medium">
                {config.showDateTime && (
                  <div className="text-center font-bold tracking-wider mb-1">
                    30/09/2025 20:15
                  </div>
                )}
                
                <div className="flex justify-between tracking-wide">
                  {config.showReceiptNumber && (
                    <span>RECEIPT: #{config.receiptPrefix || "R-"}{config.receiptNumber || "2547"}</span>
                  )}
                  {config.showTable && (
                    <span className="font-bold">TABLE: {config.tableCode || "12"}</span>
                  )}
                </div>

                <div className="flex justify-between tracking-wide">
                  {config.showCashier && (
                    <span>SERVER: {config.staffName || "MARIA G."}</span>
                  )}
                  {config.showGuests && (
                    <span>GUESTS: {config.guestCount || 2}</span>
                  )}
                </div>
              </div>

              {/* DIVIDER */}
              <div className="border-b-[1.5px] border-black my-2.5" />

              {/* ITEMS SECTION */}
              <div className="space-y-1.5 text-[11px] font-medium leading-tight">
                {MOCK_SAMPLE_ITEMS.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-baseline tracking-wide">
                    <span className="font-semibold">{item.qty > 1 ? `${item.qty}X ` : ""}{item.name.toUpperCase()}</span>
                    <span className="font-bold">{cur}{item.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* DIVIDER */}
              <div className="border-b-[1.5px] border-black my-2.5" />

              {/* TOTALS SECTION */}
              <div className="space-y-1 text-[11px] leading-tight font-medium">
                <div className="flex justify-between tracking-wide">
                  <span>SUBTOTAL:</span>
                  <span className="font-bold">{cur}{subtotal.toFixed(2)}</span>
                </div>
                {config.showTaxBreakdown && (
                  <div className="flex justify-between tracking-wide">
                    <span>TAX ({config.taxPercent}%):</span>
                    <span className="font-bold">{cur}{taxAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between tracking-wider text-xs font-bold pt-1">
                  <span>TOTAL:</span>
                  <span>{cur}{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* DIVIDER */}
              <div className="border-b-[1.5px] border-black my-3" />

              {/* FOOTER NOTICES */}
              <div className="text-center space-y-1 text-[10px] tracking-wider leading-relaxed font-bold">
                {config.showTipNotice && config.tipNotice && (
                  <p>{config.tipNotice}</p>
                )}
                {config.secondaryNotice && (
                  <p>{config.secondaryNotice}</p>
                )}
                {config.showFooterText && config.footerText && (
                  <p className="pt-1.5 font-bold text-[11px] tracking-widest">{config.footerText}</p>
                )}
              </div>

              {/* BARCODE SECTION */}
              {config.showBarcode && (
                <div className="mt-3.5 flex flex-col items-center">
                  <div className="scale-[0.8] transform origin-top grayscale">
                    <Barcode 
                      value={config.barcodeValue || `${config.receiptPrefix || "R-"}${config.receiptNumber || "2547"}`} 
                      format="CODE128"
                      width={1.8}
                      height={40}
                      displayValue={true}
                      fontSize={14}
                      margin={0}
                      background="transparent"
                      lineColor="#000000"
                    />
                  </div>
                </div>
              )}

              {/* UPI QR CODE */}
              {config.showQrCode && (
                <div className="mt-3 mb-2 flex flex-col items-center border-t border-dashed border-black/30 pt-3">
                  <p className="text-[9px] font-bold tracking-wider mb-2">SCAN TO PAY WITH UPI</p>
                  <div className="p-2 bg-white border border-black/20 rounded shadow-sm flex items-center justify-center">
                    <QRCodeSVG
                      value={config.upiId ? `upi://pay?pa=${config.upiId}&am=${grandTotal.toFixed(2)}` : "upi://pay?pa=store@upi"}
                      size={90}
                      level="M"
                      bgColor="#ffffff"
                      fgColor="#000000"
                    />
                  </div>
                </div>
              )}

              {/* Bottom Jagged Cut */}
              <div 
                className="absolute -bottom-[5px] left-0 right-0 h-[6px] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjYiIHZpZXdCb3g9IjAgMCA4IDYiPjxwYXRoIGQ9Ik0wIDBMNCA2TDggMFoiIGZpbGw9IiNGQUY4RjUiLz48L3N2Zz4=')] bg-repeat-x pointer-events-none"
              />
            </div>
            </div>
          </div>
        </aside>
      </div>
    </SettingsPageLayout>
  );
}
