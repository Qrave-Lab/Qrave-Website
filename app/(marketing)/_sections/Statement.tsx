"use client";

import { useRef } from 'react'
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion'
import { Reveal } from '../_components/Reveal'

const TEXT =
  'We bridge the gap between traditional dining and tech-savvy consumers by replacing static menus with a smart QR and AR ecosystem that drives revenue.'

function Word({
  word,
  progress,
  range,
}: {
  word: string
  progress: MotionValue<number>
  range: [number, number]
}) {
  const opacity = useTransform(progress, range, [0.12, 1])
  const blur = useTransform(progress, range, [6, 0])
  const filter = useTransform(blur, (b) => `blur(${b}px)`)
  return (
    <>
      <motion.span style={{ opacity, filter }} className="inline-block will-change-[filter,opacity]">
        {word}
      </motion.span>
      {' '}
    </>
  )
}

export default function Statement() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.85', 'start 0.3'],
  })

  const words = TEXT.split(' ')

  return (
    <section className="px-6 py-24 md:px-16 md:py-36">
      <div className="grid gap-8 md:grid-cols-[1fr_3fr]">
        <div>
          <Reveal className="text-lg font-semibold tracking-tightest">qrave®</Reveal>
          <Reveal delay={0.1} className="mt-3 max-w-[200px] text-sm font-medium tracking-tight text-neutral-500">
            Built exclusively for modern cafés and restaurants in Kochi and beyond.
          </Reveal>
        </div>
        <p ref={ref} className="text-3xl font-medium leading-[1.15] tracking-tightest md:text-[3.4rem]">
          {words.map((w, i) => (
            <Word
              key={i}
              word={w}
              progress={scrollYProgress}
              range={[i / words.length, (i + 1) / words.length]}
            />
          ))}
        </p>
      </div>
    </section>
  )
}
