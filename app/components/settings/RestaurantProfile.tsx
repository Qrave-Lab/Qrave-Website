import React from "react";
import { Camera, CheckCircle2, Loader2, Image as ImageIcon } from "lucide-react";
import type { Restaurant, TaxConfig } from "./types";

/* ---------- 24h ↔ 12h helpers ---------- */
function parse24(time: string): { hour: number; minute: number; period: "AM" | "PM" } {
  const [h, m] = (time || "00:00").split(":").map(Number);
  const period: "AM" | "PM" = h >= 12 ? "PM" : "AM";
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return { hour, minute: m, period };
}

function to24(hour: number, minute: number, period: "AM" | "PM"): string {
  let h = hour;
  if (period === "AM" && h === 12) h = 0;
  else if (period === "PM" && h !== 12) h += 12;
  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const PHONE_COUNTRY_CODES = [
  { code: "+91", label: "IN (+91)" },
  { code: "+1", label: "US/CA (+1)" },
  { code: "+44", label: "UK (+44)" },
  { code: "+61", label: "AU (+61)" },
  { code: "+65", label: "SG (+65)" },
  { code: "+971", label: "UAE (+971)" },
];
const PHONE_RULES: Record<string, { max: number; example: string; pattern: RegExp }> = {
  "+91": { max: 10, example: "8012345678", pattern: /^[2-9][0-9]{9}$/ },
  "+1": { max: 10, example: "4155552671", pattern: /^[2-9][0-9]{2}[2-9][0-9]{6}$/ },
  "+44": { max: 10, example: "7123456789", pattern: /^7[0-9]{9}$/ },
  "+61": { max: 9, example: "412345678", pattern: /^4[0-9]{8}$/ },
  "+65": { max: 8, example: "91234567", pattern: /^[689][0-9]{7}$/ },
  "+971": { max: 9, example: "501234567", pattern: /^5[0-9]{8}$/ },
};

/* ---------- TimePicker field ---------- */
function TimePickerField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const { hour, minute, period } = parse24(value);

  const update = (h: number, m: number, p: "AM" | "PM") => onChange(to24(h, m, p));
  const selectClass =
    "h-10 rounded-lg border border-slate-200 bg-slate-50/30 text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer";

  return (
    <div>
      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <div className="flex items-center gap-1.5">
        <select
          value={hour}
          onChange={(e) => update(Number(e.target.value), minute, period)}
          className={`${selectClass} w-[4.5rem] px-2 text-center`}
        >
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <span className="text-slate-400 font-bold text-sm">:</span>
        <select
          value={minute}
          onChange={(e) => update(hour, Number(e.target.value), period)}
          className={`${selectClass} w-[4.5rem] px-2 text-center`}
        >
          {MINUTES.map((m) => (
            <option key={m} value={m}>
              {String(m).padStart(2, "0")}
            </option>
          ))}
        </select>
        <select
          value={period}
          onChange={(e) => update(hour, minute, e.target.value as "AM" | "PM")}
          className={`${selectClass} w-[4.5rem] px-2 text-center font-bold`}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  );
}


type Props = {
  data: Restaurant;
  onChange: (data: Restaurant) => void;
  onLogoChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLogoRemove?: () => void;
  isUploading?: boolean;
  isRemovingLogo?: boolean;
};

