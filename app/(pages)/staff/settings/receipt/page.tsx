"use client";

import React, { useEffect, useState } from "react";
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
import { 
  Printer, 
  Save, 
  Sparkles, 
  RotateCcw,
  Check,
  Store, 
  Receipt as ReceiptIcon,
  QrCode
} from "lucide-react";
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

export default function ReceiptSettingsPage() {
  const [config, setConfig] = useState<BillConfig>(DEFAULT_BILL_CONFIG);
  const [activeTab, setActiveTab] = useState<"store" | "order">("store");
  const [mounted, setMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
      toast.success("Receipt template saved to backend!");
    } catch {
      toast.success("Receipt template saved locally!");
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
    toast.success(`Applied "${preset.name}" preset`);
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
      toast.success("Test receipt sent to printer!");
    } catch (e: any) {
      toast.error(e.message || "Failed to trigger print test");
    }
  };

  if (!mounted) return null;

  // Compute live subtotal, tax, and total
  const subtotal = MOCK_SAMPLE_ITEMS.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = (subtotal * ((config.taxPercent || 5) / 100));
  const grandTotal = subtotal + taxAmount;
  const cur = config.currencySymbol || "₹";

  return (
    <SettingsPageLayout
      title="Receipts & Billing"
      description="Choose what prints on your customer receipts."
    >
      <div className="flex flex-col lg:flex-row gap-6 items-start h-[calc(100vh-140px)] min-h-[580px] max-h-[860px]">
        
        {/* LEFT COLUMN: Control Deck (No Page Scroll, Clean Toggles with Prefilled Inputs) */}
        <div className="w-full lg:w-3/5 xl:w-7/12 h-full flex flex-col bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          
          {/* Presets Row */}
          <div className="px-5 py-2.5 bg-slate-50/70 border-b border-slate-200/80 flex items-center gap-3 shrink-0">
            <span className="text-xs font-bold text-slate-600 shrink-0 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#fe5c13]" />
              <span>Presets:</span>
            </span>
            <div className="grid grid-cols-4 gap-2 flex-1 min-w-0">
              {PRESETS.map(p => {
                const isActive = config.templateId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className={`w-full py-1 px-2 rounded-lg text-xs font-bold transition-all text-center truncate cursor-pointer ${
                      isActive 
                        ? "bg-[#fe5c13] text-white shadow-sm shadow-orange-500/20" 
                        : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80"
                    }`}
                  >
                    <span className="truncate">{p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Navigation (2 Clean Tabs) */}
          <div className="flex items-center border-b border-slate-200 px-5 bg-white shrink-0">
            <button
              onClick={() => setActiveTab("store")}
              className={`flex items-center gap-2 py-3 px-4 font-bold text-xs tracking-wide border-b-2 transition-all cursor-pointer ${
                activeTab === "store"
                  ? "border-[#fe5c13] text-[#fe5c13]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Store className="w-4 h-4" />
              <span>Header & Store Details</span>
            </button>
            <button
              onClick={() => setActiveTab("order")}
              className={`flex items-center gap-2 py-3 px-4 font-bold text-xs tracking-wide border-b-2 transition-all cursor-pointer ${
                activeTab === "order"
                  ? "border-[#fe5c13] text-[#fe5c13]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <ReceiptIcon className="w-4 h-4" />
              <span>Order, Footer & Codes</span>
            </button>
          </div>

          {/* Toggles List (Prefilled from backend, completely dynamic) */}
          <div className="flex-1 p-5 overflow-y-auto space-y-3">
            
            {/* TAB 1: HEADER & STORE DETAILS */}
            {activeTab === "store" && (
              <div className="space-y-3 animate-in fade-in-50 duration-150">
                
                {/* 1. Restaurant Logo Toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/60 border border-slate-200/70">
                  <div className="flex items-center gap-3">
                    {config.logoUrl ? (
                      <img src={config.logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-contain bg-white border border-slate-200 p-0.5 filter grayscale" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs">
                        LOGO
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-bold text-slate-800">Restaurant Logo</p>
                      <p className="text-[11px] text-slate-500">Prints your uploaded restaurant logo at the top</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={config.showLogo} 
                      onChange={e => setConfig({ ...config, showLogo: e.target.checked })} 
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#fe5c13]"></div>
                  </label>
                </div>

                {/* 2. Restaurant Name Toggle */}
                <div className="p-3 rounded-xl bg-slate-50/60 border border-slate-200/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-800">Restaurant Name</p>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={config.showRestaurantName} 
                        onChange={e => setConfig({ ...config, showRestaurantName: e.target.checked })} 
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#fe5c13]"></div>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={config.restaurantName}
                    onChange={e => setConfig({ ...config, restaurantName: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-[#fe5c13]"
                    placeholder="DINEFINE RESTAURANT"
                  />
                </div>

                {/* 3. Address Lines Toggle */}
                <div className="p-3 rounded-xl bg-slate-50/60 border border-slate-200/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-800">Store Address</p>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={config.showAddress} 
                        onChange={e => setConfig({ ...config, showAddress: e.target.checked })} 
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#fe5c13]"></div>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={config.addressLine1}
                      onChange={e => setConfig({ ...config, addressLine1: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-[#fe5c13]"
                      placeholder="Line 1"
                    />
                    <input
                      type="text"
                      value={config.addressLine2}
                      onChange={e => setConfig({ ...config, addressLine2: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-[#fe5c13]"
                      placeholder="Line 2"
                    />
                  </div>
                </div>

                {/* 4. Phone & Website Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50/60 border border-slate-200/70 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-800">Phone Number</p>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={config.showPhone} 
                          onChange={e => setConfig({ ...config, showPhone: e.target.checked })} 
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#fe5c13]"></div>
                      </label>
                    </div>
                    <input
                      type="text"
                      value={config.storePhone}
                      onChange={e => setConfig({ ...config, storePhone: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-[#fe5c13]"
                      placeholder="(555) 123-4567"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50/60 border border-slate-200/70 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-800">Website / Social</p>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={config.showWebsite} 
                          onChange={e => setConfig({ ...config, showWebsite: e.target.checked })} 
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#fe5c13]"></div>
                      </label>
                    </div>
                    <input
                      type="text"
                      value={config.storeWebsite}
                      onChange={e => setConfig({ ...config, storeWebsite: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-[#fe5c13]"
                      placeholder="WWW.DINEFINE.COM"
                    />
                  </div>
                </div>

                {/* 5. GSTIN / Tax ID */}
                <div className="p-3 rounded-xl bg-slate-50/60 border border-slate-200/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-800">GSTIN / Tax ID</p>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={config.showGstin} 
                        onChange={e => setConfig({ ...config, showGstin: e.target.checked })} 
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#fe5c13]"></div>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={config.gstin}
                    onChange={e => setConfig({ ...config, gstin: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-[#fe5c13]"
                    placeholder="e.g. 29ABCDE1234F1Z5"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: ORDER & METADATA, FOOTER & CODES */}
            {activeTab === "order" && (
              <div className="space-y-3 animate-in fade-in-50 duration-150">
                
                {/* 1. Order Meta Toggles (Grid) */}
                <div className="grid grid-cols-2 gap-2.5">
                  
                  {/* Receipt # + Prefix */}
                  <div className="p-2.5 rounded-xl bg-slate-50/60 border border-slate-200/70 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Receipt #</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={config.showReceiptNumber} 
                          onChange={e => setConfig({ ...config, showReceiptNumber: e.target.checked })} 
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#fe5c13]"></div>
                      </label>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-400">Prefix:</span>
                      <input
                        type="text"
                        value={config.receiptPrefix}
                        onChange={e => setConfig({ ...config, receiptPrefix: e.target.value })}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-medium text-slate-800 outline-none"
                        placeholder="R-"
                      />
                    </div>
                  </div>

                  {/* Date & Time */}
                  <div className="p-2.5 rounded-xl bg-slate-50/60 border border-slate-200/70 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Date & Time</p>
                      <p className="text-[10px] text-slate-400">Live timestamp</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={config.showDateTime} 
                        onChange={e => setConfig({ ...config, showDateTime: e.target.checked })} 
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#fe5c13]"></div>
                    </label>
                  </div>

                  {/* Table Number */}
                  <div className="p-2.5 rounded-xl bg-slate-50/60 border border-slate-200/70 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Table Number</p>
                      <p className="text-[10px] text-slate-400">Live table code</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={config.showTable} 
                        onChange={e => setConfig({ ...config, showTable: e.target.checked })} 
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#fe5c13]"></div>
                    </label>
                  </div>

                  {/* Server Name */}
                  <div className="p-2.5 rounded-xl bg-slate-50/60 border border-slate-200/70 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Server Name</p>
                      <p className="text-[10px] text-slate-400">Logged-in staff</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={config.showCashier} 
                        onChange={e => setConfig({ ...config, showCashier: e.target.checked })} 
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#fe5c13]"></div>
                    </label>
                  </div>

                  {/* Guest Count */}
                  <div className="p-2.5 rounded-xl bg-slate-50/60 border border-slate-200/70 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Guest Count</p>
                      <p className="text-[10px] text-slate-400">Party size</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={config.showGuests} 
                        onChange={e => setConfig({ ...config, showGuests: e.target.checked })} 
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#fe5c13]"></div>
                    </label>
                  </div>

                  {/* Tax Breakdown */}
                  <div className="p-2.5 rounded-xl bg-slate-50/60 border border-slate-200/70 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Tax Breakdown</p>
                      <p className="text-[10px] text-slate-400">{config.taxPercent}% rate</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={config.showTaxBreakdown} 
                        onChange={e => setConfig({ ...config, showTaxBreakdown: e.target.checked })} 
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#fe5c13]"></div>
                    </label>
                  </div>
                </div>

                {/* 2. Tip & Customer Notes */}
                <div className="p-3 rounded-xl bg-slate-50/60 border border-slate-200/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-800">Tip Disclaimer</p>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={config.showTipNotice} 
                        onChange={e => setConfig({ ...config, showTipNotice: e.target.checked })} 
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#fe5c13]"></div>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={config.tipNotice}
                    onChange={e => setConfig({ ...config, tipNotice: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-[#fe5c13]"
                    placeholder="Add optional tip or service disclaimer..."
                  />
                </div>

                {/* 3. Thank you message */}
                <div className="p-3 rounded-xl bg-slate-50/60 border border-slate-200/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-800">Thank You Message</p>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={config.showFooterText} 
                        onChange={e => setConfig({ ...config, showFooterText: e.target.checked })} 
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#fe5c13]"></div>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={config.footerText}
                    onChange={e => setConfig({ ...config, footerText: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-[#fe5c13]"
                    placeholder="THANK YOU, VISIT AGAIN!"
                  />
                </div>

                {/* 4. Barcode & UPI QR Toggles */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-50/60 border border-slate-200/70 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Barcode</p>
                      <p className="text-[10px] text-slate-400">Order barcode</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={config.showBarcode} 
                        onChange={e => setConfig({ ...config, showBarcode: e.target.checked })} 
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#fe5c13]"></div>
                    </label>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50/60 border border-slate-200/70 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800">UPI Payment QR</p>
                      <p className="text-[10px] text-slate-400">Scan to pay</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={config.showQrCode} 
                        onChange={e => setConfig({ ...config, showQrCode: e.target.checked })} 
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#fe5c13]"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Fixed Action Bar */}
          <div className="px-5 py-3.5 bg-white border-t border-slate-200/80 flex items-center justify-between gap-4 shrink-0">
            <button
              onClick={() => {
                setConfig(DEFAULT_BILL_CONFIG);
                toast.success("Reset to defaults");
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            <div className="flex items-center gap-2.5">
              <button
                onClick={handlePrintTest}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs shadow-sm transition-all"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>Print Test</span>
              </button>

              <button
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#fe5c13] hover:bg-[#e04f0f] text-white font-bold text-xs shadow-md shadow-orange-500/25 transition-all"
              >
                {isSaving ? <Check className="w-4 h-4 animate-bounce" /> : <Save className="w-4 h-4" />}
                <span>Save</span>
              </button>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Physical Thermal Receipt (Clean, Matches Reference, No Payment Slip) */}
        <div className="w-full lg:w-2/5 xl:w-5/12 h-full flex flex-col items-center">
          
          <div className="w-full flex items-center justify-between px-2 mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Physical Output Preview</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200/80 font-mono font-bold text-slate-600">80mm Thermal</span>
          </div>

          <div className="w-full flex-1 overflow-y-auto flex justify-center items-start py-4 px-2">
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
                  <h1 className="text-base font-black tracking-wider uppercase leading-tight font-mono">
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
                <div className="flex justify-between tracking-wider text-xs font-black pt-1">
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
                  <p className="pt-1.5 font-black text-[11px] tracking-widest">{config.footerText}</p>
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

      </div>
    </SettingsPageLayout>
  );
}
