"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

/*
 * The six features are the life of a single order, so the list is a journey:
 * a line connects the steps and fills in as you scroll. The sequence is real,
 * which is why the steps are numbered.
 */
const steps = [
  {
    step: "Guest sees the dish",
    title: "Immersive WebAR Menu",
    outcome: "Guests see every dish in 3D from their phone browser. No app to install.",
    href: "/feature/webar",
  },
  {
    step: "Guest orders",
    title: "Zero-Friction QR Ordering",
    outcome: "Scan a table QR, customize and order straight to the kitchen without waiting on a waiter.",
    href: "/feature/qr-ordering",
  },
  {
    step: "Guest pays",
    title: "Integrated UPI Payments",
    outcome: "Guests pay instantly with any major UPI app, so billing stops holding up the table.",
    href: "/feature/upi-billing",
  },
  {
    step: "Stock updates",
    title: "Inventory & Recipe Manager",
    outcome: "Recipes deduct stock automatically, and purchase orders and food cost stay in one place.",
    href: "/feature/advanced-inventory",
  },
  {
    step: "Books close",
    title: "Enterprise Accounting & GST",
    outcome: "Payables, credit notes, GSTR-1 and GSTR-3B reports, and Tally export without manual reconciliation.",
    href: "/feature/accounting",
  },
  {
    step: "You review the numbers",
    title: "Business Intelligence",
    outcome: "Live revenue, hourly sales and heatmaps, with dishes ranked by profitability.",
    href: "/feature/analytics",
  },
];

const SmartFeatures = () => {
  const dotRefs = useRef<(HTMLSpanElement | null)[]>([]);
  // How many steps the reader has scrolled to.
  const [reached, setReached] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReached(steps.length);
      return;
    }

    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.65;
      const count = dotRefs.current.filter(
        (el) => el && el.getBoundingClientRect().top < line
      ).length;
      setReached((prev) => (prev === count ? prev : count));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section id="features" className="bg-[#FAF9F6] py-24 lg:py-32 text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-12 gap-12 lg:gap-8">
        {/* Sticky heading */}
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-32">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-slate-950 tracking-[-0.03em] leading-[1.1] text-balance">
              Follow one order through your restaurant
            </h2>
            <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed max-w-[36ch]">
              From the first look at a dish to the books closing at night, every step runs on Qrave.
            </p>
          </div>
        </div>

        {/* Journey */}
        <ol className="lg:col-span-8">
          {steps.map((s, i) => {
            const active = reached > i;
            const filled = reached > i + 1;
            const last = i === steps.length - 1;

            return (
              <li key={s.href} className="relative pl-14 sm:pl-16">
                {/* Line to the next step */}
                {!last && (
                  <>
                    <span
                      aria-hidden
                      className="absolute left-[13px] top-[46px] h-full w-0.5 bg-slate-200"
                    />
                    <span
                      aria-hidden
                      className={`absolute left-[13px] top-[46px] h-full w-0.5 origin-top bg-[#fe5c13] transition-transform duration-500 ease-out motion-reduce:transition-none ${
                        filled ? "scale-y-100" : "scale-y-0"
                      }`}
                    />
                  </>
                )}

                {/* Step marker */}
                <span
                  ref={(el) => {
                    dotRefs.current[i] = el;
                  }}
                  aria-hidden
                  className={`absolute left-0 top-8 z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-semibold tabular-nums transition-colors duration-300 motion-reduce:transition-none ${
                    active
                      ? "border-[#fe5c13] bg-[#fe5c13] text-slate-950"
                      : "border-slate-300 bg-[#FAF9F6] text-slate-500"
                  }`}
                >
                  {i + 1}
                </span>

                <Link
                  href={s.href}
                  className="group flex items-start justify-between gap-6 py-8 lg:py-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#fe5c13]"
                >
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-medium transition-colors duration-300 motion-reduce:transition-none ${
                        active ? "text-[#c2410c]" : "text-slate-500"
                      }`}
                    >
                      {s.step}
                    </p>
                    <h3 className="mt-1.5 text-xl lg:text-2xl font-semibold tracking-[-0.02em] text-slate-950 transition-colors group-hover:text-[#c2410c]">
                      {s.title}
                    </h3>
                    <p className="mt-2 text-base text-slate-600 leading-relaxed max-w-[56ch]">
                      {s.outcome}
                    </p>
                  </div>
                  <ArrowUpRight
                    className="w-6 h-6 shrink-0 mt-7 text-slate-400 transition-[transform,color] duration-300 ease-out group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-[#fe5c13]"
                    aria-hidden
                  />
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
};

export default SmartFeatures;