export default function RestaurantProfile({ data, onChange, onLogoChange, onLogoRemove, isUploading, isRemovingLogo }: Props) {
  const [taxInput, setTaxInput] = React.useState(String(data.taxPercent ?? 0));
  const [serviceInput, setServiceInput] = React.useState(String(data.serviceCharge ?? 0));
  const [cessInput, setCessInput] = React.useState(String(data.taxConfig?.cess_percent ?? 0));
  const [customSlab, setCustomSlab] = React.useState(
    !([0, 5, 12, 18, 28] as number[]).includes(data.taxPercent ?? 0)
  );

  React.useEffect(() => { setTaxInput(String(data.taxPercent ?? 0)); }, [data.taxPercent]);
  React.useEffect(() => { setServiceInput(String(data.serviceCharge ?? 0)); }, [data.serviceCharge]);
  React.useEffect(() => { setCessInput(String(data.taxConfig?.cess_percent ?? 0)); }, [data.taxConfig?.cess_percent]);

  const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
  const gstinIsValid = !data.gstNumber || GSTIN_REGEX.test(data.gstNumber.trim());

  const handleChange = (key: keyof Restaurant, value: string | number | boolean) => {
    onChange({ ...data, [key]: value });
  };

  const handleTaxConfigChange = (key: keyof TaxConfig, value: unknown) => {
    const prev = data.taxConfig ?? {};
    onChange({ ...data, taxConfig: { ...prev, [key]: value } as TaxConfig });
  };

  const GST_SLABS = [0, 5, 12, 18, 28] as const;
  const mode = data.taxConfig?.mode ?? "cgst_sgst";
  const inclusive = data.taxConfig?.inclusive ?? false;
  const cessEnabled = data.taxConfig?.cess_enabled ?? false;
  const cessPercent = data.taxConfig?.cess_percent ?? 0;

  // Bill preview calculation on ₹1000 subtotal
  const PREVIEW_BASE = 1000;
  const taxableAmount = inclusive ? Math.round(PREVIEW_BASE / (1 + (data.taxPercent || 0) / 100)) : PREVIEW_BASE;
  const taxAmount = inclusive
    ? PREVIEW_BASE - taxableAmount
    : Math.round(PREVIEW_BASE * ((data.taxPercent || 0) / 100));
  const cessAmount = cessEnabled ? Math.round((inclusive ? taxableAmount : PREVIEW_BASE) * (cessPercent / 100)) : 0;
  const serviceAmount = Math.round((inclusive ? taxableAmount : PREVIEW_BASE) * ((data.serviceCharge || 0) / 100));
  const previewTotal = (inclusive ? PREVIEW_BASE : PREVIEW_BASE + taxAmount) + cessAmount + serviceAmount;

  const fmtPreview = (n: number) => `₹${n.toFixed(2)}`;
  const inputCls = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all bg-slate-50/30 text-slate-900";


  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <h2 className="font-bold text-slate-900 flex items-center gap-2">
          Restaurant Profile
        </h2>
      </div>

      <div className="p-6 space-y-6">
        <div className="flex items-start gap-6">
          <div className="flex flex-col items-center gap-2 shrink-0">
            <div className="relative">
              <div className="w-24 h-24 bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden flex items-center justify-center shadow-inner group">
                {data.logo_url ? (
                  <img
                    src={data.logo_url}
                    alt="Restaurant Logo"
                    className="w-full h-full object-cover transition-transform group-hover:scale-110"
                  />
                ) : (
                  <ImageIcon className="w-8 h-8 text-slate-300" />
                )}
              </div>
              <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg flex items-center justify-center cursor-pointer transition-all active:scale-90 border-2 border-white">
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={onLogoChange}
                  disabled={isUploading}
                />
              </label>
            </div>
            {data.logo_url && onLogoRemove && (
              <button
                type="button"
                onClick={onLogoRemove}
                disabled={isRemovingLogo || isUploading}
                className="flex items-center gap-1 text-[11px] font-semibold text-rose-500 hover:text-rose-700 disabled:opacity-50 transition-colors mt-1"
              >
                {isRemovingLogo ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                {isRemovingLogo ? "Removing…" : "Remove Photo"}
              </button>
            )}
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Restaurant Name
              </label>
              <input
                value={data.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="The Golden Bistro"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all bg-slate-50/30 font-medium text-slate-900"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Business Address
            </label>
            <input
              value={data.address}
              onChange={(e) => handleChange("address", e.target.value)}
              placeholder="123 Gourmet Ave, Food City"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all bg-slate-50/30 text-slate-900"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Website URL <span className="normal-case text-slate-300 ml-1">(optional)</span>
            </label>
            <input
              type="url"
              value={data.website || ""}
              onChange={(e) => handleChange("website", e.target.value)}
              placeholder="https://yourrestaurant.com"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all bg-slate-50/30 text-slate-900"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Phone Number
            </label>
            <div className="flex gap-2">
              <select
                value={data.phoneCountryCode}
                onChange={(e) => handleChange("phoneCountryCode", e.target.value)}
                className="w-[130px] border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all bg-slate-50/30 text-slate-900"
              >
                {PHONE_COUNTRY_CODES.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <input
                value={data.phone}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "");
                  const max = PHONE_RULES[data.phoneCountryCode]?.max ?? 14;
                  handleChange("phone", digits.slice(0, max));
                }}
                placeholder={PHONE_RULES[data.phoneCountryCode]?.example || "Business contact number"}
                inputMode="tel"
                className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all bg-slate-50/30 text-slate-900"
              />
            </div>
            {data.phone.trim() && !PHONE_RULES[data.phoneCountryCode]?.pattern.test(data.phone.trim()) && (
              <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-red-500">
                Invalid number format for {data.phoneCountryCode}. Example: {PHONE_RULES[data.phoneCountryCode]?.example}
              </div>
            )}
          </div>
        </div>

        {/* ── GST & Tax Settings ─────────────────────────────────────── */}
        <section className="pt-4 border-t border-slate-100 space-y-5">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">GST &amp; Tax</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Configure how taxes and charges appear on your bills</p>
          </div>

          {/* GSTIN */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              GSTIN <span className="normal-case text-slate-300">(optional)</span>
            </label>
            <div className="relative">
              <input
                value={data.gstNumber ?? ""}
                onChange={(e) => handleChange("gstNumber", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15))}
                placeholder="22AAAAA0000A1Z5"
                spellCheck={false}
                className={`${inputCls} pr-10 font-mono tracking-widest`}
              />
              {data.gstNumber && (
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold ${gstinIsValid ? "text-emerald-500" : "text-red-400"}`}>
                  {gstinIsValid ? <CheckCircle2 className="w-4 h-4" /> : "✗"}
                </span>
              )}
            </div>
            {data.gstNumber && !gstinIsValid && (
              <p className="mt-1 text-[10px] text-red-400 font-medium">Format: 2-digit state code + PAN + entity + Z + check digit (e.g. 22AAAAA0000A1Z5)</p>
            )}
          </div>

          {/* GST Slab */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">GST Slab</label>
            <div className="flex items-center gap-2 flex-wrap">
              {GST_SLABS.map((slab) => (
                <button
                  key={slab}
                  type="button"
                  onClick={() => {
                    setCustomSlab(false);
                    setTaxInput(String(slab));
                    handleChange("taxPercent", slab);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${!customSlab && (data.taxPercent ?? 0) === slab
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                    }`}
                >
                  {slab}%
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCustomSlab(true)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${customSlab
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                  }`}
              >
                Custom
              </button>
              {customSlab && (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={taxInput}
                    onChange={(e) => {
                      const v = e.target.value;
                      setTaxInput(v);
                      if (v !== "") handleChange("taxPercent", Number(v));
                    }}
                    onBlur={() => { if (taxInput === "") { setTaxInput("0"); handleChange("taxPercent", 0); } }}
                    className="w-20 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none bg-slate-50"
                    placeholder="0"
                  />
                  <span className="text-xs text-slate-400 font-bold">%</span>
                </div>
              )}
            </div>
          </div>

          {/* Tax Mode CGST+SGST vs IGST */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tax Breakup on Bill</label>
            <div className="grid grid-cols-2 gap-3">
              {([
                { key: "cgst_sgst", title: "CGST + SGST", desc: "Intra-state (most restaurants)" },
                { key: "igst", title: "IGST", desc: "Inter-state supply" },
              ] as const).map(({ key, title, desc }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleTaxConfigChange("mode", key)}
                  className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-left transition-all ${mode === key
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white hover:border-slate-400 text-slate-700"
                    }`}
                >
                  <div className={`mt-0.5 w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center ${mode === key ? "border-white" : "border-slate-400"
                    }`}>
                    {mode === key && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold">{title}</p>
                    <p className={`text-[10px] mt-0.5 ${mode === key ? "text-white/60" : "text-slate-400"}`}>{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Inclusive / Exclusive */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/40 px-4 py-3">
            <div>
              <p className="text-xs font-bold text-slate-800">Tax-Inclusive Prices</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {inclusive ? "Menu prices already include tax" : "Tax added on top of menu prices"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleTaxConfigChange("inclusive", !inclusive)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${inclusive ? "bg-emerald-500" : "bg-slate-300"}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${inclusive ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          {/* Cess */}
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/40 px-4 py-3">
              <div>
                <p className="text-xs font-bold text-slate-800">Cess</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Additional cess levied on top of GST</p>
              </div>
              <button
                type="button"
                onClick={() => handleTaxConfigChange("cess_enabled", !cessEnabled)}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${cessEnabled ? "bg-amber-500" : "bg-slate-300"}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${cessEnabled ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
            {cessEnabled && (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Cess (%)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={cessInput}
                    onChange={(e) => {
                      const v = e.target.value;
                      setCessInput(v);
                      if (v !== "") handleTaxConfigChange("cess_percent", Number(v));
                    }}
                    onBlur={() => { if (cessInput === "") { setCessInput("0"); handleTaxConfigChange("cess_percent", 0); } }}
                    className="w-28 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none bg-slate-50/30 text-slate-900"
                  />
                  <span className="text-sm text-slate-400 font-bold">%</span>
                </div>
              </div>
            )}
          </div>

          {/* Service Charge */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Service Charge (%)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={serviceInput}
                onChange={(e) => {
                  const v = e.target.value;
                  setServiceInput(v);
                  if (v !== "") handleChange("serviceCharge", Number(v));
                }}
                onBlur={() => { if (serviceInput === "") { setServiceInput("0"); handleChange("serviceCharge", 0); } }}
                className="w-28 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none bg-slate-50/30 text-slate-900"
              />
              <span className="text-sm text-slate-400 font-bold">%</span>
            </div>
          </div>

          {/* Bill Preview */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Bill Preview</p>
              {data.gstNumber && gstinIsValid && (
                <p className="text-[10px] font-mono text-white/40">{data.gstNumber}</p>
              )}
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-white/70">
                <span>{inclusive ? "Subtotal (incl. tax)" : "Subtotal"}</span>
                <span className="font-mono">{fmtPreview(PREVIEW_BASE)}</span>
              </div>
              {!inclusive && (data.taxPercent ?? 0) > 0 && (
                mode === "cgst_sgst" ? (
                  <>
                    <div className="flex justify-between text-white/60">
                      <span>CGST ({((data.taxPercent ?? 0) / 2).toFixed(1)}%)</span>
                      <span className="font-mono">{fmtPreview(taxAmount / 2)}</span>
                    </div>
                    <div className="flex justify-between text-white/60">
                      <span>SGST ({((data.taxPercent ?? 0) / 2).toFixed(1)}%)</span>
                      <span className="font-mono">{fmtPreview(taxAmount / 2)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-white/60">
                    <span>IGST ({data.taxPercent ?? 0}%)</span>
                    <span className="font-mono">{fmtPreview(taxAmount)}</span>
                  </div>
                )
              )}
              {inclusive && (data.taxPercent ?? 0) > 0 && (
                mode === "cgst_sgst" ? (
                  <>
                    <div className="flex justify-between text-white/50 text-[10px]">
                      <span>incl. CGST ({((data.taxPercent ?? 0) / 2).toFixed(1)}%)</span>
                      <span className="font-mono">{fmtPreview(taxAmount / 2)}</span>
                    </div>
                    <div className="flex justify-between text-white/50 text-[10px]">
                      <span>incl. SGST ({((data.taxPercent ?? 0) / 2).toFixed(1)}%)</span>
                      <span className="font-mono">{fmtPreview(taxAmount / 2)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-white/50 text-[10px]">
                    <span>incl. IGST ({data.taxPercent ?? 0}%)</span>
                    <span className="font-mono">{fmtPreview(taxAmount)}</span>
                  </div>
                )
              )}
              {cessEnabled && cessPercent > 0 && (
                <div className="flex justify-between text-amber-300">
                  <span>Cess ({cessPercent}%)</span>
                  <span className="font-mono">{fmtPreview(cessAmount)}</span>
                </div>
              )}
              {(data.serviceCharge ?? 0) > 0 && (
                <div className="flex justify-between text-white/60">
                  <span>Service Charge ({data.serviceCharge}%)</span>
                  <span className="font-mono">{fmtPreview(serviceAmount)}</span>
                </div>
              )}
            </div>
            <div className="border-t border-white/10 pt-2 flex justify-between">
              <span className="text-sm font-bold">Total</span>
              <span className="text-sm font-bold font-mono">{fmtPreview(previewTotal)}</span>
            </div>
            <p className="text-[9px] text-white/30 text-center uppercase tracking-widest">Based on ₹1,000 order · for illustration only</p>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <TimePickerField
            label="Opens At"
            value={data.openTime || ""}
            onChange={(v) => handleChange("openTime", v)}
          />
          <TimePickerField
            label="Closes At"
            value={data.closeTime || ""}
            onChange={(v) => handleChange("closeTime", v)}
          />
        </div>

        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/40 px-4 py-3">
            <div>
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Ordering
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                When off, guests can view menu and AR only.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleChange("orderingEnabled", !(data.orderingEnabled !== false))}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${data.orderingEnabled !== false ? "bg-emerald-500" : "bg-slate-300"
                }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${data.orderingEnabled !== false ? "translate-x-6" : "translate-x-1"
                  }`}
              />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
