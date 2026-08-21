import { Reveal } from '../components/Reveal'
import { Command, Aperture, Hexagon, Fingerprint, Pyramid, Triangle } from 'lucide-react'

const CLIENTS = [
  { icon: <Command size={36} strokeWidth={2.5} />, name: 'lujo' },
  { icon: <Aperture size={36} strokeWidth={2.5} />, name: 'Warpspeed' },
  { icon: <Hexagon size={42} strokeWidth={2} fill="currentColor" />, name: '' },
  { icon: <Fingerprint size={36} strokeWidth={2} />, name: 'loqo' },
  { icon: <Pyramid size={36} strokeWidth={2.5} />, name: 'vertex*' },
  { icon: <Triangle size={42} strokeWidth={2} fill="currentColor" />, name: 'Mono.' },
]

export default function Clients() {
  return (
    <section className="px-6 py-24 md:px-16 md:py-32">
      <div className="flex items-center justify-between">
        <Reveal className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-black text-[9px] text-white">
            +
          </span>
          Our clients
        </Reveal>
        <Reveal delay={0.1} className="text-sm font-medium tracking-tight text-neutral-500">
          (2019–26©)
        </Reveal>
      </div>

      <div className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-6">
        {CLIENTS.map((c, i) => (
          <Reveal key={i} delay={i * 0.05} className="h-full">
            <div className="group flex h-36 items-center justify-center rounded-3xl bg-white text-neutral-800 transition-colors duration-500 hover:bg-black hover:text-white md:h-48">
              <span className="flex items-center gap-3 transition-transform duration-500 group-hover:scale-110">
                {c.icon}
                {c.name && <span className="text-2xl font-bold tracking-tightest md:text-3xl">{c.name}</span>}
              </span>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
