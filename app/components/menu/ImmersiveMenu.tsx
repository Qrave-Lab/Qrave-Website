"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { useLanguageStore } from "@/stores/languageStore";
import { getCartKey } from "@/stores/cartStore";

interface ImmersiveMenuProps {
    items: any[];
    categories: { id: string; name: string }[];
    cart: any;
    onAdd: (id: string, vId?: string, price?: number) => void;
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
    const { t } = useLanguageStore();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [direction, setDirection] = useState(0);
    const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
    const [expandedDesc, setExpandedDesc] = useState(false);

    useEffect(() => {
        if (items.length === 0) return;
        if (currentIndex >= items.length) setCurrentIndex(0);
    }, [items, currentIndex]);

    useEffect(() => {
        setExpandedDesc(false);
    }, [currentIndex]);

    const currentItem = items[currentIndex];

    if (!currentItem) {
        return (
            <div className="fixed inset-0 z-[60] bg-[#1a1a2e] flex items-center justify-center">
                <div className="text-center">
                    <p className="text-xl font-bold text-white mb-4">No items available</p>
                    {orderingEnabled && (
                        <button onClick={onClose} className="px-6 py-2 bg-white text-slate-900 rounded-full font-bold text-sm">
                            {t("listView")}
                        </button>
                    )}
                </div>
            </div>
        );
    }

    const normalizeVariantName = (name: string) => name.trim().toLowerCase();
    const isDefaultVariant = (v: any) => {
        const label = normalizeVariantName(v.name || "");
        return ["", "default", "regular", "standard"].includes(label) && (v.priceDelta || 0) === 0;
    };

    const visibleVariants = (currentItem.variants || []).filter((v: any) => !isDefaultVariant(v));
    const activeVariantId = selectedVariants[currentItem.id] || visibleVariants[0]?.id || currentItem.variants?.[0]?.id;
    const currentVariant = currentItem.variants?.find((v: any) => v.id === activeVariantId);
    const basePrice = currentItem.price || 0;
    const displayPrice = basePrice + (currentVariant?.priceDelta || 0);

    const cartKey = getCartKey(currentItem.id, activeVariantId);
    const cartItem = cart[cartKey];
    const quantity = cartItem ? cartItem.quantity : 0;

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

    const onDragEnd = (_e: any, { offset }: PanInfo) => {
        if (offset.x < -60) handleNext();
        else if (offset.x > 60) handlePrev();
    };

