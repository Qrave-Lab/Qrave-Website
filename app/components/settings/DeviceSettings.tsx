import React from "react";
import { Printer, ArrowRight, Receipt } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DeviceSettings() {
  const router = useRouter();

  return (
    <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-6">
      <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
        <Printer className="w-5 h-5 text-gray-500" /> Devices & Printing
      </h2>
      <div className="space-y-3">
        <button className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
              <Printer className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-gray-900">Kitchen Printer</p>
              <p className="text-xs text-green-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>{" "}
                Connected
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-900" />
        </button>
        <button
          onClick={() => router.push("/staff/settings/qr-codes")}
          className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-gray-900">QR Codes</p>
              <p className="text-xs text-gray-500">Manage table QR generation</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-900" />
        </button>
      </div>
    </section>
  );
}