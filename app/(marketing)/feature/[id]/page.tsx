import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, CheckCircle2, ArrowRight } from 'lucide-react';
import Navbar from '../../_sections/Navbar';
import Footer from '../../_sections/Footer';
import CtaBanner from '../../_sections/CtaBanner';

// Comprehensive mapped data for all Qrave feature detail pages
const featureData: Record<string, any> = {
    'webar': {
        title: 'Immersive WebAR Menu Visualization',
        subtext: 'Elevate your dining experience with photorealistic 3D representations of your dishes. Our WebAR technology runs directly in the mobile browser—no app downloads needed. Allow customers to see, rotate, and crave their food before they order, reducing send-backs and increasing check sizes.',
        heroImage: '/landing/photo-1555396273-367ea4eb4db5-b4fac7e3.webp',
        subFeatures: [
            {
                title: 'Photorealistic 3D Rendering',
                description: 'We turn your static menu into an interactive playground. Guests can view true-to-scale, hyper-realistic 3D models of their meals right on their tables through their phone cameras.',
                image: '/landing/photo-1544148103-0773bf10d330-119165c7.webp',
                benefits: ['True-to-scale dish representation', 'Increases appetite appeal instantly', 'Reduces "not what I expected" complaints']
            },
            {
                title: 'Zero App Downloads Required',
                description: 'Remove all friction from the experience. Leveraging native WebXR technology, your 3D menu runs smoothly within Safari or Chrome the moment a customer scans the QR code.',
                image: '/landing/photo-1551218808-94e220e084d2-6416967a.webp',
                benefits: ['Frictionless 1-second load time', 'Works on iOS and Android', 'No account creation needed']
            },
            {
                title: 'Proven Upsell Conversions',
                description: 'When people see delicious food, they order more. Restaurants using our WebAR technology see a consistent 15-20% increase in premium add-ons and dessert attachments.',
                image: '/landing/photo-1546069901-ba9599a7e63c-079676da.webp',
                benefits: ['Drives premium item sales', 'Visual upsells convert 3x better', 'Automated dessert suggestions']
            }
        ]
    },
    'qr-ordering': {
        title: 'Zero-Friction QR Ordering Ecosystem',
        subtext: 'Transform your tables into autonomous ordering stations. Guests scan a beautiful, branded QR code to browse your dynamic digital menu, customize their meals, and send orders directly to the kitchen without waiting to catch a server\'s eye.',
        heroImage: '/landing/photo-1556740738-b6a63e27c4df-eee63264.webp',
        subFeatures: [
            {
                title: 'Table-Specific Routing',
                description: 'Every QR code is uniquely tied to a specific table number. When a guest orders, the ticket instantly appears on your Kitchen Display System with the correct table mapped automatically.',
                image: '/landing/photo-1556742049-0cfed4f6a45d-dd1854ce.webp',
                benefits: ['Eliminates manual order entry errors', 'Servers focus on hospitality, not typing', 'Orders fire to kitchen instantly']
            },
            {
                title: 'Dynamic Modifier Engine',
                description: 'Make upselling effortless. Create complex modifier groups, from mandatory meat temperatures to optional premium toppings, all presented beautifully to the user.',
                image: '/landing/photo-1556740738-b6a63e27c4df-42a90b38.webp',
                benefits: ['Unlimited nested modifiers', 'Visual upgrade prompts', 'Dietary restriction badges']
            },
            {
                title: 'Live Menu Syncing',
                description: 'Updating your menu is no longer a printing nightmare. Change prices, update descriptions, or swap seasonal dishes from your dashboard, and it reflects on customer phones instantly.',
                image: '/landing/img-616cde4d.webp',
                benefits: ['Zero printing costs for menu updates', 'Instantly fix typos or pricing', 'Schedule limited-time offers']
            }
        ]
    },
    'upi-billing': {
        title: 'Integrated UPI Billing & Lightning Payments',
        subtext: 'Close out tables 3x faster. Our native UPI integration allows guests to split checks, leave tips, and settle their bills securely from their own devices, dramatically improving table turnover rates during peak hours.',
        heroImage: '/landing/photo-1559526324-4b87b5e36e44-bb92121a.webp',
        subFeatures: [
            {
                title: 'Instant Table Settlements',
                description: 'No more waving down a waiter for the card machine. Guests can view their live tab, split it among friends, and pay via any major UPI app in under 10 seconds.',
                image: '/landing/img-a78dca06.webp',
                benefits: ['Increases table turnover by 18%', 'Frictionless bill splitting', 'Supports Google Pay, PhonePe, Paytm']
            },
            {
                title: 'Unified Digital Ledger',
                description: 'Stop manually reconciling paper receipts. All digital payments automatically log into your central Qrave dashboard alongside cash transactions for painless end-of-day closing.',
                image: '/landing/img-9a9d75ea.webp',
                benefits: ['1-click end-of-day reconciliation', 'Prevents staff pilferage', 'Exportable to accounting software']
            },
            {
                title: 'Seamless Tipping Mechanics',
                description: 'When tipping is digital, private, and suggested elegantly at checkout, servers make more money. Our UX encourages higher tip percentages by removing the awkwardness.',
                image: '/landing/img-abae91f0.webp',
                benefits: ['Increases average staff tips by 22%', 'Customizable preset percentages', 'Distributed directly to server ID']
            }
        ]
    },
    'analytics': {
        title: 'Strategic Business Intelligence Dashboard',
        subtext: 'Stop guessing and start knowing. Qrave\'s analytics suite transforms raw data into actionable insights, providing real-time tracking of revenue, hourly sales breakdowns, inventory waste, and customer flow heatmaps.',
        heroImage: '/landing/img-cac69d81.webp',
        subFeatures: [
            {
                title: 'Profitability Matrix Categorization',
                description: 'We automatically map your menu onto a Boston Consulting Group matrix. Instantly identify your Stars (high profit, high volume) and your Dogs (low profit, low volume) to optimize your offerings.',
                image: '/landing/photo-1551288049-bebda4e38f71-f8d3f6af.webp',
                benefits: ['Menu engineering made automatic', 'Identify invisible profit leaks', 'Data-driven pricing decisions']
            },
            {
                title: 'Live Heatmaps & Peak Tracking',
                description: 'Visualize your restaurant\'s busiest hours across the week. Accurately forecast rushes, optimize your kitchen prep, and schedule staff with pinpoint accuracy saving labor costs.',
                image: '/landing/img-a3d9342f.webp',
                benefits: ['Optimize shift scheduling', 'Track average ticket times during peaks', 'Analyze weather vs. sales correlations']
            },
            {
                title: 'Customer Retention Metrics',
                description: 'Understand who is coming back. Track guest return rates, average lifetime value, and most ordered items by cohort to build highly targeted loyalty campaigns.',
                image: '/landing/photo-1554224155-8d04cb21cd6c-b969db81.webp',
                benefits: ['Identify your most valuable regulars', 'Track VIP spend over time', 'Measure loyalty program success']
            }
        ]
    },
    'virtual-studio': {
        title: 'The Premium "Virtual Studio" Service',
        subtext: 'A world-class digital menu requires world-class assets. Our end-to-end "Virtual Studio" service handles the entire onboarding process. From professional food photography to 3D photogrammetry, we do the heavy lifting.',
        heroImage: '/landing/img-25c303f5.webp',
        subFeatures: [
            {
                title: 'On-Site Photography Crew',
                description: 'We deploy specialized culinary photographers to your restaurant. They capture mouth-watering, perfectly lit imagery that elevates your brand and makes dishes look irresistible.',
                image: '/landing/img-0d40d835.webp',
                benefits: ['Professional lighting and styling', 'Consistent aesthetic guidelines', 'Rights-free usage for your social media']
            },
            {
                title: '3D Photogrammetry Scanning',
                description: 'For your signature dishes, our technicians use advanced 3D scanning arrays to create optimized, lightweight AR models that look indistinguishable from real life.',
                image: '/landing/img-1c78575d.webp',
                benefits: ['Sub-millimeter texture accuracy', 'Optimized for mobile network loading', 'Lifelike lighting responses in AR']
            },
            {
                title: 'Total Menu Digitization',
                description: 'Hand us a paper menu, and we give you a fully operational ecosystem. We manually input every dish, write compelling descriptions, set up modifier trees, and configure tax settings.',
                image: '/landing/photo-1556740758-90de374c12ad-f6f48948.webp',
                benefits: ['Zero-effort onboarding', 'SEO-optimized dish descriptions', 'Perfect modifier logic mapping']
            }
        ]
    },
    'kds-integration': {
        title: 'Smart Kitchen Display System (KDS)',
        subtext: 'Replace lost paper tickets and miscommunications with a synchronized digital brain for your kitchen. Qrave KDS routes orders intelligently, tracks prep times, and keeps your back-of-house running in perfect harmony.',
        heroImage: '/landing/photo-1556742049-0cfed4f6a45d-2b030839.webp',
        subFeatures: [
            {
                title: 'Intelligent Station Routing',
                description: 'When an order comes in, the KDS splits it instantly. The grill cook only sees the steak, while the cold station sees the salad. When both are ready, the expo screen alerts the runner.',
                image: '/landing/photo-1556740758-90de374c12ad-f6f48948.webp',
                benefits: ['Eliminates kitchen shouting', 'Synchronized dish completion', 'Clear expo fulfillment view']
            },
            {
                title: 'Time-Based Escalation Alerts',
                description: 'Tickets automatically color-code from green to yellow to red based on your preset prep times. The expo manager instantly knows which tables are waiting too long.',
                image: '/landing/photo-1556742208-999815fca738-0acbb423.webp',
                color: 'bg-emerald-50/60',
                benefits: ['Visual SLA enforcement', 'Prevents completely forgotten orders', 'Auto-alerts manager on extreme delays']
            },
            {
                title: 'Digital Bump Bars & Touching',
                description: 'Built for the heat and grease of a commercial kitchen. Complete orders with a single tap on the touchscreen or use our ruggedized physical bump bars for rapid throughput.',
                image: '/landing/img-26ac90d1.webp',
                benefits: ['Grease and heat resistant hardware', '1-tap ticket clearing', 'Recall bumped tickets instantly']
            }
        ]
    },
    'advanced-inventory': {
        title: 'Advanced Inventory & Stock Intelligence',
        subtext: 'Stop selling dishes you can\'t cook. Our advanced inventory engine tracks ingredient depletion in real-time, automatically calculating stock levels with every order and hiding "86\'d" items from the menu.',
        heroImage: '/landing/photo-1542838132-92c53300491e-0e00a1e9.webp',
        subFeatures: [
            {
                title: 'Instant 86-ing Automations',
                description: 'When the ribeye runs out, it instantly drops off the mobile menu. Zero manual intervention required, meaning guests never order something the kitchen has to decline.',
                image: '/landing/photo-1556741533-974f8e62a92d-73e0e96b.webp',
                benefits: ['Prevents negative guest experiences', 'Updates across all devices instantly', 'Predictive depletion warnings']
            },
            {
                title: 'Recipe & Ingredient Mapping',
                description: 'Input your exact recipes. When a guest orders a Cheeseburger, Qrave automatically deducts 1 bun, 1 patty, and 2 slices of cheese from your master inventory ledger.',
                image: '/landing/photo-1551288049-bebda4e38f71-f8d3f6af.webp',
                benefits: ['Granular sub-ingredient tracking', 'Vendor ordering forecasts', 'Identifies over-portioning variance']
            },
            {
                title: 'Waste & Spoilage Auditing',
                description: 'Log dropped dishes, expired ingredients, and mistakes. Finally see the exact dollar amount of shrinkage hitting your bottom line every week and trace it to the source.',
                image: '/landing/img-a3d9342f.webp',
                benefits: ['Calculates exact financial loss of waste', 'Encourages kitchen accountability', 'Pinpoints problematic ingredients']
            }
        ]
    },
    'chefs-insights': {
        title: '"Chef\'s Insights" & Staff Performance',
        subtext: 'Your staff is your biggest expense and your best asset. The Chef\'s Insights module tracks performance at the individual server, cook, and manager level so you can reward your best players and coach those falling behind.',
        heroImage: '/landing/img-cac69d81.webp',
        subFeatures: [
            {
                title: 'Waiter Sales Leaderboards',
                description: 'See exactly who is driving your revenue. Track average ticket sizes, upsell success rates, and total sales by server. Use the data to incentivize staff with bonuses.',
                image: '/landing/photo-1556740758-90de374c12ad-f6f48948.webp',
                benefits: ['Identify top upsellers', 'Gamify staff performance', 'Track tip averages by employee']
            },
            {
                title: 'Kitchen Speed Analysis',
                description: 'Measure your kitchen\'s heartbeat. Track the average time from order-fire to expo-bump across different days, shifts, and specific menu items to identify bottlenecks.',
                image: '/landing/img-3ae516c3.webp',
                benefits: ['Find the slowest menu items', 'Measure prep time vs. target SLA', 'Evaluate BOH shift efficiency']
            },
            {
                title: 'Void & Comp Tracking',
                description: 'Keep a tight grip on security. Monitor which managers are heavily comping meals and which servers are voiding items most frequently to identify training gaps or potential theft.',
                image: '/landing/photo-1554224155-8d04cb21cd6c-b969db81.webp',
                benefits: ['Flag suspicious void patterns', 'Require manager PIN for large comps', 'Daily summary email of all discounts']
            }
        ]
    },
    'multi-location-management': {
        title: 'Enterprise Multi-Location HQ',
        subtext: 'Built to scale from 1 to 1,000 outlets. If you run a chain or franchise, our Enterprise HQ dashboard provides a "God Mode" view over your entire operation, allowing centralized control with localized flexibility.',
        heroImage: '/landing/photo-1554224155-8d04cb21cd6c-b969db81.webp',
        subFeatures: [
            {
                title: 'Centralized Master Menus',
                description: 'Maintain brand consistency effortlessly. Push a new seasonal item or update the price of a soda across all 50 of your locations with a single click from the HQ login.',
                image: '/landing/img-0d40d835.webp',
                benefits: ['1-click network-wide updates', 'Maintain strict brand standards', 'Allow limited local manager overrides']
            },
            {
                title: 'Aggregated Performance Dashboard',
                description: 'Stop dealing with spreadsheets. View aggregated revenue, labor costs, and top-selling items across your entire empire, or drill down to see why the Downtown branch is underperforming.',
                image: '/landing/photo-1551288049-bebda4e38f71-f8d3f6af.webp',
                benefits: ['Compare metrics side-by-side', 'Consolidated tax reporting', 'Network-wide inventory valuation']
            },
            {
                title: 'Role-Based Access Control',
                description: 'Ensure tight security. Grant the Executive Chef access to modify recipes globally, while giving a local Store Manager permissions only to 86 items and view their daily shift reports.',
                image: '/landing/img-abae91f0.webp',
                benefits: ['Enterprise-grade security hierarchies', 'Detailed audit logs of user actions', 'Prevent unauthorized menu changes']
            }
        ]
    }
};

