"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import {
    ChevronLeft,
    Plus,
    Minus,
    Star,
    Flame,
    Clock,
    Scan,
    List,
    ShoppingBag,
    FileText,
    Sparkles,
} from "lucide-react";
import { useLanguageStore } from "@/stores/languageStore";
import { getCartKey } from "@/stores/cartStore";
import { getBackendBase } from "@/app/lib/api";

interface ImmersiveMenuProps {
    items: any[];
    categories: { id: string; name: string }[];
    cart: any;
    onAdd: (id: string, vId?: string, price?: number, notes?: string) => void;
    onRemove: (id: string, vId?: string) => void;
    onArClick: (item: any) => void;
    onClose: () => void;
    tableNumber: string;
    orderingEnabled?: boolean;
    restaurantName?: string;
    logoUrl?: string;
}

export default function ImmersiveMenu({
    items,
    categories,
    cart,
    onAdd,
    onRemove,
    onArClick,
    onClose,
    tableNumber,
    orderingEnabled = true,
    restaurantName = "Restaurant",
    logoUrl = "",
}: ImmersiveMenuProps) {
    const router = useRouter();
    const { t } = useLanguageStore();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [direction, setDirection] = useState(0);
    const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
    const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
    const [isNoteOpen, setIsNoteOpen] = useState(false);
    const [expandedDesc, setExpandedDesc] = useState(false);
    const [modelViewerReady, setModelViewerReady] = useState(false);
    const catScrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (items.length === 0) return;
        if (currentIndex >= items.length) setCurrentIndex(0);
    }, [items, currentIndex]);

    useEffect(() => {
        setExpandedDesc(false);
        setIsNoteOpen(false);
    }, [currentIndex]);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                await import("@google/model-viewer");
                if (mounted) setModelViewerReady(true);
            } catch {
                if (mounted) setModelViewerReady(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    const distinctCategories = useMemo(() => {
        const map = new Map<string, { id: string; name: string; firstIndex: number; count: number }>();
        items.forEach((item, idx) => {
            const catName = item.category || item.categoryName || "General";
            const catId = item.categoryId || catName;
            if (!map.has(catId)) {
                map.set(catId, { id: catId, name: catName, firstIndex: idx, count: 1 });
            } else {
                const existing = map.get(catId)!;
                existing.count += 1;
            }
        });
        return Array.from(map.values());
    }, [items]);

    const currentItem = items[currentIndex];

    if (!currentItem) {
        return (
            <div className="fixed inset-0 z-[100] bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-xl font-medium text-slate-800 mb-6 font-serif tracking-wide">
                        No items available
                    </p>
                    {orderingEnabled && (
                        <button
                            onClick={onClose}
                            className="px-8 py-3 bg-slate-900 text-white text-xs font-bold tracking-[0.2em] uppercase rounded-full transition-all active:scale-95 shadow-xl"
                        >
                            {t("listView")}
                        </button>
                    )}
                </div>
            </div>
        );
    }

    const currentCategoryName = currentItem.category || currentItem.categoryName || "General";

    useEffect(() => {
        const activeEl = document.getElementById(`imm-cat-${currentCategoryName}`);
        if (activeEl && catScrollRef.current) {
            activeEl.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        }
    }, [currentCategoryName]);

    const normalizeVariantName = (name: string) => name.trim().toLowerCase();
    const isDefaultVariant = (v: any) => {
        const label = normalizeVariantName(v.name || "");
        return ["", "default", "regular", "standard"].includes(label) && (v.priceDelta || 0) === 0;
    };

    const visibleVariants = (currentItem.variants || []).filter((v: any) => !isDefaultVariant(v));
    const activeVariantId = selectedVariants[currentItem.id] || visibleVariants[0]?.id || currentItem.variants?.[0]?.id || "";
    const currentVariant = currentItem.variants?.find((v: any) => v.id === activeVariantId);
    const basePrice = Number(currentItem.price || 0);
    const discountedBasePrice =
        typeof currentItem.offerPrice === "number" &&
            currentItem.offerPrice > 0 &&
            currentItem.offerPrice < basePrice
            ? Number(currentItem.offerPrice)
            : basePrice;
    const displayPrice = discountedBasePrice + (currentVariant?.priceDelta || 0);
    const originalDisplayPrice = basePrice + (currentVariant?.priceDelta || 0);

    const calVal =
        typeof currentItem.calories === "number" && currentItem.calories > 0
            ? currentItem.calories
            : typeof currentItem.kcal === "number" && currentItem.kcal > 0
                ? currentItem.kcal
                : (currentItem.proteinG || currentItem.carbsG || currentItem.fatG)
                    ? Math.round((currentItem.proteinG || 0) * 4 + (currentItem.carbsG || 0) * 4 + (currentItem.fatG || 0) * 9)
                    : 0;

    const hasMacros = calVal > 0 || (currentItem.proteinG || 0) > 0 || (currentItem.carbsG || 0) > 0 || (currentItem.fatG || 0) > 0;

    const currentKey = getCartKey(currentItem.id, activeVariantId);
    const blankKey = getCartKey(currentItem.id, "");
    const bareKey = String(currentItem.id);
    const matchingKeys = Object.keys(cart || {}).filter((k) => {
      const [idPart] = k.split("::");
      return String(idPart).toLowerCase() === String(currentItem.id).toLowerCase();
    });
    const quantity =
      cart?.[currentKey]?.quantity ||
      cart?.[blankKey]?.quantity ||
      cart?.[bareKey]?.quantity ||
      matchingKeys.reduce((acc, k) => acc + (cart?.[k]?.quantity || 0), 0);

    const currentNote = itemNotes[currentItem.id] !== undefined
      ? itemNotes[currentItem.id]
      : (cart?.[currentKey]?.notes || cart?.[blankKey]?.notes || "");

    const cartTotal = Object.entries(cart || {}).reduce(
        (acc: number, [, item]: any) => acc + (item?.price || 0) * (item?.quantity || 0),
        0,
    );
    const totalCartItems = Object.values(cart || {}).reduce(
        (sum: number, item: any) => sum + (item?.quantity || 0),
        0,
    );

    const handleNext = () => {
        if (currentIndex < items.length - 1) {
            setDirection(1);
            setCurrentIndex((p) => p + 1);
        }
    };
    const handlePrev = () => {
        if (currentIndex > 0) {
            setDirection(-1);
            setCurrentIndex((p) => p - 1);
        }
    };

    const handleCategoryJump = (firstIndex: number) => {
        if (firstIndex === currentIndex) return;
        setDirection(firstIndex > currentIndex ? 1 : -1);
        setCurrentIndex(firstIndex);
    };

    const onDragEnd = (_e: any, { offset }: PanInfo) => {
        if (offset.x < -60) handleNext();
        else if (offset.x > 60) handlePrev();
    };

    const slideVariants = {
        enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0, scale: 0.95 }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1,
            scale: 1,
            transition: {
                x: { type: "spring" as const, stiffness: 320, damping: 32 },
                opacity: { duration: 0.2 },
                scale: { duration: 0.2 },
            },
        },
        exit: (dir: number) => ({
            zIndex: 0,
            x: dir < 0 ? "100%" : "-100%",
            opacity: 0,
            scale: 0.95,
            transition: {
                x: { type: "spring" as const, stiffness: 320, damping: 32 },
                opacity: { duration: 0.2 },
                scale: { duration: 0.2 },
            },
        }),
    };

    const getIngredients = (item: any): string[] => {
        if (!item) return [];
        if (Array.isArray(item.ingredients)) return item.ingredients;
        if (typeof item.ingredients === "string")
            return item.ingredients.split(",").map((s: string) => s.trim()).filter(Boolean);
        return [];
    };

    const getMediaUrl = (url?: string) => {
        if (!url) return "";
        if (url.includes("cloudfront.net")) {
            const urlObj = new URL(url);
            return `/api/proxy-model${urlObj.pathname}`;
        }
        if (url.startsWith("/uploads/")) return `${getBackendBase()}${url}`;
        return url;
    };

    useEffect(() => {
        const originalOverflow = document.body.style.overflow;
        const originalOverscroll = document.body.style.overscrollBehavior;
        const originalTouchAction = document.body.style.touchAction;
        
        document.body.style.overflow = "hidden";
        document.body.style.overscrollBehavior = "none";
        document.body.style.touchAction = "none";
        
        return () => {
            document.body.style.overflow = originalOverflow;
            document.body.style.overscrollBehavior = originalOverscroll;
            document.body.style.touchAction = originalTouchAction;
        };
    }, []);

    const ingredients = getIngredients(currentItem);
    const hasModel = Boolean(currentItem.arModelGlb);
    const desc = currentItem.description || "";
    const resolvedModelUrl = getMediaUrl(currentItem.arModelGlb);
    const resolvedImageUrl = getMediaUrl(currentItem.image);

    return (
        <div className="fixed inset-0 z-[100] h-[100dvh] max-h-[100dvh] w-screen max-w-full overflow-hidden overscroll-none touch-none flex flex-col bg-[#F8FAFC] text-slate-900 font-sans select-none">
            {/* Soft Ambient Light Gradient Background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[65vw] h-[65vw] rounded-full bg-orange-400/8 blur-[100px]" />
                <div className="absolute top-[35%] right-[-15%] w-[60vw] h-[60vw] rounded-full bg-amber-300/10 blur-[90px]" />
                <div className="absolute bottom-[-10%] left-[10%] w-[55vw] h-[55vw] rounded-full bg-emerald-400/8 blur-[100px]" />
                <div className="absolute inset-0 bg-white/50 backdrop-blur-[50px]" />
            </div>

            {/* ── Top Header Navigation ── */}
            <header className="relative z-30 px-4 pt-3.5 pb-1.5 flex items-center justify-between shrink-0">
                <button
                    onClick={orderingEnabled ? onClose : undefined}
                    className="w-10 h-10 rounded-full bg-white hover:bg-slate-100 text-slate-800 border border-slate-200/80 flex items-center justify-center transition-all active:scale-90 shadow-xs cursor-pointer"
                    aria-label="Back to menu"
                >
                    <ChevronLeft size={20} strokeWidth={2.5} className="pr-0.5" />
                </button>

                {/* Table & Brand Pill */}
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200/80 shadow-xs">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 font-dm-sans">
                        {restaurantName}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                    <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[11px] font-bold text-emerald-700 font-dm-sans">
                            Table {tableNumber || "4"}
                        </span>
                    </div>
                </div>

                <button
                    onClick={orderingEnabled ? onClose : undefined}
                    className="w-10 h-10 rounded-full bg-white hover:bg-slate-100 text-slate-800 border border-slate-200/80 flex items-center justify-center transition-all active:scale-90 shadow-xs cursor-pointer"
                    aria-label="List View"
                >
                    <List size={18} />
                </button>
            </header>

            {/* ── Top Segmented Category Scroller ── */}
            {distinctCategories.length > 1 && (
                <div 
                    ref={catScrollRef}
                    className="relative z-30 px-4 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0"
                >
                    {distinctCategories.map((cat) => {
                        const isActive = cat.name.toLowerCase() === currentCategoryName.toLowerCase();
                        return (
                            <button
                                key={cat.id}
                                id={`imm-cat-${cat.name}`}
                                onClick={() => handleCategoryJump(cat.firstIndex)}
                                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer ${
                                    isActive
                                        ? "bg-slate-900 text-white shadow-sm scale-[1.02]"
                                        : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80"
                                }`}
                            >
                                <span>{cat.name}</span>
                                <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                                    {cat.count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* ── Main Studio Showcase ── */}
            <div className="flex-1 relative overflow-hidden z-10 flex flex-col min-h-0">
                <AnimatePresence initial={false} custom={direction}>
                    <motion.div
                        key={currentItem.id}
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.7}
                        onDragEnd={onDragEnd}
                        className="absolute inset-0 flex flex-col justify-between overflow-hidden"
                    >
                        {/* ── Studio Hero Stage (Food 3D / Photo) ── */}
                        <div className="relative flex-1 min-h-[200px] max-h-[46vh] flex items-center justify-center p-3 w-full">
                            <div className="relative z-10 w-full h-full max-w-full group flex items-center justify-center">
                                {/* Floating Pedestal Halo */}
                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[70%] h-7 bg-black/10 blur-xl rounded-full" />
                                
                                {hasModel && modelViewerReady ? (
                                    <div className="absolute inset-0 z-20">
                                        <model-viewer
                                            src={resolvedModelUrl}
                                            alt={currentItem.name}
                                            auto-rotate
                                            rotation-per-second="30deg"
                                            camera-controls
                                            interaction-prompt="none"
                                            camera-orbit="0deg 75deg 90%"
                                            tone-mapping="commerce"
                                            shadow-intensity="1"
                                            shadow-softness="1"
                                            environment-image="neutral"
                                            style={{ width: "100%", height: "100%", background: "transparent" }}
                                        />
                                    </div>
                                ) : (
                                    <div className="absolute inset-0 p-3 z-20 flex items-center justify-center">
                                        {resolvedImageUrl ? (
                                            <img
                                                src={resolvedImageUrl}
                                                alt={currentItem.name}
                                                className="w-full h-full object-contain drop-shadow-[0_16px_28px_rgba(0,0,0,0.15)] scale-105"
                                            />
                                        ) : (
                                            <div className="w-40 h-40 rounded-full bg-slate-200/50 border border-slate-300 flex items-center justify-center text-slate-400 font-bold text-xs">
                                                No Image
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* AR Floating Badge */}
                                {hasModel && (
                                    <button
                                        onClick={() => onArClick(currentItem)}
                                        className="absolute bottom-2 right-3 px-3.5 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 active:scale-95 transition-all uppercase tracking-wider bg-slate-900/90 backdrop-blur-md text-white shadow-lg z-30 hover:bg-slate-800 cursor-pointer"
                                    >
                                        <Scan size={13} />
                                        <span>3D / AR</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* ── Apple Studio Full-Width Glass Card (Bottom) ── */}
                        <div className="w-full px-5 sm:px-6 pt-4 pb-6 bg-white text-slate-900 rounded-t-[32px] sm:rounded-t-[36px] shadow-[0_-12px_45px_rgba(0,0,0,0.06)] border-t border-slate-200/80 overflow-y-auto max-h-[55vh] shrink-0">
                            {/* Drag Indicator */}
                            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3" />

                            {/* Breadcrumb + Price Row */}
                            <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`w-2.5 h-2.5 rounded-full ${
                                            currentItem.isVeg ? "bg-emerald-500" : "bg-rose-500"
                                        }`}
                                    />
                                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 font-dm-sans">
                                        {currentCategoryName}
                                    </span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    {originalDisplayPrice > displayPrice && (
                                        <span className="text-xs text-slate-400 line-through font-semibold">
                                            ₹{originalDisplayPrice}
                                        </span>
                                    )}
                                    <span className="text-2xl font-black text-slate-950 font-dm-sans">
                                        ₹{displayPrice}
                                    </span>
                                </div>
                            </div>

                            {/* Dish Title */}
                            <h2 className="text-xl sm:text-2xl text-slate-900 font-extrabold tracking-tight leading-snug mb-2 font-dm-sans">
                                {currentItem.name}
                            </h2>

                            {/* Smart Badges / Macros */}
                            {hasMacros ? (
                                <div className="inline-flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-200/80 rounded-2xl mb-3 flex-wrap">
                                    {calVal > 0 && (
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-xl shadow-xs font-bold text-slate-900 text-xs">
                                            <Flame size={14} className="text-amber-500 shrink-0" />
                                            <span>{calVal} kcal</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 px-1 text-xs font-semibold text-slate-600">
                                        {(currentItem.proteinG || 0) > 0 && (
                                            <span>P: <strong className="font-extrabold text-slate-900">{currentItem.proteinG}g</strong></span>
                                        )}
                                        {(currentItem.carbsG || 0) > 0 && (
                                            <span>C: <strong className="font-extrabold text-slate-900">{currentItem.carbsG}g</strong></span>
                                        )}
                                        {(currentItem.fatG || 0) > 0 && (
                                            <span>F: <strong className="font-extrabold text-slate-900">{currentItem.fatG}g</strong></span>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                                    {currentItem.rating > 0 && (
                                        <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-100 rounded-xl">
                                            <Star size={12} className="fill-amber-400 text-amber-400" />
                                            <span className="text-xs font-bold text-amber-900">{currentItem.rating}</span>
                                        </div>
                                    )}
                                    {currentItem.isTodaysSpecial && (
                                        <div className="flex items-center gap-1 px-2.5 py-1 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-bold">
                                            <Sparkles size={12} />
                                            <span>Today's Special</span>
                                        </div>
                                    )}
                                    {currentItem.estimatedPrepMinutes && (
                                        <div className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 text-xs font-semibold">
                                            <Clock size={12} />
                                            <span>{currentItem.estimatedPrepMinutes} mins</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Description */}
                            {desc && (
                                <div className="mb-2.5">
                                    <p className={`text-xs sm:text-sm leading-relaxed text-slate-600 font-normal ${!expandedDesc ? "line-clamp-2" : ""}`}>
                                        {desc}
                                    </p>
                                    {desc.length > 90 && (
                                        <button
                                            onClick={() => setExpandedDesc(!expandedDesc)}
                                            className="text-[10.5px] font-bold mt-1 uppercase tracking-wider text-slate-400 hover:text-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                                        >
                                            {expandedDesc ? "Collapse ↑" : "Read More ↓"} 
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Ingredients */}
                            {ingredients.length > 0 && (
                                <div className="mb-2.5">
                                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                                        {ingredients.map((ing, idx) => (
                                            <div
                                                key={idx}
                                                title={ing}
                                                className="flex-shrink-0 px-2.5 py-0.5 bg-slate-100 rounded-md flex items-center justify-center text-[10.5px] font-semibold text-slate-600"
                                            >
                                                {ing}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Options / Variants */}
                            {visibleVariants.length > 0 && (
                                <div className="mb-2.5">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
                                        Choose Option
                                    </span>
                                    <div className="flex flex-wrap gap-2">
                                        {visibleVariants.map((v: any) => {
                                            const isActive = activeVariantId === v.id;
                                            return (
                                                <button
                                                    key={v.id}
                                                    onClick={() => setSelectedVariants((p) => ({ ...p, [currentItem.id]: v.id }))}
                                                    className={`px-3.5 py-1 text-xs font-bold transition-all rounded-xl border cursor-pointer ${
                                                        isActive 
                                                        ? "bg-slate-900 text-white border-slate-900 shadow-xs scale-[1.02]" 
                                                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                                                    }`}
                                                >
                                                    {v.name}{v.priceDelta > 0 && <span className="opacity-70 ml-1">+₹{v.priceDelta}</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Always-Expanded Special Instructions / Notes */}
                            <div className="mt-3 pt-3 border-t border-slate-100">
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 font-dm-sans flex items-center gap-1.5">
                                        <FileText size={13} className="text-slate-400" />
                                        <span>Special Instructions</span>
                                    </label>
                                    {currentNote && (
                                        <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                            Note Added
                                        </span>
                                    )}
                                </div>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={currentNote}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setItemNotes((p) => ({ ...p, [currentItem.id]: val }));
                                        }}
                                        placeholder="e.g. Less sweet, extra ice, no nuts, crispy crust..."
                                        maxLength={150}
                                        className="w-full text-xs bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl px-3.5 py-2.5 pr-8 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 focus:bg-white transition-all font-sans"
                                    />
                                    {currentNote && (
                                        <button
                                            type="button"
                                            onClick={() => setItemNotes((p) => ({ ...p, [currentItem.id]: "" }))}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                                            aria-label="Clear note"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* ── Card Integrated Action Button Bar ── */}
                            {orderingEnabled && (
                                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center">
                                    {quantity === 0 ? (
                                        <button
                                            type="button"
                                            onClick={() => onAdd(currentItem.id, activeVariantId, displayPrice, currentNote)}
                                            className="w-full h-[52px] rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-bold text-sm tracking-wide flex items-center justify-between px-5 shadow-sm transition-all cursor-pointer font-dm-sans"
                                        >
                                            <span className="flex items-center gap-2">
                                                <Plus size={16} strokeWidth={3} className="text-[#fe5c13]" />
                                                <span>Add to Order</span>
                                            </span>
                                            <span className="font-extrabold text-sm">₹{displayPrice}</span>
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-3 w-full animate-in fade-in duration-150">
                                            {/* Stepper */}
                                            <div className="flex items-center bg-slate-100 rounded-2xl h-[52px] px-1 border border-slate-200 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => onRemove(currentItem.id, activeVariantId)}
                                                    className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-800 hover:text-slate-950 bg-white shadow-xs hover:bg-slate-50 active:scale-95 transition-transform cursor-pointer"
                                                    aria-label="Decrease quantity"
                                                >
                                                    <Minus size={15} strokeWidth={2.5} />
                                                </button>
                                                <span className="w-9 text-center text-base font-extrabold text-slate-900 tabular-nums font-dm-sans">
                                                    {quantity}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => onAdd(currentItem.id, activeVariantId, displayPrice, currentNote)}
                                                    className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-900 bg-white shadow-xs hover:bg-slate-50 active:scale-95 transition-transform cursor-pointer"
                                                    aria-label="Increase quantity"
                                                >
                                                    <Plus size={15} strokeWidth={2.5} />
                                                </button>
                                            </div>

                                            {/* View Cart CTA */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (totalCartItems > 0) {
                                                        router.push("/checkout");
                                                    }
                                                }}
                                                className="flex-1 h-[52px] rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-between px-4 shadow-sm cursor-pointer font-dm-sans"
                                            >
                                                <div className="flex items-center gap-1.5">
                                                    <ShoppingBag size={16} strokeWidth={2.5} />
                                                    <span>View Cart</span>
                                                    <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-extrabold">
                                                        {totalCartItems}
                                                    </span>
                                                </div>
                                                <span className="font-extrabold text-sm">₹{cartTotal}</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            <style dangerouslySetInnerHTML={{__html: `
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .mask-linear-fade {
                    -webkit-mask-image: linear-gradient(to right, black 85%, transparent 100%);
                    mask-image: linear-gradient(to right, black 85%, transparent 100%);
                }
            `}} />
        </div>
    );
}

