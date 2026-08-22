import { BlurWords, Reveal } from '../_components/Reveal'

export default function Footer() {
  return (
    <footer id="contact" className="px-2 pb-2 md:px-3">
      <div className="overflow-hidden rounded-[1.75rem] bg-[#0c0c0c] text-[#f2f1ee]">
        <div className="px-6 pt-20 md:px-14 md:pt-28">
          <Reveal className="flex items-center gap-2 text-sm font-semibold tracking-tight text-neutral-400">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[9px] text-black">
              +
            </span>
            Ready to upgrade your venue?
          </Reveal>

          <h2 className="mt-6 text-[13vw] font-semibold leading-[0.92] tracking-tightest md:text-[8.5vw]">
            <BlurWords text="Launch in" />
            <br />
            <span className="text-neutral-500">
              <BlurWords text="just 3 days." stagger={0.08} />
            </span>
          </h2>

          <Reveal delay={0.2} className="mt-10 flex flex-wrap items-center gap-4">
            <a
              href="mailto:qrave.private@gmail.com"
              className="group inline-flex items-center gap-3 rounded-full bg-white px-7 py-3.5 text-base font-semibold tracking-tight text-black transition-transform duration-300 hover:scale-105"
            >
              qrave.private@gmail.com
              <span className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1">
                ↗
              </span>
            </a>
            <a
              href="#top"
              className="rounded-full border border-white/25 px-7 py-3.5 text-base font-medium tracking-tight transition-colors duration-300 hover:bg-white hover:text-black"
            >
              Book a call
            </a>
          </Reveal>
        </div>

        {/* Marquee — only 2 copies needed for seamless infinite loop */}
        <div className="mt-20 border-y border-white/10 py-5 overflow-hidden">
          <div className="animate-marquee flex w-max items-center gap-8 whitespace-nowrap" style={{ willChange: 'transform' }}>
            {Array.from({ length: 2 }).map((_, i) => (
              <span key={i} className="flex items-center gap-8 text-2xl font-semibold tracking-tightest text-neutral-600">
                qrave® tech <span className="text-sm">✦</span> smart menus <span className="text-sm">✦</span> AR previews{' '}
                <span className="text-sm">✦</span> KDS <span className="text-sm">✦</span> analytics{' '}
                <span className="text-sm">✦</span>
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-10 px-6 py-12 md:grid-cols-4 md:px-14">
          <div>
            <p className="text-lg font-semibold tracking-tightest">qrave®</p>
            <p className="mt-2 max-w-[220px] text-sm leading-snug tracking-tight text-neutral-500">
              The all-in-one smart restaurant management platform designed for modern dining.
            </p>
          </div>
          {[
            { h: 'Platform', items: ['How it works', 'Features', 'Pricing', 'Contact'] },
            { h: 'Socials', items: ['Instagram', 'Facebook', 'LinkedIn', 'X'] },
            { h: 'HQ', items: ['Infopark Phase 2', 'Kochi, Kerala', 'qrave.private@gmail.com'] },
          ].map((col) => (
            <div key={col.h}>
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{col.h}</p>
              <ul className="mt-3 space-y-1.5">
                {col.items.map((it) => (
                  <li key={it}>
                    <a
                      href="#top"
                      className="text-sm font-medium tracking-tight text-neutral-300 transition-colors hover:text-white"
                    >
                      {it}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-6 py-6 text-xs tracking-tight text-neutral-500 md:px-14">
          <span>© 2026 qrave® tech. All rights reserved.</span>
        </div>
      </div>
    </footer>
  )
}
