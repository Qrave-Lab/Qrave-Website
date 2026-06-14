import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

export const CustomSelect = ({ value, onChange, options, placeholder, className = "", buttonClassName = "" }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt: any) => opt.value === value);

  return (
    <div className={`relative group ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-12 pl-4 pr-10 text-sm font-semibold bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#fe5c13] focus:ring-4 focus:ring-[#fe5c13]/10 transition-all flex items-center justify-between hover:bg-slate-100/50 ${isOpen ? "border-[#fe5c13] bg-white ring-4 ring-[#fe5c13]/10" : ""} ${buttonClassName}`}
      >
        <span className="truncate text-slate-700">{selectedOption ? selectedOption.label : placeholder}</span>
      </button>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
        <ArrowDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180 text-[#fe5c13]" : "group-hover:text-slate-600"}`} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full min-w-max mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden py-1.5 ring-1 ring-slate-900/5"
          >
            <div className="max-h-60 overflow-y-auto custom-scrollbar">
              {options.map((opt: any) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={opt.disabled}
                  onClick={() => {
                    if (opt.disabled) return;
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
                    opt.disabled 
                      ? "opacity-50 cursor-not-allowed bg-slate-50/50 text-slate-400" 
                      : value === opt.value 
                        ? "text-[#fe5c13] font-bold bg-orange-50/50 hover:bg-orange-50" 
                        : "text-slate-600 font-medium hover:bg-slate-50"
                  }`}
                >
                  <span className="truncate pr-4">{opt.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
