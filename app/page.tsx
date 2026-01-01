"use client";

import React, { useState, useEffect } from "react";
import { 
  ArrowRight, 
  CheckCircle2, 
  ChefHat, 
  Smartphone, 
  Menu, 
  X,
  Zap,
  BarChart3,
  Layers,
  Box,
  ScanLine,
  Clock,
  Users,
  Glasses,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";


export default function LandingPage() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const companies = [
    "The Burger Joint", "Saffron Lounge", "Cafe Meridian", "Urban Eatery", 
    "Pizza Haven", "Sushi Express", "The Golden Wok", "Bistro 99", 
    "Coffee & Co.", "Green Leaf Salad Bar"
  ];

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 overflow-x-hidden">
      <style jsx global>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-scroll {
          animation: scroll 30s linear infinite;
        }
        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
      
      <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
           style={{
             backgroundColor: scrollY > 20 ? 'rgba(255, 255, 255, 0.95)' : 'transparent',
             backdropFilter: scrollY > 20 ? 'blur(12px)' : 'none',
             borderBottom: scrollY > 20 ? '1px solid rgba(0, 0, 0, 0.05)' : 'none',
           }}>
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">Q</div>
            <span className="text-xl font-bold tracking-tight text-gray-900">Qrave.</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#features" className="hover:text-black transition-colors">Features</a>
            <a href="#ar-experience" className="hover:text-black transition-colors">AR Experience</a>
            <a href="#pricing" className="hover:text-black transition-colors">Pricing</a>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Link href="/login" className="text-sm font-bold text-gray-900 hover:text-gray-600 transition-colors">
              Log in
            </Link>
            <button 
              onClick={() => router.push("/onboarding")}
              className="bg-gray-900 text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-gray-800 transition-all"
            >
              Get Started
            </button>
          </div>

          <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden absolute top-20 left-0 w-full bg-white border-b border-gray-100 p-6 flex flex-col gap-4 shadow-xl animate-fade-in">
            <a href="#features" className="text-lg font-medium">Features</a>
            <a href="#ar-experience" className="text-lg font-medium">AR Experience</a>
            <a href="#pricing" className="text-lg font-medium">Pricing</a>
            <Link href="/login" className="text-lg font-medium">Log in</Link>
            <button 
              onClick={() => router.push("/onboarding")}
              className="bg-gray-900 text-white px-5 py-3 rounded-xl font-bold w-full"
            >
              Get Started
            </button>
          </div>
        )}
      </nav>

      <section className="pt-40 pb-20 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[600px] h-[600px] bg-emerald-50 rounded-full blur-3xl pointer-events-none opacity-60" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-purple-50 rounded-full blur-3xl pointer-events-none opacity-60" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-4 py-1.5 mb-8">
            <Glasses className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">New: 3D Menu Visualization</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-[1.1] animate-fade-in text-gray-900">
            See the food before <br className="hidden md:block" />
            <span className="text-emerald-600">you order.</span>
          </h1>
          
          <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-in [animation-delay:0.2s]">
            The first restaurant OS with built-in Augmented Reality. Let your guests project 3D dishes onto their table, browse immersive menus, and order instantly.
          </p>
          
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 animate-fade-in [animation-delay:0.4s]">
            <button 
              onClick={() => router.push("/onboarding")}
              className="w-full md:w-auto bg-emerald-600 text-white px-8 py-4 rounded-full text-lg font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100"
            >
              Try AR Demo
              <ArrowRight className="w-5 h-5" />
            </button>
            <button className="w-full md:w-auto bg-white text-gray-900 border border-gray-200 px-8 py-4 rounded-full text-lg font-bold hover:bg-gray-50 transition-all">
              Watch Video
            </button>
          </div>

          <div className="mt-10 flex items-center justify-center gap-8 text-sm text-gray-500 font-medium animate-fade-in [animation-delay:0.6s]">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 
              Works on all smartphones
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 
              No app download needed
            </span>
          </div>
        </div>
      </section>

      <section className="py-12 bg-gray-50 border-y border-gray-100 overflow-hidden">
        <p className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest mb-8">Powering immersive dining at</p>
        
        <div className="relative w-full">
          <div className="flex w-max animate-scroll hover:pause">
            {companies.map((name, i) => (
              <div key={i} className="mx-8 md:mx-12">
                <span className="text-2xl font-black text-gray-300 whitespace-nowrap">{name}</span>
              </div>
            ))}
            {companies.map((name, i) => (
              <div key={`dup-${i}`} className="mx-8 md:mx-12">
                <span className="text-2xl font-black text-gray-300 whitespace-nowrap">{name}</span>
              </div>
            ))}
          </div>
          
          <div className="absolute top-0 left-0 w-32 h-full bg-gradient-to-r from-gray-50 to-transparent pointer-events-none" />
          <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-gray-50 to-transparent pointer-events-none" />
        </div>
      </section>

      <section id="ar-experience" className="py-24 bg-black text-white overflow-hidden relative">
         <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.15),transparent_60%)]" />
         
         <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="flex flex-col md:flex-row items-center gap-16">
               <div className="flex-1 space-y-8">
                  <div className="inline-block bg-emerald-900/30 border border-emerald-500/30 px-4 py-1 rounded-full text-emerald-400 text-sm font-bold tracking-wide">
                     IMMERSIVE DINING
                  </div>
                  <h2 className="text-4xl md:text-6xl font-black leading-tight">
                     What you see is <br />
                     <span className="text-emerald-500">what you eat.</span>
                  </h2>
                  <p className="text-lg text-gray-400 leading-relaxed">
                     Text menus are outdated. With Qrave, guests scan a QR code to project photorealistic 3D models of your dishes right onto their table plate.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                     <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
                        <Box className="w-8 h-8 text-emerald-500 mb-4" />
                        <h4 className="font-bold text-lg mb-2">3D Asset Library</h4>
                        <p className="text-sm text-gray-400">We convert your menu photos into 3D models automatically.</p>
                     </div>
                     <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
                        <ScanLine className="w-8 h-8 text-purple-500 mb-4" />
                        <h4 className="font-bold text-lg mb-2">Instant Scale</h4>
                        <p className="text-sm text-gray-400">Customers see exact portion sizes in true-to-life scale.</p>
                     </div>
                  </div>
               </div>
               
               <div className="flex-1 relative w-full h-[600px] flex items-center justify-center">
                  <div className="relative z-10 w-64 h-[500px] bg-gray-900 rounded-[3rem] border-4 border-gray-800 shadow-2xl overflow-hidden animate-float">
                     <div className="absolute top-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1974&auto=format&fit=crop')] bg-cover bg-center opacity-40"></div>
                     
                     <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="w-40 h-40 bg-transparent border-2 border-emerald-500 rounded-lg relative animate-pulse flex items-center justify-center">
                           <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-emerald-500"></div>
                           <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-emerald-500"></div>
                           <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-emerald-500"></div>
                           <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-emerald-500"></div>
                           <div className="text-emerald-500 text-xs font-bold tracking-widest uppercase">Scanning</div>
                        </div>
                        <div className="mt-8 bg-black/80 backdrop-blur-md p-4 rounded-2xl border border-gray-700 w-48 text-center transform translate-y-12">
                           <div className="font-bold text-white">Wagyu Burger</div>
                           <div className="text-emerald-400 font-bold">₹850</div>
                           <button className="mt-3 w-full bg-emerald-600 text-white text-xs py-2 rounded-lg font-bold">Add to Order</button>
                        </div>
                     </div>
                  </div>
                  
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-gray-800 rounded-full opacity-30 animate-[spin_10s_linear_infinite]" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] border border-gray-800 rounded-full opacity-20 animate-[spin_15s_linear_infinite_reverse]" />
               </div>
            </div>
         </div>
      </section>

      <section id="features" className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-4xl font-black tracking-tight mb-4 text-gray-900">
              Complete Restaurant OS.
            </h2>
            <p className="text-lg text-gray-500">Beyond AR, we handle the boring stuff too. Payments, inventory, and KDS.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={Box}
              title="AR Menus"
              desc="Reduce food returns by 40% when customers can see the exact dish before ordering."
            />
            <FeatureCard 
              icon={Smartphone}
              title="QR Ordering"
              desc="Customers scan, visualize, and pay at the table. Increase table turnover by 20%."
            />
            <FeatureCard 
              icon={ChefHat}
              title="Smart KDS"
              desc="Orders fly directly to the kitchen. No printed tickets, no lost orders, no shouting."
            />
            <FeatureCard 
              icon={BarChart3}
              title="Real-time Analytics"
              desc="Know your bestsellers, peak hours, and staff performance instantly."
            />
            <FeatureCard 
              icon={Layers}
              title="Inventory Control"
              desc="Track ingredients down to the gram. Get low-stock alerts before you run out."
            />
            <FeatureCard 
              icon={ShieldCheck}
              title="Role Management"
              desc="Granular access controls for owners, managers, chefs, and wait staff."
            />
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black tracking-tight mb-4 text-gray-900">Deploy AR in 3 steps.</h2>
            <p className="text-lg text-gray-500">No expensive hardware headsets required.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <StepCard 
              number="01"
              icon={Smartphone}
              title="Upload Photos"
              desc="Upload standard photos of your dishes. Our AI engine converts them into 3D AR models."
            />
            <StepCard 
              number="02"
              icon={ScanLine}
              title="Generate QR"
              desc="Print your unique QR codes for tables. We generate the AR trigger codes automatically."
            />
            <StepCard 
              number="03"
              icon={Users}
              title="Guests Scan"
              desc="Diners use their own phone cameras to view food on the table and place orders instantly."
            />
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1 space-y-8">
             <h2 className="text-4xl font-black tracking-tight leading-tight text-gray-900">
               Boost appetite with <br />
               <span className="text-gray-400">visual persuasion.</span>
             </h2>
             <p className="text-lg text-gray-500">
               Restaurants using Qrave AR menus see a <b className="text-emerald-600">35% increase</b> in dessert and appetizer orders. Visuals sell better than text.
             </p>
             
             <ul className="space-y-4">
                <ListItem text="Photorealistic food rendering" />
                <ListItem text="Interactive 360° view of dishes" />
                <ListItem text="Upsell suggestions in AR" />
                <ListItem text="Social media shareable moments" />
             </ul>
          </div>
          
          <div className="flex-1 w-full bg-gray-100 rounded-3xl h-[400px] relative flex items-center justify-center border border-gray-200 overflow-hidden">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(16,185,129,0.1),transparent_70%)]" />
             <div className="w-64 bg-white rounded-xl shadow-xl p-6 relative z-10">
                <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                   <div className="font-bold text-lg text-gray-900">Order #882</div>
                   <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold">AR ORDER</div>
                </div>
                <div className="space-y-3 mb-6">
                   <div className="flex justify-between text-sm text-gray-600"><span>1x Lava Cake (3D)</span><span className="font-bold">₹340</span></div>
                   <div className="flex justify-between text-sm text-gray-600"><span>2x Mojito</span><span className="font-bold">₹480</span></div>
                </div>
                <div className="mt-auto border-t-2 border-dashed border-gray-200 pt-4 flex justify-between font-black text-xl text-gray-900">
                   <span>Total</span>
                   <span>₹820</span>
                </div>
             </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 text-center">
            <StatCard number="40%" label="Fewer Returns" />
            <StatCard number="35%" label="Higher Ticket Size" />
            <StatCard number="2M+" label="AR Views" />
            <StatCard number="12s" label="Avg Load Time" />
          </div>
        </div>
      </section>

      <section id="pricing" className="py-24 bg-white text-gray-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4">Pricing that scales.</h2>
            <p className="text-gray-500 text-lg">Start with basic ordering, upgrade for the full AR suite.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            
            <div className="bg-white rounded-3xl p-8 border border-gray-200 hover:border-gray-300 transition-all">
               <h3 className="font-bold text-gray-500 mb-2">Essential</h3>
               <div className="text-5xl font-black mb-2">₹0<span className="text-lg text-gray-400 font-medium">/mo</span></div>
               <p className="text-sm text-gray-500 mb-8">Basic QR ordering without 3D models.</p>
               <button className="w-full bg-gray-100 hover:bg-gray-200 py-3 rounded-xl font-bold mb-8 transition-all text-gray-900">Start Free</button>
               <div className="space-y-3 text-sm text-gray-600">
                 <PricingCheck text="Digital Menu" />
                 <PricingCheck text="QR Ordering" />
                 <PricingCheck text="No AR Features" />
               </div>
            </div>

            <div className="bg-gray-900 rounded-3xl p-8 text-white relative transform md:-translate-y-4 shadow-2xl">
               <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-sm">AR ENABLED</div>
               <h3 className="font-bold text-gray-400 mb-2">Immersive</h3>
               <div className="text-5xl font-black mb-2">₹1999<span className="text-lg text-gray-500 font-medium">/mo</span></div>
               <p className="text-sm text-gray-400 mb-8">Full 3D menu capabilities and AI modeling.</p>
               <button className="w-full bg-emerald-600 hover:bg-emerald-500 py-3 rounded-xl font-bold mb-8 transition-all text-white">Get Started</button>
               <div className="space-y-3 text-sm font-medium text-gray-300">
                 <PricingCheck text="50 AR Dish Models/mo" />
                 <PricingCheck text="3D Viewer Access" />
                 <PricingCheck text="Inventory Management" />
                 <PricingCheck text="KDS Integration" />
                 <PricingCheck text="Priority Support" />
               </div>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-gray-200 hover:border-gray-300 transition-all">
               <h3 className="font-bold text-gray-500 mb-2">Chain</h3>
               <div className="text-5xl font-black mb-2">Custom</div>
               <p className="text-sm text-gray-500 mb-8">For franchises needing custom 3D assets.</p>
               <button className="w-full bg-gray-100 hover:bg-gray-200 py-3 rounded-xl font-bold mb-8 transition-all text-gray-900">Contact Sales</button>
               <div className="space-y-3 text-sm text-gray-600">
                 <PricingCheck text="Unlimited AR Models" />
                 <PricingCheck text="Custom Brand Shaders" />
                 <PricingCheck text="Dedicated 3D Artist" />
                 <PricingCheck text="API Access" />
               </div>
            </div>

          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-gray-50 border-t border-gray-100">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-black mb-6 text-gray-900">Ready to go 3D?</h2>
          <p className="text-xl mb-10 text-gray-500">Join the restaurant revolution. Give your guests an experience they'll share on Instagram.</p>
          <button 
            onClick={() => router.push("/onboarding")}
            className="bg-emerald-600 text-white px-10 py-5 rounded-full text-lg font-bold hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-100 transition-all inline-flex items-center gap-3"
          >
            Create AR Menu
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      <footer className="bg-white border-t border-gray-100 py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center text-white font-bold text-lg">Q</div>
                <span className="font-bold text-xl text-gray-900">Qrave.</span>
              </div>
              <p className="text-gray-500 text-sm">The world's first AR restaurant operating system.</p>
            </div>
            
            <div>
              <h4 className="font-bold mb-4 text-gray-900">Product</h4>
              <div className="space-y-2 text-sm text-gray-500">
                <a href="#" className="block hover:text-emerald-600 transition-colors">AR Features</a>
                <a href="#" className="block hover:text-emerald-600 transition-colors">Pricing</a>
                <a href="#" className="block hover:text-emerald-600 transition-colors">Showcase</a>
              </div>
            </div>

            <div>
              <h4 className="font-bold mb-4 text-gray-900">Company</h4>
              <div className="space-y-2 text-sm text-gray-500">
                <a href="#" className="block hover:text-emerald-600 transition-colors">About</a>
                <a href="#" className="block hover:text-emerald-600 transition-colors">Blog</a>
                <a href="#" className="block hover:text-emerald-600 transition-colors">Careers</a>
              </div>
            </div>

            <div>
              <h4 className="font-bold mb-4 text-gray-900">Legal</h4>
              <div className="space-y-2 text-sm text-gray-500">
                <a href="#" className="block hover:text-emerald-600 transition-colors">Terms</a>
                <a href="#" className="block hover:text-emerald-600 transition-colors">Privacy</a>
                <a href="#" className="block hover:text-emerald-600 transition-colors">Security</a>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-gray-400">
              © 2025 Qrave Technologies Inc. All rights reserved.
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }: any) {
  return (
    <div className="bg-white p-8 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300">
      <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center mb-5 text-gray-900">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="font-bold text-xl mb-3 text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
    </div>
  );
}

function StepCard({ number, icon: Icon, title, desc }: any) {
  return (
    <div className="relative group">
      <div className="bg-white p-8 rounded-2xl border border-gray-200 transition-all hover:shadow-lg">
        <div className="text-6xl font-black text-gray-100 mb-4">{number}</div>
        <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center text-white mb-4">
          <Icon className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-xl mb-3 text-gray-900">{title}</h3>
        <p className="text-gray-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function StatCard({ number, label }: any) {
  return (
    <div className="group cursor-default">
      <div className="text-5xl md:text-6xl font-black mb-2 text-white">{number}</div>
      <div className="text-gray-400 font-bold uppercase tracking-wider text-sm">{label}</div>
    </div>
  );
}

function ListItem({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-3">
       <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
         <CheckCircle2 className="w-3.5 h-3.5" />
       </div>
       <span className="font-medium text-gray-700">{text}</span>
    </li>
  );
}

function PricingCheck({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <CheckCircle2 className="w-5 h-5 opacity-70" />
      <span>{text}</span>
    </div>
  );
}