"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

type PaymentMethod = {
  method: string;
  percent: number;
  amount: number;
  icon: LucideIcon;
  color: string;
};

type Props = {
  methods: PaymentMethod[];
  mounted: boolean;
};

export default function PaymentBreakdown({ methods, mounted }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
      <h3 className="text-lg font-bold text-gray-900 mb-6">Payment Methods</h3>
      <div className="space-y-6">
        {methods.map((pm) => (
          <div key={pm.method}>
            <div className="flex justify-between text-sm mb-1">
              <span className="flex items-center gap-2 font-medium text-gray-700">
                <pm.icon className="w-4 h-4 text-gray-400" /> {pm.method}
              </span>
              <span className="font-bold text-gray-900">
                ₹{pm.amount.toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${pm.color} transition-all duration-1000`}
                style={{ width: mounted ? `${pm.percent}%` : "0%" }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1 text-right">
              {pm.percent}% of total
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}