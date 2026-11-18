"use client";

/*
 * Date range picker for the staff dashboard.
 *
 * Value in, value out as "YYYY-MM-DD" strings. Click a start day, then an end
 * day; the range previews on hover and applies when the end day is picked.
 * Styled with the Qrave warm palette to match the rest of the dashboard.
 */

import React, { useEffect, useMemo, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const pad = (n: number) => String(n).padStart(2, "0");
const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromKey = (k: string) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
const fmtShort = (k: string) => fromKey(k).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const fmtLong = (k: string) => fromKey(k).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

function rangeLabel(from: string, to: string) {
  if (!from) return "Pick dates";
  if (!to || from === to) return fmtLong(from);
  const sameYear = fromKey(from).getFullYear() === fromKey(to).getFullYear();
  return `${sameYear ? fmtShort(from) : fmtLong(from)} – ${fmtLong(to)}`;
}

export interface DateRangePickerProps {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  /** Latest selectable day, "YYYY-MM-DD". Defaults to today. */
  max?: string;
  defaultOpen?: boolean;
  className?: string;
}

export function DateRangePicker({ from, to, onChange, max, defaultOpen = false, className = "" }: DateRangePickerProps) {
  const maxKey = max || toKey(new Date());
  const [open, setOpen] = useState(defaultOpen);
  const [draftStart, setDraftStart] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [view, setView] = useState(() => {
    const d = fromKey(to || from || maxKey);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  useEffect(() => {
    if (!open) {
      setDraftStart(null);
      setHover(null);
    } else {
      const d = fromKey(to || from || maxKey);
      setView(new Date(d.getFullYear(), d.getMonth(), 1));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const days = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7; // Monday first
    const count = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    const cells: (string | null)[] = Array.from({ length: offset }, () => null);
    for (let i = 1; i <= count; i++) cells.push(toKey(new Date(view.getFullYear(), view.getMonth(), i)));
    while (cells.length % 7) cells.push(null);
    return cells;
  }, [view]);

  // Range being shown: a draft (start picked, end pending) or the committed value.
  const [lo, hi] = useMemo(() => {
    if (draftStart) {
      const other = hover || draftStart;
      return draftStart <= other ? [draftStart, other] : [other, draftStart];
    }
    return [from, to || from];
  }, [draftStart, hover, from, to]);

  const todayKey = toKey(new Date());
  const canNext = toKey(new Date(view.getFullYear(), view.getMonth() + 1, 1)) <= maxKey;

  const pick = (k: string) => {
    if (!draftStart) {
      setDraftStart(k);
      return;
    }
    const [a, b] = draftStart <= k ? [draftStart, k] : [k, draftStart];
    onChange(a, b);
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={`inline-flex h-9 items-center gap-2 rounded-xl border bg-white px-3 text-[12px] font-semibold tabular-nums text-[#0F1117] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#fe5c13]/30 ${open ? "border-[#fe5c13]" : "border-[#E8E8E3] hover:border-[#D6D6CF]"} ${className}`}
        >
          <CalendarIcon className="h-3.5 w-3.5 text-[#9CA3AF]" />
          {rangeLabel(from, to)}
          <ChevronDown className={`h-3.5 w-3.5 text-[#9CA3AF] transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="qr-ui z-[1000] w-[296px] rounded-2xl border border-[#E8E8E3] bg-white p-4 shadow-[0_18px_40px_-16px_rgba(15,17,23,0.3)] outline-none"
        >
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
              aria-label="Previous month"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6B7280] transition-colors hover:bg-[#F3F3EF] hover:text-[#0F1117] outline-none focus-visible:ring-2 focus-visible:ring-[#fe5c13]/30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-[14px] font-semibold text-[#0F1117]">
              {view.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
            </p>
            <button
              type="button"
              onClick={() => canNext && setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
              disabled={!canNext}
              aria-label="Next month"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6B7280] transition-colors hover:bg-[#F3F3EF] hover:text-[#0F1117] outline-none focus-visible:ring-2 focus-visible:ring-[#fe5c13]/30 disabled:cursor-not-allowed disabled:text-[#D6D6CF] disabled:hover:bg-transparent"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 text-center text-[11px] font-medium text-[#9CA3AF]">
            {WEEKDAYS.map((w) => (
              <span key={w} className="py-1">{w}</span>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-y-1" onMouseLeave={() => setHover(null)}>
            {days.map((k, i) => {
              if (!k) return <span key={`e${i}`} />;
              const disabled = k > maxKey;
              const inRange = !!lo && !!hi && k >= lo && k <= hi;
              const isStart = k === lo;
              const isEnd = k === hi;
              const edge = isStart || isEnd;
              const col = i % 7;
              // Continuous band behind the range; rounded at its ends and at row edges.
              const band = inRange && lo !== hi
                ? `bg-[#FFF4EC] ${isStart || col === 0 ? "rounded-l-lg" : ""} ${isEnd || col === 6 ? "rounded-r-lg" : ""}`
                : "";
              return (
                <div key={k} className={`flex justify-center ${band}`}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => pick(k)}
                    onMouseEnter={() => draftStart && setHover(k)}
                    aria-pressed={edge}
                    aria-label={fromKey(k).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                    className={`relative flex h-9 w-9 items-center justify-center rounded-lg text-[13px] tabular-nums transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#fe5c13]/30 ${
                      disabled
                        ? "cursor-not-allowed text-[#D6D6CF]"
                        : edge
                          ? "bg-[#fe5c13] font-semibold text-white"
                          : inRange
                            ? "font-medium text-[#C2410C] hover:bg-[#FDE6D6]"
                            : "text-[#0F1117] hover:bg-[#F3F3EF]"
                    }`}
                  >
                    {Number(k.slice(-2))}
                    {k === todayKey && !edge && (
                      <span className="absolute bottom-1 h-1 w-1 rounded-full bg-[#fe5c13]" aria-hidden />
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          <p className="mt-3 border-t border-[#F0F0EB] pt-3 text-[12px] text-[#6B7280]">
            {draftStart ? "Now pick the end date." : "Pick a start date, then an end date."}
          </p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export default DateRangePicker;
