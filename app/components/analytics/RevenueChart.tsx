"use client";

import { TrendingUp } from "lucide-react";

type Props = {
  data: number[];
  labels: string[];
  peakHour: string;
  mounted: boolean;
};

export default function RevenueChart({ data, labels, peakHour, mounted }: Props) {
  return (
    <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col justify-between">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-lg font-bold text-gray-900">Revenue Trend</h3>
        
        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
          <TrendingUp className="w-3 h-3 text-emerald-600" />
          <span className="text-xs font-medium text-gray-600">
            Peak: <span className="text-gray-900 font-bold">{peakHour}</span>
          </span>
        </div>
      </div>

      {/* Chart Area */}
      <div className="h-48 flex items-end justify-between gap-3">
        {data.map((height, i) => (
          <div key={i} className="w-full bg-gray-50 rounded-t-sm relative group h-full flex items-end">
            <div
              className="w-full bg-gray-900 rounded-t-sm opacity-80 group-hover:opacity-100 group-hover:bg-emerald-600 transition-all duration-700 ease-out relative"
              style={{ height: mounted ? `${height}%` : "0%" }}
            >
              {/* Tooltip on Hover */}
              <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg transition-opacity whitespace-nowrap z-10 pointer-events-none">
                ₹{(height * 850).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* X-Axis Labels */}
      <div className="flex justify-between mt-2 pt-2 border-t border-gray-100">
        {labels.map((label, i) => (
          <span key={i} className="text-[10px] text-gray-400 font-medium w-full text-center">
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}