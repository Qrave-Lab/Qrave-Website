import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Reveal, BlurWords } from '../components/Reveal'
import { ArrowUpRight, Check } from 'lucide-react'

export default function Pricing() {
  const containerRef = useRef<HTMLDivElement>(null)
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  })

  // Line animation that draws down as you scroll
  const lineDraw = useTransform(scrollYProgress, [0.2, 0.6], [0, 1])

  return (
    <section id="pricing" className="px-6 py-24 md:px-16 md:py-32 bg-[#f2f1ee] text-[#111110]">
      <div className="mx-auto max-w-[90rem]">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div>
            <Reveal className="text-sm font-medium text-neutral-400 mb-4">(06) PRICING</Reveal>
            <h2 className="text-[12vw] md:text-[6vw] font-bold leading-[0.9] tracking-tightest">
              <BlurWords text="Pricing &" />
              <br />
              <BlurWords text="Plans." />
            </h2>
          </div>
          <Reveal delay={0.2} className="max-w-xs text-[16px] font-medium leading-relaxed tracking-tight text-neutral-500">
            Select the engagement model that fits your goals. We tailor everything to your specific needs.
          </Reveal>
        </div>

        <div ref={containerRef} className="relative grid md:grid-cols-2 gap-6 lg:gap-8 mt-12">
          
          {/* Animated SVG Line separating the cards */}
          <div className="hidden md:block absolute top-0 bottom-0 left-1/2 w-[1px] -translate-x-1/2 pointer-events-none z-10">
            <svg width="2" height="100%" preserveAspectRatio="none">
              <motion.line 
                x1="1" y1="0" x2="1" y2="100%" 
                stroke="#111110" 
                strokeWidth="1" 
                strokeOpacity="0.15"
                style={{ pathLength: lineDraw }}
              />
            </svg>
          </div>

          {/* Tier 1 Card */}
          <Reveal delay={0.1}>
            <div className="group relative flex flex-col h-full bg-white rounded-[2.5rem] p-8 md:p-14 border border-neutral-200 transition-all duration-500 hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-2">
              
              <div className="mb-8 border-b border-neutral-200 pb-10">
                <h3 className="text-3xl font-bold tracking-tight mb-3">Essential</h3>
                <p className="text-neutral-500 font-medium leading-relaxed">For growing brands needing a solid digital foundation.</p>
                <div className="mt-8 flex items-baseline gap-2">
                  <span className="text-5xl font-bold tracking-tight">Custom</span>
                  <span className="text-sm text-neutral-400 font-medium">/ project</span>
                </div>
              </div>

              <ul className="flex flex-col gap-5 mb-14 flex-grow">
                {[
                  'Digital Strategy & Positioning',
                  'Custom UI/UX Design',
                  'Responsive Web Development',
                  'Basic SEO Optimization',
                  '1 Month Post-Launch Support'
                ].map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-4">
                    <Check className="w-5 h-5 text-neutral-300 shrink-0 mt-0.5" />
                    <span className="text-neutral-600 font-medium">{feature}</span>
                  </li>
                ))}
              </ul>

              <a 
                href="#contact" 
                className="flex w-full items-center justify-between overflow-hidden rounded-full border border-neutral-200 bg-transparent px-8 py-5 text-black transition-all hover:bg-[#111110] hover:text-white hover:border-[#111110]"
              >
                <span className="font-bold tracking-tight">Get in Touch</span>
                <ArrowUpRight className="h-5 w-5" />
              </a>
            </div>
          </Reveal>

          {/* Tier 2 Card (Dark Theme) */}
          <Reveal delay={0.2}>
            <div className="group relative flex flex-col h-full bg-[#0c0c0c] text-[#f2f1ee] rounded-[2.5rem] p-8 md:p-14 shadow-2xl transition-all duration-500 hover:-translate-y-2">
              
              <div className="absolute inset-0 border border-white/5 rounded-[2.5rem] pointer-events-none" />
              <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/[0.03] blur-[100px] rounded-full pointer-events-none" />

              <div className="relative z-10 mb-8 border-b border-white/10 pb-10">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-3xl font-bold tracking-tight">All-Access</h3>
                  <span className="bg-white text-black px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase">Pro</span>
                </div>
                <p className="text-neutral-400 font-medium leading-relaxed">For visionary teams seeking complete digital transformation.</p>
                <div className="mt-8 flex items-baseline gap-2">
                  <span className="text-5xl font-bold tracking-tight">Tailored</span>
                  <span className="text-sm text-neutral-500 font-medium">/ partnership</span>
                </div>
              </div>

              <ul className="relative z-10 flex flex-col gap-5 mb-14 flex-grow">
                {[
                  'Everything in Essential',
                  'Advanced E-commerce Integration',
                  'Complex Web App Architecture',
                  'Continuous Conversion Optimization',
                  'Priority Lifetime Support'
                ].map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-4">
                    <Check className="w-5 h-5 text-white/40 shrink-0 mt-0.5" />
                    <span className="text-neutral-300 font-medium">{feature}</span>
                  </li>
                ))}
              </ul>

              <a 
                href="#contact" 
                className="relative z-10 flex w-full items-center justify-between overflow-hidden rounded-full bg-white px-8 py-5 text-black transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <span className="font-bold tracking-tight">Get in Touch</span>
                <ArrowUpRight className="h-5 w-5" />
              </a>
            </div>
          </Reveal>

        </div>
      </div>
    </section>
  )
}
