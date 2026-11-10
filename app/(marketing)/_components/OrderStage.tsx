"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Box, Check, MoveHorizontal } from "lucide-react";
import { SITE_URL } from "@/app/_lib/seo";

/*
 * The hero's one moment, on a loop: a guest scans the table QR, browses the
 * menu, places a dish on their own table in AR, orders it, and the order
 * arrives in the kitchen as a ticket. Illustrative only; no live data.
 */

const STEPS = [
  { caption: "Scan the table QR", ms: 1900 },
  { caption: "Browse the menu", ms: 1700 },
  { caption: "See the dish on your table", ms: 2800 },
  { caption: "Add it to your order", ms: 1000 },
  { caption: "Place the order", ms: 1000 },
  { caption: "The kitchen gets it", ms: 3400 },
] as const;

const ITEMS = [
  { name: "Smash burger", note: "Cheddar, pickles, house sauce" },
  { name: "Crispy tacos", note: "Three tacos, chipotle slaw" },
];

const tearEdge: React.CSSProperties = {
  height: 8,
  backgroundImage:
    "linear-gradient(135deg, #fff 4px, transparent 0), linear-gradient(225deg, #fff 4px, transparent 0)",
  backgroundSize: "8px 8px",
  backgroundRepeat: "repeat-x",
};

/** A burger drawn from plain shapes and soft gradients: the dish placed on the table. */
function Burger() {
  return (
    <svg viewBox="0 0 140 110" className="ar-turn relative h-auto w-[172px]" aria-hidden>
      <defs>
        <linearGradient id="bg-bun" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F6C170" />
          <stop offset="1" stopColor="#CB7D2C" />
        </linearGradient>
        <linearGradient id="bg-bun-low" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E4A650" />
          <stop offset="1" stopColor="#B96F25" />
        </linearGradient>
        <linearGradient id="bg-patty" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6E4533" />
          <stop offset="1" stopColor="#38210F" />
        </linearGradient>
        <linearGradient id="bg-plate" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#E6E1D6" />
        </linearGradient>
      </defs>

      {/* contact shadow + plate */}
      <ellipse cx="70" cy="98" rx="62" ry="9" fill="rgba(15,17,23,0.22)" />
      <ellipse cx="70" cy="87" rx="60" ry="13" fill="url(#bg-plate)" stroke="#D3CDC0" />
      <ellipse cx="70" cy="87" rx="47" ry="9" fill="none" stroke="#E2DCCF" />

      {/* bottom bun */}
      <path d="M28 80h84a5 5 0 0 1-5 7H33a5 5 0 0 1-5-7Z" fill="url(#bg-bun-low)" />
      {/* patty */}
      <rect x="23" y="65" width="94" height="16" rx="8" fill="url(#bg-patty)" />
      <g fill="#fff" opacity="0.1">
        <ellipse cx="44" cy="70" rx="7" ry="1.6" />
        <ellipse cx="78" cy="73" rx="9" ry="1.6" />
        <ellipse cx="100" cy="69" rx="6" ry="1.6" />
      </g>
      {/* cheese */}
      <path d="M25 63h90v4l-10 10-10-10H65l-10 10-10-10H25Z" fill="#F7BA2A" />
      <path d="M25 63h90v2.5H25Z" fill="#FFD35E" />
      {/* lettuce */}
      <path d="M21 56c9 6 14-6 24 0s14-6 25 0 14-6 25 0 14-6 24 0v8H21Z" fill="#78B544" />
      <path d="M21 62c9 4 14-3 24 0s14-3 25 0 14-3 25 0 14-3 24 0v2H21Z" fill="#5C9A30" />
      {/* tomato */}
      <rect x="27" y="49" width="86" height="8" rx="4" fill="#D9442F" />
      <rect x="31" y="50.5" width="78" height="2" rx="1" fill="#F0705A" opacity="0.7" />
      {/* top bun */}
      <path d="M25 50C25 20 46 9 70 9s45 11 45 41Z" fill="url(#bg-bun)" />
      <ellipse cx="53" cy="25" rx="19" ry="6.5" fill="#fff" opacity="0.22" transform="rotate(-14 53 25)" />
      <g fill="#FFF1D2">
        <ellipse cx="48" cy="27" rx="3.2" ry="1.6" transform="rotate(-20 48 27)" />
        <ellipse cx="65" cy="19" rx="3.2" ry="1.6" transform="rotate(10 65 19)" />
        <ellipse cx="82" cy="27" rx="3.2" ry="1.6" transform="rotate(25 82 27)" />
        <ellipse cx="58" cy="37" rx="3.2" ry="1.6" transform="rotate(-8 58 37)" />
        <ellipse cx="75" cy="38" rx="3.2" ry="1.6" transform="rotate(14 75 38)" />
        <ellipse cx="94" cy="39" rx="3.2" ry="1.6" transform="rotate(-18 94 39)" />
      </g>
    </svg>
  );
}

