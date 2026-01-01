"use client";

import React from "react";

type AttentionItem = {
  name: string;
  reason: string;
  action: string;
};

export default function AttentionItems({ items }: { items: AttentionItem[] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="p-5 border-b border-gray-100 flex justify-between items-center">
        <h3 className="font-bold text-gray-900">⚠️ Needs Attention</h3>
        <span className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-md font-bold">
          Low Margin / Vol
        </span>
      </div>
      
      <div className="p-5 space-y-4">
        {items.map((i) => (
          <div key={i.name} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div>
              <p className="font-bold text-gray-900 text-sm">{i.name}</p>
              <p className="text-xs text-red-500 mt-0.5">{i.reason}</p>
            </div>
            <button className="text-xs bg-white border border-gray-200 px-3 py-1.5 rounded shadow-sm hover:bg-gray-50 font-medium text-gray-600 transition-colors">
              {i.action}
            </button>
          </div>
        ))}
        
        <div className="pt-2 text-center">
          <p className="text-xs text-gray-400">Regularly prune these items to improve food costs.</p>
        </div>
      </div>
    </div>
  );
}