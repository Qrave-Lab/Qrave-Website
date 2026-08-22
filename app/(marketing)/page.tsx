"use client";

import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useSmoothScroll } from './_hooks/use-smooth-scroll'
import Preloader from './_components/Preloader'
import Navbar from './_components/Navbar'
import Hero from './_sections/Hero'
import Clients from './_sections/Clients'
import Projects from './_sections/Projects'
import WhyChooseUs from './_sections/WhyChooseUs'
import Services from './_sections/Services'
import Process from './_sections/Process'
import ArDemo from './_sections/ArDemo'
import Stats from './_sections/Stats'
import Testimonials from './_sections/Testimonials'
import Statement from './_sections/Statement'
import Faq from './_sections/Faq'
import Pricing from './_sections/Pricing'
import Footer from './_sections/Footer'

export default function Home() {
  const [loading, setLoading] = useState(true)

  // Shared smooth scrolling hook
  useSmoothScroll()

  // Lock scroll while preloader is visible
  useEffect(() => {
    document.body.style.overflow = loading ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [loading])

  return (
    <div className="min-h-screen bg-[#f2f1ee] text-[#111110]">
      <AnimatePresence>
        {loading && <Preloader onDone={() => setLoading(false)} />}
      </AnimatePresence>

      {!loading && <Navbar />}

      <main>
        <Hero started={!loading} />
        <div className="relative z-10 bg-[#f2f1ee]">
          <Clients />
          <Projects />
          <WhyChooseUs />
          <Services />
          <Process />
          <ArDemo />
          <Stats />
          <Testimonials />
          <Statement />
          <Pricing />
          <Faq />
          <Footer />
        </div>
      </main>
    </div>
  )
}
