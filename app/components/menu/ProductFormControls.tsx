"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Search, X } from "lucide-react";

/*
 * Form controls for the product editor, drawn from the Qrave palette:
 * ink #0F1117, saffron #fe5c13, parchment #F8F9FA, sand #DEE2E6, taupe #6B7280.
 */

const fieldBase =
  "w-full h-12 rounded-xl border bg-[#F8F9FA] px-4 text-left text-[15px] text-[#0F1117] outline-none transition-[border-color,box-shadow,background-color] duration-150";
const fieldIdle = "border-[#DEE2E6] hover:border-[#CED4DA]";
const fieldOpen = "border-[#fe5c13] bg-white ring-4 ring-[#fe5c13]/12";

export interface ProductSelectOption {
  value: string;
  label: string;
  hint?: string;
}

function useDismiss(open: boolean, close: () => void, ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close, ref]);
}

function useOpenDirection(open: boolean, ref: React.RefObject<HTMLElement | null>) {
  const [up, setUp] = useState(false);
  useEffect(() => {
    if (!open || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom;
    setUp(below < 300 && rect.top > below);
  }, [open, ref]);
  return up;
}

export function ProductSelect({
  value,
  onChange,
  options,
  placeholder = "Select",
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: ProductSelectOption[];
  placeholder?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const up = useOpenDirection(open, rootRef);
  useDismiss(open, () => setOpen(false), rootRef);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (open) setCursor(Math.max(0, options.findIndex((o) => o.value === value)));
  }, [open, options, value]);

  const commit = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(options.length - 1, c + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const opt = options[cursor];
      if (opt) commit(opt.value);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className={`${fieldBase} ${open ? fieldOpen : fieldIdle} flex items-center justify-between gap-3 focus-visible:border-[#fe5c13] focus-visible:ring-4 focus-visible:ring-[#fe5c13]/12`}
      >
        <span className={`truncate ${selected ? "" : "text-[#9CA3AF]"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[#6B7280] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            id={listId}
            role="listbox"
            initial={{ opacity: 0, y: up ? 4 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: up ? 4 : -4 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className={`absolute left-0 right-0 z-50 max-h-64 overflow-y-auto rounded-xl border border-[#DEE2E6] bg-white p-1.5 shadow-[0_18px_40px_-18px_rgba(26,26,26,0.35)] ${up ? "bottom-full mb-2" : "top-full mt-2"}`}
          >
            {options.map((opt, i) => {
              const isSelected = opt.value === value;
              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setCursor(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => commit(opt.value)}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-[14px] ${i === cursor ? "bg-[#F1F3F5]" : ""} ${isSelected ? "font-semibold text-[#0F1117]" : "text-[#1F2937]"}`}
                >
                  <span className="truncate">
                    {opt.label}
                    {opt.hint && <span className="ml-2 font-normal text-[#6B7280]">{opt.hint}</span>}
                  </span>
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-[#fe5c13]" strokeWidth={2.5} />}
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  ariaLabel?: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="grid h-12 auto-cols-fr grid-flow-col gap-1 rounded-xl border border-[#DEE2E6] bg-[#F8F9FA] p-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={`rounded-lg text-[14px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#fe5c13]/40 ${active
              ? "bg-white font-semibold text-[#0F1117] shadow-[0_1px_2px_rgba(26,26,26,0.08),0_0_0_1px_#DEE2E6]"
              : "font-medium text-[#6B7280] hover:text-[#0F1117]"
              }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function CheckRow({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3.5 transition-colors ${checked ? "border-[#0F1117] bg-white" : "border-[#DEE2E6] bg-[#F8F9FA] hover:border-[#CED4DA]"
        }`}
    >
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span
        aria-hidden
        className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[#fe5c13]/40 ${checked ? "border-[#fe5c13] bg-[#fe5c13]" : "border-[#CED4DA] bg-white"
          }`}
      >
        {checked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
      </span>
      <span className="min-w-0">
        <span className="block text-[14px] font-medium text-[#0F1117]">{label}</span>
        {description && <span className="mt-0.5 block text-[13px] text-[#6B7280]">{description}</span>}
      </span>
    </label>
  );
}

export function DishMultiPicker({
  value,
  onChange,
  options,
  placeholder = "Choose dishes",
}: {
  value: string[];
  onChange: (value: string[]) => void;
  options: ProductSelectOption[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const up = useOpenDirection(open, rootRef);
  useDismiss(open, () => { setOpen(false); setQuery(""); }, rootRef);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  const byId = useMemo(() => new Map(options.map((o) => [o.value, o])), [options]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  return (
    <div ref={rootRef} className="relative">
      <div
        role="button"
        tabIndex={0}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={`min-h-12 w-full cursor-pointer rounded-xl border bg-[#F8F9FA] px-2 py-2 outline-none transition-[border-color,box-shadow,background-color] duration-150 focus-visible:border-[#fe5c13] focus-visible:ring-4 focus-visible:ring-[#fe5c13]/12 ${open ? fieldOpen : fieldIdle}`}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {value.length === 0 && (
            <span className="px-2 py-1 text-[15px] text-[#9CA3AF]">{placeholder}</span>
          )}
          {value.map((id) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-lg border border-[#DEE2E6] bg-white py-1 pl-2.5 pr-1 text-[13px] font-medium text-[#0F1117]"
            >
              {byId.get(id)?.label ?? "Removed dish"}
              <button
                type="button"
                aria-label={`Remove ${byId.get(id)?.label ?? "dish"}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(id);
                }}
                className="rounded-md p-0.5 text-[#6B7280] hover:bg-[#E9ECEF] hover:text-[#0F1117]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
          <ChevronDown
            className={`ml-auto mr-2 h-4 w-4 shrink-0 text-[#6B7280] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: up ? 4 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: up ? 4 : -4 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className={`absolute left-0 right-0 z-50 overflow-hidden rounded-xl border border-[#DEE2E6] bg-white shadow-[0_18px_40px_-18px_rgba(26,26,26,0.35)] ${up ? "bottom-full mb-2" : "top-full mt-2"}`}
          >
            <div className="flex items-center gap-2 border-b border-[#E9ECEF] px-3.5">
              <Search className="h-4 w-4 shrink-0 text-[#6B7280]" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search dishes"
                className="h-11 w-full bg-transparent text-[14px] text-[#0F1117] outline-none placeholder:text-[#9CA3AF]"
              />
            </div>
            <ul role="listbox" aria-multiselectable className="max-h-60 overflow-y-auto p-1.5">
              {filtered.length === 0 && (
                <li className="px-3 py-6 text-center text-[13px] text-[#6B7280]">
                  No dishes match “{query}”.
                </li>
              )}
              {filtered.map((opt) => {
                const isSelected = value.includes(opt.value);
                return (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => toggle(opt.value)}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] text-[#1F2937] hover:bg-[#F1F3F5]"
                  >
                    <span
                      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border ${isSelected ? "border-[#fe5c13] bg-[#fe5c13]" : "border-[#CED4DA] bg-white"}`}
                    >
                      {isSelected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                    </span>
                    <span className={`truncate ${isSelected ? "font-medium text-[#0F1117]" : ""}`}>{opt.label}</span>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
