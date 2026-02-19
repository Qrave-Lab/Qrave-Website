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
            <div className="fixed inset-0 z-[60] bg-white flex items-center justify-center">
                <div className="text-center">
                    <p className="text-xl font-bold text-black mb-4" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
                        No items available
                    </p>
                    {orderingEnabled && (
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-black text-white text-xs font-bold tracking-[0.15em] uppercase transition-all active:scale-95"
                            style={{ fontFamily: "'DM Sans', sans-serif" }}
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
                x: { type: "spring" as const, stiffness: 320, damping: 32 },
                opacity: { duration: 0.12 },
            },
        },
        exit: (dir: number) => ({
            zIndex: 0,
            x: dir < 0 ? "100%" : "-100%",
            opacity: 0,
            transition: {
                x: { type: "spring" as const, stiffness: 320, damping: 32 },
                opacity: { duration: 0.12 },
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
        <div
            className="fixed inset-0 z-[60] overflow-hidden flex flex-col bg-white"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
            {/* ── Header ── */}
            <header className="relative z-10 px-5 pt-8 pb-2 flex items-center justify-between">
                <button
                    onClick={orderingEnabled ? onClose : undefined}
                    className="w-10 h-10 rounded-full border border-black/10 flex items-center justify-center transition-all active:scale-90 hover:bg-black/5"
                    style={{
                        opacity: orderingEnabled ? 1 : 0,
                        pointerEvents: orderingEnabled ? "auto" : "none",
                        color: "#111",
                    }}
                >
                    <ChevronLeft size={18} strokeWidth={2.5} />
                </button>

                {/* Animated progress dots */}
                <div className="flex items-center gap-[5px]">
                    {items.map((_, idx) => {
                        if (Math.abs(idx - currentIndex) > 5) return null;
                        return (
                            <motion.div
                                key={idx}
                                animate={{
                                    width: idx === currentIndex ? 20 : 5,
                                    opacity: idx === currentIndex ? 1 : 0.18,
                                }}
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                className="h-[5px] rounded-full bg-black"
                            />
                        );
                    })}
                </div>

                <button
                    onClick={orderingEnabled ? onClose : undefined}
                    className="w-10 h-10 rounded-full border border-black/10 flex items-center justify-center transition-all active:scale-90 hover:bg-black/5"
                    style={{
                        opacity: orderingEnabled ? 1 : 0,
                        pointerEvents: orderingEnabled ? "auto" : "none",
                        color: "#111",
                    }}
                >
                    <List size={17} />
                </button>
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
                        dragElastic={0.65}
                        onDragEnd={onDragEnd}
                        className="absolute inset-0 flex flex-col overflow-y-auto"
                        style={{ scrollbarWidth: "none" }}
                    >
                        {/* ── Hero Image ── */}
                        <div className="relative flex-shrink-0 flex items-center justify-center pt-4 pb-0 mx-6">
                            {/* Ghost watermark index */}
                            <span
                                className="absolute left-0 top-1/2 -translate-y-1/2 select-none pointer-events-none font-black text-[110px] leading-none"
                                style={{
                                    color: "transparent",
                                    WebkitTextStroke: "1.5px rgba(0,0,0,0.045)",
                                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                                    zIndex: 0,
                                    userSelect: "none",
                                }}
                            >
                                {String(currentIndex + 1).padStart(2, "0")}
                            </span>

                            <div className="relative z-10 w-64 h-64 sm:w-72 sm:h-72">
                                {/* Plate disc */}
                                <div
                                    className="absolute inset-0 rounded-full"
                                    style={{
                                        background: "radial-gradient(circle at 38% 33%, #f7f7f7, #e8e8e8)",
                                        boxShadow:
                                            "0 24px 64px rgba(0,0,0,0.08), 0 6px 20px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.9)",
                                    }}
                                />

                                {hasModel ? (
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
                                    <div className="absolute inset-0 rounded-full overflow-hidden p-6">
                                        <img
                                            src={currentItem.image}
                                            alt={currentItem.name}
                                            className="w-full h-full object-contain"
                                            style={{ filter: "drop-shadow(0 14px 28px rgba(0,0,0,0.15))" }}
                                        />
                                    </div>
                                )}

                                {hasModel && (
                                    <button
                                        onClick={() => onArClick(currentItem)}
                                        className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full text-[10px] font-black flex items-center gap-1.5 active:scale-95 transition-transform uppercase tracking-wider border border-black text-black bg-white"
                                        style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}
                                    >
                                        <Scan size={11} />
                                        AR
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* ── Content ── */}
                        <div className="flex-1 px-6 pt-8 pb-6">

                            {/* Category + counter */}
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-black/25">
                                    {currentItem.category || "Menu"}
                                </span>
                                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-black/25">
                                    {String(currentIndex + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
                                </span>
                            </div>

                            {/* Name + Price */}
                            <div className="flex items-end justify-between gap-4 mb-1">
                                <h2
                                    className="text-[30px] leading-[1.08] text-black flex-1"
                                    style={{
                                        fontFamily: "'Cormorant Garamond', Georgia, serif",
                                        fontWeight: 600,
                                        letterSpacing: "-0.02em",
                                    }}
                                >
                                    {currentItem.name}
                                </h2>
                                <span
                                    className="text-2xl text-black flex-shrink-0 pb-0.5"
                                    style={{
                                        fontFamily: "'Cormorant Garamond', Georgia, serif",
                                        fontWeight: 700,
                                    }}
                                >
                                    ₹{displayPrice}
                                </span>
                            </div>

                            {/* Rule */}
                            <div className="w-full h-px bg-black/8 mb-4" />

                            {/* Description */}
                            {desc && (
                                <div className="mb-5">
                                    <p className={`text-sm leading-relaxed text-black/45 ${!expandedDesc ? "line-clamp-2" : ""}`}>
                                        {desc}
                                    </p>
                                    {desc.length > 80 && (
                                        <button
                                            onClick={() => setExpandedDesc(!expandedDesc)}
                                            className="text-[10px] font-black mt-1.5 uppercase tracking-[0.15em] text-black/30 hover:text-black transition-colors"
                                        >
                                            {expandedDesc ? "collapse ↑" : "read more ↓"}
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Stats pills */}
                            <div className="flex items-center gap-2 mb-7 flex-wrap">
                                {currentItem.rating > 0 && (
                                    <div className="flex items-center gap-1.5 px-3 py-[7px] border border-black/10 rounded-full">
                                        <Star size={11} className="fill-black text-black" />
                                        <span className="text-[11px] font-bold text-black">{currentItem.rating}</span>
                                    </div>
                                )}
                                {currentItem.calories && (
                                    <div className="flex items-center gap-1.5 px-3 py-[7px] border border-black/10 rounded-full">
                                        <Flame size={11} className="text-black" />
                                        <span className="text-[11px] font-bold text-black">{currentItem.calories} kcal</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-1.5 px-3 py-[7px] border border-black/10 rounded-full">
                                    <Clock size={11} className="text-black" />
                                    <span className="text-[11px] font-bold text-black">8–10 min</span>
                                </div>
                            </div>

                            {/* Ingredients */}
                            {ingredients.length > 0 && (
                                <div className="mb-7">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.22em] text-black/22 mb-3">
                                        Ingredients
                                    </h4>
                                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                        {ingredients.map((ing, idx) => (
                                            <div
                                                key={idx}
                                                title={ing}
                                                className="flex-shrink-0 px-3 py-2 border border-black/8 rounded-xl flex items-center justify-center active:scale-95 transition-transform hover:border-black/20 hover:bg-black/[0.02]"
                                                style={{ minWidth: "52px" }}
                                            >
                                                <span className="text-[10px] font-bold text-black/35 text-center leading-tight uppercase tracking-tight">
                                                    {ing.length > 6 ? ing.slice(0, 6) : ing}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Variants */}
                            {visibleVariants.length > 0 && (
                                <div className="mb-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.22em] text-black/22 mb-3">
                                        Options
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {visibleVariants.map((v: any) => {
                                            const isActive = activeVariantId === v.id;
                                            return (
                                                <button
                                                    key={v.id}
                                                    onClick={() => setSelectedVariants((p) => ({ ...p, [currentItem.id]: v.id }))}
                                                    className="px-4 py-2.5 text-[11px] font-black transition-all uppercase tracking-wider active:scale-95 rounded-full"
                                                    style={{
                                                        background: isActive ? "#000" : "transparent",
                                                        color: isActive ? "#fff" : "#000",
                                                        border: "1.5px solid #000",
                                                        boxShadow: isActive ? "0 4px 14px rgba(0,0,0,0.2)" : "none",
                                                    }}
                                                >
                                                    {v.name}{v.priceDelta > 0 && ` +₹${v.priceDelta}`}
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

            {/* ── Bottom Bar ── */}
            {orderingEnabled && (
                <div
                    className="relative z-10 px-5 pb-10 pt-4 bg-white"
                    style={{ borderTop: "1px solid rgba(0,0,0,0.07)" }}
                >
                    <div className="flex items-center gap-3">
                        {/* Qty stepper */}
                        <div className="flex items-center border border-black/10 rounded-2xl h-[60px] px-1.5">
                            <button
                                onClick={() => onRemove(currentItem.id, activeVariantId)}
                                className="w-11 h-11 rounded-xl flex items-center justify-center text-black/30 hover:text-black hover:bg-black/5 active:scale-90 transition-all"
                            >
                                <Minus size={17} strokeWidth={2.5} />
                            </button>
                            <span className="w-9 text-center text-lg font-black text-black">
                                {quantity || 0}
                            </span>
                            <button
                                onClick={() => onAdd(currentItem.id, activeVariantId, displayPrice)}
                                className="w-11 h-11 rounded-xl flex items-center justify-center text-black hover:bg-black/5 active:scale-90 transition-all"
                            >
                                <Plus size={17} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* CTA */}
                        <button
                            onClick={() => onAdd(currentItem.id, activeVariantId, displayPrice)}
                            className="flex-1 h-[60px] bg-black text-white rounded-2xl font-black text-[12px] active:scale-[0.97] transition-all flex items-center justify-center gap-2.5 uppercase tracking-[0.12em]"
                            style={{ boxShadow: "0 8px 28px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.1)" }}
                        >
                            <ShoppingBag size={17} strokeWidth={2.5} />
                            Add to Cart
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
