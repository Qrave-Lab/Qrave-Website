"use client";

import React, { useState, useMemo, useEffect } from "react";
import * as Popover from "@radix-ui/react-popover";
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Sparkles,
} from "lucide-react";

export interface CustomDateTimePickerProps {
  value: string; // Format: "YYYY-MM-DDTHH:mm" or ""
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  min?: string;
  disabled?: boolean;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// Helper: parse "YYYY-MM-DDTHH:mm" to local date components
function parseDateTimeString(val: string) {
  if (!val || typeof val !== "string" || !val.includes("T")) {
    return null;
  }
  const [datePart, timePart] = val.split("T");
  const [yearStr, monthStr, dayStr] = (datePart || "").split("-");
  const [hourStr, minStr] = (timePart || "").split(":");

  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1; // 0-based
  const day = parseInt(dayStr, 10);
  const hour24 = parseInt(hourStr, 10) || 0;
  const minute = parseInt(minStr, 10) || 0;

  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

  return { year, month, day, hour24, minute };
}

// Helper: format components back to "YYYY-MM-DDTHH:mm"
function formatToDateTimeString(
  year: number,
  month: number,
  day: number,
  hour24: number,
  minute: number
) {
  const yyyy = String(year).padStart(4, "0");
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  const hh = String(hour24).padStart(2, "0");
  const min = String(minute).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export function CustomDateTimePicker({
  value,
  onChange,
  placeholder = "Select date & time...",
  className = "",
  disabled = false,
}: CustomDateTimePickerProps) {
  const [open, setOpen] = useState(false);

  // Parse current value or fallback to now
  const parsed = useMemo(() => parseDateTimeString(value), [value]);

  const now = useMemo(() => new Date(), []);
  const initialYear = parsed?.year ?? now.getFullYear();
  const initialMonth = parsed?.month ?? now.getMonth();

  // Internal viewing month/year for calendar navigation
  const [viewYear, setViewYear] = useState<number>(initialYear);
  const [viewMonth, setViewMonth] = useState<number>(initialMonth);

  // Sync viewing month when opened or value changes
  useEffect(() => {
    if (parsed) {
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
    }
  }, [value, open, parsed]);

  // Selected date components
  const selectedYear = parsed?.year ?? null;
  const selectedMonth = parsed?.month ?? null;
  const selectedDay = parsed?.day ?? null;

  // Selected time (12h format internally)
  const hour24 = parsed?.hour24 ?? 12;
  const currentMinute = parsed?.minute ?? 0;
  const currentPeriod = hour24 >= 12 ? "PM" : "AM";
  const currentHour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;

  // Navigation
  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  // Build 42 calendar grid cells (6 rows x 7 days)
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sunday
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days: Array<{
      day: number;
      month: number;
      year: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
    }> = [];

    // Prev month padding
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const m = viewMonth === 0 ? 11 : viewMonth - 1;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      days.push({
        day: d,
        month: m,
        year: y,
        isCurrentMonth: false,
        isToday:
          d === now.getDate() &&
          m === now.getMonth() &&
          y === now.getFullYear(),
        isSelected:
          d === selectedDay && m === selectedMonth && y === selectedYear,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      days.push({
        day: d,
        month: viewMonth,
        year: viewYear,
        isCurrentMonth: true,
        isToday:
          d === now.getDate() &&
          viewMonth === now.getMonth() &&
          viewYear === now.getFullYear(),
        isSelected:
          d === selectedDay &&
          viewMonth === selectedMonth &&
          viewYear === selectedYear,
      });
    }

    // Next month padding to fill grid
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const m = viewMonth === 11 ? 0 : viewMonth + 1;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      days.push({
        day: d,
        month: m,
        year: y,
        isCurrentMonth: false,
        isToday:
          d === now.getDate() &&
          m === now.getMonth() &&
          y === now.getFullYear(),
        isSelected:
          d === selectedDay && m === selectedMonth && y === selectedYear,
      });
    }

    return days;
  }, [viewYear, viewMonth, selectedYear, selectedMonth, selectedDay, now]);

