import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BlurWords, Reveal } from '../components/Reveal'

const FAQS = [
  {
    q: 'Do customers need to download an app?',
    a: 'No. QRAVE is a progressive web app. Guests simply scan the QR code on their table to instantly access the menu, view AR items, and order directly from their browser.',
  },
  {
    q: 'How fast can we get started?',
    a: 'Our team handles the entire setup, from menu digitization to AR modeling. With our rapid deployment, you can be fully operational in just 3 days.',
  },
  {
    q: 'How does the billing and payment work?',
    a: 'Payments are integrated directly into the guest ordering flow. We support UPI, credit/debit cards, and bill splitting out of the box, with funds settling into your account instantly.',
  },
  {
    q: 'Do I need to buy special hardware?',
    a: 'Not at all. Your staff can use their existing smartphones or tablets for the Waiter Dashboard, and the Kitchen Display System (KDS) runs smoothly on any standard tablet or smart monitor.',
  },
  {
    q: 'Will QRAVE work for my small café?',
    a: 'Absolutely. Our Entry Tier (₹499/mo) is specifically designed for independent cafés looking to digitize their operations without huge upfront costs.',
  },
  {
    q: 'Can I change my menu items and pricing easily?',
    a: 'Yes. Our Admin Analytics Suite allows you to update items, mark dishes out of stock, and adjust pricing in real-time. Changes reflect instantly on the guest-facing menus.',
  },
]

export default function Faq() {
  const [open, setOpen] = useState(0)

  return (
    <section className="px-6 py-20 md:px-16 md:py-28">
      <div className="grid gap-12 md:grid-cols-2">
        <div>
          <h2 className="text-4xl font-semibold leading-[1.02] tracking-tightest md:text-6xl">
            <BlurWords text="Questions, answered." />
          </h2>
          <Reveal delay={0.15} className="mt-5 max-w-sm text-[15px] font-medium leading-snug tracking-tight text-neutral-500">
            Everything you need to know about setting up QRAVE at your venue. Something missing? Just ask.
          </Reveal>
        </div>

        <div className="flex flex-col gap-3">
          {FAQS.map((f, i) => {
            const isOpen = open === i
            return (
              <Reveal key={f.q} delay={i * 0.04}>
                <div
                  className={`rounded-2xl transition-colors duration-500 ${
                    isOpen ? 'bg-black text-white' : 'bg-white hover:bg-neutral-100'
                  }`}
                >
                  <button
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left"
                  >
                    <span className="text-[17px] font-semibold tracking-tight">{f.q}</span>
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base transition-all duration-500 ${
                        isOpen ? 'rotate-45 bg-white text-black' : 'bg-black text-white'
                      }`}
                    >
                      +
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="px-6 pb-6 text-[15px] leading-relaxed tracking-tight text-neutral-300">
                          {f.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
