"use client";

import React from "react";

type AuthStatCard = {
  value: string;
  label: string;
  icon?: React.ReactNode;
};

type AuthSplitLayoutProps = {
  left: React.ReactNode;
  headingLine1: string;
  headingHighlight: string;
  description: string;
  stats?: AuthStatCard[];
};

export default function AuthSplitLayout({
  left,
  headingLine1,
  headingHighlight,
  description,
  stats = [],
}: AuthSplitLayoutProps) {
  return (
    <div className="flex min-h-screen w-full font-sans text-[#1F2127] overflow-hidden bg-white selection:bg-[#FFC529]/30">
      <div className="w-full lg:w-[45%] xl:w-[40%] flex flex-col justify-center px-8 sm:px-14 lg:px-16 xl:px-24 relative z-20">
        {left}
      </div>

      <div className="hidden lg:flex flex-1 relative bg-[#FAFAFA] items-center justify-center border-l border-slate-100 overflow-hidden">
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: "radial-gradient(#1c1d20 1px, transparent 1px)", backgroundSize: "32px 32px" }}
          />
          <svg viewBox="0 0 1440 800" preserveAspectRatio="none" className="absolute bottom-0 left-0 w-full h-[60%] pointer-events-none">
            <path d="M0,800 L0,600 C 400,600 800,100 1440,100 L1440,800 Z" fill="#FFC529" fillOpacity="0.10" />
            <path d="M0,800 L0,700 C 400,700 800,400 1440,400 L1440,800 Z" fill="#FFC529" fillOpacity="0.20" />
            <path d="M0,800 L0,760 C 400,780 1000,740 1440,760 L1440,800 Z" fill="#FFC529" fillOpacity="0.05" />
          </svg>
        </div>

        <div className="relative z-10 w-full max-w-2xl px-12 text-center lg:text-left">
          <div className="space-y-10">
            <div className="space-y-6">
              <h1 className="text-6xl xl:text-7xl font-bold leading-[1.05] tracking-tight">
                {headingLine1} <br />
                <span className="relative inline-block text-[#FFC529]">
                  {headingHighlight}
                  <svg className="absolute -bottom-3 left-0 w-full h-4 text-[#FFC529]" viewBox="0 0 100 15" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2.38883 12.8715C22.0833 7.8288 65.625 2.15833 97.5 10.375" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                </span>
              </h1>
              <p className="text-slate-500 text-xl font-medium leading-relaxed max-w-md mx-auto lg:mx-0">
                {description}
              </p>
            </div>

            {stats.length > 0 && (
              <div className="grid grid-cols-2 gap-4 xl:gap-6 pt-4">
                {stats.map((s, i) => (
                  <div key={`${s.label}-${i}`} className="px-6 py-5 rounded-3xl bg-white/60 backdrop-blur-md border border-white shadow-sm flex items-center gap-4">
                    {s.icon && (
                      <div className="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center">
                        {s.icon}
                      </div>
                    )}
                    <div className="text-left">
                      <div className="text-xl font-bold">{s.value}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
