import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

const WORDS = ['smart menus', 'ar previews', 'kds sync', 'analytics', 'growth']

export default function Preloader({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0)
  const [wordIndex, setWordIndex] = useState(0)

  useEffect(() => {
    const start = performance.now()
    const duration = 2200
    let raf: number
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      // easeInOutQuart for a natural loading feel
      const eased = t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2
      setProgress(Math.round(eased * 100))
      if (t < 1) raf = requestAnimationFrame(tick)
      else setTimeout(onDone, 350)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [onDone])

  useEffect(() => {
    const id = setInterval(() => setWordIndex((i) => (i + 1) % WORDS.length), 420)
    return () => clearInterval(id)
  }, [])

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0c0c0c] text-[#f2f1ee]"
      exit={{ y: '-100%', borderBottomLeftRadius: '3rem', borderBottomRightRadius: '3rem' }}
      transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
    >
      <div className="flex items-baseline gap-3 overflow-hidden">
        <motion.span
          key={wordIndex}
          initial={{ y: '110%', opacity: 0, filter: 'blur(6px)' }}
          animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="text-xl font-medium lowercase tracking-tight text-neutral-400 md:text-2xl"
        >
          {WORDS[wordIndex]}
        </motion.span>
      </div>

      <div className="pointer-events-none absolute bottom-8 left-0 right-0 flex items-end justify-between px-6 md:px-10">
        <span className="text-sm font-medium tracking-tight text-neutral-500">qrave® tech</span>
        <span className="text-7xl font-semibold tracking-tightest tabular-nums leading-none md:text-9xl">
          {progress}
          <span className="text-neutral-500">%</span>
        </span>
      </div>

      <div className="absolute bottom-0 left-0 h-[2px] bg-[#f2f1ee]" style={{ width: `${progress}%` }} />
    </motion.div>
  )
}
