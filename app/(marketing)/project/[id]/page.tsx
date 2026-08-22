"use client";

import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useSmoothScroll } from '../../_hooks/use-smooth-scroll'
import Navbar from '../../_components/Navbar'
import Footer from '../../_sections/Footer'
import { Reveal, BlurWords } from '../../_components/Reveal'
import { ArrowLeft } from 'lucide-react'

// Dummy data for project details. We will match this against the ID parameter.
const PROJECT_DATA = {
  'smart-qr-menu': {
    name: 'Smart QR Menu',
    year: '2026',
    tag: 'Interactive',
    heroImg: '/media/p1.jpg',
    client: 'Gourmet Bistro',
    role: 'UI/UX Design, Frontend Development',
    overview:
      'We completely reimagined the dining experience for Gourmet Bistro with a seamless, highly intuitive QR menu interface that not only looks beautiful but drives higher order value.',
    challenge:
      'The client needed a digital solution to replace their physical menus while ensuring that older demographics could easily navigate the interface without friction.',
    solution:
      'We designed a clean, typography-led interface with micro-interactions that guide the user. Using dynamic categories and vibrant food imagery, we made the ordering process engaging and frictionless.',
    results: ['45% increase in average order value', '98% positive feedback on usability', '2x faster table turnover rate']
  },
  'ar-food-preview': {
    name: 'AR Food Preview',
    year: '2025',
    tag: 'Visuals',
    heroImg: '/media/p2.jpg',
    client: 'NextGen Eatery',
    role: '3D Modeling, AR Integration',
    overview:
      'Bringing the menu to life with immersive Augmented Reality, allowing customers to visualize their meals in 3D right on their table before ordering.',
    challenge:
      'High return rate of dishes due to unmatched expectations between the menu description and the actual meal served.',
    solution:
      'We developed a lightweight AR experience integrated directly into the web app, requiring no app downloads. High-fidelity 3D scans of the dishes were optimized for instant loading.',
    results: ['Zero app downloads required', '30% reduction in dish returns', 'High social media sharing rate']
  },
  'live-menu-management': {
    name: 'Live Menu Management',
    year: '2026',
    tag: 'Operations',
    heroImg: '/media/p4.jpg',
    client: 'Global Chain Inc.',
    role: 'Backend Development, Dashboard Design',
    overview:
      'A powerful real-time dashboard enabling restaurant managers to update menus, pricing, and availability across multiple locations instantly.',
    challenge:
      'Managing menus across 50+ locations was a logistical nightmare involving manual updates to disparate systems.',
    solution:
      'We built a unified command center with a beautifully designed, dark-themed dashboard. WebSockets ensure that changes made on the dashboard reflect on customer menus in milliseconds.',
    results: ['Real-time synchronization', 'Saved 40+ hours per week in manual updates', 'Zero downtime during peak hours']
  },
  'restaurant-analytics': {
    name: 'Restaurant Analytics',
    year: '2025',
    tag: 'Insights',
    heroImg: '/media/p5.jpg',
    client: 'DataDine Partners',
    role: 'Data Visualization, Full Stack Engineering',
    overview:
      'Transforming raw sales data into actionable insights through stunning, interactive visual reports for restaurant owners.',
    challenge:
      'Owners were drowning in spreadsheet data but lacking clear, visual insights to make quick business decisions.',
    solution:
      'We engineered a comprehensive analytics suite featuring customized charts and predictive modeling. The UI was kept minimal to let the data take center stage, using subtle animations to reveal trends.',
    results: ['Predictive stock management', 'Identified top 5 underperforming items', '20% increase in profit margins']
  }
}

export default function ProjectDetail() {
  const params = useParams()
  const id = params?.id as string
  
  // Shared smooth scroll, re-init on route change
  useSmoothScroll([id])
  
  // Scroll to top on load
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [id])

  // Get project data or use fallback
  const project = PROJECT_DATA[id as keyof typeof PROJECT_DATA] || {
    name: 'Unknown Project',
    year: '2026',
    tag: 'Concept',
    heroImg: '/media/p1.jpg',
    client: 'Confidential',
    role: 'Design & Development',
    overview: 'This project case study is currently being updated. Please check back later for full details on our approach and outcomes.',
    challenge: 'N/A',
    solution: 'N/A',
    results: []
  }

  return (
    <div className="min-h-screen bg-[#f2f1ee] text-[#111110]">
      <Navbar />

      <main className="pt-32 pb-24">
        {/* Header Section */}
        <div className="px-6 md:px-16 mx-auto max-w-7xl">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-black transition-colors mb-12">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <Reveal className="flex items-center gap-4 mb-6">
            <span className="px-3 py-1 text-xs font-semibold uppercase tracking-widest text-neutral-500 border border-neutral-300 rounded-full">
              {project.tag}
            </span>
            <span className="text-sm font-medium text-neutral-400">{project.year}</span>
          </Reveal>

          <h1 className="text-[12vw] md:text-[7vw] font-semibold leading-[0.9] tracking-tightest mb-8">
            <BlurWords text={project.name} />
          </h1>

          <div className="grid md:grid-cols-3 gap-12 border-t border-neutral-300 mt-16 pt-8">
            <Reveal className="col-span-1 md:col-span-2 text-xl md:text-3xl font-medium tracking-tight leading-snug">
              {project.overview}
            </Reveal>
            <div className="col-span-1 flex flex-col gap-6">
              <Reveal delay={0.1}>
                <h4 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-2">Client</h4>
                <p className="text-lg font-medium">{project.client}</p>
              </Reveal>
              <Reveal delay={0.2}>
                <h4 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-2">Role</h4>
                <p className="text-lg font-medium">{project.role}</p>
              </Reveal>
            </div>
          </div>
        </div>

        {/* Hero Image */}
        <Reveal delay={0.3} className="mt-20 w-full px-4 md:px-8">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="w-full h-[50vh] md:h-[80vh] rounded-[2rem] overflow-hidden"
          >
            <img src={project.heroImg} alt={project.name} className="w-full h-full object-cover" />
          </motion.div>
        </Reveal>

        {/* Challenge & Solution */}
        <div className="px-6 md:px-16 mx-auto max-w-5xl mt-32">
          <div className="grid md:grid-cols-2 gap-16 md:gap-24">
            <Reveal>
              <h3 className="text-3xl font-semibold tracking-tight mb-6">The Challenge</h3>
              <p className="text-lg text-neutral-600 leading-relaxed">
                {project.challenge}
              </p>
            </Reveal>
            
            <Reveal delay={0.1}>
              <h3 className="text-3xl font-semibold tracking-tight mb-6">Our Approach</h3>
              <p className="text-lg text-neutral-600 leading-relaxed">
                {project.solution}
              </p>
            </Reveal>
          </div>
        </div>

        {/* Results */}
        {project.results && project.results.length > 0 && (
          <div className="px-6 md:px-16 mx-auto max-w-7xl mt-32 mb-20">
            <div className="bg-[#111110] text-white rounded-[2rem] p-10 md:p-20">
              <Reveal>
                <h3 className="text-4xl md:text-5xl font-semibold tracking-tight mb-12">The Impact</h3>
              </Reveal>
              
              <div className="grid md:grid-cols-3 gap-8 md:gap-12">
                {project.results.map((result, i) => (
                  <Reveal key={i} delay={i * 0.1}>
                    <div className="border-t border-neutral-800 pt-6">
                      <span className="text-3xl text-red-500 font-bold block mb-4">0{i + 1}</span>
                      <p className="text-xl font-medium tracking-tight text-neutral-300">{result}</p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
