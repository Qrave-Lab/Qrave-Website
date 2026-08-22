"use client";

import Link from 'next/link';
import { ArrowUp, Twitter, Instagram, Linkedin, Github } from 'lucide-react';

const Footer = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-800/80 pt-16 pb-12 relative overflow-hidden">
      {/* Ambient background light rays */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px bg-gradient-to-r from-transparent via-[#fe5c13]/50 to-transparent" />
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#fe5c13]/10 blur-[150px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Multi-Column Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-12 pb-14 border-b border-slate-800/80">

          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="inline-block">
              <img
                src="/landing/image.png"
                alt="Qrave Logo"
                className="h-8 w-auto object-contain brightness-0 invert"
              />
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm font-medium">
              Next-generation restaurant operating system. Reimagining dining with smart QR menus, 3D AR food previews, and instant POS synchronization.
            </p>

            {/* Live Operational Status */}
            <div className="pt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-semibold text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>All Systems Operational</span>
              </div>
            </div>
          </div>

          {/* Column 1: Products */}
          <div>
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-widest mb-4">Products</h4>
            <ul className="space-y-3 text-xs font-medium">
              <li>
                <Link href="/#features" className="hover:text-[#fe5c13] hover:translate-x-1 transition-all inline-block">Smart QR Menu</Link>
              </li>
              <li>
                <Link href="/#features" className="hover:text-[#fe5c13] hover:translate-x-1 transition-all inline-block">3D AR Food Preview</Link>
              </li>
              <li>
                <Link href="/#features" className="hover:text-[#fe5c13] hover:translate-x-1 transition-all inline-block">Cloud POS Sync</Link>
              </li>
              <li>
                <Link href="/#features" className="hover:text-[#fe5c13] hover:translate-x-1 transition-all inline-block">Kitchen Display (KDS)</Link>
              </li>
              <li>
                <Link href="/#features" className="hover:text-[#fe5c13] hover:translate-x-1 transition-all inline-block">Real-time Analytics</Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Solutions */}
          <div>
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-widest mb-4">Solutions</h4>
            <ul className="space-y-3 text-xs font-medium">
              <li>
                <Link href="/#about" className="hover:text-[#fe5c13] hover:translate-x-1 transition-all inline-block">Fine Dining</Link>
              </li>
              <li>
                <Link href="/#about" className="hover:text-[#fe5c13] hover:translate-x-1 transition-all inline-block">Quick Service (QSR)</Link>
              </li>
              <li>
                <Link href="/#about" className="hover:text-[#fe5c13] hover:translate-x-1 transition-all inline-block">Cafes & Bakeries</Link>
              </li>
              <li>
                <Link href="/#about" className="hover:text-[#fe5c13] hover:translate-x-1 transition-all inline-block">Bars & Lounges</Link>
              </li>
              <li>
                <Link href="/#about" className="hover:text-[#fe5c13] hover:translate-x-1 transition-all inline-block">Multi-Chain Brands</Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Legal & Support */}
          <div>
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-widest mb-4">Legal & Support</h4>
            <ul className="space-y-3 text-xs font-medium">
              <li>
                <Link href="/#demo" className="hover:text-[#fe5c13] hover:translate-x-1 transition-all inline-block">Contact Support</Link>
              </li>
              <li>
                <Link href="/#privacy" className="hover:text-[#fe5c13] hover:translate-x-1 transition-all inline-block">Privacy Policy</Link>
              </li>
              <li>
                <Link href="/#terms" className="hover:text-[#fe5c13] hover:translate-x-1 transition-all inline-block">Terms of Service</Link>
              </li>
              <li>
                <Link href="/#cookies" className="hover:text-[#fe5c13] hover:translate-x-1 transition-all inline-block">Cookie Policy</Link>
              </li>
              <li>
                <Link href="/#faq" className="hover:text-[#fe5c13] hover:translate-x-1 transition-all inline-block">FAQ</Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Sub-Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium">
          <p className="text-slate-500 text-center sm:text-left">
            © {new Date().getFullYear()} Qrave Inc. All rights reserved.
          </p>

          <div className="flex items-center gap-6">
            {/* Social Icon Pills */}
            <div className="flex items-center gap-3">
              <a
                href="#"
                className="w-9 h-9 rounded-full border border-slate-800 bg-slate-900 flex items-center justify-center text-slate-400 hover:border-[#fe5c13] hover:text-[#fe5c13] hover:scale-105 transition-all"
                aria-label="Twitter"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="w-9 h-9 rounded-full border border-slate-800 bg-slate-900 flex items-center justify-center text-slate-400 hover:border-[#fe5c13] hover:text-[#fe5c13] hover:scale-105 transition-all"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="w-9 h-9 rounded-full border border-slate-800 bg-slate-900 flex items-center justify-center text-slate-400 hover:border-[#fe5c13] hover:text-[#fe5c13] hover:scale-105 transition-all"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="w-9 h-9 rounded-full border border-slate-800 bg-slate-900 flex items-center justify-center text-slate-400 hover:border-[#fe5c13] hover:text-[#fe5c13] hover:scale-105 transition-all"
                aria-label="GitHub"
              >
                <Github className="w-4 h-4" />
              </a>
            </div>

            {/* Back to top button */}
            <button
              onClick={scrollToTop}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 transition-all shadow-sm active:scale-95"
              aria-label="Back to Top"
            >
              <span>Back to top</span>
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
