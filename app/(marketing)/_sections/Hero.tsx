"use client";

import { useEffect, useRef } from 'react';
import { ArrowRight, Zap, Smartphone, BarChart3, Clock, CheckCircle2, Utensils, Wine, Coffee, Sparkles, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import gsap from 'gsap';

const Hero = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.from('.hero-headline', {
        opacity: 0,
        y: 40,
        duration: 0.9,
      })
        .from(
          '.hero-subtext',
          {
            opacity: 0,
            y: 30,
            duration: 0.8,
          },
          '-=0.6'
        )
        .from(
          '.hero-cta-buttons',
          {
            opacity: 0,
            scale: 0.94,
            y: 20,
            duration: 0.7,
          },
          '-=0.5'
        )
        .from(
          '.hero-mockup-card',
          {
            opacity: 0,
            y: 50,
            scale: 0.96,
            duration: 1,
          },
          '-=0.4'
        );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden bg-[#FAF9F6] text-slate-900 flex flex-col items-center justify-center"
    >
      {/* Background Decor - Subtle Grid & Ambient Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `radial-gradient(#000000 1px, transparent 1px)`,
            backgroundSize: '32px 32px'
          }}
        />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-[#fe5c13]/15 via-amber-400/10 to-transparent blur-[140px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full flex flex-col items-center text-center">
        
        {/* Centered Main Headline */}
        <h1 className="hero-headline text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-slate-950 tracking-tighter leading-[1.05] max-w-5xl mb-6">
          See what you, <br className="hidden sm:block" />
          <span className="bg-gradient-to-r from-[#fe5c13] via-orange-500 to-amber-500 bg-clip-text text-transparent">
            crave for
          </span>
        </h1>

        {/* Sub-headline */}
        <p className="hero-subtext text-base sm:text-xl lg:text-2xl font-medium text-slate-600 max-w-2xl mx-auto leading-relaxed mb-10">
          Stop the chaos and start the crave. Combine contactless ordering, 3D AR previews, instant kitchen syncing, and smart analytics in one platform.
        </p>

        {/* CTA Buttons */}
        <div className="hero-cta-buttons flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto mb-16">
          <Link
            href="/demo"
            className="w-full sm:w-auto group inline-flex justify-center items-center gap-2.5 bg-gradient-to-r from-[#fe5c13] via-[#ff6a26] to-[#fe5c13] text-white px-8 py-4 rounded-full font-bold text-sm sm:text-base tracking-wide transition-all duration-300 shadow-xl shadow-[#fe5c13]/25 hover:shadow-2xl hover:shadow-[#fe5c13]/35 hover:scale-[1.03] active:scale-[0.98]"
          >
            <span>Take a Free Demo</span>
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/onboarding"
            className="w-full sm:w-auto inline-flex justify-center items-center bg-white hover:bg-slate-50 border border-slate-200 text-slate-900 px-8 py-4 rounded-full font-bold text-sm sm:text-base transition-all duration-300 shadow-sm hover:shadow-md active:scale-[0.98]"
          >
            Start Free Trial
          </Link>
        </div>

        {/* Ultra-Sleek Dark POS Dashboard Mockup Container (No Emojis) */}
        <div className="hero-mockup-card w-full max-w-5xl relative">
          <div className="bg-slate-950 text-white rounded-[2.5rem] p-5 sm:p-8 md:p-10 border border-slate-800/90 shadow-[0_30px_90px_-20px_rgba(0,0,0,0.4)] relative overflow-hidden text-left">
            
            {/* Background Accent Glow inside Card */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#fe5c13]/10 rounded-full blur-3xl pointer-events-none" />

            {/* Window Top Bar */}
            <div className="flex items-center justify-between border-b border-slate-800/90 pb-4 mb-6 px-1">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              </div>
              <div className="hidden sm:flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900 text-xs font-mono text-slate-400 border border-slate-800">
                <Smartphone className="w-3.5 h-3.5 text-[#fe5c13]" />
                <span>app.qravetech.in/table-04</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live POS Active</span>
              </div>
            </div>

            {/* Dashboard Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Menu & Order Panel (Left 8 cols) */}
              <div className="md:col-span-8 bg-slate-900/90 border border-slate-800/90 rounded-2xl p-5 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
                  <div>
                    <h3 className="text-base font-extrabold text-white tracking-tight">Table #04 Live Order</h3>
                    <p className="text-[11px] text-slate-400 font-medium">Gourmet Bistro • Main Dining Floor</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[#fe5c13]/20 text-[#fe5c13] border border-[#fe5c13]/30">
                    3 Items
                  </span>
                </div>

                {/* Items list (Icons instead of emojis) */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-[#fe5c13] flex items-center justify-center shrink-0">
                        <Utensils className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-200">Truffle Smash Burger</h4>
                        <p className="text-[10px] font-medium text-slate-400">Extra cheese • Medium Rare</p>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-white">₹450</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                        <Utensils className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-200">Crispy Fish Tacos (3x)</h4>
                        <p className="text-[10px] font-medium text-slate-400">Spicy Chipotle Sauce</p>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-white">₹380</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                        <Coffee className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-200">Craft Mango Passion Mocktail</h4>
                        <p className="text-[10px] font-medium text-slate-400">Iced • Mint</p>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-white">₹220</span>
                  </div>
                </div>

                {/* KDS Status footer */}
                <div className="pt-2 flex justify-between items-center border-t border-slate-800/80 text-xs">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    Kitchen Prep: <strong className="text-slate-200 font-bold">4m 12s</strong>
                  </span>
                  <span className="text-[#fe5c13] font-bold">Sent to KDS ✓</span>
                </div>
              </div>

              {/* Analytics & Metrics Widget */}
              <div className="md:col-span-4 flex flex-col justify-between gap-3">
                
                {/* Metric Card 1 */}
                <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1">
                    <span>Table Turnover Rate</span>
                    <BarChart3 className="w-4 h-4 text-[#fe5c13]" />
                  </div>
                  <div className="text-2xl font-black text-white">+42%</div>
                  <p className="text-[10px] text-emerald-400 font-semibold mt-1">⚡ 2.4x Faster vs Traditional POS</p>
                </div>

                {/* Metric Card 2 */}
                <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1">
                    <span>3D AR Menu Views</span>
                    <Zap className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-black text-white">1,840</div>
                  <p className="text-[10px] text-slate-400 font-medium mt-1">Zero App Download Required</p>
                </div>

                {/* Settlement Badge */}
                <div className="bg-gradient-to-r from-[#fe5c13]/20 to-amber-500/20 border border-[#fe5c13]/30 rounded-2xl p-3.5 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#fe5c13] shrink-0" />
                  <p className="text-xs font-bold text-slate-100 leading-tight">
                    Instant UPI & Card Settlement
                  </p>
                </div>

              </div>

            </div>
          </div>

          {/* Floating Dark Glass Badges around mockup card (No Emojis) */}
          <div className="hidden lg:flex absolute -top-4 -left-6 bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-2xl items-center gap-3 text-white">
            <div className="w-8 h-8 rounded-xl bg-[#fe5c13]/20 text-[#fe5c13] border border-[#fe5c13]/30 flex items-center justify-center font-bold text-xs">
              <Zap className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className="block text-xs font-extrabold text-white">Instant KDS Sync</span>
              <span className="text-[10px] text-slate-400 font-medium">Orders sent in 200ms</span>
            </div>
          </div>

          <div className="hidden lg:flex absolute -bottom-4 -right-6 bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-2xl items-center gap-3 text-white">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold text-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className="block text-xs font-extrabold text-white">3D AR Food Preview</span>
              <span className="text-[10px] text-slate-400 font-medium">Immersive tabletop visuals</span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};

export default Hero;
