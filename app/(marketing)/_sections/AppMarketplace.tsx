"use client";

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const AppMarketplace = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  const addons = [
    {
      id: 'virtual-studio',
      title: 'The "Virtual Studio" Service',
      description: "We bring your menu to life. Our team handles professional food photography and 3D modeling so you don't have to lift a finger.",
      image: "/landing/img-25c303f5.webp"
    },
    {
      id: 'kds-integration',
      title: 'Kitchen Display System (KDS)',
      description: "Ditch the noisy printers. Send orders directly to a smart kitchen screen that prioritizes prep times and alerts chefs instantly.",
      image: "/landing/photo-1556742049-0cfed4f6a45d-2b030839.webp"
    },
    {
      id: 'advanced-inventory',
      title: 'Advanced Inventory & Stock',
      description: "Never disappoint a customer again. Automatically hide out-of-stock items from your digital menu in real-time.",
      image: "/landing/img-616cde4d.webp"
    },
    {
      id: 'chefs-insights',
      title: '"Chef\'s Insights" Analytics Pro',
      description: "Know what sells and who sells it best. Get deep insights into dish popularity, peak hours, and waiter performance.",
      image: "/landing/img-cac69d81.webp"
    },
    {
      id: 'multi-location-management',
      title: 'Multi-Location Management',
      description: "Growing fast? Control menus, pricing, and reports for all your outlets from one single headquarters account.",
      image: "/landing/photo-1554224155-8d04cb21cd6c-b969db81.webp"
    }
  ];

  return (
    <section id="addons" className="py-24 lg:py-32 bg-[#FCFBF8] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Section Header */}
        <div className="text-center mb-16 lg:mb-24">
          <h2 className="text-4xl md:text-5xl lg:text-5xl font-black text-[#1F2127] tracking-tight">
            Unlock the Full Power of <br className="hidden md:block" />
            <span className="text-[#FFC529]"> the Qrave Ecosystem</span>
          </h2>
        </div>

        {/* Split Layout */}
        <div className="grid md:grid-cols-[1fr_1.5fr] gap-8 lg:gap-24 items-start">

          {/* Left Side - Vertical Interactive List */}
          <div className="flex flex-col relative w-full border-l-[3px] border-gray-200/60">
            {addons.map((addon, index) => {
              const isActive = activeIndex === index;

              return (
                <div
                  key={addon.id}
                  onClick={() => setActiveIndex(index)}
                  className={`group relative py-5 -ml-[3px] pl-6 md:pl-8 cursor-pointer transition-colors duration-300 ${isActive ? 'border-l-[3px] border-[#FFC529]' : 'border-l-[3px] border-transparent hover:border-gray-300'
                    }`}
                >
                  <h3 className={`text-xl md:text-[22px] font-bold transition-colors duration-200 ${isActive ? 'text-[#1F2127]' : 'text-gray-400 hover:text-gray-600'
                    }`}>
                    {addon.title}
                  </h3>

                  {/* Expandable Content */}
                  <div
                    className={`grid transition-all duration-400 ease-in-out ${isActive ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0 mt-0'
                      }`}
                  >
                    <div className="overflow-hidden">
                      <p className="text-gray-500 font-medium leading-[1.6] mb-5 text-[15px] pr-4">
                        {addon.description}
                      </p>
                      <Link
                        href={`/feature/${addon.id}`}
                        className="inline-flex items-center text-[14px] font-bold text-[#1F2127] hover:text-[#FFC529] transition-colors"
                      >
                        <span>Learn more</span>
                        <ArrowRight className="w-4 h-4 ml-1.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Side - Dynamic Image Display */}
          <div className="relative w-full h-full min-h-[280px] sm:min-h-[400px] lg:min-h-[500px] rounded-3xl overflow-hidden shadow-md bg-white border border-gray-100">
            <img
              key={addons[activeIndex].id}
              src={addons[activeIndex].image}
              alt={addons[activeIndex].title}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
            />
          </div>

        </div>
      </div>
    </section>
  );
};

export default AppMarketplace;