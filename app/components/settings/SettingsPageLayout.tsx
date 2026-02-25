"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import StaffSidebar from "@/app/components/StaffSidebar";

type Props = {
    title: string;
    description?: string;
    /** Optional action slot (save button, etc.) rendered on the right of the header */
    action?: React.ReactNode;
    /** Max width of the content area. Defaults to max-w-5xl */
    maxWidth?: string;
    children: React.ReactNode;
};

export default function SettingsPageLayout({
    title,
    description,
    action,
    maxWidth = "max-w-5xl",
    children,
}: Props) {
    return (
        <div className="flex h-screen w-full bg-[#f8fafc] text-slate-900 overflow-hidden font-sans">
            <StaffSidebar />
            <div className="flex-1 flex flex-col min-w-0">
                {/* ── Unified top header ─────────────────────────────────────── */}
                <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0 z-10">
                    <div className="flex items-center gap-4 min-w-0">
                        <Link
                            href="/staff/settings"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors shrink-0"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            Back
                        </Link>
                        <div className="min-w-0">
                            <h1 className="text-xl font-bold text-slate-900 leading-tight truncate">{title}</h1>
                            {description && (
                                <p className="text-sm text-slate-500 mt-0.5 leading-snug truncate">{description}</p>
                            )}
                        </div>
                    </div>
                    {action && <div className="shrink-0 ml-4">{action}</div>}
                </header>

                {/* ── Scrollable content area ────────────────────────────────── */}
                <main className="flex-1 overflow-y-auto p-6">
                    <div className={`mx-auto ${maxWidth} space-y-6 pb-10`}>{children}</div>
                </main>
            </div>
        </div>
    );
}
