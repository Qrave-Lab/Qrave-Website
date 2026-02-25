"use client";

import { useState, useEffect, useRef } from 'react';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const rafRef = useRef<number>(0);

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
        const id = hash.replace('#', '');
        const element = document.getElementById(id);
        if (element) {
          setTimeout(() => {
            element.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
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
    <nav
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
            <Link href="/" className="flex items-center gap-1">
              <img src="/landing/image.png" alt="Qrave Logo" className="w-[4.5rem] h-[4.5rem] object-contain rounded-sm translate-y-[2px]" />
              <span className="text-[20px] font-black text-[#1c1d20] tracking-tight">
                QRAVE
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex flex-1 absolute left-1/2 -translate-x-1/2 justify-center">
            <div className="flex items-center space-x-8">
              <Link
                href="/#features"
                className="text-gray-500 hover:text-[#FFC529] transition-all duration-200 font-semibold text-[13px] tracking-wide px-3 py-1.5 rounded-full hover:bg-gray-100"
              >
                Features
              </Link>

              <Link
                href="/#pricing"
                className="text-gray-500 hover:text-[#FFC529] transition-all duration-200 font-semibold text-[13px] tracking-wide px-3 py-1.5 rounded-full hover:bg-gray-100"
              >
                Pricing
              </Link>

              <Link
                href="/#about"
                className="text-gray-500 hover:text-[#FFC529] transition-all duration-200 font-semibold text-[13px] tracking-wide px-3 py-1.5 rounded-full hover:bg-gray-100"
              >
                About Us
              </Link>
              <Link
                href="/#demo"
                className="text-gray-500 hover:text-[#FFC529] transition-all duration-200 font-semibold text-[13px] tracking-wide px-3 py-1.5 rounded-full hover:bg-gray-100"
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
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </Link>
              <Link
                href="/#pricing"
                className="block px-6 py-3 text-gray-600 hover:text-[#FFC529] hover:bg-gray-50 font-medium transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </Link>
              <Link
                href="/#about"
                className="block px-6 py-3 text-gray-600 hover:text-[#FFC529] hover:bg-gray-50 font-medium transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                About Us
              </Link>
              <Link
                href="/#demo"
                className="block px-6 py-3 text-gray-600 hover:text-[#FFC529] hover:bg-gray-50 font-medium transition-colors"
                onClick={() => setMobileMenuOpen(false)}
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
