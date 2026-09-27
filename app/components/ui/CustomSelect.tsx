"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Search, X } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  group?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface CustomSelectProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  searchable?: boolean;
  theme?: "orange" | "emerald" | "slate";
  direction?: "up" | "down" | "auto";
}

export function CustomSelect<T extends string = string>({
  value,
  onChange,
  options = [],
  placeholder = "Select an option...",
  className = "",
  buttonClassName = "",
  searchable,
  theme = "emerald",
  direction = "auto",
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [openDirection, setOpenDirection] = useState<"up" | "down">("down");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto calculate direction when opening
  useEffect(() => {
    if (isOpen && containerRef.current) {
      if (direction === "up" || direction === "down") {
        setOpenDirection(direction);
      } else {
        const rect = containerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        if (spaceBelow < 280 && spaceAbove > spaceBelow) {
          setOpenDirection("up");
        } else {
          setOpenDirection("down");
        }
      }
    }
  }, [isOpen, direction]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  // Automatically enable search if there are more than 6 options, unless explicitly set
  const isSearchable = searchable !== undefined ? searchable : options.length > 6;

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase().trim();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.group && opt.group.toLowerCase().includes(q))
    );
  }, [options, searchQuery]);

  // Group options if any option has a group property
  const hasGroups = useMemo(
    () => options.some((opt) => Boolean(opt.group)),
    [options]
  );

  const groupedOptions = useMemo(() => {
    if (!hasGroups) return null;
    const groups: { [key: string]: SelectOption<T>[] } = {};
    for (const opt of filteredOptions) {
      const g = opt.group || "Other";
      if (!groups[g]) groups[g] = [];
      groups[g].push(opt);
    }
    return groups;
  }, [filteredOptions, hasGroups]);

  // Theme styles
  const themeActiveBorder =
    theme === "emerald"
      ? "border-emerald-500 ring-4 ring-emerald-500/10"
      : theme === "slate"
      ? "border-slate-800 ring-4 ring-slate-800/10"
      : "border-[#fe5c13] ring-4 ring-[#fe5c13]/10";

  const themeItemSelected =
    theme === "emerald"
      ? "text-emerald-800 font-bold bg-emerald-50"
      : theme === "slate"
      ? "text-slate-900 font-bold bg-slate-100"
      : "text-[#fe5c13] font-bold bg-orange-50";

  const themeCheckIcon =
    theme === "emerald"
      ? "text-emerald-600"
      : theme === "slate"
      ? "text-slate-900"
      : "text-[#fe5c13]";

  return (
    <div className={`relative group w-full ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full min-h-[46px] px-4 py-2.5 text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl outline-none transition-all flex items-center justify-between text-left hover:bg-slate-100/70 hover:border-slate-300 cursor-pointer ${
          isOpen ? `bg-white ${themeActiveBorder}` : ""
        } ${buttonClassName}`}
      >
        <div className="flex items-center gap-2 truncate pr-2">
          {selectedOption?.icon && (
            <span className="shrink-0">{selectedOption.icon}</span>
          )}
          <span
            className={`truncate ${
              selectedOption
                ? "text-slate-900 font-semibold"
                : "text-slate-400 font-normal"
            }`}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180 text-slate-700" : "group-hover:text-slate-600"
          }`}
        />
      </button>

      {/* Floating Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: openDirection === "up" ? 6 : -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: openDirection === "up" ? 6 : -6, scale: 0.98 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className={`absolute z-50 w-full bg-white border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-slate-900/5 max-h-72 flex flex-col ${
              openDirection === "up" ? "bottom-full mb-1.5" : "top-full mt-1.5"
            }`}
          >
            {/* Search Input */}
            {isSearchable && (
              <div className="p-2 border-b border-slate-100 bg-slate-50/70 sticky top-0 z-10 shrink-0">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200/90 rounded-xl shadow-xs">
                  <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search options..."
                    className="w-full text-xs bg-transparent outline-none text-slate-800 placeholder:text-slate-400 font-medium"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Options List */}
            <div className="overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden p-1.5 flex-1">
              {filteredOptions.length === 0 ? (
                <div className="py-6 text-center text-xs font-medium text-slate-400">
                  No matching options found
                </div>
              ) : hasGroups && groupedOptions ? (
                // Grouped rendering
                Object.entries(groupedOptions).map(([groupName, items]) => (
                  <div key={groupName} className="mb-2 last:mb-0">
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/80 rounded-lg flex items-center justify-between mb-1">
                      <span>{groupName}</span>
                      <span className="text-[9px] font-semibold text-slate-500 bg-slate-200/70 px-1.5 py-0.2 rounded-full">
                        {items.length}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {items.map((opt) => {
                        const isSelected = value === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            disabled={opt.disabled}
                            onClick={() => {
                              if (opt.disabled) return;
                              onChange(opt.value);
                              setIsOpen(false);
                              setSearchQuery("");
                            }}
                            className={`w-full text-left px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center justify-between cursor-pointer ${
                              opt.disabled
                                ? "opacity-40 cursor-not-allowed bg-slate-50 text-slate-400"
                                : isSelected
                                ? themeItemSelected
                                : "text-slate-700 hover:bg-slate-100/70 hover:text-slate-950"
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate pr-2">
                              {opt.icon && (
                                <span className="shrink-0">{opt.icon}</span>
                              )}
                              <span className="truncate">{opt.label}</span>
                            </div>
                            {isSelected && (
                              <Check className={`w-4 h-4 shrink-0 ${themeCheckIcon}`} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                // Flat rendering
                <div className="space-y-0.5">
                  {filteredOptions.map((opt) => {
                    const isSelected = value === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={opt.disabled}
                        onClick={() => {
                          if (opt.disabled) return;
                          onChange(opt.value);
                          setIsOpen(false);
                          setSearchQuery("");
                        }}
                        className={`w-full text-left px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center justify-between cursor-pointer ${
                          opt.disabled
                            ? "opacity-40 cursor-not-allowed bg-slate-50 text-slate-400"
                            : isSelected
                            ? themeItemSelected
                            : "text-slate-700 hover:bg-slate-100/70 hover:text-slate-950"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          {opt.icon && (
                            <span className="shrink-0">{opt.icon}</span>
                          )}
                          <span className="truncate">{opt.label}</span>
                        </div>
                        {isSelected && (
                          <Check className={`w-4 h-4 shrink-0 ${themeCheckIcon}`} />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
