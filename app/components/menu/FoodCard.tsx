"use client";

import React, { useState } from "react";
import { Star, Scan, Minus, Plus } from "lucide-react";
import { useLanguageStore } from "@/stores/languageStore";

type Variant = {
  id: string;
  name: string;
  priceDelta: number;
};

type MenuItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  image: string;
  isVeg?: boolean;
  rating: number;
  arModelGlb: string | null;
  isAvailable?: boolean;
  isBestseller?: boolean;
  isSpicy?: boolean;
  variants?: Variant[];
};

interface FoodCardProps {
  item: MenuItem;
  ratingStyles: { container: string; icon: string };
  currentQty: number;
  onAdd: (itemId: string, variantId?: string, price?: number) => void;
  onRemove: (itemId: string, variantId?: string) => void;
  onArClick: (item: MenuItem) => void;
  showArTour?: boolean;
  selectedVariantId?: string;
  onVariantChange?: (variantId: string) => void;
}

const FoodCard: React.FC<FoodCardProps> = ({
  item,
  ratingStyles,
  currentQty,
  onAdd,
  onRemove,
  onArClick,
  showArTour,
  selectedVariantId,
  onVariantChange,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const { t } = useLanguageStore();
  const isAvailable = item.isAvailable !== false;

  const normalizeVariantName = (name: string) => name.trim().toLowerCase();
  const isDefaultVariant = (v: Variant) => {
    const label = normalizeVariantName(v.name || "");
    const isDefaultLabel =
      label === "" ||
      label === "default" ||
      label === "regular" ||
      label === "standard";
    return isDefaultLabel && (v.priceDelta || 0) === 0;
  };

  const visibleVariants = (item.variants || []).filter((v) => !isDefaultVariant(v));
  const activeVariantId =
    selectedVariantId ||
    visibleVariants[0]?.id ||
    item.variants?.[0]?.id;
  const displayPrice =
    item.price + (item.variants?.find((v) => v.id === activeVariantId)?.priceDelta || 0);

  return (
    <div className={`w-full ${!isAvailable ? "opacity-60" : ""}`}>
      <div className="flex gap-4">
        <div className="relative w-28 h-28 flex-shrink-0 rounded-xl overflow-hidden bg-slate-100">
          {!imageLoaded && <div className="absolute inset-0 bg-slate-200 animate-pulse" />}
          <img
            src={item.image}
            alt={item.name}
            className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setImageLoaded(true)}
          />
          <div className="absolute top-2 left-2 bg-white/95 p-1 rounded flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? "bg-green-600" : "bg-red-600"}`} />
          </div>
          {!isAvailable && (
            <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide">
              {t('soldOut')}
            </div>
          )}
          {item.arModelGlb ? (
            <button
              onClick={() => onArClick(item)}
              className={`absolute bottom-2 right-2 p-1.5 rounded-lg text-white transition-colors ${showArTour ? "bg-emerald-600 animate-pulse" : "bg-black/60 hover:bg-black/80"}`}
            >
              <Scan className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="absolute bottom-2 right-2 bg-black/40 px-2 py-1 rounded-lg text-[10px] text-white/80">
              AR soon
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col justify-between py-0.5">
          <div>
            <div className="flex justify-between items-start mb-1.5">
              <div className="space-y-1 pr-2">
                <h3 className="font-medium text-slate-900 text-sm leading-snug">{item.name}</h3>
                <div className="flex flex-wrap gap-2">
                  {item.isBestseller && (
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                      {t('bestseller')}
                    </span>
                  )}
                  {item.isSpicy && (
                    <span className="text-[10px] font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                      🌶 {t('spicy')}
                    </span>
                  )}
                </div>
              </div>
              <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${ratingStyles.container}`}>
                <Star className={`w-3 h-3 ${ratingStyles.icon}`} />
                <span>{item.rating}</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-3">{item.description}</p>
            {visibleVariants.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {visibleVariants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => onVariantChange?.(v.id)}
                    className={`px-2 py-1 rounded-full border text-[10px] font-medium transition-all ${activeVariantId === v.id ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200"}`}
                  >
                    {v.name} {v.priceDelta > 0 && `+₹${v.priceDelta}`}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold text-slate-900">₹{displayPrice}</span>
            {isAvailable ? (
              currentQty > 0 ? (
                <div className="flex items-center h-8 bg-slate-900 text-white rounded-lg overflow-hidden">
                  <button onClick={() => onRemove(item.id, activeVariantId)} className="w-8 h-full flex items-center justify-center hover:bg-white/10"><Minus className="w-3.5 h-3.5" /></button>
                  <span className="min-w-[2rem] text-center text-xs font-medium">{currentQty}</span>
                  <button onClick={() => onAdd(item.id, activeVariantId, displayPrice)} className="w-8 h-full flex items-center justify-center hover:bg-white/10"><Plus className="w-3.5 h-3.5" /></button>
                </div>
              ) : (
                <button onClick={() => onAdd(item.id, activeVariantId, displayPrice)} className="h-8 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg transition-colors">{t('add')}</button>
              )
            ) : <span className="text-xs font-semibold text-red-500">{t('unavailable')}</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FoodCard;
