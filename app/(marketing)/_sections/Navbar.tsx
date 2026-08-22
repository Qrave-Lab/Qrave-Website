"use client";

import { useState, useEffect, useRef, type MouseEvent } from 'react';
import { Menu, X, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_ITEMS = [
  { name: 'Features', href: '#features' },
  { name: 'Ecosystem', href: '#addons' },
  { name: 'Concepts', href: '#concepts' },
  { name: 'Contact Us', href: '#demo' },
];

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const rafRef = useRef<number>(0);

  const scrollToHash = (hash: string) => {
    const id = hash.replace('#', '').trim();
    if (!id) return;

    const element = document.getElementById(id);
    if (!element) return;

    const nav = document.querySelector('[data-landing-nav="true"]') as HTMLElement | null;
    const navHeight = nav?.offsetHeight ?? 80;
    const top = element.getBoundingClientRect().top + window.scrollY - navHeight - 16;

    window.scrollTo({ top, behavior: 'smooth' });
  };

  const handleSectionLinkClick = (e: MouseEvent<HTMLAnchorElement>, hash: string) => {
    if (window.location.pathname !== '/') return;

    e.preventDefault();
    setMobileMenuOpen(false);
    window.history.replaceState(null, '', hash);
    scrollToHash(hash);
  };

  useEffect(() => {
    const handleScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        setScrollY(window.scrollY);
        rafRef.current = 0;
      });
    };

    const handleHashScroll = () => {
      const hash = window.location.hash;
      if (hash) {
        scrollToHash(hash);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('hashchange', handleHashScroll);
    handleHashScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('hashchange', handleHashScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const isScrolled = scrollY > 20;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 pointer-events-none flex justify-center">
      <nav
        data-landing-nav="true"
        className={`pointer-events-auto transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isScrolled
            ? 'top-4 mt-3 w-[92%] max-w-5xl rounded-full border border-slate-200/80 bg-white/85 backdrop-blur-xl shadow-[0_12px_32px_-8px_rgba(0,0,0,0.09),0_4px_12px_-2px_rgba(0,0,0,0.04)] px-5 py-2'
            : 'top-0 mt-0 w-full max-w-7xl rounded-none border-b border-transparent bg-transparent px-6 lg:px-8 py-4'
        }`}
      >
        <div className="flex items-center justify-between">
          
          {/* Brand Logo */}
          <div className="flex items-center">
            <Link href="/" className="group flex items-center gap-2">
              <img
                src="/landing/image.png"
                alt="Qrave Logo"
                className={`w-auto object-contain transition-all duration-300 ${
                  isScrolled ? 'h-7 md:h-8' : 'h-8 md:h-9'
                }`}
              />
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center justify-center">
            <div
              className="flex items-center gap-2"
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {NAV_ITEMS.map((item, idx) => (
                <Link
                  key={item.name}
                  href={`/${item.href}`}
                  onClick={(e) => handleSectionLinkClick(e, item.href)}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  className="relative px-4 py-1.5 text-xs font-semibold tracking-wide text-slate-600 hover:text-slate-950 transition-colors duration-200"
                >
                  {hoveredIndex === idx && (
                    <motion.div
                      layoutId="navbar-hover-pill"
                      className="absolute inset-0 bg-white rounded-full shadow-sm border border-slate-200/60"
                      initial={false}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{item.name}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-semibold text-slate-600 hover:text-slate-950 px-4 py-2 rounded-full hover:bg-slate-100/80 transition-all duration-200"
            >
              Sign In
            </Link>

            <Link
              href="/onboarding"
              className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-[#fe5c13] via-[#ff6a26] to-[#fe5c13] px-5 py-2 text-xs font-bold text-white shadow-md shadow-[#fe5c13]/25 transition-all duration-300 hover:scale-[1.03] hover:shadow-lg hover:shadow-[#fe5c13]/35 active:scale-[0.98]"
            >
              <span className="relative z-10">Get Started</span>
              <ArrowRight className="relative z-10 w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
            </Link>
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden relative p-2 text-slate-700 hover:text-slate-950 bg-slate-100/80 hover:bg-slate-200/80 rounded-full transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Navigation Dropdown */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="lg:hidden absolute top-full left-0 right-0 mt-3 p-4 bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-3xl shadow-2xl space-y-3"
            >
              <div className="flex flex-col space-y-1">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.name}
                    href={`/${item.href}`}
                    onClick={(e) => handleSectionLinkClick(e, item.href)}
                    className="px-4 py-3 text-sm font-semibold text-slate-700 hover:text-[#fe5c13] hover:bg-orange-50/60 rounded-2xl transition-colors"
                  >
                    {item.name}
                  </Link>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-2xl transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/onboarding"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold text-white bg-gradient-to-r from-[#fe5c13] to-[#ff6a26] rounded-2xl shadow-md shadow-[#fe5c13]/25 active:scale-[0.98] transition-all"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
};

export default Navbar;
