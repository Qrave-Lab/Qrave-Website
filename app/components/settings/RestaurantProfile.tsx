import React from "react";
import { Camera, CheckCircle2, ExternalLink, Loader2, Image as ImageIcon, XCircle } from "lucide-react";
import type { Restaurant, TaxConfig } from "./types";

import { Select } from "@/app/components/ui/Select";
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


/* ---------- Shared look (Qrave palette) ---------- */
const INPUT =
  "h-10 w-full rounded-xl border border-[#E8E8E3] bg-white px-3.5 text-[14px] text-[#0F1117] outline-none transition-colors placeholder:text-[#9CA3AF] hover:border-[#D6D6CF] focus:border-[#fe5c13]";
const SEG_ON = "bg-white font-semibold text-[#0F1117] shadow-[0_1px_2px_rgba(15,17,23,0.06)]";
const SEG_OFF = "font-medium text-[#6B7280] hover:text-[#0F1117]";

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#E8E8E3] bg-white">
      <div className="border-b border-[#F0F0EB] px-6 py-4">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-[#0F1117]">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-[#6B7280]">{description}</p>}
      </div>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

function Label({ htmlFor, optional, children }: { htmlFor?: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium text-[#4B5563]">
      {children}
      {optional && <span className="ml-1.5 font-normal text-[#9CA3AF]">Optional</span>}
    </label>
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
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fe5c13]/40 focus-visible:ring-offset-2 ${checked ? "bg-[#fe5c13]" : "bg-[#D6D6CF]"}`}
    >
      <span
        className={`absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-[0_1px_2px_rgba(15,17,23,0.2)] transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`}
      />
    </button>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
  bare,
  className = "",
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  bare?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 ${bare ? "px-4 py-3.5" : "rounded-xl border border-[#E8E8E3] px-4 py-3.5"} ${className}`}
    >
      <div>
        <p className="text-[14px] font-semibold text-[#0F1117]">{title}</p>
        <p className="mt-0.5 text-[12px] text-[#6B7280]">{description}</p>
      </div>
      <Switch checked={checked} onChange={onChange} label={title} />
    </div>
  );
}

