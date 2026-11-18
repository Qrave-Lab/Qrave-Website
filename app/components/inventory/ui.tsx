import React from "react";

/* Shared building blocks for the Inventory hub, in the Qrave palette.
   Warm neutrals, ink #0F1117, saffron #fe5c13 as the one accent. */

export const INPUT =
  "h-10 w-full rounded-xl border border-[#E8E8E3] bg-white px-3.5 text-[14px] text-[#0F1117] outline-none transition-colors placeholder:text-[#9CA3AF] hover:border-[#D6D6CF] focus:border-[#fe5c13]";

export const LABEL = "mb-1.5 block text-[13px] font-medium text-[#4B5563]";

export const BTN_PRIMARY =
  "inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#fe5c13] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#e44e0b] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fe5c13]/40 focus-visible:ring-offset-2";

export const BTN_SECONDARY =
  "inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-[#E8E8E3] bg-white px-3.5 text-[13px] font-semibold text-[#374151] transition-colors hover:border-[#D6D6CF] hover:bg-[#FAFAF7] hover:text-[#0F1117] disabled:cursor-not-allowed disabled:opacity-50";

export const BTN_SMALL =
  "inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-[#E8E8E3] bg-white px-3 text-[12px] font-semibold text-[#374151] transition-colors hover:border-[#D6D6CF] hover:text-[#0F1117] disabled:opacity-50";

export const ICON_BTN =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#9CA3AF] transition-colors hover:bg-[#F3F3EF] hover:text-[#0F1117]";

export const ICON_BTN_DANGER =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#9CA3AF] transition-colors hover:bg-rose-50 hover:text-rose-600";

export const OVERLAY =
  "fixed inset-0 z-50 flex items-center justify-center bg-[#0F1117]/40 p-4 backdrop-blur-sm";

export const DIALOG =
  "w-full rounded-2xl border border-[#E8E8E3] bg-white shadow-[0_24px_60px_-20px_rgba(15,17,23,0.35)]";

export const CARD = "overflow-hidden rounded-2xl border border-[#E8E8E3] bg-white";

export const THEAD_ROW = "border-b border-[#F0F0EB] text-[12px] text-[#6B7280]";
export const TH = "px-5 py-3 font-medium";
export const TBODY = "divide-y divide-[#F0F0EB]";
export const TR = "transition-colors hover:bg-[#FAFAF7]";
export const TD = "px-5 py-3.5 text-[13px] text-[#4B5563]";

/** Classes for the shared CustomSelect trigger so it sits at h-10 like the inputs. */
export const CUSTOM_SELECT_BTN =
  "!h-10 !min-h-10 !py-0 !px-3.5 !text-[14px] !bg-white !border-[#E8E8E3] hover:!border-[#D6D6CF]";

const TONES = {
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
  amber: "bg-amber-50 text-amber-800 border-amber-200/70",
  rose: "bg-rose-50 text-rose-700 border-rose-200/70",
  sky: "bg-sky-50 text-sky-700 border-sky-200/70",
  neutral: "bg-[#F3F3EF] text-[#4B5563] border-[#E8E8E3]",
} as const;
const DOTS = {
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  sky: "bg-sky-500",
  neutral: "bg-[#9CA3AF]",
} as const;
export type Tone = keyof typeof TONES;

export function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[12px] font-medium ${TONES[tone]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOTS[tone]}`} />
      {children}
    </span>
  );
}

export function CountChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-[#F3F3EF] px-2.5 py-1 text-[12px] font-medium leading-none tabular-nums text-[#6B7280]">
      {children}
    </span>
  );
}

export function SectionHeader({
  title,
  count,
  description,
  children,
}: {
  title: string;
  count?: React.ReactNode;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-[#0F1117]">{title}</h2>
          {count !== undefined && count !== null && <CountChip>{count}</CountChip>}
        </div>
        {description && <p className="mt-1 max-w-2xl text-[13px] text-[#6B7280]">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  body?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <span className="text-[#C4C4BE]">{icon}</span>
      <p className="mt-3 text-[15px] font-semibold text-[#0F1117]">{title}</p>
      {body && <p className="mt-1 max-w-sm text-[13px] text-[#6B7280]">{body}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export const fmtDay = (d: string | number | Date) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
