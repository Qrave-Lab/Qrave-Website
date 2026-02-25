import { CheckCircle2 } from 'lucide-react';

const TrustedBy = () => {
  const row1Features = [
    'Contactless Ordering',
    'Eco-friendly Solution',
    'Mobile Optimized',
    'Multi-Language Support',
    'Conversion Optimized',
    'No App Download Required',
  ];

  const row2Features = [
    'Custom Branding',
    '500+ Restaurants',
    '10k+ Menus Created',
    '99.9% Uptime',
    '24/7 Support',
    'Zero Commissions',
  ];

  return (
    <section className="relative py-16 md:py-20 bg-white border-y border-gray-100 overflow-hidden">
      {/* Container Context */}
      <div className="section-padding relative z-10">
        <p className="text-center text-[11px] md:text-[13px] font-bold text-gray-400 tracking-[0.2em] mb-10 md:mb-12 uppercase">
          Trusted by forward-thinking restaurants
        </p>
      </div>

      {/* Fade Masks for Marquee Edges */}
      <div className="absolute left-0 top-0 bottom-0 w-16 md:w-48 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
      <div className="absolute right-0 top-0 bottom-0 w-16 md:w-48 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>

      {/* Row 1 - Marquee */}
      <div className="relative w-full overflow-hidden mb-8 md:mb-10 flex">
        <div className="flex animate-marquee whitespace-nowrap">
          {[...row1Features, ...row1Features, ...row1Features, ...row1Features].map((feature, index) => (
            <div
              key={index}
              className="flex items-center space-x-3 mx-6 md:mx-12 flex-shrink-0"
            >
              <CheckCircle2 className="w-5 h-5 text-[#FFC529]" strokeWidth={2} />
              <span className="text-[15px] md:text-[17px] font-bold text-gray-700">
                {feature}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Row 2 - Marquee (Reverse or slightly faded) */}
      <div className="relative w-full overflow-hidden flex">
        <div className="flex animate-marquee whitespace-nowrap overflow-visible" style={{ animationDirection: 'reverse', animationDuration: '40s' }}>
          {[...row2Features, ...row2Features, ...row2Features, ...row2Features].map((feature, index) => (
            <div
              key={index}
              className="flex items-center space-x-3 mx-8 md:mx-14 flex-shrink-0"
            >
              <span className="text-[14px] md:text-[16px] font-bold text-gray-300">
                {feature}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustedBy;
