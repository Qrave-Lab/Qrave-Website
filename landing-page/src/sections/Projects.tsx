import { motion } from 'framer-motion'
import { Link } from 'react-router'
import { BlurWords, Reveal } from '../components/Reveal'

const PROJECTS = [
  { id: 'smart-qr-menu', name: 'Smart QR Menu', year: '01', img: '/media/p1.jpg', tag: 'Interactive' },
  { id: 'ar-food-preview', name: 'AR Food Preview', year: '02', img: '/media/p2.jpg', tag: 'Visuals' },
  { id: 'live-menu-management', name: 'Live Menu Management', year: '03', img: '/media/p4.jpg', tag: 'Operations' },
  { id: 'restaurant-analytics', name: 'Restaurant Analytics', year: '04', img: '/media/p5.jpg', tag: 'Insights' },
]

export default function Projects() {
  return (
    <section id="features" className="px-6 pb-24 md:px-16 md:pb-32">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <Reveal className="text-sm font-medium text-neutral-400">(04)</Reveal>
          <h2 className="mt-2 text-[16vw] font-semibold leading-[0.9] tracking-tightest md:text-[9.5vw]">
            <BlurWords text="Features." />
          </h2>
          <Reveal delay={0.15} className="mt-1 text-2xl font-medium tracking-tightest text-neutral-400 md:text-3xl">
            ©2026
          </Reveal>
        </div>
        <Reveal delay={0.2} className="max-w-xs text-[15px] font-medium leading-snug tracking-tight text-neutral-500">
          We partner with teams across industries to ship work that performs. A few recent releases
          below.
        </Reveal>
      </div>

      <div className="mt-14 grid gap-x-6 gap-y-16 md:grid-cols-2">
        {PROJECTS.map((p, i) => (
          <Reveal key={p.name} delay={(i % 2) * 0.08}>
            <Link to={`/project/${p.id}`} className="group block cursor-pointer">
              <div className="flex flex-col gap-5">
                <div className="relative overflow-hidden rounded-[2rem] bg-neutral-100 shadow-[0_4px_30px_-4px_rgba(0,0,0,0.02)]">
                  <motion.img
                    src={p.img}
                    alt={p.name}
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover transition-all duration-[800ms] ease-[0.16,1,0.3,1] group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-black/0 transition-colors duration-500 group-hover:bg-black/5" />
                  
                  {/* Floating View Project Badge */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 scale-95 transition-all duration-500 ease-[0.16,1,0.3,1] group-hover:opacity-100 group-hover:scale-100 pointer-events-none">
                    <span className="bg-white/95 text-black px-6 py-3 rounded-full text-sm font-semibold shadow-xl backdrop-blur-md">
                      View Project
                    </span>
                  </div>
                  
                  <span className="absolute bottom-6 left-6 rounded-full bg-white/95 px-4 py-1.5 text-[12px] font-semibold tracking-wide text-black shadow-sm backdrop-blur-md">
                    {p.tag}
                  </span>
                </div>
                
                <div className="flex items-center justify-between px-2">
                  <span className="text-xl md:text-2xl font-semibold tracking-tight text-neutral-900 transition-colors group-hover:text-black">{p.name}</span>
                  <span className="text-sm font-medium text-neutral-400">/{p.year}</span>
                </div>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
