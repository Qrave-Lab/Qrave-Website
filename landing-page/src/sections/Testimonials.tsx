import { BlurWords, Reveal } from '../components/Reveal'

const QUOTES = [
  {
    text: 'Sharp thinking, zero hand-holding needed. They shipped a site that finally matches our ambition.',
    name: 'Daniel Reyes',
    role: 'Founder, Gridwork',
    img: '/media/a2.jpg',
  },
  {
    text: 'The rebrand paid for itself in a quarter. Clean, distinctive, and our team actually uses the system.',
    name: 'Sofia Almeida',
    role: 'CMO, Aqualis',
    img: '/media/a3.jpg',
  },
  {
    text: 'Fastest agency process we have ever run. Weekly demos, honest feedback, and real results.',
    name: 'Marcus Hill',
    role: 'VP Growth, Lumina',
    img: '/media/a4.jpg',
  },
]

export default function Testimonials() {
  return (
    <section className="px-6 py-20 md:px-16 md:py-28">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <h2 className="max-w-xl text-4xl font-semibold leading-[1.02] tracking-tightest md:text-6xl">
          <BlurWords text="Clients who come back." />
        </h2>
        <Reveal delay={0.15} className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {QUOTES.map((q) => (
              <img
                key={q.name}
                src={q.img}
                alt={q.name}
                className="h-9 w-9 rounded-full border-2 border-[#f2f1ee] object-cover"
              />
            ))}
          </div>
          <div className="text-sm font-medium tracking-tight">
            <span className="text-amber-500">★★★★★</span> 4.9/5
            <p className="text-xs text-neutral-500">from 40+ reviews</p>
          </div>
        </Reveal>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {QUOTES.map((q, i) => (
          <Reveal key={q.name} delay={i * 0.08}>
            <figure className="group flex h-full flex-col justify-between rounded-2xl bg-white p-7 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-xl">
              <div>
                <span className="text-sm text-amber-500">★★★★★</span>
                <blockquote className="mt-4 text-xl font-medium leading-snug tracking-tight">
                  “{q.text}”
                </blockquote>
              </div>
              <figcaption className="mt-8 flex items-center gap-3">
                <img src={q.img} alt={q.name} className="h-10 w-10 rounded-full object-cover" />
                <div>
                  <p className="text-sm font-semibold tracking-tight">{q.name}</p>
                  <p className="text-xs text-neutral-500">{q.role}</p>
                </div>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
