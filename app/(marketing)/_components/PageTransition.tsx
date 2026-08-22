"use client";

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

export default function PageTransition({ children }: { children: ReactNode }) {
  return (
    <>
      <motion.div
        initial={{ y: '100%', height: '100vh', borderTopLeftRadius: '50% 10%', borderTopRightRadius: '50% 10%' }}
        animate={{ y: '-100%', borderTopLeftRadius: '0%', borderTopRightRadius: '0%' }}
        exit={{ y: '0%', borderTopLeftRadius: '50% 10%', borderTopRightRadius: '50% 10%' }}
        transition={{ duration: 1, ease: [0.76, 0, 0.24, 1] }}
        className="fixed inset-0 z-[110] bg-[#111110] pointer-events-none"
      />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    </>
  )
}
