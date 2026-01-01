"use client";

import React from "react";

type TopItem = {
  name: string;
  sold: number;
  revenue: number;
};

export default function TopItemsTable({ items }: { items: TopItem[] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="p-5 border-b border-gray-100">
        <h3 className="font-bold text-gray-900">🏆 Top Performing Items</h3>
      </div>
      <div className="p-0">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-5 py-3 font-medium">Item</th>
              <th className="px-5 py-3 font-medium text-right">Sold</th>
              <th className="px-5 py-3 font-medium text-right">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map((item) => (
              <tr key={item.name} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-3 font-medium text-gray-900">{item.name}</td>
                <td className="px-5 py-3 text-right text-gray-600">{item.sold}</td>
                <td className="px-5 py-3 text-right font-bold text-emerald-600">
                  ₹{item.revenue.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}