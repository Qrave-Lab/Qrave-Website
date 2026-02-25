import Link from 'next/link';

const CtaBanner = () => {
    return (
        <section className="bg-white py-32 relative overflow-hidden">
            {/* Background decoration - Light Yellow framing bars */}
            <div className="absolute top-0 left-0 w-full h-[60px] bg-[#FFF6D6] z-0" />
            <div className="absolute bottom-0 left-0 w-full h-[60px] bg-[#FFF6D6] z-0" />

            <div className="max-w-4xl mx-auto px-4 relative z-10 text-center flex flex-col items-center">
                <h2 className="text-4xl md:text-5xl lg:text-5xl font-black text-[#1F2127] mb-4 tracking-tight leading-[1.15]">
                    Ready to <span className="text-[#FFC529]">modernize</span><br className="hidden md:block" /> your restaurant?
                </h2>
                <p className="text-gray-500 font-medium text-[15px] mb-10 max-w-xl mx-auto leading-relaxed">
                    Join hundreds of restaurants providing a seamless digital experience.<br className="hidden md:block" />
                    Build, brand, and launch in as little as 2 minutes.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
                    <Link
                        href="/onboarding"
                        className="w-full sm:w-auto inline-flex justify-center items-center bg-[#FFC529] hover:bg-[#F0B820] text-[#1F2127] px-8 py-3 rounded-xl font-bold text-[14.5px] transition-all duration-300 shadow-[0_4px_14px_0_rgba(255,197,41,0.39)] hover:shadow-[0_6px_20px_rgba(255,197,41,0.23)] hover:-translate-y-0.5"
                    >
                        Start My Free Trial &rarr;
                    </Link>
                    <Link
                        href="/demo"
                        className="w-full sm:w-auto inline-flex justify-center items-center bg-transparent hover:bg-gray-50/80 border border-gray-200 text-[#1F2127] px-8 py-3 rounded-xl font-semibold text-[14.5px] transition-all duration-300"
                    >
                        Try the demo
                    </Link>
                </div>
            </div>
        </section>
    );
};

export default CtaBanner;
