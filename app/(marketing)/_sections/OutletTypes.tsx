"use client";

import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

const OUTLETS = [
  { name: 'Food Courts & Canteens', image: '/landing/outlet-foodcourt.png', tag: 'High-Volume Order Queues' },
  { name: 'Cafés & Coffee Shops', image: '/landing/outlet-cafe.png', tag: 'Quick Counter & Table Orders' },
  { name: 'Fine Dining', image: '/landing/outlet-finedine.png', tag: 'Multi-Course Table Service' },
  { name: 'Bars & Breweries', image: '/landing/outlet-bar.png', tag: 'Tab Management & Tap Sync' },
  { name: 'Pizzerias & Italian', image: '/landing/outlet-pizzeria.png', tag: 'Custom Topping Modifiers' },
  { name: 'Quick Service (QSR)', image: '/landing/outlet-qsr.png', tag: 'Express Pickup & KDS' },
  { name: 'Desserts & Ice Cream', image: '/landing/outlet-desserts.png', tag: 'Visual 3D Food Showcase' },
  { name: 'Multi-Unit Chains', image: '/landing/outlet-largechains.png', tag: 'Centralized Menu Control' },
  { name: 'Bakeries', image: '/landing/outlet-bakery.png', tag: 'Pre-Orders & Daily Specials' },
  { name: 'Cloud Kitchens', image: '/landing/outlet-cloudkitchen.png', tag: 'Aggregator & POS Sync' },
];

const OutletTypes = () => {
  return (
    <section id="concepts" className="pt-28 pb-24 lg:pt-36 lg:pb-32 bg-[#FAF9F6] text-slate-900 relative overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-orange-400/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header with Generous Top Spacing */}
        <div className="text-center mb-16 pt-4">
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-950 tracking-tight mb-6 max-w-4xl mx-auto leading-[1.1]">
            Engineered for Every <br />
            <span className="bg-gradient-to-r from-[#fe5c13] to-amber-600 bg-clip-text text-transparent">
              Culinary Concept
            </span>
          </h2>
          <p className="text-base sm:text-xl text-slate-600 font-medium max-w-2xl mx-auto leading-relaxed">
            From 20-seat cafés to multi-location restaurant chains, Qrave adapts seamlessly to your operational flow.
          </p>
        </div>

      </div>

      {/* Fade Masks for Edge Smoothness */}
      <div className="absolute left-0 top-0 bottom-0 w-20 md:w-48 bg-gradient-to-r from-[#FAF9F6] to-transparent z-20 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-20 md:w-48 bg-gradient-to-l from-[#FAF9F6] to-transparent z-20 pointer-events-none" />

      {/* Infinite Image Marquee Gallery */}
      <div className="relative w-full overflow-hidden flex py-4">
        <div className="flex animate-marquee whitespace-nowrap gap-6">
          {[...OUTLETS, ...OUTLETS, ...OUTLETS].map((outlet, index) => (
            <Link
              key={index}
              href={`#${outlet.name.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and')}`}
              className="group relative w-72 sm:w-80 h-96 sm:h-[420px] rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 flex-shrink-0 cursor-pointer border border-slate-200/80"
            >
              {/* Image */}
              <img
                src={outlet.image}
                alt={outlet.name}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />

              {/* Dark Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent transition-opacity duration-300" />

              {/* Top Glass Badge */}
              <div className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-slate-900 shadow-md group-hover:bg-[#fe5c13] group-hover:text-white transition-colors duration-300">
                <ArrowUpRight className="w-4 h-4" />
              </div>

              {/* Bottom Content */}
              <div className="absolute inset-0 flex flex-col justify-end p-6 z-10">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#fe5c13] bg-[#fe5c13]/10 border border-[#fe5c13]/30 px-2.5 py-1 rounded-full w-fit mb-2 backdrop-blur-sm">
                  {outlet.tag}
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white group-hover:text-[#fe5c13] transition-colors leading-tight whitespace-normal">
                  {outlet.name}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </div>

    </section>
  );
};

export default OutletTypes;
