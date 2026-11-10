import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import OrderStage from '../_components/OrderStage';

const Hero = () => {
  return (
    <section className="bg-[#FAF9F6] text-slate-900 pt-32 pb-20 lg:pt-40 lg:pb-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-12 gap-14 lg:gap-8 items-center">
        <div className="lg:col-span-6">
          <h1 className="feature-rise text-5xl sm:text-6xl lg:text-[4.25rem] font-semibold text-slate-950 tracking-[-0.035em] leading-[1.05] text-balance">
            See the dish before you order it.
          </h1>

          <p
            className="feature-rise mt-6 text-lg lg:text-xl text-slate-600 leading-relaxed max-w-[48ch]"
            style={{ animationDelay: '90ms' }}
          >
            Guests scan a table QR, see every dish in 3D on their own table, and order from the same screen. No app to install.
          </p>

          <div
            className="feature-rise mt-10 flex flex-col sm:flex-row gap-3"
            style={{ animationDelay: '180ms' }}
          >
            <Link
              href="/demo"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#fe5c13] px-6 py-3.5 text-[15px] font-semibold text-slate-950 transition-colors hover:bg-[#ff7433] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
            >
              Try the demo
              <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
            {/* Signup disabled for now
            <Link href="/onboarding">Start Free Trial</Link>
            */}
            <Link
              href="/#features"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-xl border border-slate-300 px-6 py-3.5 text-[15px] font-semibold text-slate-900 transition-colors hover:border-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
            >
              See how it works
            </Link>
          </div>
        </div>

        <div className="lg:col-span-6 flex justify-center lg:justify-end">
          <OrderStage />
        </div>
      </div>
    </section>
  );
};

export default Hero;
