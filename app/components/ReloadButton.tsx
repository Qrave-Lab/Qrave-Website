"use client";

export default function ReloadButton({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className={`rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:border-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fe5c13] ${className}`}
    >
      Try again
    </button>
  );
}
