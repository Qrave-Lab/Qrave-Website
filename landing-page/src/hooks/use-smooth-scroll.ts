import { useEffect } from 'react'
import Lenis from 'lenis'

/**
 * Shared smooth scrolling hook using Lenis.
 * Extracted to avoid duplicating the rAF loop in Home.tsx and ProjectDetail.tsx.
 * Uses a single requestAnimationFrame loop that is properly cleaned up on unmount.
 */
export function useSmoothScroll(deps: unknown[] = []) {
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.09 })
    let raf: number
    const loop = (time: number) => {
      lenis.raf(time)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      lenis.destroy()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
