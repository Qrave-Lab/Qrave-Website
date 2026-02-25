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
  offerPrice?: number;
  offerLabel?: string;
  description: string;
  image: string;
  isVeg?: boolean;
  rating: number;
  arModelGlb: string | null;
  arModelUsdz?: string | null;
  ingredients?: string[] | string;
  calories?: number | string;
  allergens?: string[];
  isAvailable?: boolean;
  isOutOfStock?: boolean;
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
  orderingEnabled?: boolean;
  layout?: "list" | "grid" | "compact";
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
  orderingEnabled = true,
  layout = "list",
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const { t } = useLanguageStore();
  const isAvailable = item.isAvailable !== false && !item.isOutOfStock;

  const normalizeVariantName = (name: string) => name.trim().toLowerCase();
  const isDefaultVariant = (v: Variant) => {
    const label = normalizeVariantName(v.name || "");
    return (label === "" || label === "default" || label === "regular" || label === "standard") && (v.priceDelta || 0) === 0;
  };

  const visibleVariants = (item.variants || []).filter((v) => !isDefaultVariant(v));
  const activeVariantId = selectedVariantId || visibleVariants[0]?.id || item.variants?.[0]?.id || "";
  const basePrice = item.price;
  const discountedBasePrice =
    typeof item.offerPrice === "number" && item.offerPrice >= 0 && item.offerPrice < basePrice
      ? item.offerPrice
      : basePrice;
  const variantDelta = item.variants?.find((v) => v.id === activeVariantId)?.priceDelta || 0;
  const displayPrice = discountedBasePrice + variantDelta;
  const displayBaseWithoutDiscount = basePrice + variantDelta;

  const AddButton = () => (
    isAvailable ? (
      orderingEnabled ? (
        currentQty > 0 ? (
          <div className="flex items-center bg-slate-900 text-white rounded-xl overflow-hidden h-8">
            <button onClick={() => onRemove(item.id, activeVariantId)} className="w-8 h-full flex items-center justify-center hover:bg-white/10 transition-colors">
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="min-w-6 text-center text-xs font-bold">{currentQty}</span>
            <button onClick={() => onAdd(item.id, activeVariantId, displayPrice)} className="w-8 h-full flex items-center justify-center hover:bg-white/10 transition-colors">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => onAdd(item.id, activeVariantId, displayPrice)}
            className="h-8 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            {t("add")}
          </button>
        )
      ) : null
    ) : (
      <span className="text-xs font-semibold text-red-500">{t("unavailable")}</span>
    )
  );

  // ─── COMPACT layout ─────────────────────────────────────────────────────────
  if (layout === "compact") {
    return (
      <div className={`flex items-center gap-3 py-2.5 ${!isAvailable ? "opacity-60" : ""}`}>
        <div className="relative w-12 h-12 shrink-0 rounded-xl overflow-hidden bg-slate-100">
          {!imageLoaded && <div className="absolute inset-0 bg-slate-200 animate-pulse" />}
          <img
            src={item.image}
            alt={item.name}
            className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setImageLoaded(true)}
          />
          <div className="absolute top-1 left-1 bg-white/95 p-0.5 rounded flex items-center">
            <div className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? "bg-green-600" : "bg-red-600"}`} />
          </div>
          {!isAvailable && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="text-[8px] font-black uppercase text-white">Out</span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate leading-snug">{item.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {displayBaseWithoutDiscount > displayPrice && (
              <span className="text-[10px] text-slate-400 line-through">₹{displayBaseWithoutDiscount}</span>
            )}
            <span className="text-sm font-bold text-slate-900">₹{displayPrice}</span>
            {item.calories ? (
              <span className="text-[10px] text-slate-400">{item.calories} kcal</span>
            ) : null}
          </div>
          {visibleVariants.length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {visibleVariants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => onVariantChange?.(v.id)}
                  className={`px-2 py-0.5 rounded-full border text-[9px] font-semibold transition-all ${activeVariantId === v.id ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200"}`}
                >
                  {v.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="shrink-0">
          <AddButton />
        </div>
      </div>
    );
  }

  // ─── GRID layout ─────────────────────────────────────────────────────────────
  if (layout === "grid") {
    return (
      <div className={`rounded-2xl overflow-hidden border border-slate-100 shadow-sm bg-white flex flex-col ${!isAvailable ? "opacity-60" : ""}`}>
        <div className="relative aspect-4/3 overflow-hidden bg-slate-100 shrink-0">
          {!imageLoaded && <div className="absolute inset-0 bg-slate-200 animate-pulse" />}
          <img
            src={item.image}
            alt={item.name}
            className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setImageLoaded(true)}
          />
          {/* Veg dot */}
          <div className="absolute top-2 left-2 bg-white/95 p-1 rounded flex items-center">
            <div className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? "bg-green-600" : "bg-red-600"}`} />
          </div>
          {/* Rating */}
          {item.rating > 0 && (
            <div className={`absolute top-2 right-2 flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border ${ratingStyles.container}`}>
              <Star className={`w-2.5 h-2.5 ${ratingStyles.icon}`} />
              <span className="font-bold">{item.rating}</span>
            </div>
          )}
          {/* Sold out */}
          {!isAvailable && (
            <div className="absolute bottom-2 left-2 bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide font-bold">
              {t("soldOut")}
            </div>
          )}
          {/* AR */}
          {item.arModelGlb && (
            <button
              onClick={() => onArClick(item)}
              className={`ar-view-btn absolute bottom-2 right-2 p-1.5 rounded-lg text-white transition-colors ${showArTour ? "bg-emerald-600 animate-pulse" : "bg-black/60 hover:bg-black/80"}`}
            >
              <Scan className="w-3.5 h-3.5" />
            </button>
          )}
          {/* Badges */}
          {(item.isBestseller || item.isSpicy) && (
            <div className="absolute bottom-2 left-2 flex gap-1">
              {item.isBestseller && (
                <span className="text-[9px] font-bold text-amber-700 bg-amber-50/95 px-1.5 py-0.5 rounded-full">{t("bestseller")}</span>
              )}
              {item.isSpicy && (
                <span className="text-[9px] font-bold text-red-600 bg-red-50/95 px-1.5 py-0.5 rounded-full">🌶</span>
              )}
            </div>
          )}
        </div>
        <div className="p-3 flex flex-col flex-1">
          <h3 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2 mb-1">{item.name}</h3>
          <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2 flex-1 mb-2">{item.description}</p>
          {visibleVariants.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {visibleVariants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => onVariantChange?.(v.id)}
                  className={`px-2 py-0.5 rounded-full border text-[9px] font-semibold transition-all ${activeVariantId === v.id ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200"}`}
                >
                  {v.name} {v.priceDelta > 0 && `+₹${v.priceDelta}`}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between mt-auto pt-1">
            <div className="flex flex-col">
              {displayBaseWithoutDiscount > displayPrice && (
                <span className="text-[10px] text-slate-400 line-through">₹{displayBaseWithoutDiscount}</span>
              )}
              <span className="text-sm font-bold text-slate-900">₹{displayPrice}</span>
            </div>
            <AddButton />
          </div>
        </div>
      </div>
    );
  }

  // ─── LIST layout (default) ───────────────────────────────────────────────────
  return (
    <div className={`w-full ${!isAvailable ? "opacity-60" : ""}`}>
      <div className="flex gap-4">
        <div className="relative w-28 h-28 shrink-0 rounded-xl overflow-hidden bg-slate-100">
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
            <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide font-bold">
              {t("soldOut")}
            </div>
          )}
          {item.arModelGlb ? (
            <button
              onClick={() => onArClick(item)}
              className={`ar-view-btn absolute bottom-2 right-2 p-1.5 rounded-lg text-white transition-colors ${showArTour ? "bg-emerald-600 animate-pulse" : "bg-black/60 hover:bg-black/80"}`}
            >
              <Scan className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>

        <div className="flex-1 flex flex-col justify-between py-0.5">
          <div>
            <div className="flex justify-between items-start mb-1.5">
              <div className="space-y-1 pr-2">
                <h3 className="font-medium text-slate-900 text-sm leading-snug">{item.name}</h3>
                <div className="flex flex-wrap gap-2">
                  {item.isBestseller && (
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                      {t("bestseller")}
                    </span>
                  )}
                  {item.isSpicy && (
                    <span className="text-[10px] font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                      🌶 {t("spicy")}
                    </span>
                  )}
                </div>
              </div>
              <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border shrink-0 ${ratingStyles.container}`}>
                <Star className={`w-3 h-3 ${ratingStyles.icon}`} />
                <span>{item.rating}</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-3">{item.description}</p>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {item.calories ? (
                <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                  {item.calories} kcal
                </span>
              ) : null}
              {Array.isArray(item.allergens) && item.allergens.length > 0 ? (
                <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                  Allergens: {item.allergens.slice(0, 3).join(", ")}
                </span>
              ) : null}
            </div>
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
            <div className="flex flex-col">
              {displayBaseWithoutDiscount > displayPrice && (
                <span className="text-[11px] font-semibold text-slate-400 line-through">₹{displayBaseWithoutDiscount}</span>
              )}
              <span className="text-base font-semibold text-slate-900">₹{displayPrice}</span>
            </div>
            <AddButton />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FoodCard;
