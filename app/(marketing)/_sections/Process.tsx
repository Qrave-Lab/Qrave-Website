"use client";

import { motion } from 'framer-motion'
import { BlurWords, Reveal } from '../_components/Reveal'

const CARDS = [
  { id: 'Step 01', img: '/media/p1.jpg', title: 'Scan & Discover', text: 'Guests scan a table-specific QR code to instantly access a visually rich, interactive menu on their own devices.' },
  { id: 'Step 02', img: '/media/p2.jpg', title: 'Immersive 3D/AR Previews', text: "See exactly what you're ordering with augmented reality. Boosts appetite and drives upselling by 15-20% natively." },
  { id: 'Step 03', img: '/media/p3.jpg', title: 'Tap, Order & Pay', text: 'Send orders straight to the kitchen. Split bills and checkout securely with integrated UPI and cards.' },
]

export default function Process() {
  return (
    <section id="process" className="px-6 py-20 md:px-16 md:py-28">
      <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-black text-[9px] text-white">
              +
            </span>
            How it works
          </div>
        </div>
        <div className="max-w-2xl">
          <h2 className="text-4xl font-semibold leading-[1.05] tracking-tightest md:text-5xl lg:text-6xl">
            <BlurWords text="Seamless Dining, Reimagined." />
          </h2>
          <Reveal delay={0.1}>
            <p className="mt-6 max-w-md text-[15px] font-medium leading-relaxed tracking-tight text-neutral-500">
              Give your guests full control with a friction-free, 3-step digital ordering experience. No app downloads required—just scan and savor.
            </p>
          </Reveal>
        </div>
      </div>

      <div className="mt-16 md:mt-24">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((c, i) => (
            <Reveal key={c.id} delay={i * 0.1}>
              <div className="flex h-full flex-col justify-between rounded-t-2xl bg-white p-5 border border-neutral-100/50 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-xs font-semibold tracking-tight text-black">
                    ✦ {c.id}
                  </span>
                  <div className="h-1.5 w-1.5 rounded-full bg-neutral-200" />
                </div>
                <div className="flex items-start gap-4">
                  <img
                    src={c.img}
                    alt=""
                    className="h-14 w-14 rounded-md object-cover flex-shrink-0"
                  />
                  <div>
                    <h3 className="text-[15px] font-bold tracking-tight text-black mb-1">{c.title}</h3>
                    <p className="text-[13px] font-medium leading-snug tracking-tight text-neutral-500">
                      {c.text}
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.3} className="mt-2">
          <div className="group relative overflow-hidden rounded-b-[2rem] rounded-t-xl bg-neutral-100">
            <motion.img
              src="/media/p5.jpg"
              alt="Showreel"
              className="aspect-video lg:aspect-[21/9] w-full object-cover grayscale-[20%] transition-transform duration-700 ease-out group-hover:scale-105 group-hover:grayscale-0"
            />
            <div className="absolute inset-0 bg-black/10 transition-colors duration-500 group-hover:bg-black/20" />
            
            <button className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-3 rounded-full bg-white/20 p-2 pr-5 text-sm font-medium text-white backdrop-blur-md transition-all duration-300 hover:bg-white/30 hover:scale-105">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black pl-1">
                ▶
              </span>
              <span className="flex flex-col items-start text-left">
                <span>See QRAVE in action</span>
                <span className="text-[10px] text-white/80">1min 22s</span>
              </span>
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
