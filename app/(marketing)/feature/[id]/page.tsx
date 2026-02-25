import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
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
                color: 'bg-blue-50/50',
                benefits: ['True-to-scale dish representation', 'Increases appetite appeal instantly', 'Reduces "not what I expected" complaints']
            },
            {
                title: 'Zero App Downloads Required',
                description: 'Remove all friction from the experience. Leveraging native WebXR technology, your 3D menu runs smoothly within Safari or Chrome the moment a customer scans the QR code.',
                image: '/landing/photo-1551218808-94e220e084d2-6416967a.webp',
                color: 'bg-green-50/50',
                benefits: ['Frictionless 1-second load time', 'Works on iOS and Android', 'No account creation needed']
            },
            {
                title: 'Proven Upsell Conversions',
                description: 'When people see delicious food, they order more. Restaurants using our WebAR technology see a consistent 15-20% increase in premium add-ons and dessert attachments.',
                image: '/landing/photo-1546069901-ba9599a7e63c-079676da.webp',
                color: 'bg-amber-50/50',
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
                color: 'bg-purple-50/50',
                benefits: ['Eliminates manual order entry errors', 'Servers focus on hospitality, not typing', 'Orders fire to kitchen instantly']
            },
            {
                title: 'Dynamic Modifier Engine',
                description: 'Make upselling effortless. Create complex modifier groups, from mandatory meat temperatures to optional premium toppings, all presented beautifully to the user.',
                image: '/landing/photo-1556740738-b6a63e27c4df-42a90b38.webp',
                color: 'bg-orange-50/50',
                benefits: ['Unlimited nested modifiers', 'Visual upgrade prompts', 'Dietary restriction badges']
            },
            {
                title: 'Live Menu Syncing',
                description: 'Updating your menu is no longer a printing nightmare. Change prices, update descriptions, or swap seasonal dishes from your dashboard, and it reflects on customer phones instantly.',
                image: '/landing/img-616cde4d.webp',
                color: 'bg-blue-50/50',
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
                color: 'bg-rose-50/50',
                benefits: ['Increases table turnover by 18%', 'Frictionless bill splitting', 'Supports Google Pay, PhonePe, Paytm']
            },
            {
                title: 'Unified Digital Ledger',
                description: 'Stop manually reconciling paper receipts. All digital payments automatically log into your central Qrave dashboard alongside cash transactions for painless end-of-day closing.',
                image: '/landing/img-9a9d75ea.webp',
                color: 'bg-amber-50/50',
                benefits: ['1-click end-of-day reconciliation', 'Prevents staff pilferage', 'Exportable to accounting software']
            },
            {
                title: 'Seamless Tipping Mechanics',
                description: 'When tipping is digital, private, and suggested elegantly at checkout, servers make more money. Our UX encourages higher tip percentages by removing the awkwardness.',
                image: '/landing/img-abae91f0.webp',
                color: 'bg-green-50/50',
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
                color: 'bg-indigo-50/50',
                benefits: ['Menu engineering made automatic', 'Identify invisible profit leaks', 'Data-driven pricing decisions']
            },
            {
                title: 'Live Heatmaps & Peak Tracking',
                description: 'Visualize your restaurant\'s busiest hours across the week. Accurately forecast rushes, optimize your kitchen prep, and schedule staff with pinpoint accuracy saving labor costs.',
                image: '/landing/img-a3d9342f.webp',
                color: 'bg-cyan-50/50',
                benefits: ['Optimize shift scheduling', 'Track average ticket times during peaks', 'Analyze weather vs. sales correlations']
            },
            {
                title: 'Customer Retention Metrics',
                description: 'Understand who is coming back. Track guest return rates, average lifetime value, and most ordered items by cohort to build highly targeted loyalty campaigns.',
                image: '/landing/photo-1554224155-8d04cb21cd6c-b969db81.webp',
                color: 'bg-fuchsia-50/50',
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
                color: 'bg-amber-50/50',
                benefits: ['Professional lighting and styling', 'Consistent aesthetic guidelines', 'Rights-free usage for your social media']
            },
            {
                title: '3D Photogrammetry Scanning',
                description: 'For your signature dishes, our technicians use advanced 3D scanning arrays to create optimized, lightweight AR models that look indistinguishable from real life.',
                image: '/landing/img-1c78575d.webp',
                color: 'bg-blue-50/50',
                benefits: ['Sub-millimeter texture accuracy', 'Optimized for mobile network loading', 'Lifelike lighting responses in AR']
            },
            {
                title: 'Total Menu Digitization',
                description: 'Hand us a paper menu, and we give you a fully operational ecosystem. We manually input every dish, write compelling descriptions, set up modifier trees, and configure tax settings.',
                image: '/landing/photo-1556740758-90de374c12ad-f6f48948.webp',
                color: 'bg-green-50/50',
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
                color: 'bg-rose-50/50',
                benefits: ['Eliminates kitchen shouting', 'Synchronized dish completion', 'Clear expo fulfillment view']
            },
            {
                title: 'Time-Based Escalation Alerts',
                description: 'Tickets automatically color-code from green to yellow to red based on your preset prep times. The expo manager instantly knows which tables are waiting too long.',
                image: '/landing/photo-1556742208-999815fca738-0acbb423.webp',
                color: 'bg-emerald-50/50',
                benefits: ['Visual SLA enforcement', 'Prevents completely forgotten orders', 'Auto-alerts manager on extreme delays']
            },
            {
                title: 'Digital Bump Bars & Touching',
                description: 'Built for the heat and grease of a commercial kitchen. Complete orders with a single tap on the touchscreen or use our ruggedized physical bump bars for rapid throughput.',
                image: '/landing/img-26ac90d1.webp',
                color: 'bg-orange-50/50',
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
                color: 'bg-purple-50/50',
                benefits: ['Prevents negative guest experiences', 'Updates across all devices instantly', 'Predictive depletion warnings']
            },
            {
                title: 'Recipe & Ingredient Mapping',
                description: 'Input your exact recipes. When a guest orders a Cheeseburger, Qrave automatically deducts 1 bun, 1 patty, and 2 slices of cheese from your master inventory ledger.',
                image: '/landing/photo-1551288049-bebda4e38f71-f8d3f6af.webp',
                color: 'bg-orange-50/50',
                benefits: ['Granular sub-ingredient tracking', 'Vendor ordering forecasts', 'Identifies over-portioning variance']
            },
            {
                title: 'Waste & Spoilage Auditing',
                description: 'Log dropped dishes, expired ingredients, and mistakes. Finally see the exact dollar amount of shrinkage hitting your bottom line every week and trace it to the source.',
                image: '/landing/img-a3d9342f.webp',
                color: 'bg-rose-50/50',
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
                color: 'bg-indigo-50/50',
                benefits: ['Identify top upsellers', 'Gamify staff performance', 'Track tip averages by employee']
            },
            {
                title: 'Kitchen Speed Analysis',
                description: 'Measure your kitchen\'s heartbeat. Track the average time from order-fire to expo-bump across different days, shifts, and specific menu items to identify bottlenecks.',
                image: '/landing/img-3ae516c3.webp',
                color: 'bg-cyan-50/50',
                benefits: ['Find the slowest menu items', 'Measure prep time vs. target SLA', 'Evaluate BOH shift efficiency']
            },
            {
                title: 'Void & Comp Tracking',
                description: 'Keep a tight grip on security. Monitor which managers are heavily comping meals and which servers are voiding items most frequently to identify training gaps or potential theft.',
                image: '/landing/photo-1554224155-8d04cb21cd6c-b969db81.webp',
                color: 'bg-red-50/50',
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
                color: 'bg-blue-50/50',
                benefits: ['1-click network-wide updates', 'Maintain strict brand standards', 'Allow limited local manager overrides']
            },
            {
                title: 'Aggregated Performance Dashboard',
                description: 'Stop dealing with spreadsheets. View aggregated revenue, labor costs, and top-selling items across your entire empire, or drill down to see why the Downtown branch is underperforming.',
                image: '/landing/photo-1551288049-bebda4e38f71-f8d3f6af.webp',
                color: 'bg-green-50/50',
                benefits: ['Compare metrics side-by-side', 'Consolidated tax reporting', 'Network-wide inventory valuation']
            },
            {
                title: 'Role-Based Access Control',
                description: 'Ensure tight security. Grant the Executive Chef access to modify recipes globally, while giving a local Store Manager permissions only to 86 items and view their daily shift reports.',
                image: '/landing/img-abae91f0.webp',
                color: 'bg-slate-50/50',
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
        <div className="min-h-screen bg-[#F8F9FA] overflow-x-hidden">
            <Navbar /> {/* Always solid navbar on this page, handle scroll inside */}

            <main className="pt-28 pb-20">

                {/* Back Link */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
                    <Link href="/#features" className="inline-flex items-center text-sm font-semibold text-gray-500 hover:text-[#1F2127] transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Smart Features
                    </Link>
                </div>

                {/* Hero Section */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-24">
                    <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

                        <div className="max-w-xl">
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-[#1F2127] tracking-tight mb-8 leading-[1.15]">
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1F2127] to-[#4A4D57]">
                                    {feature.title}
                                </span>
                            </h1>

                            <p className="text-lg md:text-xl text-gray-600 font-medium leading-relaxed mb-10">
                                {feature.subtext}
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <a href="/#demo" className="inline-flex justify-center items-center bg-[#FFC529] hover:bg-[#F0B820] text-[#1F2127] px-8 py-4 rounded-xl font-bold text-[15px] transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5">
                                    Book A Demo
                                </a>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 bg-[#FFC529]/10 rounded-[2rem] transform rotate-3 scale-105 z-0" />
                            <Image
                                src={feature.heroImage}
                                alt={feature.title}
                                width={800}
                                height={450}
                                priority
                                className="relative z-10 w-full aspect-video object-cover rounded-[2rem] shadow-xl border border-gray-100"
                            />
                        </div>

                    </div>
                </div>

                {/* Diagonal Separator */}
                <div className="w-full h-24 bg-white transform -skew-y-2 origin-top-left -mb-12 border-t border-gray-100" />

                {/* Sub-Features Section (White Background) */}
                <div className="bg-white py-24 relative z-10">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                        <div className="text-center mb-16 lg:mb-24">
                            <h2 className="text-3xl md:text-4xl font-black text-[#1F2127] tracking-tight">
                                <span className="text-[#FFC529]">Everything</span> you need to succeed
                            </h2>
                        </div>

                        <div className="space-y-24">
                            {feature.subFeatures.map((subFeature: any, index: number) => {
                                const isEven = index % 2 === 0;

                                return (
                                    <div key={index} className={`flex flex-col lg:flex-row items-center gap-12 lg:gap-20 ${isEven ? '' : 'lg:flex-row-reverse'}`}>

                                        {/* Image Box */}
                                        <div className="w-full lg:w-1/2">
                                            <div className={`p-8 md:p-12 rounded-[2rem] ${subFeature.color} relative overflow-hidden group`}>
                                                <img
                                                    src={subFeature.image}
                                                    alt={subFeature.title}
                                                    className="w-full h-auto rounded-xl shadow-lg transform transition-transform duration-700 group-hover:scale-105 group-hover:-translate-y-2"
                                                />
                                            </div>
                                        </div>

                                        {/* Text Box */}
                                        <div className="w-full lg:w-1/2 flex flex-col items-start">
                                            <h3 className="text-3xl md:text-4xl font-bold text-[#1F2127] mb-6 leading-tight">
                                                {subFeature.title}
                                            </h3>
                                            <p className="text-[17px] text-gray-500 font-medium leading-[1.7] mb-8">
                                                {subFeature.description}
                                            </p>
                                            <ul className="space-y-3 mt-4">
                                                {(subFeature.benefits || []).map((benefit: string, bIdx: number) => (
                                                    <li key={bIdx} className="flex items-center text-[#1F2127] font-semibold text-sm">
                                                        <CheckCircle2 className="w-5 h-5 text-[#FFC529] mr-3 flex-shrink-0" />
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
                <div className="mt-12 bg-white">
                    <CtaBanner />
                </div>

            </main>

            <Footer />
        </div>
    );
};

export default FeatureDetailPage;