function PercentInput({
  value,
  onChange,
  onBlur,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  ariaLabel: string;
}) {
  return (
    <div className="flex h-10 w-28 shrink-0 overflow-hidden rounded-xl border border-[#E8E8E3] bg-white transition-colors hover:border-[#D6D6CF] focus-within:border-[#fe5c13]">
      <input
        type="number"
        min="0"
        max="100"
        step="0.5"
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder="0"
        className="w-full min-w-0 bg-transparent px-3 text-right text-[14px] tabular-nums text-[#0F1117] outline-none"
      />
      <span className="flex items-center border-l border-[#E8E8E3] bg-[#F3F3EF] px-3 text-[13px] font-medium text-[#6B7280]">%</span>
    </div>
  );
}

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
  const sel = "h-10 w-[4.5rem] rounded-xl border border-[#E8E8E3] bg-white px-3 text-[14px] tabular-nums text-[#0F1117]";

  return (
    <div>
      <p className="mb-1.5 text-[13px] font-medium text-[#4B5563]">{label}</p>
      <div className="flex items-center gap-1.5" role="group" aria-label={label}>
        <Select value={hour} onChange={(e) => update(Number(e.target.value), minute, period)} className={sel} aria-label={`${label} hour`}>
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </Select>
        <span className="text-[14px] font-semibold text-[#9CA3AF]">:</span>
        <Select value={minute} onChange={(e) => update(hour, Number(e.target.value), period)} className={sel} aria-label={`${label} minute`}>
          {MINUTES.map((m) => (
            <option key={m} value={m}>
              {String(m).padStart(2, "0")}
            </option>
          ))}
        </Select>
        <div className="ml-1 inline-flex h-10 items-center gap-0.5 rounded-xl bg-[#F3F3EF] p-1" role="radiogroup" aria-label={`${label} AM or PM`}>
          {(["AM", "PM"] as const).map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={period === p}
              onClick={() => update(hour, minute, p)}
              className={`flex h-8 items-center rounded-lg px-3 text-[13px] transition-colors ${period === p ? SEG_ON : SEG_OFF}`}
            >
              {p}
            </button>
          ))}
        </div>
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

  const fmtPreview = (n: number) =>
    `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const phoneInvalid = !!data.phone.trim() && !!PHONE_RULES[data.phoneCountryCode] && !PHONE_RULES[data.phoneCountryCode].pattern.test(data.phone.trim());
  const inputCls = INPUT;

  const sliceLeft = (
    <div className="min-w-0 space-y-6">
      <Section title="Brand" description="Shown on your menu, bills and the staff app.">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex items-center gap-4 sm:w-auto">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#E8E8E3] bg-[#FAFAF7]">
              {data.logo_url ? (
                <img src={data.logo_url} alt="Restaurant logo" className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="h-7 w-7 text-[#C4C4BE]" />
              )}
            </div>
            <div className="space-y-2">
              <label
                className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-[#E8E8E3] bg-white px-3 text-[13px] font-semibold text-[#374151] transition-colors hover:border-[#D6D6CF] hover:text-[#0F1117] focus-within:border-[#fe5c13] ${isUploading ? "pointer-events-none opacity-60" : ""}`}
              >
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4 text-[#6B7280]" />}
                {isUploading ? "Uploading" : data.logo_url ? "Replace logo" : "Upload logo"}
                <input type="file" className="sr-only" accept="image/*" onChange={onLogoChange} disabled={isUploading} />
              </label>
              {data.logo_url && onLogoRemove ? (
                <button
                  type="button"
                  onClick={onLogoRemove}
                  disabled={isRemovingLogo || isUploading}
                  className="block text-[12px] font-medium text-[#6B7280] transition-colors hover:text-rose-600 disabled:opacity-50"
                >
                  {isRemovingLogo ? "Removing" : "Remove logo"}
                </button>
              ) : (
                <p className="text-[12px] text-[#9CA3AF]">A square image works best.</p>
              )}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <Label htmlFor="rp-name">Restaurant name</Label>
            <input
              id="rp-name"
              value={data.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="The Golden Bistro"
              className={`${inputCls} h-11 text-[16px] font-semibold`}
            />
          </div>
        </div>
      </Section>

      <Section title="Contact and location" description="How guests and delivery partners reach you.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label htmlFor="rp-address">Address</Label>
            <input
              id="rp-address"
              value={data.address}
              onChange={(e) => handleChange("address", e.target.value)}
              placeholder="123 Gourmet Ave, Food City"
              className={inputCls}
            />
          </div>
          <div>
            <Label htmlFor="rp-phone">Phone</Label>
            <div className="flex h-10 overflow-hidden rounded-xl border border-[#E8E8E3] bg-white transition-colors hover:border-[#D6D6CF] focus-within:border-[#fe5c13]">
              <Select
                value={data.phoneCountryCode}
                onChange={(e) => handleChange("phoneCountryCode", e.target.value)}
                className="h-full w-[118px] shrink-0 border-r border-[#E8E8E3] bg-[#F3F3EF] px-3 text-[13px] font-medium text-[#374151]"
              >
                {PHONE_COUNTRY_CODES.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.label}
                  </option>
                ))}
              </Select>
              <input
                id="rp-phone"
                value={data.phone}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "");
                  const max = PHONE_RULES[data.phoneCountryCode]?.max ?? 14;
                  handleChange("phone", digits.slice(0, max));
                }}
                placeholder={PHONE_RULES[data.phoneCountryCode]?.example || "Business number"}
                inputMode="tel"
                className="w-full min-w-0 bg-transparent px-3.5 text-[14px] tabular-nums text-[#0F1117] outline-none placeholder:text-[#9CA3AF]"
              />
            </div>
            {phoneInvalid && (
              <p className="mt-1.5 text-[12px] text-rose-600">
                That doesn&apos;t look like a {data.phoneCountryCode} number. For example {PHONE_RULES[data.phoneCountryCode]?.example}.
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="rp-web" optional>Website</Label>
            <input
              id="rp-web"
              type="url"
              value={data.website || ""}
              onChange={(e) => handleChange("website", e.target.value)}
              placeholder="https://yourrestaurant.com"
              className={inputCls}
            />
          </div>
        </div>
      </Section>

      <Section title="Menu link and reviews" description="Where guests find your menu and leave reviews.">
        <div className="space-y-4">
          <div>
            <Label htmlFor="rp-slug">Digital menu address</Label>
            <div className="flex h-10 overflow-hidden rounded-xl border border-[#E8E8E3] bg-white transition-colors hover:border-[#D6D6CF] focus-within:border-[#fe5c13]">
              <input
                id="rp-slug"
                type="text"
                value={data.storeSlug || ""}
                onChange={(e) => handleChange("storeSlug", e.target.value)}
                placeholder="your-restaurant-name"
                className="w-full min-w-0 bg-transparent px-3.5 text-[14px] text-[#0F1117] outline-none placeholder:text-[#9CA3AF]"
              />
              <span className="flex shrink-0 items-center border-l border-[#E8E8E3] bg-[#F3F3EF] px-3.5 text-[13px] text-[#6B7280]">
                .qravetech.in
              </span>
            </div>
            {data.storeSlug && (
              <a
                href={`https://${data.storeSlug}.qravetech.in`}
                target="_blank"
                rel="noreferrer"
                className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-medium text-[#6B7280] transition-colors hover:text-[#0F1117]"
              >
                {data.storeSlug}.qravetech.in <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          <div>
            <Label htmlFor="rp-review" optional>Google review link</Label>
            <input
              id="rp-review"
              type="url"
              value={data.googleReviewUrl || ""}
              onChange={(e) => handleChange("googleReviewUrl", e.target.value)}
              placeholder="https://g.page/r/your-business/review"
              className={inputCls}
            />
            <p className="mt-1.5 text-[12px] leading-relaxed text-[#9CA3AF]">
              Guests who rate 4 or 5 stars on their bill are sent here. Lower ratings stay private as feedback. You&apos;ll find the link in Google Business Profile under &ldquo;Get more reviews&rdquo;.
            </p>
          </div>
        </div>
      </Section>

      <Section title="Hours and ordering" description="When you're open, and whether guests can order from the menu.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TimePickerField label="Opens at" value={data.openTime || ""} onChange={(v) => handleChange("openTime", v)} />
          <TimePickerField label="Closes at" value={data.closeTime || ""} onChange={(v) => handleChange("closeTime", v)} />
        </div>
        <ToggleRow
          className="mt-5"
          title="Online ordering"
          description={data.orderingEnabled !== false ? "Guests can order from the QR menu." : "Guests can only browse the menu and AR view."}
          checked={data.orderingEnabled !== false}
          onChange={() => handleChange("orderingEnabled", !(data.orderingEnabled !== false))}
        />
      </Section>

      <Section title="GST and tax" description="How tax and charges are worked out on your bills.">
        <div className="space-y-6">
          <div>
            <Label htmlFor="rp-gstin" optional>GSTIN</Label>
            <div className="relative max-w-sm">
              <input
                id="rp-gstin"
                value={data.gstNumber ?? ""}
                onChange={(e) => handleChange("gstNumber", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15))}
                placeholder="22AAAAA0000A1Z5"
                spellCheck={false}
                className={`${inputCls} pr-10 tabular-nums tracking-wider ${data.gstNumber && !gstinIsValid ? "!border-rose-300" : ""}`}
              />
              {data.gstNumber && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  {gstinIsValid ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-rose-500" />}
                </span>
              )}
            </div>
            {data.gstNumber && !gstinIsValid && (
              <p className="mt-1.5 text-[12px] text-rose-600">
                A GSTIN is 15 characters: state code, PAN, entity number, Z and a check digit. For example 22AAAAA0000A1Z5.
              </p>
            )}
          </div>

          <div>
            <Label>GST rate</Label>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex h-10 items-center gap-0.5 rounded-xl bg-[#F3F3EF] p-1" role="radiogroup" aria-label="GST rate">
                {GST_SLABS.map((slab) => {
                  const on = !customSlab && (data.taxPercent ?? 0) === slab;
                  return (
                    <button
                      key={slab}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => {
                        setCustomSlab(false);
                        setTaxInput(String(slab));
                        handleChange("taxPercent", slab);
                      }}
                      className={`flex h-8 min-w-[3.25rem] items-center justify-center rounded-lg px-3 text-[13px] tabular-nums transition-colors ${on ? SEG_ON : SEG_OFF}`}
                    >
                      {slab}%
                    </button>
                  );
                })}
                <button
                  type="button"
                  role="radio"
                  aria-checked={customSlab}
                  onClick={() => setCustomSlab(true)}
                  className={`flex h-8 items-center justify-center rounded-lg px-3 text-[13px] transition-colors ${customSlab ? SEG_ON : SEG_OFF}`}
                >
                  Custom
                </button>
              </div>
              {customSlab && (
                <PercentInput
                  value={taxInput}
                  ariaLabel="Custom GST rate"
                  onChange={(v) => {
                    setTaxInput(v);
                    if (v !== "") handleChange("taxPercent", Number(v));
                  }}
                  onBlur={() => { if (taxInput === "") { setTaxInput("0"); handleChange("taxPercent", 0); } }}
                />
              )}
            </div>
            <p className="mt-1.5 text-[12px] text-[#9CA3AF]">Most restaurants charge 5%.</p>
          </div>

          <div>
            <Label>Show tax on the bill as</Label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Tax breakup">
              {([
                { key: "cgst_sgst", title: "CGST + SGST", desc: "Selling within your state. Most restaurants." },
                { key: "igst", title: "IGST", desc: "Selling to another state." },
              ] as const).map(({ key, title, desc }) => {
                const on = mode === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => handleTaxConfigChange("mode", key)}
                    className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${on ? "border-[#fe5c13] bg-[#FFF4EC]" : "border-[#E8E8E3] bg-white hover:border-[#D6D6CF]"}`}
                  >
                    <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${on ? "border-[#fe5c13]" : "border-[#C4C4BE]"}`}>
                      {on && <span className="h-2 w-2 rounded-full bg-[#fe5c13]" />}
                    </span>
                    <span>
                      <span className="block text-[14px] font-semibold text-[#0F1117]">{title}</span>
                      <span className="mt-0.5 block text-[12px] text-[#6B7280]">{desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="divide-y divide-[#F0F0EB] rounded-xl border border-[#E8E8E3]">
            <ToggleRow
              bare
              title="Prices include tax"
              description={inclusive ? "Menu prices already include GST." : "GST is added on top of menu prices."}
              checked={inclusive}
              onChange={() => handleTaxConfigChange("inclusive", !inclusive)}
            />
            <div>
              <ToggleRow
                bare
                title="Cess"
                description="An extra cess charged on top of GST."
                checked={cessEnabled}
                onChange={() => handleTaxConfigChange("cess_enabled", !cessEnabled)}
              />
              {cessEnabled && (
                <div className="flex items-center gap-3 px-4 pb-4">
                  <span className="text-[13px] text-[#4B5563]">Cess rate</span>
                  <PercentInput
                    value={cessInput}
                    ariaLabel="Cess rate"
                    onChange={(v) => {
                      setCessInput(v);
                      if (v !== "") handleTaxConfigChange("cess_percent", Number(v));
                    }}
                    onBlur={() => { if (cessInput === "") { setCessInput("0"); handleTaxConfigChange("cess_percent", 0); } }}
                  />
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-3.5">
              <div>
                <p className="text-[14px] font-semibold text-[#0F1117]">Service charge</p>
                <p className="mt-0.5 text-[12px] text-[#6B7280]">Added to every bill. Set 0 to turn it off.</p>
              </div>
              <PercentInput
                value={serviceInput}
                ariaLabel="Service charge"
                onChange={(v) => {
                  setServiceInput(v);
                  if (v !== "") handleChange("serviceCharge", Number(v));
                }}
                onBlur={() => { if (serviceInput === "") { setServiceInput("0"); handleChange("serviceCharge", 0); } }}
              />
            </div>
          </div>
        </div>
      </Section>

      <Section title="Reservation deposits" description="Ask guests to pay upfront to hold a table.">
        <ToggleRow
          title="Require a deposit"
          description={data.reservationDepositRequired ? "Guests pay a deposit when they book." : "Bookings are free to make."}
          checked={!!data.reservationDepositRequired}
          onChange={() => handleChange("reservationDepositRequired", !data.reservationDepositRequired)}
        />
        {data.reservationDepositRequired && (
          <div className="mt-4">
            <Label htmlFor="rp-deposit">Deposit per booking</Label>
            <div className="flex h-10 w-48 overflow-hidden rounded-xl border border-[#E8E8E3] bg-white transition-colors hover:border-[#D6D6CF] focus-within:border-[#fe5c13]">
              <span className="flex shrink-0 items-center border-r border-[#E8E8E3] bg-[#F3F3EF] px-3 text-[13px] font-medium text-[#6B7280]">
                {data.currency === "INR" ? "₹" : data.currency}
              </span>
              <input
                id="rp-deposit"
                type="number"
                min="0"
                step="1"
                value={data.reservationDepositAmount ?? 0}
                onChange={(e) => handleChange("reservationDepositAmount", Math.max(0, Number(e.target.value) || 0))}
                className="w-full min-w-0 bg-transparent px-3 text-[14px] tabular-nums text-[#0F1117] outline-none"
                placeholder="0"
              />
            </div>
          </div>
        )}
      </Section>
    </div>
  );

  const pct = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
  const Line = ({ label, value, muted }: { label: string; value: number; muted?: boolean }) => (
    <div className={`flex justify-between gap-4 ${muted ? "text-[12px] text-[#9CA3AF]" : "text-[13px] text-[#4B5563]"}`}>
      <span>{label}</span>
      <span className="tabular-nums">{fmtPreview(value)}</span>
    </div>
  );
  const rate = data.taxPercent ?? 0;

  const preview = (
    <aside className="xl:sticky xl:top-0">
      <div className="rounded-2xl border border-[#E8E8E3] bg-white">
        <div className="border-b border-dashed border-[#E8E8E3] px-5 py-4">
          <p className="text-[14px] font-semibold text-[#0F1117]">Bill preview</p>
          <p className="mt-0.5 text-[12px] text-[#6B7280]">A ₹1,000 order with your current settings.</p>
        </div>
        <div className="px-5 py-4">
          <p className="truncate text-center text-[14px] font-semibold text-[#0F1117]">{data.name || "Your restaurant"}</p>
          {data.gstNumber && gstinIsValid && (
            <p className="mt-0.5 text-center text-[11px] tabular-nums tracking-wide text-[#9CA3AF]">GSTIN {data.gstNumber}</p>
          )}
          <div className="mt-4 space-y-1.5">
            <Line label={inclusive ? "Subtotal, tax included" : "Subtotal"} value={PREVIEW_BASE} />
            {rate > 0 &&
              (mode === "cgst_sgst" ? (
                <>
                  <Line label={`${inclusive ? "Includes " : ""}CGST ${pct(rate / 2)}%`} value={taxAmount / 2} muted={inclusive} />
                  <Line label={`${inclusive ? "Includes " : ""}SGST ${pct(rate / 2)}%`} value={taxAmount / 2} muted={inclusive} />
                </>
              ) : (
                <Line label={`${inclusive ? "Includes " : ""}IGST ${pct(rate)}%`} value={taxAmount} muted={inclusive} />
              ))}
            {cessEnabled && cessPercent > 0 && <Line label={`Cess ${pct(cessPercent)}%`} value={cessAmount} />}
            {(data.serviceCharge ?? 0) > 0 && <Line label={`Service charge ${pct(data.serviceCharge ?? 0)}%`} value={serviceAmount} />}
          </div>
          <div className="mt-4 flex items-baseline justify-between border-t border-dashed border-[#E8E8E3] pt-3">
            <span className="text-[14px] font-semibold text-[#0F1117]">Total</span>
            <span className="text-[20px] font-bold tabular-nums tracking-[-0.02em] text-[#0F1117]">{fmtPreview(previewTotal)}</span>
          </div>
        </div>
      </div>
      <p className="mt-3 px-1 text-[12px] leading-relaxed text-[#9CA3AF]">
        Updates as you change tax settings. Figures are rounded and only for illustration.
      </p>
    </aside>
  );

  return (
    <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      {sliceLeft}
      {preview}
    </div>
  );
}
