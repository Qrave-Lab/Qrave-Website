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
    const [modelViewerReady, setModelViewerReady] = useState(false);

    useEffect(() => {
        if (items.length === 0) return;
        if (currentIndex >= items.length) setCurrentIndex(0);
    }, [items, currentIndex]);

    useEffect(() => {
        setExpandedDesc(false);
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

    const normalizeVariantName = (name: string) => name.trim().toLowerCase();
    const isDefaultVariant = (v: any) => {
        const label = normalizeVariantName(v.name || "");
        return ["", "default", "regular", "standard"].includes(label) && (v.priceDelta || 0) === 0;
    };

    const visibleVariants = (currentItem.variants || []).filter((v: any) => !isDefaultVariant(v));
    const activeVariantId = selectedVariants[currentItem.id] || visibleVariants[0]?.id || currentItem.variants?.[0]?.id;
    const currentVariant = currentItem.variants?.find((v: any) => v.id === activeVariantId);
    const basePrice = Number(currentItem.price || 0);
    const discountedBasePrice =
        typeof currentItem.offerPrice === "number" &&
            currentItem.offerPrice >= 0 &&
            currentItem.offerPrice < basePrice
            ? Number(currentItem.offerPrice)
            : basePrice;
    const displayPrice = discountedBasePrice + (currentVariant?.priceDelta || 0);
    const originalDisplayPrice = basePrice + (currentVariant?.priceDelta || 0);

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
        enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0, scale: 0.95 }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1,
            scale: 1,
            transition: {
                x: { type: "spring" as const, stiffness: 300, damping: 30 },
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
                x: { type: "spring" as const, stiffness: 300, damping: 30 },
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

    const ingredients = getIngredients(currentItem);
    const hasModel = Boolean(currentItem.arModelGlb);
    const desc = currentItem.description || "";

    return (
        <div className="fixed inset-0 z-[100] overflow-hidden flex flex-col bg-[#F8FAFC] text-slate-900 font-sans selection:bg-slate-200">
            {/* Soft Background Gradient */}
            <div className="absolute inset-0 pointer-events-none opacity-60">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150vw] h-[60vh] bg-gradient-to-b from-white to-transparent blur-3xl rounded-b-full mix-blend-overlay" />
            </div>

            {/* ── Header ── */}
            <header className="relative z-20 px-6 pt-12 pb-4 flex items-center justify-between">
                <button
                    onClick={orderingEnabled ? onClose : undefined}
                    className="w-11 h-11 rounded-full bg-white/80 backdrop-blur-xl border border-slate-200 flex items-center justify-center transition-all active:scale-90 hover:bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
                    style={{
                        opacity: orderingEnabled ? 1 : 0,
                        pointerEvents: orderingEnabled ? "auto" : "none",
                    }}
                >
                    <ChevronLeft size={20} strokeWidth={2.5} className="text-slate-800" />
                </button>

                {/* Animated progress dots */}
                <div className="flex items-center gap-1.5">
                    {items.map((_, idx) => {
                        if (Math.abs(idx - currentIndex) > 4) return null;
                        return (
                            <motion.div
                                key={idx}
                                animate={{
                                    width: idx === currentIndex ? 24 : 6,
                                    opacity: idx === currentIndex ? 1 : 0.2,
                                }}
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                className="h-1.5 rounded-full bg-slate-800"
                            />
                        );
                    })}
                </div>

                <button
                    onClick={orderingEnabled ? onClose : undefined}
                    className="w-11 h-11 rounded-full bg-white/80 backdrop-blur-xl border border-slate-200 flex items-center justify-center transition-all active:scale-90 hover:bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
                    style={{
                        opacity: orderingEnabled ? 1 : 0,
                        pointerEvents: orderingEnabled ? "auto" : "none",
                    }}
                >
                    <List size={18} className="text-slate-800" />
                </button>
            </header>

            {/* ── Swipeable Content ── */}
            <div className="flex-1 relative overflow-hidden z-10">
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
                        className="absolute inset-0 flex flex-col overflow-y-auto pb-32"
                        style={{ scrollbarWidth: "none" }}
                    >
                        {/* ── Hero Image ── */}
                        <div className="relative flex-shrink-0 flex items-center justify-center pt-8 pb-8 mx-6">
                            {/* Ghost watermark index */}
                            <span
                                className="absolute left-0 top-1/2 -translate-y-1/2 select-none pointer-events-none font-black text-[140px] leading-none"
                                style={{
                                    color: "transparent",
                                    WebkitTextStroke: "1px rgba(0,0,0,0.04)",
                                    fontFamily: "Georgia, serif",
                                    zIndex: 0,
                                    userSelect: "none",
                                }}
                            >
                                {String(currentIndex + 1).padStart(2, "0")}
                            </span>

                            <div className="relative z-10 w-72 h-72 sm:w-80 sm:h-80 group">
                                {/* Soft pedestal shadow instead of a hard circle */}
                                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[80%] h-12 bg-black/10 blur-xl rounded-[100%]" />
                                
                                {hasModel && modelViewerReady ? (
                                    <div className="absolute inset-0 rounded-full overflow-hidden">
                                        <model-viewer
                                            src={currentItem.arModelGlb}
                                            alt={currentItem.name}
                                            auto-rotate
                                            disable-zoom
                                            interaction-prompt="none"
                                            camera-orbit="0deg 75deg 1.8m"
                                            min-camera-orbit="auto auto 1.8m"
                                            max-camera-orbit="auto auto 1.8m"
                                            tone-mapping="commerce"
                                            shadow-intensity="1"
                                            style={{ width: "100%", height: "100%", background: "transparent" }}
                                        />
                                    </div>
                                ) : (
                                    <div className="absolute inset-0 p-2">
                                        <img
                                            src={currentItem.image}
                                            alt={currentItem.name}
                                            className="w-full h-full object-contain drop-shadow-[0_24px_34px_rgba(0,0,0,0.15)]"
                                        />
                                    </div>
                                )}

                                {hasModel && (
                                    <button
                                        onClick={() => onArClick(currentItem)}
                                        className="absolute bottom-4 right-4 px-4 py-2 rounded-full text-[11px] font-black flex items-center gap-2 active:scale-95 transition-all uppercase tracking-widest bg-white/90 backdrop-blur-md border border-slate-200 text-slate-900 hover:bg-white shadow-[0_8px_20px_rgba(0,0,0,0.08)]"
                                    >
                                        <Scan size={14} />
                                        View AR
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* ── Content ── */}
                        <div className="flex-1 px-8 pt-4 pb-8">
                            
                            {/* Category + counter */}
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                                    {currentItem.category || "Menu"}
                                </span>
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                                    {String(currentIndex + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
                                </span>
                            </div>

                            {/* Name + Price */}
                            <div className="flex flex-col gap-2 mb-6">
                                <h2 className="text-4xl leading-[1.1] text-slate-900 font-serif font-bold tracking-tight">
                                    {currentItem.name}
                                </h2>
                                <div className="flex items-end gap-3 mt-1">
                                    <span className="text-3xl text-slate-900 font-serif font-semibold">
                                        ₹{displayPrice}
                                    </span>
                                    {originalDisplayPrice > displayPrice && (
                                        <span className="text-lg text-slate-400 line-through font-serif mb-0.5">
                                            ₹{originalDisplayPrice}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Stats pills */}
                            <div className="flex items-center gap-3 mb-8 flex-wrap">
                                {currentItem.rating > 0 && (
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full shadow-sm">
                                        <Star size={12} className="fill-amber-400 text-amber-400" />
                                        <span className="text-xs font-bold text-slate-700">{currentItem.rating}</span>
                                    </div>
                                )}
                                {currentItem.calories && (
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full shadow-sm">
                                        <Flame size={12} className="text-rose-500" />
                                        <span className="text-xs font-bold text-slate-700">{currentItem.calories} kcal</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full shadow-sm">
                                    <Clock size={12} className="text-blue-500" />
                                    <span className="text-xs font-bold text-slate-700">8–10 min</span>
                                </div>
                            </div>

                            {/* Description */}
                            {desc && (
                                <div className="mb-8">
                                    <p className={`text-[15px] leading-relaxed text-slate-600 font-light ${!expandedDesc ? "line-clamp-2" : ""}`}>
                                        {desc}
                                    </p>
                                    {desc.length > 90 && (
                                        <button
                                            onClick={() => setExpandedDesc(!expandedDesc)}
                                            className="text-[10px] font-black mt-2 uppercase tracking-[0.2em] text-slate-400 hover:text-slate-800 transition-colors flex items-center gap-1"
                                        >
                                            {expandedDesc ? "Collapse" : "Read More"} 
                                            <span className="text-xs font-normal">{expandedDesc ? "↑" : "↓"}</span>
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Ingredients */}
                            {ingredients.length > 0 && (
                                <div className="mb-8">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4">
                                        Ingredients
                                    </h4>
                                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mask-linear-fade">
                                        {ingredients.map((ing, idx) => (
                                            <div
                                                key={idx}
                                                title={ing}
                                                className="flex-shrink-0 px-4 py-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-center shadow-sm"
                                            >
                                                <span className="text-[11px] font-bold text-slate-600 text-center uppercase tracking-wider">
                                                    {ing}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Variants */}
                            {visibleVariants.length > 0 && (
                                <div className="mb-8">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4">
                                        Options
                                    </h4>
                                    <div className="flex flex-wrap gap-2.5">
                                        {visibleVariants.map((v: any) => {
                                            const isActive = activeVariantId === v.id;
                                            return (
                                                <button
                                                    key={v.id}
                                                    onClick={() => setSelectedVariants((p) => ({ ...p, [currentItem.id]: v.id }))}
                                                    className={`px-5 py-3 text-xs font-bold transition-all uppercase tracking-widest rounded-2xl border ${
                                                        isActive 
                                                        ? "bg-slate-900 text-white border-slate-900 shadow-md" 
                                                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                                    }`}
                                                >
                                                    {v.name}{v.priceDelta > 0 && <span className="opacity-60 ml-1">+₹{v.priceDelta}</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* ── Floating Glass Bottom Bar ── */}
            {orderingEnabled && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-md z-50">
                    <div className="relative p-2 rounded-[28px] bg-white/80 backdrop-blur-2xl border border-slate-200/60 shadow-[0_24px_48px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,1)] flex items-center gap-2">
                        
                        {/* Qty stepper */}
                        <div className="flex items-center bg-slate-100/80 rounded-[20px] h-[56px] px-1">
                            <button
                                onClick={() => onRemove(currentItem.id, activeVariantId)}
                                className="w-12 h-12 rounded-[16px] flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-200/50 active:scale-95 transition-all"
                            >
                                <Minus size={18} strokeWidth={2.5} />
                            </button>
                            <span className="w-8 text-center text-lg font-bold text-slate-900">
                                {quantity || 0}
                            </span>
                            <button
                                onClick={() => onAdd(currentItem.id, activeVariantId, displayPrice)}
                                className="w-12 h-12 rounded-[16px] flex items-center justify-center text-slate-900 hover:bg-slate-200/50 active:scale-95 transition-all"
                            >
                                <Plus size={18} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Add to Cart CTA */}
                        <button
                            onClick={() => onAdd(currentItem.id, activeVariantId, displayPrice)}
                            className="flex-1 h-[56px] bg-slate-900 text-white rounded-[20px] font-black text-xs active:scale-[0.97] transition-all flex items-center justify-center gap-2 uppercase tracking-[0.15em] hover:bg-slate-800 shadow-[0_8px_20px_rgba(15,23,42,0.2)]"
                        >
                            <ShoppingBag size={18} strokeWidth={2.5} />
                            Add to Cart
                        </button>
                    </div>
                </div>
            )}

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

