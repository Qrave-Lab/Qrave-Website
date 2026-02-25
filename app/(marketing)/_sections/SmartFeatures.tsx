import { View, QrCode, CreditCard, PieChart, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { ReactNode } from 'react';

const SmartFeatures = () => {
  const features = [
    {
      title: <>Immersive <span className="text-[#FFC529]">WebAR Menu</span> Visualization</>,
      description: "Allow customers to visualize photorealistic 3D representations of dishes directly in their mobile browser—no app installation required. Amplifies appetite appeal and reduces \"order regret\".",
      linkText: "Explore WebAR integration",
      linkPath: "/feature/webar",
      image: "/landing/feature_ar.png",
      icon: <View className="w-8 h-8 text-[#FFC529]" />
    },
    {
      title: <>Zero-Friction <span className="text-[#FFC529]">QR Ordering</span> Ecosystem</>,
      description: "Diners scan a table-specific QR code to browse, customize, and place orders directly to the kitchen. Removes the waiter as a bottleneck and improves peak-hour order latency by up to 40%.",
      linkText: "Explore QR ordering features",
      linkPath: "/feature/qr-ordering",
      image: "/landing/feature_qr.png",
      icon: <QrCode className="w-8 h-8 text-[#FFC529]" />
    },
    {
      title: <>Integrated <span className="text-[#FFC529]">UPI Billing</span> & Payment Suite</>,
      description: "Seamlessly integrates with the UPI ecosystem, allowing customers to pay instantly using any major payment app. Collapses the \"Wait Time Paradox\" for billing.",
      linkText: "Explore payment integrations",
      linkPath: "/feature/upi-billing",
      image: "/landing/feature_upi.png",
      icon: <CreditCard className="w-8 h-8 text-[#FFC529]" />
    },
    {
      title: <>Strategic <span className="text-[#FFC529]">Business Intelligence</span> & Analytics</>,
      description: "Real-time tracking of revenue, hourly sales breakdowns, and customer flow heatmaps. Analytics that categorize dishes by profitability to help optimize your menu.",
      linkText: "Explore analytics dashboard",
      linkPath: "/feature/analytics",
      image: "/landing/feature_analytics.png",
      icon: <PieChart className="w-8 h-8 text-[#FFC529]" />
    }
  ];

  return (
    <section id="features" className="bg-white pb-24 lg:pb-32 relative overflow-hidden">
      {/* Background Flowing Waves for entire section */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.20]">
        {/* Top Wave */}
        <div className="absolute top-0 left-0 w-full overflow-hidden leading-none">
          <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="w-[150%] lg:w-full h-[200px] lg:h-[400px]">
            <path fill="#FFC529" d="M0,192L48,197.3C96,203,192,213,288,208C384,203,480,181,576,149.3C672,117,768,75,864,80C960,85,1056,139,1152,154.7C1248,171,1344,149,1392,138.7L1440,128L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"></path>
          </svg>
        </div>

        {/* Middle decorative wave */}
        <div className="absolute top-1/3 right-0 w-full overflow-hidden leading-none transform rotate-180 opacity-50">
          <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="w-[150%] lg:w-full h-[300px]">
            <path fill="#FFC529" d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,138.7C672,149,768,203,864,202.7C960,203,1056,149,1152,128C1248,107,1344,117,1392,122.7L1440,128L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"></path>
          </svg>
        </div>

        {/* Bottom wave */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none opacity-80">
          <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="w-[150%] lg:w-full h-[250px]">
            <path fill="#FFC529" d="M0,256L48,245.3C96,235,192,213,288,213.3C384,213,480,235,576,224C672,213,768,171,864,160C960,149,1056,171,1152,165.3C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          </svg>
        </div>
      </div>

      <div className="section-padding max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full pt-16 lg:pt-24">

        {/* Section Header */}
        <div className="text-center mb-24 lg:mb-32">

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-[#1F2127] tracking-tight mb-8 max-w-4xl mx-auto leading-[1.1] text-center">
            Beyond the POS: <br className="hidden md:block" />
            Immersive Dining & <span className="text-[#FFC529]">Intelligent Control</span>
          </h2>
          <p className="text-xl md:text-2xl text-gray-500 font-medium max-w-3xl mx-auto text-center">
            Captivate guests with 3D visuals while powering your operations with next-gen smart tools.
          </p>
        </div>

        {/* Features List */}
        <div className="space-y-24 lg:space-y-40">
          {features.map((feature, index) => {
            const isEven = index % 2 === 0;

            return (
              <div
                key={index}
                className={`flex flex-col lg:flex-row items-center gap-12 lg:gap-24 ${isEven ? '' : 'lg:flex-row-reverse'}`}
              >
                {/* Text Content */}
                <div className="w-full lg:w-1/2 flex flex-col items-center lg:items-start text-center lg:text-left relative z-10">
                  <h3 className="text-3xl lg:text-[40px] font-black mb-6 text-[#1F2127] leading-[1.1]">
                    {feature.title}
                  </h3>
                  <p className="text-lg md:text-xl leading-relaxed text-gray-500 font-medium max-w-lg mb-8">
                    {feature.description}
                  </p>
                  <Link href={feature.linkPath} className="inline-flex items-center text-[#1F2127] font-bold text-lg hover:text-[#FFC529] transition-colors group">
                    <span className="border-b-2 border-transparent group-hover:border-[#FFC529] pb-0.5 transition-colors">Explore all features</span>
                    <ArrowRight className="ml-2 w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>

                {/* Image Content - Blended natively, no boxes, glowing shadow */}
                <div className="w-full lg:w-1/2 relative flex justify-center items-center z-10">
                  {/* Decorative soft glow behind image to help it pop against white/wave background */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-[#FFC529]/15 blur-[100px] rounded-full -z-10" />

                  <img
                    src={feature.image}
                    alt=""
                    loading="lazy"
                    className="w-full max-w-lg h-auto object-contain mix-blend-multiply drop-shadow-[0_30px_60px_rgba(0,0,0,0.15)]"
                  />
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

export default SmartFeatures;
