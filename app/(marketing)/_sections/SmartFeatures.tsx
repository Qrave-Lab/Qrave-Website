"use client";

import { useEffect, useRef } from "react";
import { ArrowUpRight, CreditCard, PieChart, QrCode, View, Boxes, FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import gsap from "gsap";

const SmartFeatures = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>('.bento-feature-card');
      
      gsap.set(cards, { opacity: 0, y: 35 });

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              gsap.to(cards, {
                opacity: 1,
                y: 0,
                duration: 0.8,
                stagger: 0.1,
                ease: 'power3.out',
              });
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1, rootMargin: '50px 0px' }
      );

      if (containerRef.current) {
        observer.observe(containerRef.current);
      }

      return () => observer.disconnect();
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const features = [
    {
      num: "01",
      title: (
        <>
          Immersive <span className="text-[#fe5c13]">WebAR Menu</span>
        </>
      ),
      description:
        'Allow customers to visualize photorealistic 3D representations of dishes directly in their mobile browser—no app installation required. Amplifies appetite appeal and reduces "order regret".',
      linkText: "Explore WebAR",
      linkPath: "/feature/webar",
      icon: <View className="w-5 h-5 text-[#fe5c13]" />,
    },
    {
      num: "02",
      title: (
        <>
          Zero-Friction <span className="text-[#fe5c13]">QR Ordering</span>
        </>
      ),
      description:
        "Diners scan a table-specific QR code to browse, customize, and place orders directly to the kitchen. Removes the waiter as a bottleneck and improves peak-hour order latency by up to 40%.",
      linkText: "Explore QR Ordering",
      linkPath: "/feature/qr-ordering",
      icon: <QrCode className="w-5 h-5 text-[#fe5c13]" />,
    },
    {
      num: "03",
      title: (
        <>
          Integrated <span className="text-[#fe5c13]">UPI Payments</span>
        </>
      ),
      description:
        'Seamlessly integrates with the UPI ecosystem, allowing customers to pay instantly using any major payment app. Collapses the "Wait Time Paradox" for billing.',
      linkText: "Explore Payment Suite",
      linkPath: "/feature/upi-billing",
      icon: <CreditCard className="w-5 h-5 text-[#fe5c13]" />,
    },
    {
      num: "04",
      title: (
        <>
          Business <span className="text-[#fe5c13]">Intelligence</span>
        </>
      ),
      description:
        "Real-time tracking of revenue, hourly sales breakdowns, and customer flow heatmaps. Analytics that categorize dishes by profitability to help optimize your menu.",
      linkText: "Explore Analytics",
      linkPath: "/feature/analytics",
      icon: <PieChart className="w-5 h-5 text-[#fe5c13]" />,
    },
    {
      num: "05",
      title: (
        <>
          Inventory & <span className="text-[#fe5c13]">Recipe Manager</span>
        </>
      ),
      description:
        "Multi-level Recipe Builders with yield factors, Auto Stock Deduction, fully-integrated Purchase Orders, Supplier Directory, and a live Food Cost Dashboard to maximize your margins.",
      linkText: "Explore Inventory",
      linkPath: "/feature/inventory",
      icon: <Boxes className="w-5 h-5 text-[#fe5c13]" />,
    },
    {
      num: "06",
      title: (
        <>
          Enterprise <span className="text-[#fe5c13]">Accounting & GST</span>
        </>
      ),
      description:
        "End-to-end financial operations with automated Accounts Payable, B2B Credit Notes, GSTR-1 & GSTR-3B Tax Liability Reports, and seamless Tally integration. Zero manual reconciliation.",
      linkText: "Explore Accounting",
      linkPath: "/feature/accounting",
      icon: <FileSpreadsheet className="w-5 h-5 text-[#fe5c13]" />,
    },
  ];

  return (
    <section
      ref={containerRef}
      id="features"
      className="bg-[#FAF9F6] pt-28 pb-28 lg:pt-36 lg:pb-36 relative overflow-hidden text-slate-900"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        
        {/* Section Header */}
        <div className="text-center mb-16 lg:mb-24 pt-6">
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-950 tracking-tight mb-6 max-w-4xl mx-auto leading-[1.1]">
            Beyond the POS: <br className="hidden md:block" />
            Immersive Dining &{" "}
            <span className="bg-gradient-to-r from-[#fe5c13] to-amber-600 bg-clip-text text-transparent">
              Intelligent Control
            </span>
          </h2>
          
          <p className="text-base sm:text-xl text-slate-600 font-medium max-w-2xl mx-auto leading-relaxed">
            Captivate guests with 3D visuals while powering your operations with next-gen smart tools.
          </p>
        </div>

        {/* Agency-Grade Bento Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bento-feature-card bg-white border border-slate-200/90 rounded-[2rem] p-8 sm:p-10 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.04)] hover:shadow-2xl hover:border-orange-300 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden"
            >
              {/* Top Card Header Bar */}
              <div>
                <div className="flex items-center justify-between mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100/80 flex items-center justify-center text-[#fe5c13] group-hover:scale-110 transition-transform">
                    {feature.icon}
                  </div>
                  <span className="text-2xl font-black text-slate-200 group-hover:text-[#fe5c13]/30 transition-colors select-none">
                    {feature.num}
                  </span>
                </div>

                <h3 className="text-xl lg:text-2xl font-black text-slate-950 tracking-tight leading-snug mb-4">
                  {feature.title}
                </h3>

                <p className="text-sm text-slate-600 font-medium leading-relaxed mb-8">
                  {feature.description}
                </p>
              </div>

              {/* Action Button Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <Link
                  href={feature.linkPath}
                  className="text-xs font-bold uppercase tracking-wider text-slate-700 group-hover:text-[#fe5c13] transition-colors"
                >
                  {feature.linkText}
                </Link>
                <Link
                  href={feature.linkPath}
                  className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-[#fe5c13] text-slate-600 group-hover:text-white flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                >
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default SmartFeatures;
