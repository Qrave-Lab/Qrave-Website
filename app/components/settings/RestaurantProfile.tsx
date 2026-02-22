import React from "react";
import { Camera, Loader2, Image as ImageIcon } from "lucide-react";
import type { Restaurant } from "./types";

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
  isUploading?: boolean;
};

export default function RestaurantProfile({ data, onChange, onLogoChange, isUploading }: Props) {
  const [taxInput, setTaxInput] = React.useState(String(data.taxPercent ?? 0));
  const [serviceInput, setServiceInput] = React.useState(String(data.serviceCharge ?? 0));

  React.useEffect(() => {
    setTaxInput(String(data.taxPercent ?? 0));
  }, [data.taxPercent]);

  React.useEffect(() => {
    setServiceInput(String(data.serviceCharge ?? 0));
  }, [data.serviceCharge]);

  const handleChange = (key: keyof Restaurant, value: string | number | boolean) => {
    onChange({ ...data, [key]: value });
  };


  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <h2 className="font-bold text-slate-900 flex items-center gap-2">
          Restaurant Profile
        </h2>
      </div>

      <div className="p-6 space-y-6">
        <div className="flex items-center gap-6">
          <div className="relative shrink-0">
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

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Tax Rate (%)
            </label>
            <input
              type="number"
              value={taxInput}
              onChange={(e) => {
                const v = e.target.value;
                setTaxInput(v);
                if (v === "") return;
                handleChange("taxPercent", Number(v));
              }}
              onBlur={() => {
                if (taxInput === "") {
                  handleChange("taxPercent", 0);
                  setTaxInput("0");
                }
              }}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all bg-slate-50/30 text-slate-900"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Service Charge (%)
            </label>
            <input
              type="number"
              value={serviceInput}
              onChange={(e) => {
                const v = e.target.value;
                setServiceInput(v);
                if (v === "") return;
                handleChange("serviceCharge", Number(v));
              }}
              onBlur={() => {
                if (serviceInput === "") {
                  handleChange("serviceCharge", 0);
                  setServiceInput("0");
                }
              }}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all bg-slate-50/30 text-slate-900"
            />
          </div>
        </div>

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
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                data.orderingEnabled !== false ? "bg-emerald-500" : "bg-slate-300"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  data.orderingEnabled !== false ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
