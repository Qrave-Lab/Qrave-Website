"use client";

import { useState } from 'react';
import { Camera, Monitor, Boxes, BarChart3, Building2, Globe, ArrowRight, Sparkles, Clock, ShieldCheck, TrendingUp, Layers, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

const ADDONS = [
  {
    id: 'virtual-studio',
    title: 'Virtual Studio 3D',
    subtitle: 'Food Photography & 3D AR Modeling',
    description: 'We bring your menu to life. Our team handles professional food photography and photorealistic 3D modeling so your dishes jump off the screen.',
    icon: <Camera className="w-5 h-5" />,
    badge: '3D AR Engine',
    link: '/feature/virtual-studio',
    mockupType: '3d'
  },
  {
    id: 'kds-integration',
    title: 'Kitchen Display System (KDS)',
    subtitle: 'Real-Time Kitchen Order Sync',
    description: 'Ditch noisy ticket printers. Send orders directly to a smart kitchen screen that prioritizes prep times, organizes courses, and alerts chefs instantly.',
    icon: <Monitor className="w-5 h-5" />,
    badge: '200ms Latency',
    link: '/feature/kds-integration',
    mockupType: 'kds'
  },
  {
    id: 'advanced-inventory',
    title: 'Advanced Inventory & Stock',
    subtitle: 'Auto Stock Deduction & Recipes',
    description: 'Automatically hide out-of-stock items from your digital menu in real-time as ingredients are consumed from completed orders.',
    icon: <Boxes className="w-5 h-5" />,
    badge: 'Auto Deduction',
    link: '/feature/advanced-inventory',
    mockupType: 'inventory'
  },
  {
    id: 'chefs-insights',
    title: '"Chef\'s Insights" Analytics Pro',
    subtitle: 'Margin & Profitability Reports',
    description: 'Know what sells and who sells it best. Get deep insights into dish popularity, peak hours, food cost margins, and waiter performance.',
    icon: <BarChart3 className="w-5 h-5" />,
    badge: 'Live Reports',
    link: '/feature/chefs-insights',
    mockupType: 'analytics'
  },
  {
    id: 'multi-location',
    title: 'Multi-Location HQ',
    subtitle: 'Central Chain Management',
    description: 'Control menus, pricing, promotional campaigns, and financial reports for all your restaurant outlets from one single headquarters account.',
    icon: <Building2 className="w-5 h-5" />,
    badge: 'HQ Control',
    link: '/feature/multi-location-management',
    mockupType: 'hq'
  },
  {
    id: 'custom-domain',
    title: 'Custom Subdomain Routing',
    subtitle: 'White-Label Branding',
    description: 'Serve your digital menus natively on your custom subdomain like restaurantname.qravetech.in when customers scan table QR codes.',
    icon: <Globe className="w-5 h-5" />,
    badge: 'DNS Auto-Sync',
    link: '/feature/custom-domains',
    mockupType: 'domain'
  }
];

const AppMarketplace = () => {
  const [activeTab, setActiveTab] = useState(ADDONS[0].id);
  const currentAddon = ADDONS.find((a) => a.id === activeTab) || ADDONS[0];

  return (
    <section id="addons" className="pt-28 pb-24 lg:pt-36 lg:pb-32 bg-[#FAF9F6] text-slate-900 relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/4 left-1/3 w-[600px] h-[300px] bg-orange-400/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Section Header */}
        <div className="text-center mb-16 pt-4">
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-950 tracking-tight mb-6 max-w-4xl mx-auto leading-[1.1]">
            Unlock the Full Power of <br className="hidden md:block" />
            <span className="bg-gradient-to-r from-[#fe5c13] to-amber-600 bg-clip-text text-transparent">
              the Qrave Ecosystem
            </span>
          </h2>
          <p className="text-base sm:text-xl text-slate-600 font-medium max-w-2xl mx-auto leading-relaxed">
            Supercharge your venue operations with modular extensions designed to scale with your business.
          </p>
        </div>

        {/* Open 2-Column Showcase (No Nested Box-in-Box Cards) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Clean Minimalist Tabs List */}
          <div className="lg:col-span-5 space-y-1.5">
            {ADDONS.map((addon) => {
              const isActive = activeTab === addon.id;
              return (
                <button
                  key={addon.id}
                  onClick={() => setActiveTab(addon.id)}
                  className={`w-full text-left px-5 py-4 rounded-2xl transition-all duration-300 flex items-center justify-between gap-3 ${
                    isActive
                      ? 'bg-white shadow-md border-l-4 border-l-[#fe5c13] border-t border-r border-b border-slate-200/80 text-slate-950 scale-[1.01]'
                      : 'hover:bg-slate-100/60 text-slate-600 hover:text-slate-900 border-l-4 border-l-transparent'
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isActive ? 'bg-[#fe5c13] text-white shadow-sm' : 'bg-slate-200/70 text-slate-500'
                      }`}
                    >
                      {addon.icon}
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-sm font-extrabold truncate leading-snug">
                        {addon.title}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium truncate">
                        {addon.subtitle}
                      </p>
                    </div>
                  </div>

                  <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full shrink-0 ${
                    isActive ? 'bg-orange-50 text-[#fe5c13] border border-orange-200' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {addon.badge}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Column: Single High-Fidelity Feature Display Widget */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentAddon.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-10 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.06)] flex flex-col justify-between min-h-[440px]"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-100">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-orange-100/90 text-[#fe5c13] border border-orange-200 flex items-center justify-center">
                        {currentAddon.icon}
                      </div>
                      <div>
                        <h4 className="text-xl font-black text-slate-950 tracking-tight">{currentAddon.title}</h4>
                        <span className="text-xs text-slate-500 font-medium">{currentAddon.subtitle}</span>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Active Module
                    </span>
                  </div>

                  <p className="text-sm sm:text-base text-slate-600 font-medium leading-relaxed mb-8">
                    {currentAddon.description}
                  </p>

                  {/* DYNAMIC LIVE WIDGET PREVIEWS (No emojis) */}
                  <div className="bg-[#FAF9F6] border border-slate-200/80 rounded-2xl p-5 space-y-4">
                    
                    {currentAddon.mockupType === '3d' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-[#fe5c13] flex items-center justify-center">
                              <Sparkles className="w-5 h-5" />
                            </div>
                            <div>
                              <h5 className="text-xs font-extrabold text-slate-900">Truffle Smash Burger 3D</h5>
                              <p className="text-[10px] font-medium text-slate-500">4,200 Polygons • AR QuickLook Enabled</p>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-[#fe5c13] bg-white border border-orange-200 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
                            <Sparkles className="w-3.5 h-3.5" />
                            360° AR View
                          </span>
                        </div>
                        <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-600 font-medium">
                          <span>Appetite Conversion Rate</span>
                          <span className="text-emerald-600 font-extrabold">+34% vs Static Photo</span>
                        </div>
                      </div>
                    )}

                    {currentAddon.mockupType === 'kds' && (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-extrabold text-slate-900">Table #04 Order Queue</span>
                          <span className="text-amber-700 font-mono font-bold flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> 02m 45s Prep Time
                          </span>
                        </div>
                        <div className="text-xs text-slate-700 flex justify-between bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                          <span>2x Smash Burgers, 1x Passion Mocktail</span>
                          <span className="text-emerald-600 font-extrabold">Dispatched to Line ✓</span>
                        </div>
                      </div>
                    )}

                    {currentAddon.mockupType === 'inventory' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                            <div>
                              <h5 className="text-xs font-extrabold text-slate-900">Atlantic Salmon Stock: 0 kg</h5>
                              <p className="text-[10px] text-rose-600 font-bold">Auto-Disabled on QR Menu</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-extrabold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-full shadow-2xs">
                            Auto Sync
                          </span>
                        </div>
                      </div>
                    )}

                    {currentAddon.mockupType === 'analytics' && (
                      <div className="flex justify-between items-center text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold">Today Net Sales</span>
                          <span className="text-2xl font-black text-slate-950">₹94,820</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 justify-end">
                            <TrendingUp className="w-3.5 h-3.5" /> +34% vs Last Week
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">Top Item: Smash Burger</span>
                        </div>
                      </div>
                    )}

                    {currentAddon.mockupType === 'hq' && (
                      <div className="flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <span className="text-slate-900 font-extrabold block">3 Outlets Operational</span>
                          <span className="text-[10px] text-slate-500 font-medium">Mumbai • Bangalore • Delhi</span>
                        </div>
                        <span className="text-xs font-extrabold text-[#fe5c13] bg-white border border-orange-200 px-3 py-1 rounded-full shadow-2xs">
                          Global Menu Pushed
                        </span>
                      </div>
                    )}

                    {currentAddon.mockupType === 'domain' && (
                      <div className="flex items-center justify-between text-xs">
                        <div className="font-mono text-slate-800 flex items-center gap-2 font-semibold">
                          <Globe className="w-3.5 h-3.5 text-[#fe5c13]" />
                          <span>gourmetbistro.qravetech.in</span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-white px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1 shadow-2xs">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          SSL Verified
                        </span>
                      </div>
                    )}

                  </div>
                </div>

                {/* Card Footer Link */}
                <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    href={currentAddon.link}
                    className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#fe5c13] hover:text-[#fe5c13]/80 transition-colors group/link"
                  >
                    <span>Explore {currentAddon.title} Module</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover/link:translate-x-1" />
                  </Link>
                </div>

              </motion.div>
            </AnimatePresence>
          </div>

        </div>

      </div>
    </section>
  );
};

export default AppMarketplace;