import { useState } from 'react';
import { useMenu } from '../../../_context/MenuContext';
import { useStudio } from '../context/StudioContext';
import { Search, Plus, ShoppingBag, Smartphone, ChevronUp, Star, Bell, Droplets, Box } from 'lucide-react';
import type { MenuItem } from '../../../types/menu';

interface LiveMenuPreviewProps {
    onEditItem?: (item: MenuItem) => void;
    onAddItem?: () => void;
}

export default function LiveMenuPreview({ onEditItem, onAddItem }: LiveMenuPreviewProps) {
    const { state: studioState } = useStudio();
    const { state: menuState } = useMenu();
    const { theme } = studioState;
    const { restaurant, categories, subcategories, items } = menuState;

    const [cartCount, setCartCount] = useState(0);
    const [cartTotal, setCartTotal] = useState(0);

    const handleAddToCart = (e: React.MouseEvent, price: number) => {
        e.stopPropagation();
        setCartCount(prev => prev + 1);
        setCartTotal(prev => prev + price);
    };

    // ─── Dynamic Style Mappings ────────────────────────────────

    const containerStyle = {
        backgroundColor: theme.colors.background,
        color: theme.colors.text,
        fontFamily: theme.fontFamily,
    };

    const cardStyle = {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.cardStyle === 'Flat' ? '0px' : theme.cardStyle === 'Bordered' ? '16px' : '14px',
        boxShadow: theme.cardStyle === 'Shadow' ? '0 6px 24px rgba(0,0,0,0.06)' : 'none',
        border: theme.cardStyle === 'Bordered' ? `1px solid ${theme.colors.muted}25` : 'none',
        padding: theme.cardStyle === 'Shadow' || theme.cardStyle === 'Bordered' ? '12px' : '0',
    };

    const btnStyle = (() => {
        switch (theme.buttonStyle) {
            case 'Outline': return { bg: 'transparent', text: theme.colors.accent, border: `1.5px solid ${theme.colors.accent}`, radius: '10px' };
            case 'Ghost': return { bg: `${theme.colors.accent}12`, text: theme.colors.accent, border: 'none', radius: '10px' };
            case 'Pill': return { bg: theme.colors.accent, text: theme.colors.accentText, border: 'none', radius: '9999px' };
            case 'Solid':
            default: return { bg: theme.colors.accent, text: theme.colors.accentText, border: 'none', radius: '10px' };
        }
    })();

    const iconProps = (() => {
        switch (theme.iconPack) {
            case 'Line': return { strokeWidth: 1.25, fill: 'none' };
            case 'Solid': return { strokeWidth: 0, fill: 'currentColor' };
            case 'Duotone': return { strokeWidth: 1.5, fill: 'currentColor', fillOpacity: 0.15 };
            case 'Auto':
            default: return { strokeWidth: 1.75, fill: 'none' };
        }
    })();

    const motifClasses = (() => {
        switch (theme.motif) {
            case 'Elegant': return 'flex-col items-center text-center gap-1';
            case 'Playful': return 'items-center gap-2 -rotate-1';
            case 'Classic': return 'items-center gap-3 border-b pb-3';
            case 'Minimal':
            default: return 'items-center gap-3 justify-between';
        }
    })();

    const headerClasses = (() => {
        switch (theme.header) {
            case 'Bold': return 'font-black tracking-tight text-[15px]';
            case 'Modern': return 'font-medium tracking-[0.2em] uppercase text-[11px]';
            case 'Underline': return 'font-bold tracking-widest uppercase border-b-2 pb-1 inline-block text-[12px] border-current';
            case 'Classic':
            default: return 'font-bold tracking-widest uppercase text-[12px]';
        }
    })();

    const density = (() => {
        switch (theme.layoutDensity) {
            case 'Compact': return { catGap: 'space-y-4', itemGap: 'space-y-2.5', pad: 'p-1.5' };
            case 'Spacious': return { catGap: 'space-y-10', itemGap: 'space-y-5', pad: 'p-4' };
            case 'Comfortable':
            default: return { catGap: 'space-y-7', itemGap: 'space-y-3.5', pad: 'p-0' };
        }
    })();

    const imageClasses = (() => {
        switch (theme.imageStyle) {
            case 'Square': return 'w-[100px] h-[100px] rounded-md';
            case 'Circle': return 'w-[88px] h-[88px] rounded-full';
            case 'Hidden': return 'hidden';
            case 'Rounded':
            default: return 'w-[100px] h-[100px] rounded-xl';
        }
    })();

    // ─── Background Layers ─────────────────────────────────────

    const bgImageLayer = theme.backgroundImage ? (
        <div
            className="absolute inset-0 z-0"
            style={{
                backgroundImage: `url(${theme.backgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: theme.backgroundIntensity / 100
            }}
        />
    ) : null;

    const patternLayer = theme.pattern !== 'None' ? (
        <div
            className="absolute inset-0 z-0 pointer-events-none opacity-[0.04]"
            style={{
                backgroundImage: theme.pattern === 'Dots'
                    ? `radial-gradient(${theme.colors.text} 1px, transparent 1px)`
                    : theme.pattern === 'Lines'
                        ? `repeating-linear-gradient(45deg, ${theme.colors.text} 0, ${theme.colors.text} 1px, transparent 0, transparent 50%)`
                        : `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                backgroundSize: theme.pattern === 'Dots' ? '12px 12px' : theme.pattern === 'Lines' ? '20px 20px' : 'auto'
            }}
        />
    ) : null;

    // ─── Render ────────────────────────────────────────────────

    const restaurantName = restaurant?.name || 'Kunar';

    return (
        <div className="flex-1 bg-[#F4F5F7] relative h-full flex flex-col overflow-hidden">
            {/* Soft backdrop */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.9)_0%,rgba(244,245,247,0)_80%)] pointer-events-none" />

            {/* Header Area */}
            <div className="w-full px-8 py-6 flex items-end justify-between relative z-10 flex-shrink-0">
                <div>
                    <h3 className="text-[18px] font-bold text-gray-900 tracking-tight">Live Preview</h3>
                    <p className="text-[13px] text-gray-500 font-medium mt-0.5">See exactly what your customers see</p>
                </div>
                {cartCount > 0 && (
                    <button
                        onClick={() => { setCartCount(0); setCartTotal(0); }}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-[12px] font-bold text-gray-600 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md hover:bg-gray-50 transition-all active:scale-95 flex items-center gap-2"
                    >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        Clear cart
                    </button>
                )}
            </div>

            {/* Phone Stage Container */}
            <div className="flex-1 w-full flex items-center justify-center relative z-10 pb-8 overflow-y-auto no-scrollbar">

                {/* ── Realistic Phone Frame ─────────────────────────── */}
                <div className="relative w-[375px] h-[812px] bg-[#000] rounded-[55px] p-[12px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.1)_inset] ring-1 ring-black/10 flex-shrink-0 z-10 transform scale-[0.85] 2xl:scale-[0.95] origin-center mt-[-40px] transition-transform duration-300">

                    {/* Hardware Buttons */}
                    <div className="absolute top-[120px] -left-[3px] w-[3px] h-[26px] bg-[#2a2a2a] rounded-l-md" /> {/* Mute */}
                    <div className="absolute top-[170px] -left-[3px] w-[3px] h-[50px] bg-[#2a2a2a] rounded-l-md" /> {/* Vol Up */}
                    <div className="absolute top-[230px] -left-[3px] w-[3px] h-[50px] bg-[#2a2a2a] rounded-l-md" /> {/* Vol Down */}
                    <div className="absolute top-[190px] -right-[3px] w-[3px] h-[75px] bg-[#2a2a2a] rounded-r-md" /> {/* Power */}

                    {/* Inner Bezel Ring */}
                    <div className="absolute inset-[4px] rounded-[48px] border-[4px] border-[#111] pointer-events-none" />

                    {/* Glass Glare Effect */}
                    <div className="absolute inset-[10px] rounded-[42px] bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none z-50 opacity-50" />

                    {/* Dynamic Island */}
                    <div className="absolute top-[22px] inset-x-0 h-7 flex justify-center z-50">
                        <div className="w-[120px] h-[28px] bg-black rounded-full flex items-center justify-between px-3 relative overflow-hidden ring-1 ring-white/5">
                            <div className="w-[10px] h-[10px] rounded-full bg-[#1a1a1a] flex items-center justify-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#0a0a0a] ring-1 ring-[#2a2a2a]" />
                            </div>
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 blur-[2px]" />
                        </div>
                    </div>

                    {/* Screen */}
                    <div
                        className="relative w-full h-full rounded-[42px] overflow-hidden overflow-y-auto no-scrollbar scroll-smooth"
                        style={containerStyle}
                    >
                        {bgImageLayer}
                        {patternLayer}

                        {/* Status Bar */}
                        <div className="relative z-20 flex items-center justify-between px-7 pt-4 pb-1">
                            <span className="text-[11px] font-semibold" style={{ color: theme.colors.text }}>9:41</span>
                            <div className="flex items-center gap-1.5">
                                <div className="flex gap-[2px]">{[1, 2, 3, 4].map(i => <div key={i} className="w-[3px] rounded-full" style={{ height: `${6 + i * 2}px`, backgroundColor: theme.colors.text, opacity: i < 4 ? 1 : 0.3 }} />)}</div>
                                <div className="w-[3px] h-[3px] rounded-full" style={{ backgroundColor: theme.colors.text, opacity: 0.3 }} />
                                <svg width="18" height="10" viewBox="0 0 18 10" className="ml-0.5">
                                    <rect x="0" y="1" width="14" height="8" rx="1.5" fill="none" stroke={theme.colors.text} strokeWidth="1" opacity="0.4" />
                                    <rect x="1.5" y="2.5" width="9" height="5" rx="0.5" fill={theme.colors.text} opacity="0.6" />
                                    <rect x="15" y="3" width="2" height="4" rx="0.5" fill={theme.colors.text} opacity="0.3" />
                                </svg>
                            </div>
                        </div>

                        {/* Banner */}
                        {theme.bannerText && (
                            <div
                                className="relative z-20 mx-4 mt-2 py-2.5 px-4 text-center text-[10px] font-bold uppercase tracking-widest rounded-xl"
                                style={{ backgroundColor: theme.colors.accent, color: theme.colors.accentText }}
                            >
                                {theme.bannerText}
                            </div>
                        )}

                        <div className="relative z-10 px-5 pt-5 pb-28 min-h-full">
                            {/* ── Restaurant Header ─────────── */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 shadow-sm ring-1 bg-white" style={{ borderColor: `${theme.colors.muted}20` }}>
                                        {(theme.logoImage || restaurant.logoUrl) ? (
                                            <img src={theme.logoImage || restaurant.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                                        ) : (
                                            <img src="/landing/img-3ae516c3.webp" alt="Logo" className="w-full h-full object-cover" />
                                        )}
                                    </div>
                                    <div>
                                        <h1 className="text-[16px] font-bold leading-tight" style={{ color: theme.colors.text }}>{theme.restaurantName || restaurantName}</h1>
                                        <p className="text-[9px] font-bold mt-0.5 tracking-widest uppercase" style={{ color: theme.colors.muted }}>{theme.tableSubtitle || 'TABLE 1'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {theme.enableLanguageSelector && (
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold tracking-wider" style={{ backgroundColor: `${theme.colors.muted}15`, color: theme.colors.muted }}>EN</div>
                                    )}
                                    <div className="w-7 h-7 rounded-[10px] flex items-center justify-center shadow-sm" style={{ backgroundColor: theme.colors.accent, color: theme.colors.accentText }}>
                                        <Smartphone className="w-3.5 h-3.5" {...iconProps} />
                                    </div>
                                    {theme.enableVegToggle && (
                                        <div className="px-2 py-1 rounded-full flex items-center gap-1 text-[8px] font-bold tracking-wider" style={{ border: `1px solid ${theme.colors.muted}25`, color: theme.colors.muted }}>
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                            VEG
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ── Add Item ─────────────────── */}
                            <div className="flex justify-end mb-3">
                                <button
                                    onClick={onAddItem}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-95 shadow-sm"
                                    style={{ backgroundColor: `${theme.colors.accent}12`, color: theme.colors.accent }}
                                >
                                    <Plus className="w-3 h-3" {...iconProps} />
                                    Add Item
                                </button>
                            </div>

                            {/* ── Search ───────────────────── */}
                            <div className="relative mb-6">
                                <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
                                    <Search className="w-3.5 h-3.5" style={{ color: theme.colors.muted }} {...iconProps} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search for delicacies..."
                                    className="w-full py-3 pl-9 pr-4 rounded-2xl text-[12px] outline-none transition-colors"
                                    style={{
                                        backgroundColor: theme.colors.surface,
                                        border: `1px solid ${theme.colors.muted}18`,
                                        color: theme.colors.text,
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
                                    }}
                                    readOnly
                                />
                            </div>

                            {/* ── Sticky Categories Mock ── */}
                            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mb-6 pb-2 -mx-5 px-5 snap-x">
                                {categories.map((c: any, i: number) => (
                                    <button key={c.id} className="snap-start flex-shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-colors whitespace-nowrap" style={{
                                        backgroundColor: i === 0 ? theme.colors.accent : theme.colors.surface,
                                        color: i === 0 ? theme.colors.accentText : theme.colors.text,
                                        border: i === 0 ? 'none' : `1px solid ${theme.colors.muted}25`
                                    }}>
                                        {c.name}
                                    </button>
                                ))}
                            </div>

                            {/* ── Categories & Items ──────── */}
                            <div className={`${density.catGap} pb-8`}>
                                {categories.map((category: any) => {
                                    const categoryItems = items.filter((item: any) => item.categoryId === category.id);
                                    if (categoryItems.length === 0) return null;

                                    return (
                                        <div key={category.id} className="space-y-4">
                                            {/* Ornament */}
                                            {theme.ornament !== 'Off' && (
                                                <div className="flex justify-center mb-1">
                                                    <svg width="50" height="10" viewBox="0 0 50 10" fill="none" className={theme.ornament === 'Subtle' ? 'opacity-20' : 'opacity-60'}>
                                                        <path d="M25 0L27.5 5L50 5L29 6.5L33 10L25 8L17 10L21 6.5L0 5L22.5 5L25 0Z" fill={theme.colors.accent} />
                                                    </svg>
                                                </div>
                                            )}

                                            {/* Category Header */}
                                            <div className={`flex ${motifClasses}`} style={{ borderColor: `${theme.colors.muted}18` }}>
                                                {theme.header === 'Classic' && theme.motif !== 'Elegant' ? (
                                                    <>
                                                        <div className="w-5 h-[2.5px] rounded-full" style={{ backgroundColor: theme.colors.accent }} />
                                                        <div className="w-1 h-1 rounded-full" style={{ backgroundColor: theme.colors.accent }} />
                                                    </>
                                                ) : (
                                                    <span className="text-[14px]">{theme.sectionIcon}</span>
                                                )}
                                                <h2 className={headerClasses} style={{ color: theme.colors.text }}>{category.name}</h2>
                                                {theme.motif !== 'Elegant' && (
                                                    <div className="w-5 h-5 rounded-full flex items-center justify-center ml-auto" style={{ border: `1px solid ${theme.colors.muted}20` }}>
                                                        <ChevronUp className="w-2.5 h-2.5" style={{ color: theme.colors.muted }} {...iconProps} />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Subcategory Groups */}
                                            <div className={density.itemGap}>
                                                {(() => {
                                                    const catSubs = (subcategories || [])
                                                        .filter((sub: any) => sub.categoryGroupId === category.id)
                                                        .sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));

                                                    const orphanItems = categoryItems.filter((i: any) => !i.subcategoryId);

                                                    const groups = catSubs.map((sub: any) => ({
                                                        id: sub.id,
                                                        name: sub.name,
                                                        items: categoryItems.filter((i: any) => i.subcategoryId === sub.id)
                                                    })).filter((g: any) => g.items.length > 0);

                                                    if (orphanItems.length > 0) {
                                                        groups.push({ id: 'no-sub', name: 'GENERAL', items: orphanItems });
                                                    }

                                                    return groups.map((group: any) => (
                                                        <div key={group.id} className={density.itemGap}>
                                                            {/* Subcategory label */}
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-3 h-[1.5px] rounded-full" style={{ backgroundColor: `${theme.colors.muted}40` }} />
                                                                <span className="font-semibold tracking-widest uppercase text-[9px]" style={{ color: theme.colors.muted }}>{group.name}</span>
                                                            </div>

                                                            {/* Items */}
                                                            {group.items.map((item: any) => (
                                                                <div
                                                                    key={item.id}
                                                                    className={`flex gap-3.5 cursor-pointer transition-all duration-200 relative group hover:scale-[1.005] ${density.pad}`}
                                                                    style={cardStyle}
                                                                    onClick={() => onEditItem?.(item)}
                                                                >
                                                                    {/* Image */}
                                                                    <div className={`overflow-hidden flex-shrink-0 relative ${imageClasses}`} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                                                                        {(item.image || item.imageUrl) ? (
                                                                            <img src={item.image || item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            <div className="w-full h-full flex items-center justify-center text-[10px] bg-gray-50" style={{ color: theme.colors.muted }}>No Img</div>
                                                                        )}
                                                                        <div className="absolute top-1.5 left-1.5 w-3.5 h-3.5 rounded-[3px] bg-white/90 backdrop-blur-sm p-[2px] shadow-sm flex items-center justify-center">
                                                                            <div className={`w-full h-full rounded-[2px] ${item.isVeg ? 'bg-green-500' : 'bg-red-500'}`} />
                                                                        </div>
                                                                        <button
                                                                            className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-white/90 backdrop-blur-md shadow-sm flex items-center justify-center transition-transform hover:scale-110 active:scale-95 z-20"
                                                                            onClick={(e) => { e.stopPropagation(); /* Open AR View handler */ }}
                                                                        >
                                                                            <Box className="w-3.5 h-3.5" strokeWidth={2.5} style={{ color: theme.colors.accent }} />
                                                                        </button>
                                                                    </div>

                                                                    {/* Details */}
                                                                    <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0">
                                                                        <div>
                                                                            <div className="flex items-start justify-between gap-1">
                                                                                <h3 className="text-[13px] font-bold leading-tight truncate" style={{ color: theme.colors.text }}>{item.name}</h3>
                                                                                <button className="flex-shrink-0 p-0.5 rounded transition-transform active:scale-90" style={{ color: theme.colors.accent }}>
                                                                                    <Star className="w-3 h-3" {...iconProps} />
                                                                                </button>
                                                                            </div>
                                                                            {item.description && (
                                                                                <p className="text-[10px] mt-0.5 line-clamp-2 leading-relaxed" style={{ color: theme.colors.muted }}>
                                                                                    {item.description}
                                                                                </p>
                                                                            )}
                                                                        </div>

                                                                        <div className="flex items-center justify-between mt-2">
                                                                            <span className="text-[13px] font-bold" style={{ color: theme.colors.text }}>₹{item.price}</span>
                                                                            <button
                                                                                onClick={(e) => handleAddToCart(e, item.price)}
                                                                                className="px-4 py-1.5 text-[11px] font-bold z-20 transition-all active:scale-95 hover:shadow-md"
                                                                                style={{
                                                                                    backgroundColor: btnStyle.bg,
                                                                                    color: btnStyle.text,
                                                                                    border: btnStyle.border,
                                                                                    borderRadius: btnStyle.radius,
                                                                                }}
                                                                            >
                                                                                Add
                                                                            </button>
                                                                        </div>
                                                                    </div>

                                                                    {/* Hover overlay */}
                                                                    <div className="absolute inset-0 rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ border: `1.5px solid ${theme.colors.accent}30` }} />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ));
                                                })()}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ── Table Services FAB ─── */}
                        {theme.enableTableServices && (
                            <div className="absolute bottom-[80px] right-4 flex flex-col items-center gap-2 z-40 pointer-events-none transition-transform duration-300" style={{ transform: cartCount > 0 ? 'translateY(-65px)' : 'translateY(0)' }}>
                                <div className="p-1 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.12)] pointer-events-auto flex flex-col gap-1 backdrop-blur-md border" style={{ backgroundColor: `${theme.colors.surface}E6`, borderColor: `${theme.colors.muted}20` }}>
                                    <button className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:opacity-80 active:scale-95" style={{ color: theme.colors.text }}>
                                        <Bell className="w-4 h-4" {...iconProps} />
                                    </button>
                                    <div className="w-5 h-px mx-auto" style={{ backgroundColor: `${theme.colors.muted}30` }} />
                                    <button className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:opacity-80 active:scale-95 text-blue-500">
                                        <Droplets className="w-[18px] h-[18px]" {...iconProps} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Removed Floating AR Button */}

                        {/* ── Cart Bar ─────────────────── */}
                        <div
                            className={`absolute bottom-4 left-3 right-3 p-3 rounded-2xl flex items-center justify-between shadow-2xl transition-all duration-300 z-50 ${cartCount > 0 ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}
                            style={{ backgroundColor: theme.colors.accent, color: theme.colors.accentText }}
                        >
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center relative">
                                    <ShoppingBag className="w-3.5 h-3.5" />
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full text-[8px] font-bold flex items-center justify-center text-white">
                                        {cartCount}
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-bold uppercase opacity-70">Total</span>
                                    <span className="text-[13px] font-bold">₹{cartTotal.toFixed(0)}</span>
                                </div>
                            </div>
                            <button
                                className="px-4 py-2 text-[11px] font-bold rounded-xl active:scale-95 transition-transform"
                                style={{ backgroundColor: theme.colors.accentText, color: theme.colors.accent }}
                            >
                                Checkout →
                            </button>
                        </div>
                    </div>
                </div>

                {/* Grounding shadow under the phone */}
                <div className="absolute bottom-[2%] left-1/2 -translate-x-1/2 w-[320px] h-[30px] bg-black/15 blur-2xl rounded-[100%] pointer-events-none z-0" />
            </div>
        </div>
    );
}
