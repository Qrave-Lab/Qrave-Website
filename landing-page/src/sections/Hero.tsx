import { motion, useScroll, useTransform, useMotionValue, useMotionTemplate } from 'framer-motion'
import type { MouseEvent } from 'react'



const letterAnim = (i: number) => ({
  initial: { y: '112%', rotate: 4, filter: 'blur(10px)' },
  animate: { y: 0, rotate: 0, filter: 'blur(0px)' },
  transition: { duration: 1, delay: 0.25 + i * 0.045, ease: [0.22, 1, 0.36, 1] as const },
})

export default function Hero({ started }: { started: boolean }) {
  const { scrollY } = useScroll()
  const scrollScale = useTransform(scrollY, [0, 800], [1, 0.85])
  const word = 'qrave'.split('')

  const mouseX = useMotionValue(-1000)
  const mouseY = useMotionValue(-1000)
  const isHovered = useMotionValue(0)

  // Hoist motion templates out of JSX — created once, updated reactively
  const maskImage = useMotionTemplate`radial-gradient(500px circle at ${mouseX}px ${mouseY}px, black 0%, transparent 100%)`

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const { currentTarget, clientX, clientY } = e
    const { left, top } = currentTarget.getBoundingClientRect()
    mouseX.set(clientX - left)
    mouseY.set(clientY - top)
  }

  return (
    <section id="top" className="sticky top-0 z-0 px-2 pt-[60px] pb-2 md:px-4 md:pt-[72px] md:pb-4">
      <motion.div style={{ scale: scrollScale }} className="origin-top">
        <motion.div
          initial={{ scale: 0.97, opacity: 0 }}
          animate={started ? { scale: 1, opacity: 1 } : {}}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          className="relative h-[calc(100vh-60px-8px)] md:h-[calc(100vh-72px-16px)] min-h-[620px] overflow-hidden rounded-[2rem] bg-black text-white cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseEnter={() => isHovered.set(1)}
          onMouseLeave={() => isHovered.set(0)}
        >
        {/* Background video (grayscale base) */}
        <motion.video
          src="/media/hero2.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          initial={{ scale: 1.15 }}
          animate={started ? { scale: 1 } : {}}
          transition={{ duration: 2.4, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 h-full w-full object-cover object-left opacity-90 grayscale"
        />
        
        {/* Spotlight colored video — uses motion values directly, zero re-renders */}
        {started && (
          <motion.video
            src="/media/hero2.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            initial={{ scale: 1.15, opacity: 0 }}
            animate={{ scale: 1 }}
            style={{
              opacity: isHovered,
              maskImage,
              WebkitMaskImage: maskImage,
            }}
            transition={{
              scale: { duration: 2.4, ease: [0.22, 1, 0.36, 1] },
            }}
            className="absolute inset-0 h-full w-full object-cover object-left pointer-events-none"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <h1 className="flex select-none items-center justify-center text-[19vw] font-semibold leading-[0.85] tracking-tightest md:text-[15.5vw]">
            {started &&
              word.map((l, i) => (
                <span key={i} className="inline-block overflow-hidden pb-[0.06em] px-[0.05em] mx-[-0.05em]">
                  <motion.span className="inline-block will-change-transform" {...letterAnim(i)}>
                    {l}
                  </motion.span>
                </span>
              ))}
          </h1>
          <div className="overflow-hidden mt-2 md:mt-4">
            <motion.p
              initial={{ y: '110%', opacity: 0, filter: 'blur(6px)' }}
              animate={started ? { y: 0, opacity: 1, filter: 'blur(0px)' } : {}}
              transition={{ duration: 0.9, delay: 0.85, ease: [0.22, 1, 0.36, 1] }}
              className="text-[4vw] font-semibold tracking-[0.15em] text-neutral-400 uppercase md:text-[1.6vw]"
            >
              SEE WHAT YOU CRAVE FOR
            </motion.p>
          </div>
        </div>



        {/* Crosshair marks */}
        <div className="absolute inset-x-0 bottom-[32%] hidden justify-between px-10 md:flex">
          {[0, 1, 2, 3].map((i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0 }}
              animate={started ? { opacity: 0.5 } : {}}
              transition={{ delay: 1.2 + i * 0.1 }}
              className="animate-plus-spin text-xl font-light text-white"
              style={{ animationDelay: `${i * -3}s` }}
            >
              +
            </motion.span>
          ))}
        </div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 24, filter: 'blur(6px)' }}
          animate={started ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
          transition={{ duration: 0.9, delay: 1.25, ease: [0.22, 1, 0.36, 1] }}
          className="absolute bottom-24 left-6 max-w-[460px] text-[15px] font-medium leading-relaxed tracking-tight text-white/80 md:bottom-10 md:left-10 md:text-[17px] flex flex-col gap-1 text-left"
        >
          <span className="font-semibold text-white">Zero paper. Frictionless ordering.</span>
          <span className="text-white/70">QRAVE modernizes dining with interactive QR menus, 3D previews, and intelligent analytics.</span>
        </motion.p>

        {/* Copyright */}
        <motion.span
          initial={{ opacity: 0 }}
          animate={started ? { opacity: 0.6 } : {}}
          transition={{ delay: 1.4 }}
          className="absolute bottom-24 right-6 text-sm tracking-tight md:bottom-10 md:right-auto md:left-1/2 md:-translate-x-1/2"
        >
          © 2026 qrave® tech
        </motion.span>

      </motion.div>
      </motion.div>
    </section>
  )
}
