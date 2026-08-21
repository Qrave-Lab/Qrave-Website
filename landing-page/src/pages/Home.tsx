import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useSmoothScroll } from '../hooks/use-smooth-scroll'
import Preloader from '../components/Preloader'
import Navbar from '../components/Navbar'
import Hero from '../sections/Hero'
import Clients from '../sections/Clients'
import Projects from '../sections/Projects'
import WhyChooseUs from '../sections/WhyChooseUs'
import Services from '../sections/Services'
import Process from '../sections/Process'
import ArDemo from '../sections/ArDemo'
import Stats from '../sections/Stats'
import Testimonials from '../sections/Testimonials'
import Statement from '../sections/Statement'
import Faq from '../sections/Faq'
import Pricing from '../sections/Pricing'
import Footer from '../sections/Footer'

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
