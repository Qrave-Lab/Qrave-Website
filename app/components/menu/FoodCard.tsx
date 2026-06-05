
"use client";

import React, { useState } from "react";
import { Star, Scan, Minus, Plus, Flame } from "lucide-react";
import { useLanguageStore } from "@/stores/languageStore";
import { motion } from "framer-motion";

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
  isNew?: boolean;
  spiceLabel?: string;
  estimatedPrepMinutes?: number | null;
  pairWithNames?: string[];
  variants?: Variant[];
  isTodaysSpecial?: boolean;
  isChefSpecial?: boolean;
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
  layout?: "list" | "grid" | "compact" | "magazine";
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
  const hasDiscount = displayBaseWithoutDiscount > displayPrice;
  
  const isSpecial = item.isTodaysSpecial || item.isChefSpecial;
  const hasOffer = hasDiscount || item.offerLabel;

  const getSpiceStyle = (level: string) => {
    const l = level.toLowerCase();
    if (l === "mild") return "bg-[#E8650026] text-[#C45200]";
    if (l === "medium") return "bg-[#E8650033] text-[#B94500]";
    if (l === "hot" || l === "extra") return "bg-[#E8650044] text-[#A03C00]";
    return "bg-[#E8650026] text-[#C45200]";
  };

  const AddControls = () => {
    if (!isAvailable || !orderingEnabled) return null;
    
    if (currentQty > 0) {
      return (
        <div className="flex flex-row bg-[#F7F2EB] rounded-[10px] border border-[#EDE5D8] overflow-hidden shrink-0 items-center">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => onRemove(item.id, activeVariantId)}
            className="w-[28px] h-[28px] flex flex-col items-center justify-center bg-transparent active:bg-[#ede5d8] transition-colors"
          >
            <Minus className="w-[14px] h-[14px] text-[#3D2B1F]" strokeWidth={2.5}/>
          </motion.button>
          <span className="w-[22px] text-center text-[#3D2B1F] text-[13px] font-[700] tabular-nums leading-none">
            {currentQty}
          </span>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => onAdd(item.id, activeVariantId, displayPrice)}
            className="w-[28px] h-[28px] flex flex-col items-center justify-center bg-transparent active:bg-[#ede5d8] transition-colors"
          >
            <Plus className="w-[14px] h-[14px] text-[#3D2B1F]" strokeWidth={2.5} />
          </motion.button>
        </div>
      );
    }
    
    return (
      <motion.button
        whileHover={{ scale: 1.05, backgroundColor: "#5C3D2A" }}
        whileTap={{ scale: 0.92 }}
        onClick={() => onAdd(item.id, activeVariantId, displayPrice)}
        className="w-[30px] h-[30px] rounded-[10px] bg-[#3D2B1F] flex items-center justify-center flex-shrink-0 cursor-pointer shadow-sm transition-all"
      >
        <Plus className="w-4 h-4 text-[#F7F2EB]" strokeWidth={2.5} />
      </motion.button>
    );
  };

  return (
    <div className="flex flex-row p-[16px_16px_14px_16px] bg-[#FFFFFF] border-b border-[#F0E9DF]">
      
      {/* 88x88 Thumb */}
      <div className="relative shrink-0 w-[88px] h-[88px] rounded-[12px] bg-[#F7F2EB] overflow-hidden mr-[14px]">
        {item.image ? (
          <img 
             src={item.image} 
             alt={item.name} 
             className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? "opacity-100" : "opacity-0"} ${!isAvailable ? "grayscale contrast-50 opacity-60" : ""}`}
             onLoad={() => setImageLoaded(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center opacity-40">
            <Scan className="w-6 h-6 text-[#9B8677]" />
          </div>
        )}
        
        {/* AR Button Overlay */}
        {item.arModelGlb && (
          <button
            onClick={() => onArClick(item)}
            className={`ar-view-btn absolute z-10 bottom-1 left-1 w-6 h-6 bg-white/90 backdrop-blur border border-white/40 shadow-sm rounded-full flex items-center justify-center transition-all shadow-[#3D2B1F]/10 ${showArTour ? "ring-2 ring-[#3D2B1F] ring-offset-1 animate-pulse" : "hover:scale-110 active:scale-95"}`}
          >
            <Scan className="w-3.5 h-3.5 text-[#3D2B1F]" strokeWidth={2.5}/>
          </button>
        )}

        {/* Badges/Tags over image */}
        {item.isVeg !== undefined && (
          <div className="absolute top-[4px] left-[4px] w-[14px] h-[14px] bg-white rounded-full flex items-center justify-center shadow-sm">
             <div className={`w-[8px] h-[8px] rounded-full border-[1.5px] border-white ${item.isVeg ? "bg-[#2E7D32]" : "bg-[#C62828]"}`}/>
          </div>
        )}
        
        {hasOffer ? (
          <div className="absolute top-0 right-0 bg-[#15803D] px-1.5 py-0.5 rounded-bl-[6px] text-[#FFFFFF] text-[9px] font-[600] tracking-tight">
             {item.offerLabel || "OFFER"}
          </div>
        ) : isSpecial ? (
          <div className="absolute top-0 right-0 bg-[#B45309] px-1.5 py-0.5 rounded-bl-[6px] text-[#FFFFFF] text-[9px] font-[600] tracking-tight">
             ✦ SPECIAL
          </div>
        ) : null}

        {item.isBestseller && (
          <div className="absolute bottom-0 left-0 w-full bg-[rgba(254,243,199,0.95)] backdrop-blur-[2px] py-[2px] flex justify-center text-[#92400E] text-[9px] uppercase font-[700] tracking-wider leading-none">
             ★ Bestseller
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col min-w-0 py-0.5">
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-dm-sans font-[600] text-[14px] leading-tight text-[#3D2B1F] tracking-[-0.01em] line-clamp-2">
            {item.name}
            {item.isSpicy && (
              <span className={`inline-flex items-center ml-1.5 px-1 py-[1px] rounded-[4px] text-[10px] font-[600] leading-none align-baseline ${getSpiceStyle(item.spiceLabel || "mild")}`}>
                <Flame className="w-2.5 h-2.5 mr-0.5" />
                {item.spiceLabel}
              </span>
            )}
            {item.calories && (
               <span className="inline-flex ml-1.5 bg-[#F7F2EB] text-[#B3A08E] rounded-[20px] px-[7px] py-[1px] text-[10px] font-[500] border border-[#F0E9DF]">
                 {item.calories} kcal
               </span>
            )}
          </h3>
        </div>

        {item.description && (
          <p className="mt-1 font-dm-sans text-[12px] font-[400] leading-[1.5] text-[#9B8677] line-clamp-2 pr-1">
            {item.description}
          </p>
        )}
        
        {visibleVariants.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {visibleVariants.map((v) => (
              <button
                key={v.id}
                onClick={() => onVariantChange?.(v.id)}
                className={`px-2 py-[3px] rounded-[6px] text-[11px] font-[600] border transition-colors ${
                  activeVariantId === v.id
                    ? "bg-[#3D2B1F] border-[#3D2B1F] text-[#F7F2EB]"
                    : "bg-[#FFFFFF] border-[#DDD5C5] text-[#6B5B4E]"
                }`}
              >
                {v.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1" />

        <div className="flex flex-row justify-between items-end mt-2 h-[32px]">
          <div className="flex items-baseline flex-wrap">
            <span className="font-dm-sans text-[15px] font-[700] text-[#3D2B1F] tracking-[-0.02em] leading-none mb-0.5">
             <span className="text-[11px] opacity-80 font-[600] mr-0.5 tracking-normal">₹</span>{displayPrice.toFixed(2)}
            </span>
            {hasDiscount && (
              <span className="ml-[5px] font-dm-sans text-[11px] text-[#B3A08E] line-through font-[500] leading-none">
                ₹{displayBaseWithoutDiscount.toFixed(2)}
              </span>
            )}
          </div>
          
          <div className="relative z-10 flex items-center mb-0.5">
            <AddControls />
          </div>
        </div>
      </div>
      
    </div>
  );
};

export default FoodCard;
