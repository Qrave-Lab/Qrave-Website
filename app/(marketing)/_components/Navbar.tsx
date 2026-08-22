"use client";

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const LINKS = [
  { label: 'tech', href: '#tech' },
  { label: 'Features', href: '#features', badge: '04' },
  { label: 'Contact', href: '#contact' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        className="fixed inset-x-0 top-0 z-50 bg-[#f2f1ee]"
      >
        <nav className="flex items-center justify-between px-5 py-3 md:px-10">
          <a href="#top" className="text-xl font-bold tracking-tightest text-black lowercase md:text-2xl">
            qrave<sup>®</sup>
          </a>

          <div className="flex items-center gap-10">
            <div className="hidden items-center gap-8 md:flex">
              {LINKS.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  className="group relative text-[17px] font-bold tracking-tight text-black transition-colors md:text-[18px]"
                >
                  {l.label}
                  {l.badge && (
                    <sup className="ml-0.5 text-[11px] font-bold text-neutral-500">{l.badge}</sup>
                  )}
                  <span className="absolute -bottom-1 left-0 h-px w-0 bg-black transition-all duration-300 group-hover:w-full" />
                </a>
              ))}
            </div>

            <button
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              className="group flex h-8 w-10 flex-col items-end justify-center gap-[6px]"
            >
              <span className="h-[2px] w-8 bg-black transition-all duration-300 group-hover:w-5" />
              <span className="h-[2px] w-5 bg-black transition-all duration-300 group-hover:w-8" />
            </button>
          </div>
        </nav>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ clipPath: 'inset(0 0 100% 0)' }}
            animate={{ clipPath: 'inset(0 0 0% 0)' }}
            exit={{ clipPath: 'inset(0 0 100% 0)' }}
            transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
            className="fixed inset-0 z-[90] flex flex-col bg-[#0c0c0c] text-[#f2f1ee]"
          >
            <div className="flex items-center justify-between px-5 py-4 md:px-10">
              <span className="text-lg font-semibold tracking-tightest">qrave<sup>®</sup></span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-sm transition-colors hover:bg-white hover:text-black"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-1 flex-col justify-center gap-1 px-6 md:px-16">
              {LINKS.map((l, i) => (
                <div key={l.label} className="overflow-hidden">
                  <motion.a
                    href={l.href}
                    onClick={() => setOpen(false)}
                    initial={{ y: '110%', filter: 'blur(8px)' }}
                    animate={{ y: 0, filter: 'blur(0px)' }}
                    exit={{ y: '110%', filter: 'blur(8px)' }}
                    transition={{ duration: 0.6, delay: 0.15 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                    className="group flex items-baseline gap-4 text-6xl font-semibold tracking-tightest md:text-8xl"
                  >
                    <span className="text-sm font-normal text-neutral-500 md:text-base">
                      0{i + 1}
                    </span>
                    <span className="transition-transform duration-500 group-hover:translate-x-4 group-hover:text-neutral-400">
                      {l.label}
                    </span>
                    {l.badge && <sup className="text-xl text-neutral-500">{l.badge}</sup>}
                  </motion.a>
                </div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.5 }}
              className="flex items-center justify-between px-6 pb-8 text-sm text-neutral-500 md:px-16"
            >
              <span>qrave.private@gmail.com</span>
              <span>© 2026 qrave® tech</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
