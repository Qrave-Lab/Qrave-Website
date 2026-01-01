"use client";

import React from "react";
import { Lock } from "lucide-react";
import StaffSidebar from "../StaffSidebar";

type Props = {
  role: "owner" | "manager" | "staff";
  children: React.ReactNode;
};

export default function AnalyticsAccessGuard({ role, children }: Props) {
  if (role === "staff") {
    return (
      <div className="flex h-screen bg-gray-50 font-sans">
        <StaffSidebar />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-200 max-w-md w-full">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Access Restricted</h2>
            <p className="text-gray-500 mb-6">
              Staff members do not have permission to view financial analytics.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}