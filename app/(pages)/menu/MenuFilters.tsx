"use client";

import { SlidersHorizontal, X } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  DEFAULT_MENU_FILTERS,
  countActiveFilters,
  parseStoredFilters,
  type DietFilter,
  type MaxSpice,
  type MenuFilterState,
} from "./filterMenuItems";

const STORAGE_KEY = "qrave_menu_filters_v1";

/** Session-persisted filter state. Storage access is always guarded. */
export function useMenuFilters() {
  const [filters, setFilters] = useState<MenuFilterState>(() => {
    if (typeof window === "undefined") return DEFAULT_MENU_FILTERS;
    try {
      return parseStoredFilters(sessionStorage.getItem(STORAGE_KEY));
    } catch {
      return DEFAULT_MENU_FILTERS;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch {
      /* storage unavailable */
    }
  }, [filters]);

  const clear = useCallback(() => setFilters(DEFAULT_MENU_FILTERS), []);
  const activeCount = countActiveFilters(filters);
  return { filters, setFilters, clear, activeCount };
}

const DIET_OPTIONS: { id: DietFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "veg", label: "Veg" },
  { id: "nonveg", label: "Non-veg" },
];
const SPICE_OPTIONS: { id: MaxSpice; label: string }[] = [
  { id: "any", label: "Any" },
  { id: "none", label: "Not spicy" },
  { id: "mild", label: "Mild" },
  { id: "medium", label: "Medium" },
  { id: "hot", label: "Hot" },
];

const chip = (active: boolean) =>
  `inline-flex items-center justify-center min-h-[44px] px-4 rounded-full border text-[13px] font-semibold whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fe5c13] motion-reduce:transition-none ${
    active
      ? "bg-[#18181B] text-white border-[#18181B]"
      : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
  }`;

type BarProps = {
  filters: MenuFilterState;
  setFilters: React.Dispatch<React.SetStateAction<MenuFilterState>>;
  clear: () => void;
  activeCount: number;
  allergenOptions: string[];
  resultCount: number;
};

/** Horizontally scrollable quick row + full filter bottom sheet. */
export function MenuFilterBar({
  filters,
  setFilters,
  clear,
  activeCount,
  allergenOptions,
  resultCount,
}: BarProps) {
  const [open, setOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sheetRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      triggerRef.current?.focus();
    };
  }, [open]);

  const toggleAllergen = (name: string) =>
    setFilters((f) => ({
      ...f,
      excludeAllergens: f.excludeAllergens.some((a) => a.toLowerCase() === name.toLowerCase())
        ? f.excludeAllergens.filter((a) => a.toLowerCase() !== name.toLowerCase())
        : [...f.excludeAllergens, name],
    }));

  return (
    <>
      <div
        className="flex items-center gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="group"
        aria-label="Menu filters"
      >
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(true)}
          className={chip(activeCount > 0)}
          aria-haspopup="dialog"
          aria-label={
            activeCount > 0 ? `Filters, ${activeCount} active` : "Filters"
          }
        >
          <SlidersHorizontal size={14} className="mr-1.5" aria-hidden />
          Filters{activeCount > 0 ? ` (${activeCount})` : ""}
        </button>
        {DIET_OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={filters.diet === o.id}
            onClick={() => setFilters((f) => ({ ...f, diet: o.id }))}
            className={chip(filters.diet === o.id)}
          >
            {o.label}
          </button>
        ))}
        {activeCount > 0 && (
          <button
            type="button"
            onClick={clear}
            className="inline-flex items-center min-h-[44px] px-3 text-[13px] font-semibold text-[#fe5c13] underline-offset-2 hover:underline whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#fe5c13] rounded-full"
          >
            Clear
          </button>
        )}
      </div>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[120] flex items-end justify-center">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <div
              ref={sheetRef}
              role="dialog"
              aria-modal="true"
              aria-label="Filter menu"
              tabIndex={-1}
              className="relative w-full max-w-[520px] max-h-[88vh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-6 shadow-2xl outline-none"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-zinc-900">Filters</h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close filters"
                  className="w-11 h-11 -mr-2 rounded-full flex items-center justify-center text-zinc-600 hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#fe5c13]"
                >
                  <X size={18} />
                </button>
              </div>

              <section className="mb-5" aria-labelledby="mf-diet">
                <h3 id="mf-diet" className="text-xs font-bold uppercase tracking-wide text-zinc-500 mb-2">
                  Diet
                </h3>
                <div className="flex flex-wrap gap-2">
                  {DIET_OPTIONS.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      aria-pressed={filters.diet === o.id}
                      onClick={() => setFilters((f) => ({ ...f, diet: o.id }))}
                      className={chip(filters.diet === o.id)}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </section>

              <section className="mb-5" aria-labelledby="mf-spice">
                <h3 id="mf-spice" className="text-xs font-bold uppercase tracking-wide text-zinc-500 mb-2">
                  Maximum spice level
                </h3>
                <div className="flex flex-wrap gap-2">
                  {SPICE_OPTIONS.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      aria-pressed={filters.maxSpice === o.id}
                      onClick={() => setFilters((f) => ({ ...f, maxSpice: o.id }))}
                      className={chip(filters.maxSpice === o.id)}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </section>

              {allergenOptions.length > 0 && (
                <section className="mb-4" aria-labelledby="mf-allergen">
                  <h3 id="mf-allergen" className="text-xs font-bold uppercase tracking-wide text-zinc-500 mb-1">
                    Exclude allergens
                  </h3>
                  <p className="text-xs text-zinc-500 mb-2">
                    Hides dishes that contain, may contain or have traces of the selected allergens.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {allergenOptions.map((name) => {
                      const on = filters.excludeAllergens.some(
                        (a) => a.toLowerCase() === name.toLowerCase(),
                      );
                      return (
                        <button
                          key={name}
                          type="button"
                          aria-pressed={on}
                          onClick={() => toggleAllergen(name)}
                          className={`${chip(on)} capitalize`}
                        >
                          {on ? "No " : ""}
                          {name}
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              <p className="text-xs text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-xl p-3 mb-5">
                Allergen information is provided by the restaurant. If you have a severe allergy, please ask staff before ordering.
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={clear}
                  disabled={activeCount === 0}
                  className="min-h-[48px] px-5 rounded-full border border-zinc-300 text-sm font-semibold text-zinc-700 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#fe5c13]"
                >
                  Clear all
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 min-h-[48px] rounded-full bg-[#fe5c13] text-white text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18181B]"
                >
                  Show {resultCount} {resultCount === 1 ? "dish" : "dishes"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

export function MenuFilterEmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-5 text-center" role="status">
      <h3 className="text-xl font-bold text-slate-800 mb-2">No dishes match your filters</h3>
      <p className="text-slate-500 text-sm max-w-[280px] leading-relaxed">
        Try removing a filter to see more of the menu.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-6 min-h-[48px] px-8 bg-[#fe5c13] text-white rounded-full font-bold hover:bg-[#d94e10] transition-colors active:scale-95 motion-reduce:transform-none"
      >
        Clear filters
      </button>
    </div>
  );
}