const scene = (on: boolean) =>
  `absolute inset-0 transition-opacity duration-300 motion-reduce:transition-none ${
    on ? "opacity-100" : "pointer-events-none opacity-0"
  }`;

export default function OrderStage() {
  const [step, setStep] = useState(0);
  const [arrivedAt, setArrivedAt] = useState("");

  // Loop through the steps forever. Reduced motion rests on the AR scene.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStep(2);
      return;
    }
    let current = 0;
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      timer = setTimeout(() => {
        current = (current + 1) % STEPS.length;
        setStep(current);
        next();
      }, STEPS[current].ms);
    };
    next();
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (step === 5) {
      setArrivedAt(
        new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })
      );
    }
  }, [step]);

  const added = step >= 3; // the burger is in the order
  const placed = step >= 5;
  const onMenu = step === 1 || step >= 4;

  return (
    <div className="flex flex-col items-center">
      {/* Fixed 420x440 stage, scaled down on small screens */}
      <div className="h-[352px] w-[336px] sm:h-[440px] sm:w-[420px] lg:h-[484px] lg:w-[462px]">
        <div
          role="img"
          aria-label="Example: a guest scans the table QR code, places a burger on their table in augmented reality, orders it, and the order appears as a ticket in the kitchen."
          className="relative h-[440px] w-[420px] origin-top-left scale-[0.8] sm:scale-100 lg:scale-110"
        >
          {/* Guest phone */}
          <div className="absolute left-0 top-0 w-[220px] rounded-[28px] border border-slate-300 bg-white p-2 [filter:drop-shadow(0_18px_28px_rgba(15,17,23,0.10))]">
            <div className="relative h-[392px] overflow-hidden rounded-[22px] bg-[#FAF9F6]">
              {/* 1. Scan the table QR */}
              <div className={`${scene(step === 0)} flex flex-col items-center justify-center bg-[#0F1117]`}>
                <div className="relative">
                  <div className="rounded-lg bg-white p-2.5">
                    <QRCodeSVG
                      value={`${SITE_URL}/demo`}
                      size={104}
                      level="M"
                      marginSize={0}
                      fgColor="#0F1117"
                      bgColor="#FFFFFF"
                    />
                    <span className="qr-scan-line absolute inset-x-2.5 top-2.5 h-0.5 rounded bg-[#fe5c13]" />
                  </div>
                  {/* Viewfinder corners */}
                  <span className="absolute -left-2.5 -top-2.5 h-5 w-5 border-l-2 border-t-2 border-[#fe5c13]" />
                  <span className="absolute -right-2.5 -top-2.5 h-5 w-5 border-r-2 border-t-2 border-[#fe5c13]" />
                  <span className="absolute -bottom-2.5 -left-2.5 h-5 w-5 border-b-2 border-l-2 border-[#fe5c13]" />
                  <span className="absolute -bottom-2.5 -right-2.5 h-5 w-5 border-b-2 border-r-2 border-[#fe5c13]" />
                </div>
                <p className="mt-8 text-xs text-slate-300">Point your camera at the table</p>
              </div>

              {/* 2. Menu (and the final order state) */}
              <div className={`${scene(onMenu)} flex flex-col`}>
                <div className="px-4 pb-3 pt-5">
                  <p className="text-base font-semibold text-slate-950">Table 4</p>
                  <p className="mt-0.5 text-xs text-slate-500">Choose your dishes</p>
                </div>

                <ul className="space-y-2.5 px-3">
                  {ITEMS.map((item, i) => {
                    const isAdded = added && i === 0;
                    return (
                      <li key={item.name} className="rounded-xl border border-slate-200 bg-white p-3">
                        <p className="text-[13px] font-semibold text-slate-950">{item.name}</p>
                        <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{item.note}</p>
                        <div className="mt-2.5 flex items-center justify-between">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#c2410c]">
                            <Box className="h-3 w-3" aria-hidden />
                            View in 3D
                          </span>
                          <span
                            className={`inline-flex h-6 items-center gap-1 rounded-lg px-2.5 text-[11px] font-semibold transition-colors duration-200 ${
                              isAdded ? "bg-[#0F1117] text-white" : "border border-slate-300 text-slate-900"
                            }`}
                          >
                            {isAdded ? (
                              <>
                                <Check className="h-3 w-3" strokeWidth={3} />
                                Added
                              </>
                            ) : (
                              "Add"
                            )}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-auto p-3">
                  <span
                    className={`flex h-10 items-center justify-center gap-1.5 rounded-xl text-[13px] font-semibold transition-colors duration-300 ${
                      placed
                        ? "bg-emerald-700 text-white"
                        : added
                          ? "bg-[#fe5c13] text-slate-950"
                          : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {placed ? (
                      <>
                        <Check className="h-4 w-4" strokeWidth={3} />
                        Order sent
                      </>
                    ) : added ? (
                      "Place order · 1 item"
                    ) : (
                      "Place order"
                    )}
                  </span>
                </div>
              </div>

              {/* 3. The dish on the guest's own table, in AR */}
              <div
                className={`${scene(step === 2 || step === 3)} flex flex-col overflow-hidden bg-gradient-to-b from-[#e6e1d7] via-[#cfba9b] to-[#a57d52]`}
              >
                {/* Detected surface */}
                <div aria-hidden className="ar-plane absolute inset-x-0 bottom-[70px] h-[200px]" />

                <div className="relative flex items-center justify-between px-3 pt-4">
                  <span className="whitespace-nowrap rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-950">
                    Smash burger
                  </span>
                  <span className="whitespace-nowrap rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                    True to scale
                  </span>
                </div>

                <div className="relative flex flex-1 items-center justify-center">
                  <div className="relative">
                    <svg
                      aria-hidden
                      viewBox="0 0 230 60"
                      className="ar-ring absolute -bottom-3 left-1/2 w-[184px] -translate-x-1/2"
                    >
                      <ellipse cx="115" cy="30" rx="110" ry="26" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="6 7" />
                    </svg>
                    <Burger />
                  </div>
                </div>

                <div className="relative flex justify-center pb-3">
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#0F1117]/75 px-3 py-1 text-[11px] font-medium text-white">
                    <MoveHorizontal className="h-3 w-3" aria-hidden />
                    Drag to rotate
                  </span>
                </div>

                <div className="relative p-3 pt-0">
                  <span
                    className={`flex h-10 items-center justify-center gap-1.5 rounded-xl text-[13px] font-semibold transition-colors duration-300 ${
                      step === 3 ? "bg-[#0F1117] text-white" : "bg-[#fe5c13] text-slate-950"
                    }`}
                  >
                    {step === 3 ? (
                      <>
                        <Check className="h-4 w-4" strokeWidth={3} />
                        Added
                      </>
                    ) : (
                      "Add to order"
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Kitchen ticket */}
          <div
            className={`absolute right-0 top-14 w-[190px] [filter:drop-shadow(0_1px_1px_rgba(15,17,23,0.08))_drop-shadow(0_18px_28px_rgba(15,17,23,0.12))] transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
              placed ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"
            }`}
          >
            <div className="rounded-t-lg bg-white">
              <div className="flex items-baseline justify-between px-4 pb-3 pt-4 font-mono text-xs text-slate-600">
                <span className="font-medium text-slate-950">Table 4</span>
                <span className="tabular-nums">{arrivedAt || " "}</span>
              </div>
              <div className="border-t-2 border-dashed border-slate-300" />
              <ul className="px-4 py-4 text-[13px] text-slate-950">
                <li className="flex gap-3">
                  <span className="font-mono tabular-nums text-slate-500">1</span>
                  Smash burger
                </li>
              </ul>
              <p className="px-4 pb-4 text-xs font-medium text-emerald-700">New order</p>
            </div>
            <div aria-hidden style={tearEdge} />
          </div>
        </div>
      </div>

      {/* What is happening now */}
      <div className="mt-5 flex flex-col items-center gap-3">
        <p className="h-5 text-sm font-medium text-slate-700" aria-hidden>
          {STEPS[step].caption}
        </p>
        <div className="flex gap-1.5" aria-hidden>
          {STEPS.map((s, i) => (
            <span
              key={s.caption}
              className={`h-1 w-6 rounded-full transition-colors duration-300 ${
                i <= step ? "bg-[#fe5c13]" : "bg-slate-300"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
