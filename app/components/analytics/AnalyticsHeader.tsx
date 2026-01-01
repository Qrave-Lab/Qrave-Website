"use client";

import { Calendar, Download, X } from "lucide-react";
// Assuming you will pass the data needed for export or handle it in the parent, 
// but keeping your import here as requested.
import exportAnalyticsCSV from "@/app/lib/exports/exportAnalyticsCSV";

type Props = {
  timeRange: "daily" | "weekly" | "monthly" | "custom";
  setTimeRange: (range: "daily" | "weekly" | "monthly" | "custom") => void;
  showDatePicker: boolean;
  setShowDatePicker: (show: boolean) => void;
  customDates: { start: string; end: string };
  setCustomDates: (dates: { start: string; end: string }) => void;
};

export default function AnalyticsHeader({
  timeRange,
  setTimeRange,
  showDatePicker,
  setShowDatePicker,
  customDates,
  setCustomDates,
}: Props) {
  return (
    <header className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between shrink-0 z-20 relative">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Financial Reports</h1>
        <p className="text-xs text-gray-500 mt-1">
          Sales performance • <span className="text-emerald-600 font-medium">Verified Owner Access</span>
        </p>
      </div>

      <div className="flex items-center gap-4">
        
        {/* Time Range Selector */}
        <div className="relative">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            {(["daily", "weekly", "monthly"] as const).map((range) => (
              <button
                key={range}
                onClick={() => {
                  setTimeRange(range);
                  setShowDatePicker(false);
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide transition-all
                  ${
                    timeRange === range
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-900"
                  }
                `}
              >
                {range}
              </button>
            ))}
            <button
              onClick={() => {
                setTimeRange("custom");
                setShowDatePicker(!showDatePicker);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide flex items-center gap-1 transition-all
                ${
                  timeRange === "custom"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                }
              `}
            >
              <Calendar className="w-3 h-3" />
              Custom
            </button>
          </div>

          {/* Date Picker Dropdown */}
          {showDatePicker && timeRange === "custom" && (
            <div className="absolute top-full right-0 mt-3 bg-white p-4 rounded-xl shadow-xl border border-gray-200 w-72 z-50">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-bold text-gray-900">Select Range</h4>
                <button
                  onClick={() => setShowDatePicker(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={customDates.start}
                    onChange={(e) =>
                      setCustomDates({ ...customDates, start: e.target.value })
                    }
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={customDates.end}
                    onChange={(e) =>
                      setCustomDates({ ...customDates, end: e.target.value })
                    }
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                </div>
                <button
                  onClick={() => setShowDatePicker(false)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded-lg mt-2 transition-colors shadow-sm"
                >
                  Apply Filter
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => exportAnalyticsCSV()}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>
    </header>
  );
}