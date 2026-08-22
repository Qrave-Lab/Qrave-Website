"use client";

import { useState } from 'react';
import { CheckCircle2, Loader2, User, Mail, Phone, Store, MapPin, Send, ArrowUpRight, Zap, ShieldCheck, Headphones, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { api } from '@/app/lib/api';

const DemoForm = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    city: '',
    restaurantName: '',
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Please fill out your full name.';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Please fill out your email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Please fill out your phone number.';
    } else if (formData.phone.trim().length < 7) {
      newErrors.phone = 'Please enter a valid phone number.';
    }

    if (!formData.restaurantName.trim()) {
      newErrors.restaurantName = 'Please fill out your restaurant name.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!validateForm()) {
      toast.error('Please complete all required fields.');
      return;
    }

    setIsLoading(true);

    try {
      await api('/public/contact', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      setIsSubmitted(true);
      setErrors({});
      setFormData({
        name: '',
        phone: '',
        email: '',
        city: '',
        restaurantName: '',
      });
      toast.success('Callback request submitted!');
    } catch (err: any) {
      console.error('Contact submission error:', err);
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fieldName = e.target.name;
    setFormData({
      ...formData,
      [fieldName]: e.target.value,
    });

    if (errors[fieldName]) {
      setErrors((prev) => ({ ...prev, [fieldName]: '' }));
    }
  };

  return (
    <section id="demo" className="py-24 lg:py-32 bg-[#FAF9F6] text-slate-900 relative overflow-hidden">
      {/* Soft Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-400/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-amber-400/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Main Light Card Grid */}
        <div className="bg-white border border-slate-200/80 rounded-[2.5rem] overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.06)] grid grid-cols-1 lg:grid-cols-12">
          
          {/* Left Column: Premium Light Info Panel (No Card Boxes) */}
          <div className="lg:col-span-5 p-8 sm:p-12 lg:p-14 bg-gradient-to-br from-slate-50 via-orange-50/20 to-amber-50/30 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200/80">
            <div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.15] mb-6 text-slate-900">
                Ready to upgrade your <span className="bg-gradient-to-r from-[#fe5c13] to-amber-600 bg-clip-text text-transparent">restaurant?</span>
              </h2>

              <p className="text-slate-600 font-medium text-base leading-relaxed mb-10">
                Book a personalized walkthrough with our specialists and discover how Qrave boosts order speeds and table turnover.
              </p>

              {/* Clean Minimalist Highlights List (No Card Boxes) */}
              <div className="space-y-7">
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-2xl bg-orange-100/80 text-[#fe5c13] flex items-center justify-center shrink-0 mt-0.5">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900">Same-Day Setup</h4>
                    <p className="text-xs font-medium text-slate-600 mt-1 leading-relaxed">
                      Get your digital QR menus and POS live in under 24 hours with zero hardware friction.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-2xl bg-emerald-100/80 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900">99.9% Reliable Uptime</h4>
                    <p className="text-xs font-medium text-slate-600 mt-1 leading-relaxed">
                      Built on enterprise cloud infrastructure to handle peak weekend dinner rushes effortlessly.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-2xl bg-amber-100/80 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Headphones className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900">24/7 Dedicated Support</h4>
                    <p className="text-xs font-medium text-slate-600 mt-1 leading-relaxed">
                      Direct phone & WhatsApp support whenever your kitchen or floor staff needs assistance.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Direct Contact Footer Info */}
            <div className="mt-12 pt-8 border-t border-slate-200/80 grid grid-cols-2 gap-4">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Direct Line</span>
                <a href="tel:+919876543210" className="text-xs font-bold text-slate-900 hover:text-[#fe5c13] transition-colors inline-flex items-center gap-1">
                  +91 98765 43210
                  <ArrowUpRight className="w-3 h-3 opacity-60" />
                </a>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Email Support</span>
                <a href="mailto:support@qravetech.in" className="text-xs font-bold text-slate-900 hover:text-[#fe5c13] transition-colors inline-flex items-center gap-1">
                  support@qravetech.in
                  <ArrowUpRight className="w-3 h-3 opacity-60" />
                </a>
              </div>
            </div>
          </div>

          {/* Right Column: Clean Light Form with Custom Validation */}
          <div className="lg:col-span-7 p-8 sm:p-12 lg:p-14 bg-white flex flex-col justify-center">
            {isSubmitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="text-center py-12 px-4"
              >
                <div className="w-20 h-20 bg-emerald-100 border border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600 shadow-md">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">
                  Callback Requested!
                </h3>
                <p className="text-base text-slate-600 font-medium max-w-md mx-auto mb-8">
                  Thank you for reaching out. A Qrave specialist will get in touch with you shortly.
                </p>
                <button
                  onClick={() => setIsSubmitted(false)}
                  className="inline-flex items-center justify-center px-6 py-2.5 rounded-full text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Submit Another Request
                </button>
              </motion.div>
            ) : (
              <form noValidate onSubmit={handleSubmit} className="space-y-5">
                <div className="mb-4">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Request a Callback</h3>
                  <p className="text-xs text-slate-500 font-semibold mt-1">Fill out the details below and we will contact you shortly.</p>
                </div>

                {/* Name Input */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Your Full Name <span className="text-[#fe5c13]">*</span>
                  </label>
                  <div className="relative">
                    <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none ${errors.name ? 'text-rose-500' : 'text-slate-400'}`}>
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="John Doe"
                      className={`w-full pl-11 pr-4 py-3.5 bg-slate-50 border rounded-2xl text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none transition-all ${
                        errors.name
                          ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10'
                          : 'border-slate-200 focus:bg-white focus:border-[#fe5c13] focus:ring-4 focus:ring-[#fe5c13]/10'
                      }`}
                    />
                  </div>
                  {errors.name && (
                    <p className="text-[11px] font-extrabold text-rose-600 flex items-center gap-1 mt-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{errors.name}</span>
                    </p>
                  )}
                </div>

                {/* Email & Phone Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Email Address <span className="text-[#fe5c13]">*</span>
                    </label>
                    <div className="relative">
                      <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none ${errors.email ? 'text-rose-500' : 'text-slate-400'}`}>
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="john@restaurant.com"
                        className={`w-full pl-11 pr-4 py-3.5 bg-slate-50 border rounded-2xl text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none transition-all ${
                          errors.email
                            ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10'
                            : 'border-slate-200 focus:bg-white focus:border-[#fe5c13] focus:ring-4 focus:ring-[#fe5c13]/10'
                        }`}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-[11px] font-extrabold text-rose-600 flex items-center gap-1 mt-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{errors.email}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Phone Number <span className="text-[#fe5c13]">*</span>
                    </label>
                    <div className="relative">
                      <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none ${errors.phone ? 'text-rose-500' : 'text-slate-400'}`}>
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+91 98765 43210"
                        className={`w-full pl-11 pr-4 py-3.5 bg-slate-50 border rounded-2xl text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none transition-all ${
                          errors.phone
                            ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10'
                            : 'border-slate-200 focus:bg-white focus:border-[#fe5c13] focus:ring-4 focus:ring-[#fe5c13]/10'
                        }`}
                      />
                    </div>
                    {errors.phone && (
                      <p className="text-[11px] font-extrabold text-rose-600 flex items-center gap-1 mt-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{errors.phone}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Restaurant & City Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Restaurant Name <span className="text-[#fe5c13]">*</span>
                    </label>
                    <div className="relative">
                      <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none ${errors.restaurantName ? 'text-rose-500' : 'text-slate-400'}`}>
                        <Store className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        name="restaurantName"
                        value={formData.restaurantName}
                        onChange={handleChange}
                        placeholder="Gourmet Bistro"
                        className={`w-full pl-11 pr-4 py-3.5 bg-slate-50 border rounded-2xl text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none transition-all ${
                          errors.restaurantName
                            ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10'
                            : 'border-slate-200 focus:bg-white focus:border-[#fe5c13] focus:ring-4 focus:ring-[#fe5c13]/10'
                        }`}
                      />
                    </div>
                    {errors.restaurantName && (
                      <p className="text-[11px] font-extrabold text-rose-600 flex items-center gap-1 mt-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{errors.restaurantName}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      City / Location
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        placeholder="Mumbai, IN"
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#fe5c13] focus:ring-4 focus:ring-[#fe5c13]/10 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-3 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
                    ⚠️ {errorMsg}
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full relative group inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-[#fe5c13] via-[#ff6a26] to-[#fe5c13] text-white font-bold text-xs tracking-wider uppercase rounded-2xl shadow-lg shadow-[#fe5c13]/25 hover:shadow-xl hover:shadow-[#fe5c13]/35 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <span>Request Callback</span>
                        <Send className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </button>

                  <p className="text-[11px] text-center font-medium text-slate-400 mt-4">
                    By submitting, you agree to our{' '}
                    <Link href="/#privacy" className="text-slate-700 hover:text-[#fe5c13] hover:underline font-bold transition-colors">Privacy Policy</Link>
                    {' '}and{' '}
                    <Link href="/#terms" className="text-slate-700 hover:text-[#fe5c13] hover:underline font-bold transition-colors">Terms of Service</Link>
                  </p>
                </div>
              </form>
            )}
          </div>

        </div>
      </div>
    </section>
  );
};

export default DemoForm;
