"use client";

import { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import Link from 'next/link';

const DemoForm = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    city: '',
    restaurantName: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setFormData({
        name: '',
        phone: '',
        email: '',
        city: '',
        restaurantName: '',
      });
    }, 3000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const inputClassName = "w-full px-6 py-3.5 bg-gray-50/80 border border-gray-100 rounded-full focus:ring-2 focus:ring-[#FFC529] focus:bg-white focus:border-transparent outline-none transition-colors font-medium text-sm text-[#1F2127] placeholder:text-gray-400 shadow-sm";

  return (
    <section id="demo" className="py-24 lg:py-32 bg-white relative overflow-hidden">
      <div className="section-padding max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

          {/* Left Column: Image */}
          <div className="w-full lg:w-[45%] xl:w-1/2 flex justify-center lg:justify-start order-2 lg:order-1">
            <img
              src="/landing/contact us.png"
              alt="Contact Customer Support Illustration"
              loading="lazy"
              className="w-full max-w-lg lg:max-w-xl object-contain"
            />
          </div>

          {/* Right Column: Form */}
          <div className="w-full lg:w-[55%] xl:w-1/2 order-1 lg:order-2">
            {/* Section Header */}
            <div className="mb-10 sm:mb-12 text-center lg:text-left">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#1F2127] tracking-tight mb-4">
                Contact <span className="text-[#FFC529]">us</span>
              </h2>
              <p className="text-[16px] sm:text-[17px] text-gray-500 font-medium">
                Get in touch with our team to clarify your queries
              </p>
            </div>

            {/* Form Area */}
            <div className="bg-white rounded-3xl p-4 sm:p-6 lg:p-0">
              {isSubmitted ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-[#FFC529]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-10 h-10 text-[#FFC529]" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-3xl font-black text-[#1F2127] mb-3">
                    Thank you!
                  </h3>
                  <p className="text-lg text-gray-500 font-medium">
                    Our team will get in touch with you shortly.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-[460px] mx-auto lg:mx-0">
                  <div>
                    <label className="block text-xs font-bold text-[#1F2127] mb-1.5 px-2">
                      Name <span className="text-[#FFC529]">*</span>
                    </label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} required className={inputClassName} />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1F2127] mb-1.5 px-2">
                      Email address <span className="text-[#FFC529]">*</span>
                    </label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} required className={inputClassName} />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1F2127] mb-1.5 px-2">
                      Phone number <span className="text-[#FFC529]">*</span>
                    </label>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required className={inputClassName} />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1F2127] mb-1.5 px-2">
                      Restaurant Name <span className="text-[#FFC529]">*</span>
                    </label>
                    <input type="text" name="restaurantName" value={formData.restaurantName} onChange={handleChange} required className={inputClassName} />
                  </div>

                  <div className="pt-4 flex flex-col gap-4">
                    <button
                      type="submit"
                      className="w-full px-8 py-4 bg-[#FFC529] hover:bg-[#F0B820] text-[#1F2127] font-black text-[15px] tracking-wide rounded-full transition-colors duration-200 shadow-[0_8px_20px_-6px_rgba(255,197,41,0.5)] border-2 border-transparent"
                    >
                      REQUEST CALLBACK
                    </button>
                    <p className="text-[11px] text-center font-medium text-gray-400 px-4">
                      By submitting, you agree to our{' '}
                      <Link href="/#privacy" className="text-[#1F2127] hover:text-[#FFC529] hover:underline font-bold transition-colors">Privacy Policy</Link>
                      {' '}and{' '}
                      <Link href="/#terms" className="text-[#1F2127] hover:text-[#FFC529] hover:underline font-bold transition-colors">Terms of Service</Link>
                    </p>
                  </div>
                </form>
              )}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default DemoForm;