    const slideVariants = {
        enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1,
            transition: {
                x: { type: "spring" as const, stiffness: 300, damping: 30 },
                opacity: { duration: 0.15 },
            },
        },
        exit: (dir: number) => ({
            zIndex: 0,
            x: dir < 0 ? "100%" : "-100%",
            opacity: 0,
            transition: {
                x: { type: "spring" as const, stiffness: 300, damping: 30 },
                opacity: { duration: 0.15 },
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

    const ingredients = getIngredients(currentItem);
    const hasModel = Boolean(currentItem.arModelGlb);
    const desc = currentItem.description || "";

    return (
        <div className="fixed inset-0 z-[60] bg-[#1a1a2e] overflow-hidden flex flex-col">
            {/* ── Header ── */}
            <header className="relative z-10 px-5 pt-5 pb-3 flex items-center justify-between">
                <button
                    onClick={orderingEnabled ? onClose : undefined}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${orderingEnabled
                        ? "bg-white/10 text-white hover:bg-white/20 active:scale-95"
                        : "opacity-0 pointer-events-none"
                        }`}
                >
                    <ChevronLeft size={20} />
                </button>

                <div className="flex items-center gap-1.5">
                    {items.map((_, idx) => {
                        if (Math.abs(idx - currentIndex) > 4) return null;
                        return (
                            <div
                                key={idx}
                                className={`rounded-full transition-all duration-300 ${idx === currentIndex ? "w-5 h-2 bg-white" : "w-2 h-2 bg-white/30"
                                    }`}
                            />
                        );
                    })}
                </div>

                {orderingEnabled ? (
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 active:scale-95 transition-colors"
                    >
                        <List size={18} />
                    </button>
                ) : (
                    <div className="w-10 h-10" />
                )}
            </header>

            {/* ── Swipeable Content ── */}
            <div className="flex-1 relative overflow-hidden">
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
                        className="absolute inset-0 flex flex-col overflow-y-auto px-6 pb-6"
                        style={{ scrollbarWidth: "none" }}
                    >
                        {/* ── Hero: 3D Model or Image ── */}
                        <div className="flex-shrink-0 flex items-center justify-center pt-2 pb-6">
                            <div className="relative w-64 h-64 sm:w-72 sm:h-72">
                                {/* Circular glow behind the food */}
                                <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/5 to-transparent" />
                                <div className="absolute inset-4 rounded-full bg-[#2a2a40] shadow-2xl shadow-black/50" />

                                {hasModel ? (
                                    <div className="absolute inset-0 rounded-full overflow-hidden">
                                        <model-viewer
                                            src={currentItem.arModelGlb}
                                            alt={currentItem.name}
                                            camera-controls
                                            auto-rotate
                                            tone-mapping="commerce"
                                            shadow-intensity="1"
                                            style={{
                                                width: "100%",
                                                height: "100%",
                                                background: "transparent",
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <div className="absolute inset-4 rounded-full overflow-hidden">
                                        <img
                                            src={currentItem.image}
                                            alt={currentItem.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                )}

                                {hasModel && (
                                    <button
                                        onClick={() => onArClick(currentItem)}
                                        className="absolute bottom-2 right-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1 active:scale-95 transition-transform"
                                    >
                                        <Scan size={12} />
                                        AR
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* ── Food Title + Price ── */}
                        <div className="flex items-start justify-between mb-3">
                            <h2 className="text-2xl font-black text-white leading-tight pr-4">
                                {currentItem.name}
                            </h2>
                            <span className="text-xl font-black text-white flex-shrink-0">
                                ₹{displayPrice}
                            </span>
                        </div>

                        {/* ── Description ── */}
                        {desc && (
                            <div className="mb-5">
                                <p className={`text-sm text-white/50 leading-relaxed ${!expandedDesc ? "line-clamp-2" : ""}`}>
                                    {desc}
                                </p>
                                {desc.length > 80 && (
                                    <button
                                        onClick={() => setExpandedDesc(!expandedDesc)}
                                        className="text-xs font-bold text-amber-400 mt-1"
                                    >
                                        {expandedDesc ? "Show Less" : "Read More"}
                                    </button>
                                )}
                            </div>
                        )}

                        {/* ── Stats Row ── */}
                        <div className="flex items-center gap-4 mb-6">
                            {currentItem.rating > 0 && (
                                <div className="flex items-center gap-1.5">
                                    <Star size={16} className="fill-amber-400 text-amber-400" />
                                    <span className="text-sm font-bold text-white">{currentItem.rating}</span>
                                </div>
                            )}
                            {currentItem.calories && (
                                <div className="flex items-center gap-1.5">
                                    <Flame size={16} className="text-orange-400" />
                                    <span className="text-sm font-medium text-white/70">{currentItem.calories} Kcal</span>
                                </div>
                            )}
                            <div className="flex items-center gap-1.5">
                                <Clock size={16} className="text-blue-400" />
                                <span className="text-sm font-medium text-white/70">8-10 Min</span>
                            </div>
                        </div>

                        {/* ── Ingredients ── */}
                        {ingredients.length > 0 && (
                            <div className="mb-6">
                                <h4 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">
                                    Ingredients
                                </h4>
                                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                                    {ingredients.map((ing, idx) => (
                                        <div
                                            key={idx}
                                            className="flex-shrink-0 w-14 h-14 rounded-2xl bg-white/8 border border-white/10 flex items-center justify-center"
                                            title={ing}
                                        >
                                            <span className="text-[10px] font-medium text-white/60 text-center leading-tight px-1">
                                                {ing.length > 6 ? ing.slice(0, 6) + "…" : ing}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── Variants ── */}
                        {visibleVariants.length > 0 && (
                            <div className="mb-6">
                                <h4 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">
                                    Options
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {visibleVariants.map((v: any) => (
                                        <button
                                            key={v.id}
                                            onClick={() => setSelectedVariants((p) => ({ ...p, [currentItem.id]: v.id }))}
                                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${activeVariantId === v.id
                                                ? "bg-white text-slate-900 border-white"
                                                : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
                                                }`}
                                        >
                                            {v.name}
                                            {v.priceDelta > 0 && ` +₹${v.priceDelta}`}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* ── Bottom Bar ── */}
            {orderingEnabled && (
                <div className="relative z-10 px-6 pb-8 pt-3 bg-gradient-to-t from-[#1a1a2e] via-[#1a1a2e] to-transparent">
                    <div className="flex items-center gap-3">
                        {quantity > 0 ? (
                            <>
                                <div className="flex items-center bg-[#2a2a40] rounded-2xl h-14 px-1">
                                    <button
                                        onClick={() => onRemove(currentItem.id, activeVariantId)}
                                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-all"
                                    >
                                        <Minus size={18} />
                                    </button>
                                    <span className="w-8 text-center text-lg font-black text-white">{quantity}</span>
                                    <button
                                        onClick={() => onAdd(currentItem.id, activeVariantId, displayPrice)}
                                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-all"
                                    >
                                        <Plus size={18} />
                                    </button>
                                </div>
                                <button
                                    onClick={() => onAdd(currentItem.id, activeVariantId, displayPrice)}
                                    className="flex-1 h-14 bg-amber-500 text-slate-900 rounded-2xl font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                >
                                    <ShoppingBag size={18} />
                                    Add To Cart
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => onAdd(currentItem.id, activeVariantId, displayPrice)}
                                className="w-full h-14 bg-amber-500 text-slate-900 rounded-2xl font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-lg shadow-amber-500/20"
                            >
                                <ShoppingBag size={18} />
                                Add To Cart — ₹{displayPrice}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
