"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Plus, Minus, Star, ShoppingBag, UtensilsCrossed } from "lucide-react";
import { useLanguageStore } from "@/stores/languageStore";
import { getCartKey } from "@/stores/cartStore";

interface ImmersiveMenuProps {
    items: any[];
    categories: { id: string; name: string }[];
    cart: any;
    onAdd: (id: string, vId?: string, price?: number) => void;
    onRemove: (id: string, vId?: string) => void;
    onClose: () => void;
    tableNumber: string;
}

export default function ImmersiveMenu({
    items,
    categories,
    cart,
    onAdd,
    onRemove,
    onClose,
    tableNumber,
}: ImmersiveMenuProps) {
    const { t } = useLanguageStore();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [direction, setDirection] = useState(0);
    const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

    const prevIndex = useRef(currentIndex);

    useEffect(() => {
        if (items.length === 0) return;
        if (currentIndex >= items.length) {
            setCurrentIndex(0);
        }
    }, [items, currentIndex]);

    const currentItem = items[currentIndex];

    if (!currentItem) {
        return (
            <div className="fixed inset-0 z-50 bg-slate-900 flex items-center justify-center text-white">
                <div className="text-center">
                    <p className="text-xl font-bold mb-4">{t('unavailable')}</p>
                    <button onClick={onClose} className="px-6 py-2 bg-white text-slate-900 rounded-full font-bold">
                        {t('listView')}
                    </button>
                </div>
            </div>
        );
    }

    // Variant Logic
    const normalizeVariantName = (name: string) => name.trim().toLowerCase();
    const isDefaultVariant = (v: any) => {
        const label = normalizeVariantName(v.name || "");
        const isDefaultLabel = ["", "default", "regular", "standard"].includes(label);
        return isDefaultLabel && (v.priceDelta || 0) === 0;
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
            setCurrentIndex(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setDirection(-1);
            setCurrentIndex(prev => prev - 1);
        }
    };

    const onDragEnd = (e: any, { offset, velocity }: PanInfo) => {
        const swipe = offset.x;
        if (swipe < -50) {
            handleNext();
        } else if (swipe > 50) {
            handlePrev();
        }
    };

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 300 : -300,
            opacity: 0,
            scale: 0.8,
            rotateY: direction > 0 ? 45 : -45
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1,
            scale: 1,
            rotateY: 0,
            transition: {
                x: { stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
                scale: { duration: 0.2 }
            }
        },
        exit: (direction: number) => ({
            zIndex: 0,
            x: direction < 0 ? 300 : -300,
            opacity: 0,
            scale: 0.8,
            rotateY: direction < 0 ? -45 : 45,
            transition: {
                x: { stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
                scale: { duration: 0.2 }
            }
        })
    } as const;

    return (
        <div className="fixed inset-0 z-[60] bg-slate-900 overflow-hidden flex flex-col">
            {/* Background Ambience */}
            <div className="absolute inset-0 overflow-hidden">
                <motion.div
                    key={currentItem.image}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.3 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1 }}
                    className="absolute inset-0 bg-cover bg-center blur-3xl scale-125"
                    style={{ backgroundImage: `url(${currentItem.image})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-900/50 to-slate-900" />
            </div>

            {/* Header */}
            <header className="relative z-10 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center text-white">
                        <UtensilsCrossed size={16} />
                    </div>
                    <div>
                        <h1 className="text-white font-bold text-lg leading-none">NOIR.</h1>
                        <p className="text-white/50 text-[10px] uppercase font-bold tracking-wider">Table {tableNumber}</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                >
                    <X size={20} />
                </button>
            </header>

            {/* Category Tabs */}
            <div className="relative z-10 px-6 mb-4">
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 mask-linear">
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => {
                                // Find first item of this category
                                const idx = items.findIndex((i: any) =>
                                    (i.parentCategoryName || i.categoryName) === cat.id
                                );
                                if (idx !== -1) {
                                    setDirection(idx > currentIndex ? 1 : -1);
                                    setCurrentIndex(idx);
                                }
                            }}
                            className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all
                 ${items[currentIndex].parentCategoryName === cat.id || items[currentIndex].categoryName === cat.id
                                    ? "bg-white text-slate-900 shadow-lg shadow-white/20"
                                    : "bg-white/5 text-white/60 hover:bg-white/10"
                                }`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Swipe Area */}
            <div className="flex-1 relative flex items-center justify-center perspective-1000">
                <AnimatePresence initial={false} custom={direction}>
                    <motion.div
                        key={currentItem.id}
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={1}
                        onDragEnd={onDragEnd}
                        className="absolute w-[85%] h-[70vh] max-h-[600px] bg-white rounded-3xl overflow-hidden shadow-2xl shadow-black/50 flex flex-col"
                    >
                        {/* Image Area */}
                        <div className="relative h-[55%] bg-slate-100 overflow-hidden group">
                            <img
                                src={currentItem.image}
                                alt={currentItem.name}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                            <div className="absolute top-4 left-4 flex gap-2">
                                <div className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${currentItem.isVeg ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>
                                    {t('veg')}
                                </div>
                                {currentItem.rating > 0 && (
                                    <div className="px-2 py-1 rounded-lg bg-white/90 backdrop-blur text-[10px] font-bold flex items-center gap-1">
                                        <Star size={10} className="fill-amber-400 text-amber-400" />
                                        {currentItem.rating}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 p-6 flex flex-col">
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-2">
                                    <h2 className="text-2xl font-black text-slate-900 leading-tight">{currentItem.name}</h2>
                                    <span className="text-xl font-bold text-slate-900">₹{displayPrice}</span>
                                </div>
                                <p className="text-sm text-slate-500 leading-relaxed line-clamp-3 mb-4">{currentItem.description}</p>

                                {/* Variants */}
                                {visibleVariants.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {visibleVariants.map((v: any) => (
                                            <button
                                                key={v.id}
                                                onClick={() => setSelectedVariants(p => ({ ...p, [currentItem.id]: v.id }))}
                                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border 
                          ${activeVariantId === v.id
                                                        ? "bg-slate-900 text-white border-slate-900"
                                                        : "bg-white text-slate-600 border-slate-200"
                                                    }`}
                                            >
                                                {v.name} {v.priceDelta > 0 && `+₹${v.priceDelta}`}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="mt-auto pt-4 border-t border-slate-100">
                                {quantity > 0 ? (
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1 flex items-center justify-between bg-slate-900 text-white rounded-2xl p-2">
                                            <button
                                                onClick={() => onRemove(currentItem.id, activeVariantId)}
                                                className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all"
                                            >
                                                <Minus size={20} />
                                            </button>
                                            <span className="text-xl font-black">{quantity}</span>
                                            <button
                                                onClick={() => onAdd(currentItem.id, activeVariantId, displayPrice)}
                                                className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all"
                                            >
                                                <Plus size={20} />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => onAdd(currentItem.id, activeVariantId, displayPrice)}
                                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-xl shadow-slate-900/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                                    >
                                        <ShoppingBag size={20} />
                                        {t('add')}
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Navigation Buttons (Desktop/Tablet) */}
                <button
                    onClick={handlePrev}
                    disabled={currentIndex === 0}
                    className="absolute left-4 z-20 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/20 transition-all md:flex hidden"
                >
                    <ChevronLeft size={24} />
                </button>
                <button
                    onClick={handleNext}
                    disabled={currentIndex === items.length - 1}
                    className="absolute right-4 z-20 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/20 transition-all md:flex hidden"
                >
                    <ChevronRight size={24} />
                </button>
            </div>

            {/* Progress Dots */}
            <div className="relative z-10 py-6 flex justify-center gap-2">
                {/* Show only a window of dots if too many */}
                {items.map((_, idx) => {
                    // Simple visibility logic for dots
                    if (Math.abs(idx - currentIndex) > 3) return null;
                    return (
                        <div
                            key={idx}
                            className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? "w-6 bg-white" : "w-1.5 bg-white/30"}`}
                        />
                    );
                })}
            </div>
        </div>
    );
}
