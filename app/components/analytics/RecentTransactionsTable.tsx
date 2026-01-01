"use client";

import React from "react";

type Transaction = {
  id: string;
  time: string;
  table: string;
  total: number;
  method: string;
};

export default function RecentTransactionsTable({ transactions }: { transactions: Transaction[] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
        <h3 className="font-bold text-gray-900">Recent Transactions</h3>
        <button className="text-xs text-blue-600 font-bold hover:underline">
          View All
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 font-medium">
            <tr>
              <th className="px-6 py-3 whitespace-nowrap">ID</th>
              <th className="px-6 py-3 whitespace-nowrap">Time</th>
              <th className="px-6 py-3 whitespace-nowrap">Table</th>
              <th className="px-6 py-3 whitespace-nowrap">Total</th>
              <th className="px-6 py-3 whitespace-nowrap">Method</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {transactions.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900">{t.id}</td>
                <td className="px-6 py-4 text-gray-500">{t.time}</td>
                <td className="px-6 py-4">
                  <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-bold">
                    {t.table}
                  </span>
                </td>
                <td className="px-6 py-4 font-bold text-gray-900">
                  ₹{t.total.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-gray-500">{t.method}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}