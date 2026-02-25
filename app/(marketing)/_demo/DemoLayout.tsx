import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
    ChefHat,
    ClipboardList,
    QrCode,
    Menu as MenuIcon,
    X,
    ArrowLeft,
    Calendar,
    ExternalLink,
    Monitor,
} from 'lucide-react';

export type DemoTab = 'studio' | 'inventory' | 'qr';

interface DemoLayoutProps {
    activeTab: DemoTab;
    onTabChange: (tab: DemoTab) => void;
    children: ReactNode;
}

const nav = [
    { key: 'studio' as const, label: 'Menu Studio', icon: ChefHat, desc: 'Design your menu card' },
    { key: 'inventory' as const, label: 'Menu Inventory', icon: ClipboardList, desc: 'Manage items & categories' },
    { key: 'qr' as const, label: 'QR Menu', icon: QrCode, desc: 'Generate QR for menu access' },
];

export default function DemoLayout({ activeTab, onTabChange, children }: DemoLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen overflow-hidden bg-[#F9FAFB]">
            {/* Backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-gray-200 bg-white transition-transform lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <button
                    className="absolute right-4 top-4 rounded-lg p-2 text-gray-400 hover:bg-gray-100 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                >
                    <X className="h-5 w-5" />
                </button>

                {/* Brand */}
                <Link href="/" className="flex items-center gap-3 border-b border-gray-100 px-6 py-6">
                    <img
                        src="/landing/image.png"
                        alt="Qrave Logo"
                        className="h-10 w-10 rounded-lg object-contain"
                    />
                    <div>
                        <span className="text-lg font-extrabold tracking-tight text-gray-900">QRAVE</span>
                        <p className="text-[11px] font-medium text-gray-500">Demo Studio</p>
                    </div>
                </Link>

                {/* Nav */}
                <nav className="flex-1 space-y-1 px-3 py-5">
                    {nav.map((entry) => {
                        const Icon = entry.icon;
                        const active = activeTab === entry.key;
                        return (
                            <button
                                key={entry.key}
                                onClick={() => {
                                    onTabChange(entry.key);
                                    setSidebarOpen(false);
                                }}
                                className={`group w-full rounded-xl px-4 py-3.5 text-left transition-all ${active
                                    ? 'bg-[#FFC529]/10 border border-[#FFC529]/20'
                                    : 'hover:bg-gray-50 border border-transparent'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`rounded-lg p-2 transition-colors ${active
                                            ? 'bg-gradient-to-br from-[#FFC529] to-[#F0B820] text-white shadow-md shadow-[#FFC529]/25'
                                            : 'bg-gray-100 text-gray-400 group-hover:text-gray-600'
                                            }`}
                                    >
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <span
                                            className={`text-sm font-semibold ${active ? 'text-gray-900' : 'text-gray-500 group-hover:text-gray-700'
                                                }`}
                                        >
                                            {entry.label}
                                        </span>
                                        <p className="text-[11px] text-gray-400">{entry.desc}</p>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </nav>

                {/* Disclaimer & CTA Card */}
                <div className="mx-3 mt-4 mb-6">
                    <div className="rounded-2xl border border-[#FFC529]/10 bg-gradient-to-br from-[#FDFCF6] to-[#F9FAFB] p-4 ring-1 ring-[#FFC529]/5">
                        <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFC529]/10">
                            <Calendar className="h-4 w-4 text-[#FFC529]" />
                        </div>
                        <h3 className="mb-1.5 text-xs font-bold text-gray-900">Disclaimer</h3>
                        <p className="mb-4 text-[11px] leading-relaxed text-gray-500">
                            This demo offers a limited preview. Actual features and interface may vary. For the complete QRAVE experience, schedule a full walkthrough.
                        </p>
                        <Link
                            href="/#demo"
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-[11px] font-bold text-white transition-all hover:bg-black active:scale-[0.98]"
                        >
                            Book a Full Demo
                            <ExternalLink className="h-3 w-3" />
                        </Link>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-100 px-5 py-4">
                    <Link
                        href="/"
                        className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Home
                    </Link>
                </div>
            </aside>

            {/* Main content */}
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                {/* Top bar */}
                {activeTab !== 'inventory' ? (
                    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white/80 px-5 backdrop-blur-xl">
                        <div className="flex items-center gap-3">
                            <button
                                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 lg:hidden"
                                onClick={() => setSidebarOpen(true)}
                            >
                                <MenuIcon className="h-5 w-5" />
                            </button>
                            <div>
                                <h1 className="text-base font-bold text-gray-900">
                                    {nav.find((n) => n.key === activeTab)?.label}
                                </h1>
                                <p className="text-[11px] text-gray-500">
                                    {nav.find((n) => n.key === activeTab)?.desc}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="rounded-full bg-[#FFC529]/10 px-3 py-1 text-[11px] font-bold text-[#FFC529]">
                                DEMO MODE
                            </span>
                        </div>
                    </header>
                ) : (
                    <header className="flex items-center border-b border-gray-200 bg-white/80 px-5 py-2 backdrop-blur-xl lg:hidden">
                        <button
                            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <MenuIcon className="h-5 w-5" />
                        </button>
                    </header>
                )}

                {/* Content */}
                <main className="flex-1 overflow-y-auto relative">
                    {/* Mobile gate for Studio tab */}
                    {activeTab === 'studio' && (
                        <div className="lg:hidden absolute inset-0 z-50 flex items-center justify-center bg-white">
                            <div className="flex flex-col items-center text-center px-8 max-w-sm">
                                <div className="w-20 h-20 rounded-2xl bg-[#FFC529]/10 flex items-center justify-center mb-6">
                                    <Monitor className="w-10 h-10 text-[#FFC529]" />
                                </div>
                                <h2 className="text-2xl font-black text-[#1F2127] mb-3 tracking-tight">Switch to Desktop</h2>
                                <p className="text-gray-500 font-medium text-[15px] leading-relaxed mb-6">
                                    The Menu Studio requires a laptop or desktop screen for the best design experience. Please open this page on a larger device.
                                </p>
                                <div className="flex flex-col gap-3 w-full">
                                    <button
                                        onClick={() => onTabChange('inventory')}
                                        className="w-full px-6 py-3 bg-[#FFC529] hover:bg-[#F0B820] text-[#1F2127] font-bold text-sm rounded-xl transition-all shadow-sm"
                                    >
                                        Open Menu Inventory
                                    </button>
                                    <button
                                        onClick={() => onTabChange('qr')}
                                        className="w-full px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm rounded-xl transition-all"
                                    >
                                        Open QR Generator
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {children}
                </main>
            </div>
        </div>
    );
}