  // Handle day click
  const handleSelectDay = (day: number, month: number, year: number) => {
    const targetHour24 = parsed ? parsed.hour24 : 12;
    const targetMin = parsed ? parsed.minute : 0;
    const nextVal = formatToDateTimeString(
      year,
      month,
      day,
      targetHour24,
      targetMin
    );
    onChange(nextVal);
  };

  // Handle time updates
  const handleTimeChange = (
    newHour12: number,
    newMinute: number,
    newPeriod: "AM" | "PM"
  ) => {
    const y = selectedYear ?? now.getFullYear();
    const m = selectedMonth ?? now.getMonth();
    const d = selectedDay ?? now.getDate();

    let h24 = newHour12 % 12;
    if (newPeriod === "PM") {
      h24 += 12;
    }

    const nextVal = formatToDateTimeString(y, m, d, h24, newMinute);
    onChange(nextVal);
  };

  // Quick Preset Helper
  const applyPreset = (preset: "now" | "tomorrow9am" | "tomorrow6pm" | "nextMonday") => {
    const target = new Date();
    if (preset === "now") {
      const mins = Math.ceil(target.getMinutes() / 5) * 5;
      target.setMinutes(mins);
      target.setSeconds(0);
    } else if (preset === "tomorrow9am") {
      target.setDate(target.getDate() + 1);
      target.setHours(9, 0, 0, 0);
    } else if (preset === "tomorrow6pm") {
      target.setDate(target.getDate() + 1);
      target.setHours(18, 0, 0, 0);
    } else if (preset === "nextMonday") {
      const daysUntilMonday = (8 - target.getDay()) % 7 || 7;
      target.setDate(target.getDate() + daysUntilMonday);
      target.setHours(9, 0, 0, 0);
    }

    const nextVal = formatToDateTimeString(
      target.getFullYear(),
      target.getMonth(),
      target.getDate(),
      target.getHours(),
      target.getMinutes()
    );
    onChange(nextVal);
    setViewYear(target.getFullYear());
    setViewMonth(target.getMonth());
  };

