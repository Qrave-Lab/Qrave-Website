export interface SubFeature {
    title: string;
    description: string;
    benefits: string[];
    /** Optional headline figure for this capability (existing marketing claim). */
    stat?: { value: string; label: string };
}

export interface Feature {
    title: string;
    subtext: string;
    subFeatures: SubFeature[];
}

export const featureData: Record<string, Feature> = {
    'webar': {
        title: 'Immersive WebAR Menu Visualization',
        subtext: 'Elevate your dining experience with photorealistic 3D representations of your dishes. Our WebAR technology runs directly in the mobile browser—no app downloads needed. Allow customers to see, rotate, and crave their food before they order, reducing send-backs and increasing check sizes.',
        subFeatures: [
            {
                title: 'Photorealistic 3D Rendering',
                description: 'We turn your static menu into an interactive playground. Guests can view true-to-scale, hyper-realistic 3D models of their meals right on their tables through their phone cameras.',
                benefits: ['True-to-scale dish representation', 'Increases appetite appeal instantly', 'Reduces "not what I expected" complaints']
            },
            {
                title: 'Zero App Downloads Required',
                description: 'Remove all friction from the experience. Leveraging native WebXR technology, your 3D menu runs smoothly within Safari or Chrome the moment a customer scans the QR code.',
                benefits: ['Frictionless 1-second load time', 'Works on iOS and Android', 'No account creation needed']
            },
            {
                title: 'Proven Upsell Conversions',
                stat: { value: '15–20%', label: 'more premium add-ons and dessert attachments' },
                description: 'When people see delicious food, they order more. Restaurants using our WebAR technology see a consistent 15-20% increase in premium add-ons and dessert attachments.',
                benefits: ['Drives premium item sales', 'Visual upsells convert 3x better', 'Automated dessert suggestions']
            }
        ]
    },
    'qr-ordering': {
        title: 'Zero-Friction QR Ordering Ecosystem',
        subtext: 'Transform your tables into autonomous ordering stations. Guests scan a beautiful, branded QR code to browse your dynamic digital menu, customize their meals, and send orders directly to the kitchen without waiting to catch a server\'s eye.',
        subFeatures: [
            {
                title: 'Table-Specific Routing',
                description: 'Every QR code is uniquely tied to a specific table number. When a guest orders, the ticket instantly appears on your Kitchen Display System with the correct table mapped automatically.',
                benefits: ['Eliminates manual order entry errors', 'Servers focus on hospitality, not typing', 'Orders fire to kitchen instantly']
            },
            {
                title: 'Dynamic Modifier Engine',
                description: 'Make upselling effortless. Create complex modifier groups, from mandatory meat temperatures to optional premium toppings, all presented beautifully to the user.',
                benefits: ['Unlimited nested modifiers', 'Visual upgrade prompts', 'Dietary restriction badges']
            },
            {
                title: 'Live Menu Syncing',
                description: 'Updating your menu is no longer a printing nightmare. Change prices, update descriptions, or swap seasonal dishes from your dashboard, and it reflects on customer phones instantly.',
                benefits: ['Zero printing costs for menu updates', 'Instantly fix typos or pricing', 'Schedule limited-time offers']
            }
        ]
    },
    'upi-billing': {
        title: 'Integrated UPI Billing & Lightning Payments',
        subtext: 'Close out tables 3x faster. Our native UPI integration allows guests to split checks, leave tips, and settle their bills securely from their own devices, dramatically improving table turnover rates during peak hours.',
        subFeatures: [
            {
                title: 'Instant Table Settlements',
                stat: { value: '18%', label: 'higher table turnover' },
                description: 'No more waving down a waiter for the card machine. Guests can view their live tab, split it among friends, and pay via any major UPI app in under 10 seconds.',
                benefits: ['Increases table turnover by 18%', 'Frictionless bill splitting', 'Supports Google Pay, PhonePe, Paytm']
            },
            {
                title: 'Unified Digital Ledger',
                description: 'Stop manually reconciling paper receipts. All digital payments automatically log into your central Qrave dashboard alongside cash transactions for painless end-of-day closing.',
                benefits: ['1-click end-of-day reconciliation', 'Prevents staff pilferage', 'Exportable to accounting software']
            },
            {
                title: 'Seamless Tipping Mechanics',
                stat: { value: '22%', label: 'higher average staff tips' },
                description: 'When tipping is digital, private, and suggested elegantly at checkout, servers make more money. Our UX encourages higher tip percentages by removing the awkwardness.',
                benefits: ['Increases average staff tips by 22%', 'Customizable preset percentages', 'Distributed directly to server ID']
            }
        ]
    },
    'analytics': {
        title: 'Strategic Business Intelligence Dashboard',
        subtext: 'Stop guessing and start knowing. Qrave\'s analytics suite transforms raw data into actionable insights, providing real-time tracking of revenue, hourly sales breakdowns, inventory waste, and customer flow heatmaps.',
        subFeatures: [
            {
                title: 'Profitability Matrix Categorization',
                description: 'We automatically map your menu onto a Boston Consulting Group matrix. Instantly identify your Stars (high profit, high volume) and your Dogs (low profit, low volume) to optimize your offerings.',
                benefits: ['Menu engineering made automatic', 'Identify invisible profit leaks', 'Data-driven pricing decisions']
            },
            {
                title: 'Live Heatmaps & Peak Tracking',
                description: 'Visualize your restaurant\'s busiest hours across the week. Accurately forecast rushes, optimize your kitchen prep, and schedule staff with pinpoint accuracy saving labor costs.',
                benefits: ['Optimize shift scheduling', 'Track average ticket times during peaks', 'Analyze weather vs. sales correlations']
            },
            {
                title: 'Customer Retention Metrics',
                description: 'Understand who is coming back. Track guest return rates, average lifetime value, and most ordered items by cohort to build highly targeted loyalty campaigns.',
                benefits: ['Identify your most valuable regulars', 'Track VIP spend over time', 'Measure loyalty program success']
            }
        ]
    },
    'virtual-studio': {
        title: 'The Premium "Virtual Studio" Service',
        subtext: 'A world-class digital menu requires world-class assets. Our end-to-end "Virtual Studio" service handles the entire onboarding process. From professional food photography to 3D photogrammetry, we do the heavy lifting.',
        subFeatures: [
            {
                title: 'On-Site Photography Crew',
                description: 'We deploy specialized culinary photographers to your restaurant. They capture mouth-watering, perfectly lit imagery that elevates your brand and makes dishes look irresistible.',
                benefits: ['Professional lighting and styling', 'Consistent aesthetic guidelines', 'Rights-free usage for your social media']
            },
            {
                title: '3D Photogrammetry Scanning',
                description: 'For your signature dishes, our technicians use advanced 3D scanning arrays to create optimized, lightweight AR models that look indistinguishable from real life.',
                benefits: ['Sub-millimeter texture accuracy', 'Optimized for mobile network loading', 'Lifelike lighting responses in AR']
            },
            {
                title: 'Total Menu Digitization',
                description: 'Hand us a paper menu, and we give you a fully operational ecosystem. We manually input every dish, write compelling descriptions, set up modifier trees, and configure tax settings.',
                benefits: ['Zero-effort onboarding', 'SEO-optimized dish descriptions', 'Perfect modifier logic mapping']
            }
        ]
    },
    'kds-integration': {
        title: 'Smart Kitchen Display System (KDS)',
        subtext: 'Replace lost paper tickets and miscommunications with a synchronized digital brain for your kitchen. Qrave KDS routes orders intelligently, tracks prep times, and keeps your back-of-house running in perfect harmony.',
        subFeatures: [
            {
                title: 'Intelligent Station Routing',
                description: 'When an order comes in, the KDS splits it instantly. The grill cook only sees the steak, while the cold station sees the salad. When both are ready, the expo screen alerts the runner.',
                benefits: ['Eliminates kitchen shouting', 'Synchronized dish completion', 'Clear expo fulfillment view']
            },
            {
                title: 'Time-Based Escalation Alerts',
                description: 'Tickets automatically color-code from green to yellow to red based on your preset prep times. The expo manager instantly knows which tables are waiting too long.',
                benefits: ['Visual SLA enforcement', 'Prevents completely forgotten orders', 'Auto-alerts manager on extreme delays']
            },
            {
                title: 'Digital Bump Bars & Touching',
                description: 'Built for the heat and grease of a commercial kitchen. Complete orders with a single tap on the touchscreen or use our ruggedized physical bump bars for rapid throughput.',
                benefits: ['Grease and heat resistant hardware', '1-tap ticket clearing', 'Recall bumped tickets instantly']
            }
        ]
    },
    'advanced-inventory': {
        title: 'Advanced Inventory & Stock Intelligence',
        subtext: 'Stop selling dishes you can\'t cook. Our advanced inventory engine tracks ingredient depletion in real-time, automatically calculating stock levels with every order and hiding "86\'d" items from the menu.',
        subFeatures: [
            {
                title: 'Instant 86-ing Automations',
                description: 'When the ribeye runs out, it instantly drops off the mobile menu. Zero manual intervention required, meaning guests never order something the kitchen has to decline.',
                benefits: ['Prevents negative guest experiences', 'Updates across all devices instantly', 'Predictive depletion warnings']
            },
            {
                title: 'Recipe & Ingredient Mapping',
                description: 'Input your exact recipes. When a guest orders a Cheeseburger, Qrave automatically deducts 1 bun, 1 patty, and 2 slices of cheese from your master inventory ledger.',
                benefits: ['Granular sub-ingredient tracking', 'Vendor ordering forecasts', 'Identifies over-portioning variance']
            },
            {
                title: 'Waste & Spoilage Auditing',
                description: 'Log dropped dishes, expired ingredients, and mistakes. Finally see the exact dollar amount of shrinkage hitting your bottom line every week and trace it to the source.',
                benefits: ['Calculates exact financial loss of waste', 'Encourages kitchen accountability', 'Pinpoints problematic ingredients']
            }
        ]
    },
    'accounting': {
        title: 'Enterprise Accounting & GST Compliance',
        subtext: 'Run the money side of your restaurant without spreadsheets. Qrave handles accounts payable, B2B credit notes and GST reporting in the same system that takes your orders, so your books are ready when your accountant asks.',
        subFeatures: [
            {
                title: 'Automated Accounts Payable',
                description: 'Purchase orders, supplier bills and payments live in one ledger. Every bill is matched to what you actually received, so you always know what you owe and when it is due.',
                benefits: ['Supplier bills linked to purchase orders', 'Due-date tracking for every payable', 'Payment history per supplier']
            },
            {
                title: 'B2B Credit Notes',
                description: 'Issue and track credit notes for returns, corrections and disputes. Each one adjusts the right invoice and flows into your tax reports automatically.',
                benefits: ['Credit notes tied to the original invoice', 'Automatic ledger and tax adjustments', 'Clear audit trail for every change']
            },
            {
                title: 'GSTR-1 & GSTR-3B Reports',
                description: 'Generate your tax liability reports straight from recorded sales and purchases. No copying figures between sheets at month end.',
                benefits: ['GSTR-1 and GSTR-3B ready from live data', 'Tax liability visible before filing', 'Exportable for your accountant']
            },
            {
                title: 'Seamless Tally Integration',
                description: 'Send vouchers to Tally so your accountant keeps working in the tool they already use. Zero manual reconciliation between your restaurant and your books.',
                benefits: ['Sales and purchase vouchers exported to Tally', 'Consistent ledger mapping', 'No double entry']
            }
        ]
    },
    'chefs-insights': {
        title: '"Chef\'s Insights" & Staff Performance',
        subtext: 'Your staff is your biggest expense and your best asset. The Chef\'s Insights module tracks performance at the individual server, cook, and manager level so you can reward your best players and coach those falling behind.',
        subFeatures: [
            {
                title: 'Waiter Sales Leaderboards',
                description: 'See exactly who is driving your revenue. Track average ticket sizes, upsell success rates, and total sales by server. Use the data to incentivize staff with bonuses.',
                benefits: ['Identify top upsellers', 'Gamify staff performance', 'Track tip averages by employee']
            },
            {
                title: 'Kitchen Speed Analysis',
                description: 'Measure your kitchen\'s heartbeat. Track the average time from order-fire to expo-bump across different days, shifts, and specific menu items to identify bottlenecks.',
                benefits: ['Find the slowest menu items', 'Measure prep time vs. target SLA', 'Evaluate BOH shift efficiency']
            },
            {
                title: 'Void & Comp Tracking',
                description: 'Keep a tight grip on security. Monitor which managers are heavily comping meals and which servers are voiding items most frequently to identify training gaps or potential theft.',
                benefits: ['Flag suspicious void patterns', 'Require manager PIN for large comps', 'Daily summary email of all discounts']
            }
        ]
    },
    'multi-location-management': {
        title: 'Enterprise Multi-Location HQ',
        subtext: 'Built to scale from 1 to 1,000 outlets. If you run a chain or franchise, our Enterprise HQ dashboard provides a "God Mode" view over your entire operation, allowing centralized control with localized flexibility.',
        subFeatures: [
            {
                title: 'Centralized Master Menus',
                description: 'Maintain brand consistency effortlessly. Push a new seasonal item or update the price of a soda across all 50 of your locations with a single click from the HQ login.',
                benefits: ['1-click network-wide updates', 'Maintain strict brand standards', 'Allow limited local manager overrides']
            },
            {
                title: 'Aggregated Performance Dashboard',
                description: 'Stop dealing with spreadsheets. View aggregated revenue, labor costs, and top-selling items across your entire empire, or drill down to see why the Downtown branch is underperforming.',
                benefits: ['Compare metrics side-by-side', 'Consolidated tax reporting', 'Network-wide inventory valuation']
            },
            {
                title: 'Role-Based Access Control',
                description: 'Ensure tight security. Grant the Executive Chef access to modify recipes globally, while giving a local Store Manager permissions only to 86 items and view their daily shift reports.',
                benefits: ['Enterprise-grade security hierarchies', 'Detailed audit logs of user actions', 'Prevent unauthorized menu changes']
            }
        ]
    }
};
