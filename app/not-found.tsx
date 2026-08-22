"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 flex flex-col items-center justify-center relative overflow-hidden px-4 py-16">
      {/* Subtle background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-orange-400/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-xl mx-auto text-center relative z-10 flex flex-col items-center">
        
        {/* Minimal 404 Display */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-7xl sm:text-9xl lg:text-[10rem] font-black text-slate-950 tracking-tighter leading-none mb-4 select-none"
        >
          404
        </motion.h1>

        {/* Clean Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight mb-3"
        >
          Page Not Found
        </motion.h2>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-base sm:text-lg text-slate-600 font-medium max-w-md mx-auto leading-relaxed mb-10"
        >
          The page you are looking for doesn't exist or has been moved.
        </motion.p>

        {/* Single Clean CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-[#fe5c13] via-[#ff6a26] to-[#fe5c13] text-white px-8 py-4 rounded-full font-bold text-sm tracking-wide shadow-xl shadow-[#fe5c13]/25 hover:shadow-2xl hover:scale-[1.03] active:scale-[0.98] transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
        </motion.div>

      </div>
    </div>
  );
}