  // Formatted trigger label
  const formattedDisplay = useMemo(() => {
    if (!parsed) return null;
    const dateObj = new Date(
      parsed.year,
      parsed.month,
      parsed.day,
      parsed.hour24,
      parsed.minute
    );
    if (isNaN(dateObj.getTime())) return null;

    const weekday = dateObj.toLocaleDateString("en-US", { weekday: "short" });
    const month = dateObj.toLocaleDateString("en-US", { month: "short" });
    const dayNum = parsed.day;
    const yearNum = parsed.year;

    const timeStr = `${String(currentHour12).padStart(2, "0")}:${String(
      currentMinute
    ).padStart(2, "0")} ${currentPeriod}`;

    return {
      date: `${weekday}, ${dayNum} ${month} ${yearNum}`,
      time: timeStr,
    };
  }, [parsed, currentHour12, currentMinute, currentPeriod]);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild disabled={disabled}>
        <button
          type="button"
          className={`w-full h-11 px-3.5 text-sm font-semibold bg-white border border-slate-200/90 rounded-2xl outline-none transition-all flex items-center justify-between text-left hover:bg-slate-50/80 hover:border-slate-300 focus:border-[#fe5c13] focus:ring-4 focus:ring-[#fe5c13]/10 cursor-pointer shadow-xs group ${
            open ? "border-[#fe5c13] ring-4 ring-[#fe5c13]/10 bg-white" : ""
          } ${disabled ? "opacity-50 cursor-not-allowed bg-slate-100" : ""} ${className}`}
        >
          <div className="flex items-center gap-2.5 truncate pr-2">
            <div
              className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                formattedDisplay
                  ? "bg-orange-50 text-[#fe5c13]"
                  : "bg-slate-100 text-slate-400 group-hover:text-slate-600"
              }`}
            >
              <CalendarIcon className="w-4 h-4" />
            </div>

            {formattedDisplay ? (
              <div className="flex items-center gap-2 truncate">
                <span className="text-slate-800 font-bold text-xs truncate">
                  {formattedDisplay.date}
                </span>
                <span className="text-slate-300 text-xs">•</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-50 text-[#fe5c13] text-[11px] font-black tracking-wide">
                  <Clock className="w-3 h-3" />
                  {formattedDisplay.time}
                </span>
              </div>
            ) : (
              <span className="text-slate-400 font-medium text-xs">
                {placeholder}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {value && !disabled && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                }}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Clear date"
              >
                <X className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="bottom"
          sideOffset={6}
          align="start"
          collisionPadding={12}
          avoidCollisions={true}
          className="z-[200] w-auto max-w-[calc(100vw-24px)] bg-white border border-slate-200/90 rounded-2xl shadow-2xl ring-1 ring-slate-900/10 p-3.5 outline-none select-none animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 duration-150"
        >
          {/* Compact Horizontal Side-by-Side Layout */}
          <div className="flex flex-col sm:flex-row gap-3.5 items-stretch">
            {/* Left Panel: Calendar */}
            <div className="w-[230px] shrink-0">
              {/* Month / Year Navigation */}
              <div className="flex items-center justify-between pb-1.5 px-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-slate-900 tracking-tight">
                    {MONTH_NAMES[viewMonth]} {viewYear}
                  </span>
                  {(viewMonth !== now.getMonth() ||
                    viewYear !== now.getFullYear()) && (
                    <button
                      type="button"
                      onClick={() => {
                        setViewMonth(now.getMonth());
                        setViewYear(now.getFullYear());
                      }}
                      className="px-1.5 py-0.5 rounded text-[9px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      Today
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={prevMonth}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={nextMonth}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                    aria-label="Next month"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-0.5 mb-1 text-center">
                {WEEKDAYS.map((w, idx) => (
                  <div
                    key={idx}
                    className="text-[9px] font-black uppercase text-slate-400 py-0.5"
                  >
                    {w}
                  </div>
                ))}
              </div>

              {/* Calendar Days Grid (Compact 26px cells) */}
              <div className="grid grid-cols-7 gap-0.5">
                {calendarDays.map((item, idx) => {
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() =>
                        handleSelectDay(item.day, item.month, item.year)
                      }
                      className={`h-7 w-7 rounded-lg text-[11px] font-semibold flex items-center justify-center transition-all relative mx-auto cursor-pointer ${
                        item.isSelected
                          ? "bg-[#fe5c13] text-gray-900 font-black shadow-xs scale-105 z-10"
                          : item.isCurrentMonth
                          ? "text-slate-700 hover:bg-orange-50 hover:text-[#fe5c13]"
                          : "text-slate-300 hover:bg-slate-50 hover:text-slate-500"
                      } ${
                        item.isToday && !item.isSelected
                          ? "ring-1 ring-orange-400 font-bold text-[#fe5c13]"
                          : ""
                      }`}
                    >
                      {item.day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Vertical Divider */}
            <div className="hidden sm:block w-[1px] bg-slate-100 self-stretch my-0.5" />

            {/* Right Panel: Presets, Time & Actions */}
            <div className="w-[175px] flex flex-col justify-between pt-0.5">
              {/* Presets */}
              <div>
                <div className="flex items-center gap-1 mb-1.5">
                  <Sparkles className="w-3 h-3 text-[#fe5c13]" />
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                    Quick Presets
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 mb-3">
                  <button
                    type="button"
                    onClick={() => applyPreset("now")}
                    className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-50 hover:bg-orange-50 hover:text-[#fe5c13] text-slate-600 transition-colors border border-slate-100 text-center cursor-pointer"
                  >
                    Now
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset("tomorrow9am")}
                    className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-50 hover:bg-orange-50 hover:text-[#fe5c13] text-slate-600 transition-colors border border-slate-100 text-center cursor-pointer"
                  >
                    Tmrw 9 AM
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset("tomorrow6pm")}
                    className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-50 hover:bg-orange-50 hover:text-[#fe5c13] text-slate-600 transition-colors border border-slate-100 text-center cursor-pointer"
                  >
                    Tmrw 6 PM
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset("nextMonday")}
                    className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-50 hover:bg-orange-50 hover:text-[#fe5c13] text-slate-600 transition-colors border border-slate-100 text-center cursor-pointer"
                  >
                    Next Mon
                  </button>
                </div>

                {/* Time Controls */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                      Time
                    </span>
                  </div>

                  {/* AM / PM Segmented Control */}
                  <div className="flex p-0.5 rounded-lg bg-slate-100 border border-slate-200/60">
                    <button
                      type="button"
                      onClick={() =>
                        handleTimeChange(currentHour12, currentMinute, "AM")
                      }
                      className={`px-1.5 py-0.5 rounded text-[10px] font-black transition-all cursor-pointer ${
                        currentPeriod === "AM"
                          ? "bg-white text-slate-900 shadow-2xs"
                          : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      AM
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleTimeChange(currentHour12, currentMinute, "PM")
                      }
                      className={`px-1.5 py-0.5 rounded text-[10px] font-black transition-all cursor-pointer ${
                        currentPeriod === "PM"
                          ? "bg-white text-slate-900 shadow-2xs"
                          : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      PM
                    </button>
                  </div>
                </div>

                {/* Hour : Minute Selectors */}
                <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-100 mb-2">
                  <div className="flex-1">
                    <select
                      value={currentHour12}
                      onChange={(e) =>
                        handleTimeChange(
                          parseInt(e.target.value, 10),
                          currentMinute,
                          currentPeriod
                        )
                      }
                      className="w-full text-center py-1 bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-800 focus:outline-none focus:border-[#fe5c13] cursor-pointer"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                        <option key={h} value={h}>
                          {String(h).padStart(2, "0")}
                        </option>
                      ))}
                    </select>
                  </div>

                  <span className="text-slate-400 font-black text-xs">:</span>

                  <div className="flex-1">
                    <select
                      value={Math.floor(currentMinute / 5) * 5}
                      onChange={(e) =>
                        handleTimeChange(
                          currentHour12,
                          parseInt(e.target.value, 10),
                          currentPeriod
                        )
                      }
                      className="w-full text-center py-1 bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-800 focus:outline-none focus:border-[#fe5c13] cursor-pointer"
                    >
                      {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => (
                        <option key={m} value={m}>
                          {String(m).padStart(2, "0")}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Quick Time Pills */}
                <div className="flex items-center gap-1 mb-2">
                  <button
                    type="button"
                    onClick={() => handleTimeChange(12, 0, "PM")}
                    className="flex-1 py-1 rounded text-[9px] font-bold bg-slate-50 hover:bg-orange-50 hover:text-[#fe5c13] text-slate-600 border border-slate-100 transition-colors text-center cursor-pointer"
                  >
                    12:00 PM
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTimeChange(11, 55, "PM")}
                    className="flex-1 py-1 rounded text-[9px] font-bold bg-slate-50 hover:bg-orange-50 hover:text-[#fe5c13] text-slate-600 border border-slate-100 transition-colors text-center cursor-pointer"
                  >
                    11:59 PM
                  </button>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                {value ? (
                  <button
                    type="button"
                    onClick={() => {
                      onChange("");
                      setOpen(false);
                    }}
                    className="text-[11px] font-bold text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                ) : (
                  <span />
                )}

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-3 py-1 rounded-lg text-xs font-black bg-[#fe5c13] text-gray-900 hover:brightness-95 transition-all shadow-2xs flex items-center gap-1 ml-auto cursor-pointer"
                >
                  <Check className="w-3 h-3" /> Done
                </button>
              </div>
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
