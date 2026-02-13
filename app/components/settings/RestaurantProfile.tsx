import React from "react";
import { Store, Camera, Loader2, Image as ImageIcon } from "lucide-react";
import type { Restaurant } from "./types";
import toast from "react-hot-toast";


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

  const handleChange = (key: keyof Restaurant, value: any) => {
  if (key === "phone") {
    const cleaned = value.replace(/\D/g, "");

    if (cleaned.length > 10) {
      toast.error("Phone number cannot exceed 10 digits.");
      return;
    }

    onChange({ ...data, [key]: cleaned });
    return;
  }

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
            <input
  value={data.phone}
  onChange={(e) => handleChange("phone", e.target.value)}
  placeholder="0000000000"
  inputMode="numeric"
  pattern="[0-9]*"
  maxLength={10}
  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all bg-slate-50/30 text-slate-900"
/>

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
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Opens At
            </label>
            <input
              type="time"
              value={data.openTime || ""}
              onChange={(e) => handleChange("openTime", e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all bg-slate-50/30 text-slate-900"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Closes At
            </label>
            <input
              type="time"
              value={data.closeTime || ""}
              onChange={(e) => handleChange("closeTime", e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all bg-slate-50/30 text-slate-900"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
