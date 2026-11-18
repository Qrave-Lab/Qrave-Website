"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import StaffSidebar from "@/app/components/StaffSidebar";

type Props = {
    title: string;
    description?: React.ReactNode;
    /** Optional action slot (save button, etc.) rendered on the right of the header */
    action?: React.ReactNode;
    /** Max width of the content area. Defaults to max-w-5xl */
    maxWidth?: string;
    /** When true, children fill the remaining viewport with no padding or max-width wrapper */
    fullBleed?: boolean;
    children: React.ReactNode;
};

export default function SettingsPageLayout({
    title,
    description,
    action,
    maxWidth = "max-w-5xl",
    fullBleed = false,
    children,
}: Props) {
    return (
        <div className="flex h-screen w-full overflow-hidden bg-[#FAFAF7] text-[#0F1117]">
            <StaffSidebar />
            <div className="flex min-w-0 flex-1 flex-col">
                <header className="z-10 flex shrink-0 items-center justify-between gap-4 border-b border-[#E8E8E3] bg-white px-8 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <Link
                            href="/staff/settings"
                            aria-label="Back to settings"
                            title="Back to settings"
                            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E8E8E3] bg-white text-[#6B7280] transition-colors hover:border-[#D6D6CF] hover:bg-[#FAFAF7] hover:text-[#0F1117] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fe5c13]/40"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                        <div className="min-w-0">
                            <p className="text-[12px] font-medium leading-none text-[#9CA3AF]">
                                <Link href="/staff/settings" className="transition-colors hover:text-[#0F1117]">
                                    Settings
                                </Link>
                            </p>
                            <h1 className="mt-1.5 truncate text-[20px] font-bold leading-none tracking-[-0.02em] text-[#0F1117]">
                                {title}
                            </h1>
                            {description && (
                                <p className="mt-1.5 truncate text-[13px] leading-snug text-[#6B7280]">{description}</p>
                            )}
                        </div>
                    </div>
                    {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
                </header>

                {fullBleed ? (
                    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
                ) : (
                    <main className="flex-1 overflow-y-auto px-8 py-6">
                        <div className={`mx-auto ${maxWidth} space-y-6 pb-10`}>{children}</div>
                    </main>
                )}
            </div>
        </div>
    );
}
