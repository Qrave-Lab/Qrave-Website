import { useEffect, useRef } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

export default function CustomCursor() {
  const cursorX = useMotionValue(0)
  const cursorY = useMotionValue(0)
  const ringX = useSpring(0, { mass: 0.1, stiffness: 150, damping: 15 })
  const ringY = useSpring(0, { mass: 0.1, stiffness: 150, damping: 15 })
  const scale = useMotionValue(1)
  const ringScale = useSpring(1, { mass: 0.1, stiffness: 150, damping: 15 })
  const ringBg = useMotionValue('rgba(255,255,255,0)')
  const isMobile = useRef(false)

  useEffect(() => {
    // Don't run on mobile/touch devices
    isMobile.current = window.matchMedia('(pointer: coarse)').matches
    if (isMobile.current) return

    const onMouseMove = (e: MouseEvent) => {
      cursorX.set(e.clientX - 6)
      cursorY.set(e.clientY - 6)
      ringX.set(e.clientX - 20)
      ringY.set(e.clientY - 20)
    }

    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const isInteractive =
        target.tagName === 'A' ||
        target.tagName === 'BUTTON' ||
        target.closest('a') ||
        target.closest('button')

      if (isInteractive) {
        scale.set(0)
        ringScale.set(1.5)
        ringBg.set('rgba(255,255,255,1)')
      } else {
        scale.set(1)
        ringScale.set(1)
        ringBg.set('rgba(255,255,255,0)')
      }
    }

    window.addEventListener('mousemove', onMouseMove, { passive: true })
    window.addEventListener('mouseover', onMouseOver, { passive: true })

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseover', onMouseOver)
    }
  }, [cursorX, cursorY, ringX, ringY, scale, ringScale, ringBg])

  // Don't render on mobile
  if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) {
    return null
  }

  return (
    <>
      <motion.div
        className="pointer-events-none fixed top-0 left-0 z-[100] hidden h-3 w-3 rounded-full bg-white mix-blend-difference md:block"
        style={{
          x: cursorX,
          y: cursorY,
          scale,
        }}
      />
      <motion.div
        className="pointer-events-none fixed top-0 left-0 z-[99] hidden h-10 w-10 rounded-full border border-white/50 mix-blend-difference md:block"
        style={{
          x: ringX,
          y: ringY,
          scale: ringScale,
          backgroundColor: ringBg,
        }}
      />
    </>
  )
}
