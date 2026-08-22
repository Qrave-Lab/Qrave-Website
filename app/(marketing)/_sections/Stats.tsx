"use client";

import { useEffect, useRef } from 'react'
import { animate, useInView } from 'framer-motion'
import { Reveal } from '../_components/Reveal'

const STATS = [
  { value: 4.2, suffix: 'm+', decimals: 1, label: 'Ad impressions managed' },
  { value: 64, suffix: '+', decimals: 0, label: 'Projects shipped to date' },
  { value: 97, suffix: '%', decimals: 0, label: 'Client retention rate' },
  { value: 52, suffix: 'k+', decimals: 0, label: 'Monthly organic visits driven' },
]

function Counter({ value, suffix, decimals }: { value: number; suffix: string; decimals: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  useEffect(() => {
    if (!inView || !ref.current) return
    const controls = animate(0, value, {
      duration: 2,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = v.toFixed(decimals) + suffix
      },
    })
    return () => controls.stop()
  }, [inView, value, suffix, decimals])

  return <span ref={ref}>0{suffix}</span>
}

export default function Stats() {
  return (
    <section className="border-b border-black/10 px-6 py-20 md:px-16 md:py-28">
      <div className="grid gap-12 md:grid-cols-4 md:gap-6">
        {STATS.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.08}>
            <div className="text-6xl font-semibold tracking-tightest md:text-7xl">
              <Counter value={s.value} suffix={s.suffix} decimals={s.decimals} />
            </div>
            <p className="mt-3 max-w-[180px] text-sm font-medium leading-snug tracking-tight text-neutral-500">
              {s.label}
            </p>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
