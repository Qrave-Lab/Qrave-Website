import { BlurWords, Reveal } from '../_components/Reveal'

export default function WhyChooseUs() {
  return (
    <section id="why-choose-us" className="px-6 pb-24 pt-10 md:px-16 md:pb-32">
      {/* Header section */}
      <div className="flex flex-col gap-6 md:flex-row md:gap-24 lg:gap-40">
        <div className="shrink-0">
          <Reveal className="flex items-center gap-2 text-sm font-bold tracking-tight text-neutral-900">
            <div className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-black text-white pb-[2px] text-xs">
              +
            </div>
            Rapid ROI
          </Reveal>
        </div>
        <div className="max-w-4xl">
          <h2 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-[4rem] lg:leading-[1.05]">
            <BlurWords text="Instant ROI, Zero Risk." />
            <br />
            <BlurWords text="with a rapid 3-day launch." className="text-neutral-400" />
          </h2>
        </div>
      </div>

      {/* Content section */}
      <div className="mt-20 grid gap-8 md:grid-cols-2 md:gap-12 lg:gap-16 items-start">
        {/* Left Image */}
        <Reveal>
          <div className="group relative overflow-hidden rounded-3xl">
            <img 
              src="/media/p6.jpg" 
              alt="Why choose us" 
              loading="lazy"
              className="aspect-[3/4] w-full object-cover grayscale-[20%] transition-transform duration-700 ease-out group-hover:scale-105"
            />
            {/* Arrow Button */}
            <div className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black text-white transition-transform duration-300 hover:scale-110">
              <span className="text-lg">↗</span>
            </div>
          </div>
        </Reveal>

        {/* Right Content */}
        <div className="flex flex-col pt-4 md:pt-10">
          <Reveal delay={0.1}>
            <p className="mb-14 max-w-md text-base font-medium text-neutral-500 md:text-lg">
              <span className="font-bold text-black">Immediate financial upside.</span> The QRAVE Impact: An average 50-table cafe sees up to a 35% overall revenue increase through smart upselling, 15-20% higher check values via AR, and significantly faster table turns.
            </p>
          </Reveal>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Card 1 */}
            <Reveal delay={0.2}>
              <div className="flex h-64 flex-col justify-between rounded-3xl bg-white p-6 md:p-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] border border-neutral-100 transition-transform duration-500 hover:-translate-y-1">
                <div className="flex items-start justify-between">
                  <span className="text-4xl font-bold tracking-tight text-black md:text-5xl">35%</span>
                  <span className="text-[10px] font-semibold text-neutral-400">Impact</span>
                </div>
                <div>
                  <p className="mb-3 text-right text-sm font-bold leading-snug text-black md:text-base">
                    Revenue Increase<br />On Average
                  </p>
                  <p className="text-[11px] font-medium leading-relaxed text-neutral-400">
                    Driven natively through our intelligent upselling algorithms and visual AR menus.
                  </p>
                </div>
              </div>
            </Reveal>

            {/* Card 2 */}
            <Reveal delay={0.3}>
              <div className="flex h-64 flex-col justify-between rounded-3xl bg-white p-6 md:p-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] border border-neutral-100 transition-transform duration-500 hover:-translate-y-1">
                <div className="flex items-start justify-between">
                  <span className="text-4xl font-bold tracking-tight text-black md:text-5xl">3 Days</span>
                  <span className="text-[10px] font-semibold text-neutral-400">Speed</span>
                </div>
                <div className="flex flex-col items-end">
                  <p className="mb-3 text-right text-sm font-bold leading-snug text-black md:text-base">
                    Done-For-You<br />Rapid Launch
                  </p>
                  <p className="text-[11px] font-medium leading-relaxed text-neutral-400 text-right">
                    We handle everything from digital menu creation to AR modeling so you can focus on hospitality.
                  </p>
                </div>
              </div>
            </Reveal>

            {/* Card 3 */}
            <Reveal delay={0.4}>
              <div className="flex h-64 flex-col justify-between rounded-3xl bg-white p-6 md:p-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] border border-neutral-100 transition-transform duration-500 hover:-translate-y-1">
                <div className="flex items-start justify-between">
                  <span className="text-4xl font-bold tracking-tight text-black md:text-5xl">0%</span>
                  <span className="text-[10px] font-semibold text-neutral-400">Fees</span>
                </div>
                <div>
                  <p className="mb-3 text-right text-sm font-bold leading-snug text-black md:text-base">
                    No Hidden Commissions<br />Keep Your Profits
                  </p>
                  <p className="text-[11px] font-medium leading-relaxed text-neutral-400">
                    Unlike food delivery aggregators, we never take a cut of your hard-earned order revenue.
                  </p>
                </div>
              </div>
            </Reveal>

            {/* Card 4 */}
            <Reveal delay={0.5}>
              <div className="flex h-64 flex-col justify-between rounded-3xl bg-white p-6 md:p-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] border border-neutral-100 transition-transform duration-500 hover:-translate-y-1">
                <div className="flex items-start justify-between">
                  <span className="text-4xl font-bold tracking-tight text-black md:text-5xl">&lt; 2s</span>
                  <span className="text-[10px] font-semibold text-neutral-400">Friction</span>
                </div>
                <div className="flex flex-col items-end">
                  <p className="mb-3 text-right text-sm font-bold leading-snug text-black md:text-base">
                    Zero App Downloads<br />Instant Access
                  </p>
                  <p className="text-[11px] font-medium leading-relaxed text-neutral-400 text-right">
                    Our blazing-fast Progressive Web App (PWA) ensures guests can browse and order instantly.
                  </p>
                </div>
              </div>
            </Reveal>

            {/* Card 5 */}
            <Reveal delay={0.6}>
              <div className="flex h-64 flex-col justify-between rounded-3xl bg-white p-6 md:p-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] border border-neutral-100 transition-transform duration-500 hover:-translate-y-1">
                <div className="flex items-start justify-between">
                  <span className="text-4xl font-bold tracking-tight text-black md:text-5xl">100%</span>
                  <span className="text-[10px] font-semibold text-neutral-400">Sync</span>
                </div>
                <div>
                  <p className="mb-3 text-right text-sm font-bold leading-snug text-black md:text-base">
                    Real-time Operations<br />No Dropped Orders
                  </p>
                  <p className="text-[11px] font-medium leading-relaxed text-neutral-400">
                    Your Waiter Dashboard and KDS stay perfectly synchronized so your kitchen never skips a beat.
                  </p>
                </div>
              </div>
            </Reveal>

            {/* Card 6 */}
            <Reveal delay={0.7}>
              <div className="flex h-64 flex-col justify-between rounded-3xl bg-white p-6 md:p-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] border border-neutral-100 transition-transform duration-500 hover:-translate-y-1">
                <div className="flex items-start justify-between">
                  <span className="text-4xl font-bold tracking-tight text-black md:text-5xl">24/7</span>
                  <span className="text-[10px] font-semibold text-neutral-400">Support</span>
                </div>
                <div className="flex flex-col items-end">
                  <p className="mb-3 text-right text-sm font-bold leading-snug text-black md:text-base">
                    Hyper-Local Team<br />Immediate Help
                  </p>
                  <p className="text-[11px] font-medium leading-relaxed text-neutral-400 text-right">
                    Based right here in Kochi, our dedicated support squad is always on standby for you.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}
