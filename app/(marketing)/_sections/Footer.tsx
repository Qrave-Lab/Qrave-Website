"use client";

import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowRight, ArrowUp, Instagram, Linkedin } from 'lucide-react';
import { SITE_URL } from '@/app/_lib/seo';

/*
 * The footer is also the page's closing call to action.
 * Its one memorable element is a real, scannable QR code: Qrave's core object,
 * pointing at the live demo, so a phone is all it takes to try the product.
 */

const columns = [
  {
    title: 'Products',
    links: [
      { label: 'Smart QR Menu', href: '/feature/qr-ordering' },
      { label: '3D AR Food Preview', href: '/feature/webar' },
      { label: 'Cloud POS Sync', href: '/#features' },
      { label: 'Kitchen Display (KDS)', href: '/feature/kds-integration' },
      { label: 'Real-time Analytics', href: '/feature/analytics' },
    ],
  },
  {
    title: 'Solutions',
    links: [
      { label: 'Fine Dining', href: '/#about' },
      { label: 'Quick Service (QSR)', href: '/#about' },
      { label: 'Cafes & Bakeries', href: '/#about' },
      { label: 'Bars & Lounges', href: '/#about' },
      { label: 'Multi-Chain Brands', href: '/#about' },
    ],
  },
  {
    title: 'Legal & support',
    links: [
      { label: 'Contact Support', href: '/#demo' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Refund & Cancellation', href: '/refunds' },
      { label: 'Cookie Policy', href: '/privacy#cookies' },
      { label: 'FAQ', href: '/#faq' },
    ],
  },
];

const focus =
  'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#fe5c13] rounded-sm';

const linkClass = `text-[15px] text-slate-400 transition-colors hover:text-white ${focus}`;

const socialClass =
  'inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fe5c13]';

const Footer = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#0F1117] text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Closing call to action + QR */}
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8 items-center py-20 lg:py-28">
          <div className="lg:col-span-8">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-[-0.03em] leading-[1.06] text-white text-balance max-w-3xl">
              Ready to modernize your restaurant?
            </h2>
            <p className="mt-6 text-lg text-slate-300 leading-relaxed max-w-[52ch]">
              Join hundreds of restaurants providing a seamless digital experience. Build, brand, and launch in as little as 2 minutes.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <Link
                href="/demo"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#fe5c13] px-6 py-3.5 text-[15px] font-semibold text-slate-950 transition-colors hover:bg-[#ff7433] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Try the demo
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/#features"
                className="inline-flex items-center justify-center rounded-xl border border-slate-600 px-6 py-3.5 text-[15px] font-semibold text-slate-100 transition-colors hover:border-slate-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Explore features
              </Link>
            </div>
          </div>

          <div className="lg:col-span-4 flex lg:justify-end">
            <figure className="flex items-center gap-5 lg:flex-col lg:items-start lg:gap-4">
              <div className="rounded-2xl bg-white p-3.5 shrink-0">
                <QRCodeSVG
                  value={`${SITE_URL}/demo`}
                  size={148}
                  level="M"
                  marginSize={0}
                  fgColor="#0F1117"
                  bgColor="#FFFFFF"
                  title="QR code that opens the Qrave live demo"
                />
              </div>
              <figcaption className="text-[15px] text-slate-300 leading-snug max-w-[18ch]">
                Scan to open the live demo on your phone.
              </figcaption>
            </figure>
          </div>
        </div>

        {/* Brand + links */}
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8 border-t border-slate-800 py-14 lg:py-16">
          <div className="lg:col-span-5">
            <Link href="/" className={`inline-block ${focus}`}>
              <img
                src="/landing/image.png"
                alt="Qrave"
                className="h-8 w-auto object-contain brightness-0 invert"
              />
            </Link>
            <p className="mt-5 text-[15px] text-slate-400 leading-relaxed max-w-[40ch]">
              Next-generation restaurant operating system. Reimagining dining with smart QR menus, 3D AR food previews, and instant POS synchronization.
            </p>
          </div>

          {columns.map((col, i) => (
            <nav
              key={col.title}
              aria-label={col.title}
              className={`lg:col-span-2 ${i === 0 ? 'lg:col-start-7' : ''}`}
            >
              <h3 className="text-[15px] font-semibold text-white">{col.title}</h3>
              <ul className="mt-5 space-y-3.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className={linkClass}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col-reverse gap-6 border-t border-slate-800 py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} Qrave Inc. All rights reserved.
          </p>

          <div className="flex items-center justify-between gap-6 sm:justify-end">
            <div className="flex items-center">
              <a href="#" className={socialClass} aria-label="X (formerly Twitter)">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a href="#" className={socialClass} aria-label="Instagram">
                <Instagram className="h-[18px] w-[18px]" aria-hidden />
              </a>
              <a href="#" className={socialClass} aria-label="LinkedIn">
                <Linkedin className="h-[18px] w-[18px]" aria-hidden />
              </a>
            </div>

            <button
              type="button"
              onClick={scrollToTop}
              className={`group inline-flex items-center gap-1.5 text-sm font-medium text-slate-300 transition-colors hover:text-white ${focus}`}
            >
              Back to top
              <ArrowUp
                className="h-4 w-4 transition-transform group-hover:-translate-y-0.5"
                aria-hidden
              />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
