import Link from 'next/link';

const CtaBanner = () => {
    return (
        <section className="py-20 lg:py-28 bg-[#FAF9F6]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Solid Dark CTA Card (No Gradients) */}
                <div className="rounded-3xl lg:rounded-[2.5rem] bg-slate-900 text-white p-8 sm:p-14 lg:p-20 border border-slate-800 shadow-xl text-center flex flex-col items-center">
                    
                    {/* Main Headline */}
                    <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.12] mb-6 max-w-3xl">
                        Ready to <span className="text-[#fe5c13]">modernize</span> your restaurant?
                    </h2>

                    {/* Sub-headline */}
                    <p className="text-slate-400 font-medium text-base sm:text-lg mb-10 max-w-xl mx-auto leading-relaxed">
                        Join hundreds of restaurants providing a seamless digital experience. Build, brand, and launch in as little as 2 minutes.
                    </p>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
                        <Link
                            href="/onboarding"
                            className="w-full sm:w-auto inline-flex justify-center items-center bg-[#fe5c13] hover:bg-[#fe5c13]/90 text-slate-950 px-8 py-4 rounded-2xl font-bold text-sm uppercase tracking-wide transition-all duration-200 shadow-md active:scale-[0.98]"
                        >
                            Start My Free Trial &rarr;
                        </Link>
                        <Link
                            href="/demo"
                            className="w-full sm:w-auto inline-flex justify-center items-center bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 px-8 py-4 rounded-2xl font-semibold text-sm transition-all duration-200 active:scale-[0.98]"
                        >
                            Try the Demo
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default CtaBanner;
