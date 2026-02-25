const AboutUs = () => {
    return (
        <section id="about" className="py-24 lg:py-32 bg-white relative overflow-hidden">
            {/* Clean Background - Removing blobs to match minimal style */}

            <div className="section-padding max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

                {/* Centered Heading */}
                <div className="text-center mb-16 lg:mb-24">
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-[#1F2127] tracking-tight max-w-4xl mx-auto leading-[1.1]">
                        The story behind <br className="hidden md:block" />
                        <span className="text-[#FFC529]">QRAVE</span>
                    </h2>
                </div>

                <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">

                    {/* Text Content */}
                    <div className="max-w-2xl relative">
                        <div className="space-y-6 text-lg lg:text-[1.1rem] text-gray-500 font-medium leading-relaxed">
                            <p>
                                What started as a late-night discussion between three passionate undergraduate students quickly turned into a mission to revolutionize the hospitality industry.
                            </p>
                            <p>
                                We noticed a glaring gap: while technology was advancing rapidly, local cafes, bars, and restaurants were largely stuck using clunky, outdated POS systems that frustrated both staff and customers. Software should make running a restaurant easier, not harder.
                            </p>
                            <p>
                                That's why we built QRAVE. We designed a deeply integrated platform focusing on robust mobile ordering, seamless kitchen syncing, and intelligent analytics. We are driven by the belief that exceptional technology can entirely eliminate operational chaos and elevate customer satisfaction to new heights.
                            </p>
                            <p>
                                By combining a tech-first approach with an obsessed focus on customer experience, we are empowering the next generation of hospitality. Our overarching goal is to make enterprise-grade software accessible to every restaurant—regardless of their size, budget, or technical expertise.
                            </p>
                        </div>
                    </div>

                    {/* Image Content - Clean floating style */}
                    <div className="w-full flex justify-center lg:justify-end">
                        <img
                            src="/landing/5.png"
                            alt="Modern cafe POS system"
                            className="w-full max-w-lg lg:max-w-xl object-contain"
                        />
                    </div>

                </div>
            </div>
        </section>
    );
};

export default AboutUs;
