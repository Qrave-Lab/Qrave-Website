"use client";

import { useState, useEffect, useRef, type MouseEvent } from 'react';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const rafRef = useRef<number>(0);
  const scrollAnimRef = useRef<number>(0);

  const animateScrollTo = (targetY: number, durationMs = 900) => {
    const startY = window.scrollY;
    const distance = targetY - startY;
    const startTime = performance.now();

    const easeInOutCubic = (t: number) => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    if (scrollAnimRef.current) {
      cancelAnimationFrame(scrollAnimRef.current);
      scrollAnimRef.current = 0;
    }

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = easeInOutCubic(progress);
      window.scrollTo(0, Math.round(startY + distance * eased));

      if (progress < 1) {
        scrollAnimRef.current = requestAnimationFrame(step);
      } else {
        scrollAnimRef.current = 0;
      }
    };

    scrollAnimRef.current = requestAnimationFrame(step);
  };

  const scrollToHash = (hash: string) => {
    const id = hash.replace('#', '').trim();
    if (!id) return;

    const element = document.getElementById(id);
    if (!element) return;

    const nav = document.querySelector('[data-landing-nav="true"]') as HTMLElement | null;
    const navHeight = nav?.offsetHeight ?? 88;
    const top = element.getBoundingClientRect().top + window.scrollY - navHeight - 18;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion) {
      window.scrollTo({ top, behavior: 'auto' });
      return;
    }

    animateScrollTo(top, 950);
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
      // Throttle scroll updates with requestAnimationFrame
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        setScrollY(window.scrollY);
        rafRef.current = 0;
      });
    };

    const handleHashScroll = () => {
      const hash = window.location.hash;
      if (hash) {
        setTimeout(() => {
          scrollToHash(hash);
        }, 80);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('hashchange', handleHashScroll);
    handleHashScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('hashchange', handleHashScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (scrollAnimRef.current) cancelAnimationFrame(scrollAnimRef.current);
    };
  }, []);

  const isScrolled = scrollY > 20;

  return (
    <nav
      data-landing-nav="true"
      className={`fixed z-50 transition-all duration-300 ease-out will-change-transform left-1/2 -translate-x-1/2 ${isScrolled
        ? 'top-4 w-[95%] max-w-[1100px] rounded-[2rem] border bg-white/95 backdrop-blur-md border-gray-100 shadow-md py-0'
        : 'top-0 w-full max-w-7xl rounded-none border-transparent bg-transparent shadow-none py-2'
        }`}
    >
      <div className="px-6 lg:px-8 w-full max-w-7xl mx-auto">
        <div className={`flex items-center justify-between transition-all duration-500 ease-in-out ${isScrolled ? 'h-14 lg:h-[68px]' : 'h-20 lg:h-[88px]'
          }`}>
          {/* Logo */}
          <div className="flex w-[200px] justify-start">
            <Link href="/" className="flex items-center">
              <img src="/landing/image.png" alt="Qrave Logo" className="h-8 md:h-9 w-auto object-contain translate-y-[1px]" />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex flex-1 absolute left-1/2 -translate-x-1/2 justify-center">
            <div className="flex items-center space-x-8">
              <Link
                href="/#features"
                className="text-gray-500 hover:text-[#FFC529] transition-all duration-200 font-semibold text-[13px] tracking-wide px-3 py-1.5 rounded-full hover:bg-gray-100"
                onClick={(e) => handleSectionLinkClick(e, '#features')}
              >
                Features
              </Link>

              <Link
                href="/#pricing"
                className="text-gray-500 hover:text-[#FFC529] transition-all duration-200 font-semibold text-[13px] tracking-wide px-3 py-1.5 rounded-full hover:bg-gray-100"
                onClick={(e) => handleSectionLinkClick(e, '#pricing')}
              >
                Pricing
              </Link>

              <Link
                href="/#about"
                className="text-gray-500 hover:text-[#FFC529] transition-all duration-200 font-semibold text-[13px] tracking-wide px-3 py-1.5 rounded-full hover:bg-gray-100"
                onClick={(e) => handleSectionLinkClick(e, '#about')}
              >
                About Us
              </Link>
              <Link
                href="/#demo"
                className="text-gray-500 hover:text-[#FFC529] transition-all duration-200 font-semibold text-[13px] tracking-wide px-3 py-1.5 rounded-full hover:bg-gray-100"
                onClick={(e) => handleSectionLinkClick(e, '#demo')}
              >
                Contact Us
              </Link>
            </div>
          </div>

          {/* CTA Button and Additional Actions */}
          <div className="hidden lg:flex w-[200px] justify-end items-center">
            <div className="h-4 w-px bg-gray-200 mr-2"></div>

            <Link href="/login" className="text-gray-500 hover:text-gray-900 font-semibold text-[13px] transition-all duration-200 mr-2 px-3 py-1.5 rounded-full hover:bg-gray-100">
              Sign In
            </Link>
            <Link href="/onboarding" className="bg-[#FFC529] hover:bg-[#F0B820] text-[#1c1d20] px-5 py-[0.4rem] rounded-full font-bold text-[13px] transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap">
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 text-gray-600 hover:text-gray-900 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-gray-100 py-4 animate-in slide-in-from-top duration-200 mt-2 rounded-b-xl shadow-lg">
            <div className="space-y-2">
              <Link
                href="/#features"
                className="block px-6 py-3 text-gray-600 hover:text-[#FFC529] hover:bg-gray-50 font-medium transition-colors"
                onClick={(e) => handleSectionLinkClick(e, '#features')}
              >
                Features
              </Link>
              <Link
                href="/#pricing"
                className="block px-6 py-3 text-gray-600 hover:text-[#FFC529] hover:bg-gray-50 font-medium transition-colors"
                onClick={(e) => handleSectionLinkClick(e, '#pricing')}
              >
                Pricing
              </Link>
              <Link
                href="/#about"
                className="block px-6 py-3 text-gray-600 hover:text-[#FFC529] hover:bg-gray-50 font-medium transition-colors"
                onClick={(e) => handleSectionLinkClick(e, '#about')}
              >
                About Us
              </Link>
              <Link
                href="/#demo"
                className="block px-6 py-3 text-gray-600 hover:text-[#FFC529] hover:bg-gray-50 font-medium transition-colors"
                onClick={(e) => handleSectionLinkClick(e, '#demo')}
              >
                Contact Us
              </Link>

              <div className="px-4 pt-4 border-t border-gray-100 flex flex-col space-y-3">
                <Link href="/login" className="block text-center text-gray-600 hover:text-gray-900 font-medium py-2 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  Sign In
                </Link>
                <Link href="/onboarding" className="bg-[#FFC529] hover:bg-[#F0B820] text-[#1F2127] px-5 py-2.5 rounded-full font-bold text-center transition-colors shadow-sm" onClick={() => setMobileMenuOpen(false)}>
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
