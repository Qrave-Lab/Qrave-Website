"use client";

import { useState } from 'react';
import { Check } from 'lucide-react';

const Pricing = () => {
    const [isYearly, setIsYearly] = useState(false);
    const plans = [
        {
            name: "Starter",
            monthlyPrice: "499",
            yearlyPrice: "5,499",
            description: "7-day free trial included",
            highlight: false,
            badge: "",
            features: [
                "Unlimited Menus & Items",
                "Premium Branding Tools",
                "Instant QR Generation",
                "Real-time Menu Updates",
                "Basic Performance Insights",
                "Priority Support"
            ],
            buttonText: "Start 7-Day Free Trial",
            buttonVariant: "outline"
        },
        {
            name: "Pro",
            monthlyPrice: "999",
            yearlyPrice: "11,499",
            description: "Includes Advanced Analytics",
            highlight: true,
            badge: "MOST POPULAR",
            features: [
                "Everything in Starter",
                "Unlimited Menus & Items",
                "Full Custom Branding",
                "Advanced Analytics",
                "Priority VIP Support",
                "Best Value"
            ],
            buttonText: "Subscribe Pro",
            buttonVariant: "solid"
        }
    ];

    return (
        <section id="pricing" className="py-24 bg-white relative">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Header */}
                <div className="text-center mb-12">
                    <h2 className="text-4xl md:text-5xl font-black text-[#1F2127] tracking-tight mb-4">
                        Simple, Transparent <span className="text-[#FFC529]">Pricing</span>
                    </h2>
                    <p className="text-gray-500 font-medium text-lg mb-8 max-w-xl mx-auto">
                        Start with a 7-day free trial. No credit card required. Cancel anytime.
                    </p>

                    {/* Billing Toggle */}
                    <div className="flex items-center justify-center gap-4 mb-4">
                        <span className={`text-sm font-bold ${!isYearly ? 'text-[#1F2127]' : 'text-gray-400'} transition-colors`}>
                            Monthly
                        </span>

                        {/* Interactive Toggle Button */}
                        <button
                            onClick={() => setIsYearly(!isYearly)}
                            className="relative w-16 h-8 bg-[#1F2127] rounded-full p-1 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[#FFC529] focus:ring-offset-2"
                            aria-label="Toggle billing duration"
                        >
                            <div className={`w-6 h-6 bg-[#FFC529] rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${isYearly ? 'translate-x-8' : 'translate-x-0'}`} />
                        </button>

                        <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${isYearly ? 'text-[#1F2127]' : 'text-gray-400'} transition-colors`}>
                                Annually
                            </span>
                            <span className="hidden sm:inline-block bg-[#FFC529]/10 text-[#FFC529] text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                                Save ~16%
                            </span>
                        </div>
                    </div>
                    <span className="sm:hidden inline-block bg-[#FFC529]/10 text-[#FFC529] text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full mt-2">
                        Save ~16% on Annual
                    </span>
                </div>

                {/* Pricing Cards */}
                <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    {plans.map((plan, index) => (
                        <div
                            key={index}
                            className={`relative rounded-3xl p-8 lg:p-12 ${plan.highlight
                                ? 'bg-white border-2 border-[#FFC529] shadow-[0_20px_60px_-15px_rgba(255,197,41,0.2)]'
                                : 'bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200'
                                }`}
                        >
                            {plan.badge && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                    <span className="bg-[#FFC529] text-[#1F2127] text-xs font-black tracking-widest uppercase px-4 py-1 rounded-full shadow-sm">
                                        {plan.badge}
                                    </span>
                                </div>
                            )}

                            <div className="text-center mb-8">
                                <h3 className="text-2xl font-bold text-[#1F2127] mb-4">{plan.name}</h3>
                                <div className="flex items-end justify-center gap-1 h-14">
                                    <span className="text-5xl font-black text-[#1F2127]">
                                        <span className="text-3xl">₹</span>
                                        {isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                                    </span>
                                    <span className="text-gray-500 font-medium mb-1">{isYearly ? '/year' : '/month'}</span>
                                </div>
                                <p className="text-gray-400 text-[13px] font-bold mb-3 mt-1">+ 2.5% GST</p>
                                <p className="text-[#FFC529] font-medium text-sm">
                                    {plan.description}
                                </p>
                            </div>

                            <div className="space-y-4 mb-10">
                                {plan.features.map((feature, idx) => (
                                    <div key={idx} className="flex items-center gap-3">
                                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#FFC529]/10 flex items-center justify-center">
                                            <Check className="w-3.5 h-3.5 text-[#FFC529]" strokeWidth={3} />
                                        </div>
                                        <span className={`text-sm md:text-base font-medium ${feature === 'Advanced Analytics' ? 'text-[#1F2127] font-bold' : 'text-gray-600'}`}>
                                            {feature}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="text-center">
                                <button
                                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 ${plan.buttonVariant === 'solid'
                                        ? 'bg-[#FFC529] hover:bg-[#eebb1d] text-[#1F2127] shadow-lg hover:shadow-xl'
                                        : 'bg-white border-2 border-[#FFC529] text-[#1F2127] hover:bg-[#FFC529]/5'
                                        }`}
                                >
                                    {plan.buttonText}
                                </button>
                                <p className="text-[10px] text-gray-400 font-bold tracking-wider mt-4 uppercase">
                                    7 DAYS FREE • CANCEL ANYTIME
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </section>
    );
};

export default Pricing;
