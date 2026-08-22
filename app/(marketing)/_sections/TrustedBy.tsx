"use client";

const RESTAURANT_LOGOS = [
  { name: 'BISTRO & CO.', font: 'font-serif tracking-widest' },
  { name: 'URBAN TABLE', font: 'font-sans font-black tracking-tight' },
  { name: 'SAFFRON LOUNGE', font: 'font-mono tracking-widest' },
  { name: 'CRAFT BAKERY', font: 'font-serif italic font-bold' },
  { name: 'ARTISAN PIZZA', font: 'font-sans font-extrabold tracking-wider' },
  { name: 'THE TACO BAR', font: 'font-mono font-bold tracking-tighter' },
  { name: 'NATIVE EATS', font: 'font-sans font-black tracking-widest' },
  { name: 'ROAST & BREW', font: 'font-serif tracking-wide' },
];

const TrustedBy = () => {
  return (
    <section className="relative py-14 md:py-16 bg-[#FAF9F6] border-y border-slate-200/80 overflow-hidden">
      
      {/* Section Header */}
      <div className="max-w-7xl mx-auto px-4 text-center mb-8 relative z-10">
        <p className="text-[11px] md:text-xs font-bold text-slate-400 uppercase tracking-[0.25em]">
          Trusted by 500+ forward-thinking restaurants
        </p>
      </div>

      {/* Fade Masks for Edge Smoothness */}
      <div className="absolute left-0 top-0 bottom-0 w-24 md:w-48 bg-gradient-to-r from-[#FAF9F6] to-transparent z-20 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-24 md:w-48 bg-gradient-to-l from-[#FAF9F6] to-transparent z-20 pointer-events-none" />

      {/* Ultra-Sleek Monochrome Logo Marquee */}
      <div className="relative w-full overflow-hidden flex items-center py-3">
        <div className="flex animate-marquee whitespace-nowrap items-center gap-12 md:gap-20">
          {[...RESTAURANT_LOGOS, ...RESTAURANT_LOGOS, ...RESTAURANT_LOGOS].map((brand, index) => (
            <div
              key={index}
              className="flex items-center justify-center flex-shrink-0 cursor-pointer group"
            >
              <span className={`text-lg md:text-xl text-slate-400/70 group-hover:text-[#fe5c13] transition-all duration-300 select-none ${brand.font}`}>
                {brand.name}
              </span>
            </div>
          ))}
        </div>
      </div>

    </section>
  );
};

export default TrustedBy;
