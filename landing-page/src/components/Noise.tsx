import { useEffect, useRef } from 'react'

/**
 * Noise overlay using a tiny canvas-generated texture.
 * Generated once on mount, then displayed as a static CSS background.
 * Much cheaper than live SVG feTurbulence which forces continuous GPU compositing.
 */
export default function Noise() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const imageData = ctx.createImageData(128, 128)
    const data = imageData.data
    for (let i = 0; i < data.length; i += 4) {
      const v = Math.random() * 255
      data[i] = v
      data[i + 1] = v
      data[i + 2] = v
      data[i + 3] = 20 // very subtle alpha
    }
    ctx.putImageData(imageData, 0, 0)
    ref.current.style.backgroundImage = `url(${canvas.toDataURL('image/png')})`
  }, [])

  return (
    <div
      ref={ref}
      className="pointer-events-none fixed inset-0 z-50 h-full w-full opacity-[0.03]"
      style={{ backgroundRepeat: 'repeat' }}
    />
  )
}