const FeatureDetailPage = async ({ params }: { params: Promise<{ id: string }> }) => {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const feature = id ? featureData[id] : null;

    if (!feature) {
        notFound();
    }

    return (
        <div className="min-h-screen bg-[#FAF9F6] text-slate-900 overflow-x-hidden">
            <Navbar />

            <main className="pt-28 pb-20 lg:pt-36">

                {/* Navigation Breadcrumb */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
                    <Link
                        href="/#features"
                        className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-[#fe5c13] transition-colors"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Smart Features</span>
                        <span className="text-slate-300">/</span>
                        <span className="text-slate-900 font-extrabold">{feature.title}</span>
                    </Link>
                </div>

                {/* Hero Showcase Section */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20 lg:mb-28">
                    <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">

                        {/* Left Column Text */}
                        <div className="lg:col-span-6">
                            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-950 tracking-tight mb-6 leading-[1.1]">
                                {feature.title}
                            </h1>

                            <p className="text-base sm:text-xl text-slate-600 font-medium leading-relaxed mb-10">
                                {feature.subtext}
                            </p>

                            <div className="flex flex-col sm:flex-row items-center gap-4">
                                <a
                                    href="/#demo"
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-[#fe5c13] via-[#ff6a26] to-[#fe5c13] text-white px-8 py-4 rounded-full font-bold text-sm tracking-wide shadow-xl shadow-[#fe5c13]/25 hover:shadow-2xl hover:scale-[1.03] active:scale-[0.98] transition-all"
                                >
                                    <span>Book a Demo</span>
                                    <ArrowRight className="w-4 h-4" />
                                </a>

                                <Link
                                    href="/#features"
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-800 px-7 py-4 rounded-full font-bold text-sm hover:bg-slate-50 transition-all"
                                >
                                    <span>Explore All Features</span>
                                </Link>
                            </div>
                        </div>

                        {/* Right Column Hero Image */}
                        <div className="lg:col-span-6">
                            <div className="bg-white border border-slate-200/90 rounded-[2.5rem] p-3 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.06)] relative overflow-hidden">
                                <div className="relative rounded-[2rem] overflow-hidden aspect-video">
                                    <Image
                                        src={feature.heroImage}
                                        alt={feature.title}
                                        width={800}
                                        height={450}
                                        priority
                                        className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700"
                                    />
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Sub-Features Section */}
                <div className="bg-white border-t border-slate-200/80 rounded-t-[3rem] py-24 shadow-[0_-20px_50px_-15px_rgba(0,0,0,0.03)] relative z-10">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                        <div className="text-center mb-16 lg:mb-24">
                            <h2 className="text-3xl sm:text-5xl font-black text-slate-950 tracking-tight">
                                <span className="bg-gradient-to-r from-[#fe5c13] to-amber-600 bg-clip-text text-transparent">Everything</span> you need to succeed
                            </h2>
                        </div>

                        <div className="space-y-20 lg:space-y-28">
                            {feature.subFeatures.map((subFeature: any, index: number) => {
                                const isEven = index % 2 === 0;

                                return (
                                    <div key={index} className={`flex flex-col lg:flex-row items-center gap-12 lg:gap-20 ${isEven ? '' : 'lg:flex-row-reverse'}`}>

                                        {/* Image Box */}
                                        <div className="w-full lg:w-1/2">
                                            <div className="bg-[#FAF9F6] border border-slate-200/80 p-4 sm:p-6 rounded-[2.5rem] shadow-sm overflow-hidden group">
                                                <img
                                                    src={subFeature.image}
                                                    alt={subFeature.title}
                                                    className="w-full h-auto rounded-2xl object-cover shadow-md transform transition-transform duration-700 group-hover:scale-[1.03]"
                                                />
                                            </div>
                                        </div>

                                        {/* Text Box */}
                                        <div className="w-full lg:w-1/2 flex flex-col items-start">
                                            <h3 className="text-2xl sm:text-4xl font-extrabold text-slate-950 mb-4 leading-tight">
                                                {subFeature.title}
                                            </h3>
                                            <p className="text-sm sm:text-base text-slate-600 font-medium leading-relaxed mb-6">
                                                {subFeature.description}
                                            </p>
                                            <ul className="space-y-3">
                                                {(subFeature.benefits || []).map((benefit: string, bIdx: number) => (
                                                    <li key={bIdx} className="flex items-center text-slate-800 font-bold text-xs sm:text-sm">
                                                        <div className="w-5 h-5 rounded-full bg-orange-100 text-[#fe5c13] flex items-center justify-center shrink-0 mr-3">
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                        </div>
                                                        <span>{benefit}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                    </div>
                                )
                            })}
                        </div>

                    </div>
                </div>

                {/* Bottom CTA Area */}
                <div className="bg-white">
                    <CtaBanner />
                </div>

            </main>

            <Footer />
        </div>
    );
};

export default FeatureDetailPage;
