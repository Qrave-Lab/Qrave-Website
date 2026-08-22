"use client";

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Reveal } from '../_components/Reveal'
import { ArrowUpRight, Plus, Minus } from 'lucide-react'

export default function Services() {
  const [expanded, setExpanded] = useState<number | null>(0)

  const services = [
    {
      title: 'Digital Strategy & Positioning',
      desc: 'We define the core purpose of your digital presence. From market analysis to user personas, we craft a strategic roadmap that ensures your product resonates with the right audience and drives measurable business growth.',
      tags: ['Market Research', 'Brand Positioning', 'User Personas', 'Roadmapping']
    },
    {
      title: 'Bespoke UX/UI Design',
      desc: 'Modern, responsive, and user-friendly interfaces designed to engage visitors and drive conversions. We focus on smart design, intuitive navigation, and beautiful aesthetics that elevate your brand.',
      tags: ['Wireframing', 'Prototyping', 'Design Systems', 'Interaction Design']
    },
    {
      title: 'High-Performance Web Development',
      desc: 'We build blazing-fast, scalable web applications using cutting-edge technologies like React, Next.js, and Framer Motion. Every line of code is optimized for performance, SEO, and accessibility.',
      tags: ['React & Next.js', 'Creative Development', 'CMS Integration', 'SEO Optimization']
    },
    {
      title: 'Continuous Growth & Support',
      desc: 'Our partnership doesn\'t end at launch. We provide ongoing support, A/B testing, and data-driven optimizations to ensure your digital asset continues to evolve and outperform the competition.',
      tags: ['A/B Testing', 'Analytics', 'Conversion Optimization', 'Maintenance']
    }
  ]

  return (
    <section id="services" className="px-6 py-24 md:px-16 md:py-32 bg-[#f2f1ee]">
      <div className="mx-auto max-w-[90rem]">
        
        {/* The Black Card */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-[#0c0c0c] text-[#f2f1ee] px-6 py-16 md:p-24 shadow-2xl">
          
          <div className="mb-16 md:mb-24 flex flex-col md:flex-row md:items-end justify-between gap-8">
            <Reveal>
              <h2 className="text-[12vw] md:text-[8vw] font-bold leading-[0.9] tracking-tightest">
                Services.<span className="text-3xl md:text-5xl text-neutral-500 align-top ml-2">(4)</span>
              </h2>
            </Reveal>
            <Reveal delay={0.2} className="max-w-sm text-lg text-neutral-400">
              We engineer bespoke digital experiences that align perfectly with your unique business objectives. No rigid packages, just tailored solutions.
            </Reveal>
          </div>

          <div className="flex flex-col">
            {/* Top Line Animation */}
            <motion.div 
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
              className="w-full h-[1px] bg-neutral-800 origin-left"
            />

            {services.map((service, idx) => {
              const isExpanded = expanded === idx

              return (
                <div key={idx} className="flex flex-col">
                  
                  {/* Accordion Header */}
                  <button 
                    onClick={() => setExpanded(isExpanded ? null : idx)}
                    className="group relative flex items-center justify-between py-8 md:py-12 w-full text-left transition-colors hover:text-white"
                  >
                    <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-24 w-full">
                      <span className="text-sm font-semibold text-neutral-500 w-12 shrink-0">
                        (0{idx + 1})
                      </span>
                      <h3 className={`text-3xl md:text-5xl font-semibold tracking-tight transition-colors duration-500 ${isExpanded ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-200'}`}>
                        {service.title}
                      </h3>
                    </div>
                    
                    <div className="shrink-0 ml-4 relative flex items-center justify-center w-12 h-12 rounded-full border border-neutral-800 group-hover:border-neutral-600 transition-colors">
                      <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      >
                        {isExpanded ? <Minus className="w-5 h-5" /> : <Plus className="w-5 h-5 text-neutral-500 group-hover:text-white transition-colors" />}
                      </motion.div>
                    </div>
                  </button>

                  {/* Accordion Content */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="pb-12 md:pb-16 flex flex-col lg:flex-row gap-12 lg:gap-24 md:pl-[120px]">
                          
                          <div className="lg:w-1/2 flex flex-col justify-between">
                            <p className="text-xl leading-relaxed text-neutral-400 mb-8 max-w-xl">
                              {service.desc}
                            </p>
                            <a 
                              href="mailto:qrave.private@gmail.com" 
                              className="group inline-flex items-center justify-center gap-3 overflow-hidden rounded-full bg-white px-8 py-4 text-black transition-transform hover:scale-[1.02] active:scale-[0.98] w-fit"
                            >
                              <span className="font-bold tracking-tight text-sm">Get in Touch</span>
                              <ArrowUpRight className="h-4 w-4 transition-transform duration-500 group-hover:rotate-45 group-hover:scale-110" />
                            </a>
                          </div>

                          <div className="lg:w-5/12">
                            <h4 className="text-xs uppercase tracking-widest text-neutral-600 mb-6 font-semibold">Capabilities</h4>
                            <div className="flex flex-wrap gap-3">
                              {service.tags.map((tag, tIdx) => (
                                <span key={tIdx} className="px-5 py-2.5 rounded-full border border-neutral-800 text-sm font-medium text-neutral-300">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>

                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Horizontal Line Animation below item */}
                  <motion.div 
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full h-[1px] bg-neutral-800 origin-left"
                  />

                </div>
              )
            })}
          </div>

        </div>
      </div>
    </section>
  )
}
