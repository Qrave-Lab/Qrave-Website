import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const Hero = () => {
  return (
    <section className="relative min-h-[auto] sm:min-h-[90vh] pt-24 lg:pt-28 z-0 overflow-hidden bg-[#FAFAFA]">
      {/* Abstract Background Decor */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(#1c1d20 1px, transparent 1px)`,
            backgroundSize: '32px 32px'
          }}
        />

        <svg
          viewBox="0 0 1440 800"
          preserveAspectRatio="none"
          className="absolute bottom-0 left-0 w-full h-full pointer-events-none"
        >
          <path d="M0,800 L0,600 C 400,600 800,100 1440,100 L1440,800 Z" fill="#FFC529" fillOpacity="0.15" />
          <path d="M0,800 L0,700 C 400,700 800,400 1440,400 L1440,800 Z" fill="#FFC529" fillOpacity="0.35" />
          <path d="M0,800 L0,760 C 400,780 1000,740 1440,760 L1440,800 Z" fill="#FFC529" />
        </svg>
      </div>

      <div className="section-padding relative z-10">
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-12 items-center min-h-[calc(100vh-7rem)] sm:min-h-[calc(100vh-7rem)]">
          {/* Left Content - Hero Image */}
          <div className="order-2 lg:order-1 flex justify-center lg:justify-start">
            <div className="relative w-full max-w-[220px] sm:max-w-md lg:max-w-lg xl:max-w-xl">
              <Image
                src="/landing/Alternative Background Design.png"
                alt="QRAVE POS System"
                width={600}
                height={600}
                priority
                className="w-full h-auto rounded-2xl"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
          </div>

          {/* Right Content */}
          <div className="order-1 lg:order-2 py-4 lg:py-0">
            <div className="space-y-5 lg:space-y-9 text-center lg:text-left">
              <h1 className="text-[28px] sm:text-[42px] md:text-[52px] lg:text-[76px] font-black text-[#1F2127] tracking-tighter leading-[1.05]">
                See what you,
                <br />
                crave <span className="relative inline-block text-[#FFC529]">
                  for
                  <svg className="absolute -bottom-3 lg:-bottom-5 left-0 w-full h-3 lg:h-5 text-[#FFC529]" viewBox="0 0 100 15" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2.38883 12.8715C22.0833 7.8288 65.625 2.15833 97.5 10.375" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                </span>
              </h1>

              <p className="text-[14px] sm:text-[18px] lg:text-[22px] font-medium text-gray-600 max-w-lg mx-auto lg:mx-0 leading-[1.65]">
                Stop the chaos and start the crave. combine contactless 3D ordering, instant kitchen syncing, and smart analytics in one platform and run your café like a pro</p>
              <div className="flex justify-center lg:justify-start">
                <Link
                  href="/demo"
                  className="inline-flex items-center space-x-2 bg-[#FFC529] text-black hover:bg-[#ECA918] px-7 py-3.5 sm:px-8 sm:py-4 rounded-xl font-bold text-[15px] sm:text-[16px] transition-colors duration-200 shadow-[0_4px_20px_rgba(255,197,41,0.3)] hover:shadow-[0_8px_25px_rgba(255,197,41,0.45)] group"
                >
                  <span>Take a free demo</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
