"use client";

import React, { useState } from "react";
import { Star, Scan, Minus, Plus, Flame } from "lucide-react";
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
  isNew?: boolean;
  spiceLabel?: string;
  estimatedPrepMinutes?: number | null;
  pairWithNames?: string[];
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

  const AddButton = () => (
    isAvailable ? (
      orderingEnabled ? (
        currentQty > 0 ? (
          <div className="fc-qty-stepper">
            <button onClick={() => onRemove(item.id, activeVariantId)} className="fc-qty-btn">
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="fc-qty-count">{currentQty}</span>
            <button onClick={() => onAdd(item.id, activeVariantId, displayPrice)} className="fc-qty-btn">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => onAdd(item.id, activeVariantId, displayPrice)}
            className="fc-add-btn"
          >
            {t("add")}
          </button>
        )
      ) : null
    ) : (
      <span className="fc-unavailable">{t("unavailable")}</span>
    )
  );

  // ─── MAGAZINE layout ─────────────────────────────────────────────────────────
  if (layout === "magazine") {
    return (
      <div className={`fc-magazine ${!isAvailable ? "fc-disabled" : ""}`}>
        <div className="fc-magazine-img-wrap">
          {!imageLoaded && <div className="fc-img-placeholder" />}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.image}
            alt={item.name}
            className={`fc-magazine-img ${imageLoaded ? "fc-img-loaded" : "fc-img-loading"}`}
            onLoad={() => setImageLoaded(true)}
          />
          <div className="fc-magazine-badges">
            {item.isBestseller && <span className="fc-badge fc-badge--gold">Bestseller</span>}
            {item.isNew && <span className="fc-badge fc-badge--green">New</span>}
          </div>
          <div className="fc-magazine-overlay">
            <h3 className="fc-magazine-name">{item.name}</h3>
            <div className="fc-magazine-meta">
              <div className="fc-veg-indicator">
                <div className={`fc-veg-dot ${item.isVeg ? "fc-veg" : "fc-nonveg"}`} />
              </div>
              {item.rating > 0 && (
                <span className="fc-magazine-rating"><Star className="w-4 h-4 fill-current" /> {item.rating}</span>
              )}
              {item.calories && <span className="fc-magazine-cal">{item.calories} kcal</span>}
            </div>
          </div>
        </div>
        <div className="fc-magazine-body">
          <p className="fc-desc">{item.description}</p>

          {visibleVariants.length > 0 && (
            <div className="fc-variants">
              {visibleVariants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => onVariantChange?.(v.id)}
                  className={`fc-variant-pill ${activeVariantId === v.id ? "fc-variant-pill--active" : ""}`}
                >
                  {v.name} {v.priceDelta > 0 && `+₹${v.priceDelta}`}
                </button>
              ))}
            </div>
          )}

          <div className="fc-bottom">
            <div className="fc-price-col">
              {hasDiscount && (
                <span className="fc-price-old">₹{displayBaseWithoutDiscount}</span>
              )}
              <span className="fc-price-main fc-price-lg">₹{displayPrice}</span>
            </div>
            <AddButton />
          </div>
        </div>
        <FoodCardStyles />
      </div>
    );
  }

  // ─── COMPACT layout ─────────────────────────────────────────────────────────
  if (layout === "compact") {
    return (
      <div className={`fc-compact ${!isAvailable ? "fc-disabled" : ""}`}>
        <div className="fc-compact-img-wrap">
          {!imageLoaded && <div className="fc-img-placeholder" />}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.image}
            alt={item.name}
            className={`fc-compact-img ${imageLoaded ? "fc-img-loaded" : "fc-img-loading"}`}
            onLoad={() => setImageLoaded(true)}
          />
          <div className="fc-compact-veg-wrap">
            <div className={`fc-veg-dot ${item.isVeg ? "fc-veg" : "fc-nonveg"}`} />
          </div>
          {!isAvailable && (
            <div className="fc-compact-oos">
              <span>Out</span>
            </div>
          )}
        </div>
        <div className="fc-compact-body">
          <p className="fc-compact-name">{item.name}</p>
          <div className="fc-compact-meta">
            {hasDiscount && (
              <span className="fc-price-old fc-price-sm">₹{displayBaseWithoutDiscount}</span>
            )}
            <span className="fc-price-main fc-price-sm">₹{displayPrice}</span>
            {item.calories ? (
              <span className="fc-cal-badge">{item.calories} kcal</span>
            ) : null}
          </div>
          {visibleVariants.length > 0 && (
            <div className="fc-variants fc-variants-sm">
              {visibleVariants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => onVariantChange?.(v.id)}
                  className={`fc-variant-pill fc-variant-pill--sm ${activeVariantId === v.id ? "fc-variant-pill--active" : ""}`}
                >
                  {v.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="fc-compact-action">
          <AddButton />
        </div>
        <FoodCardStyles />
      </div>
    );
  }

  // ─── GRID layout ─────────────────────────────────────────────────────────────
  if (layout === "grid") {
    return (
      <div className={`fc-grid ${!isAvailable ? "fc-disabled" : ""}`}>
        <div className="fc-grid-img-wrap">
          {!imageLoaded && <div className="fc-img-placeholder" />}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.image}
            alt={item.name}
            className={`fc-grid-img ${imageLoaded ? "fc-img-loaded" : "fc-img-loading"}`}
            onLoad={() => setImageLoaded(true)}
          />
          <div className="fc-grid-veg">
            <div className={`fc-veg-indicator fc-veg-indicator--sm`}>
              <div className={`fc-veg-dot ${item.isVeg ? "fc-veg" : "fc-nonveg"}`} />
            </div>
          </div>
          {item.rating > 0 && (
            <div className="fc-grid-rating">
              <Star className="w-2.5 h-2.5 fill-current text-amber-500" />
              <span>{item.rating}</span>
            </div>
          )}
          {!isAvailable && (
            <div className="fc-grid-oos">{t("soldOut")}</div>
          )}
          {item.arModelGlb && (
            <button
              onClick={() => onArClick(item)}
              className={`fc-ar-btn ${showArTour ? "fc-ar-btn--tour" : ""}`}
            >
              <Scan className="w-3.5 h-3.5" />
            </button>
          )}
          {(item.isBestseller || item.isSpicy || item.isNew) && (
            <div className="fc-grid-badges">
              {item.isBestseller && <span className="fc-badge fc-badge--gold fc-badge--sm">{t("bestseller")}</span>}
              {item.isNew && <span className="fc-badge fc-badge--green fc-badge--sm">New</span>}
              {item.isSpicy && <span className="fc-badge fc-badge--red fc-badge--sm">{item.spiceLabel || "Spicy"}</span>}
            </div>
          )}
        </div>
        <div className="fc-grid-body">
          <h3 className="fc-grid-name">{item.name}</h3>
          <p className="fc-desc fc-desc-sm">{item.description}</p>
          {visibleVariants.length > 0 && (
            <div className="fc-variants fc-variants-sm">
              {visibleVariants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => onVariantChange?.(v.id)}
                  className={`fc-variant-pill fc-variant-pill--sm ${activeVariantId === v.id ? "fc-variant-pill--active" : ""}`}
                >
                  {v.name} {v.priceDelta > 0 && `+₹${v.priceDelta}`}
                </button>
              ))}
            </div>
          )}
          <div className="fc-bottom">
            <div className="fc-price-col">
              {hasDiscount && (
                <span className="fc-price-old fc-price-sm">₹{displayBaseWithoutDiscount}</span>
              )}
              <span className="fc-price-main fc-price-sm">₹{displayPrice}</span>
            </div>
            <AddButton />
          </div>
        </div>
        <FoodCardStyles />
      </div>
    );
  }

  // ─── LIST layout (default) — warm editorial card ──────────────────────────
  return (
    <div className={`fc-card ${!isAvailable ? "fc-disabled" : ""}`}>
      {/* Large top image */}
      <div className="fc-card-img-wrap">
        {!imageLoaded && <div className="fc-img-placeholder" />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.image}
          alt={item.name}
          className={`fc-card-img ${imageLoaded ? "fc-img-loaded" : "fc-img-loading"}`}
          onLoad={() => setImageLoaded(true)}
        />

        {/* Veg/Non-veg indicator — bordered square */}
        <div className="fc-card-veg-badge">
          <div className={`fc-veg-indicator ${item.isVeg ? "fc-veg-indicator--green" : "fc-veg-indicator--red"}`}>
            <div className={`fc-veg-dot ${item.isVeg ? "fc-veg" : "fc-nonveg"}`} />
          </div>
        </div>

        {/* Rating — gold floating badge */}
        {item.rating > 0 && (
          <div className="fc-card-rating">
            <Star className="w-3.5 h-3.5 fill-current" />
            <span>{item.rating}</span>
          </div>
        )}

        {/* AR button */}
        {item.arModelGlb && (
          <button
            onClick={() => onArClick(item)}
            className={`fc-ar-btn ar-view-btn ${showArTour ? "fc-ar-btn--tour" : ""}`}
          >
            <Scan className="w-4 h-4" />
          </button>
        )}

        {/* Sold out overlay */}
        {!isAvailable && (
          <div className="fc-card-oos-overlay">
            <span className="fc-card-oos-text">{t("soldOut")}</span>
          </div>
        )}

        {/* Badges */}
        <div className="fc-card-top-badges">
          {item.isBestseller && <span className="fc-badge fc-badge--gold">🏆 {t("bestseller")}</span>}
          {item.isNew && <span className="fc-badge fc-badge--green">✨ New</span>}
          {hasDiscount && item.offerLabel && (
            <span className="fc-badge fc-badge--offer">{item.offerLabel}</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="fc-card-body">
        {/* Name */}
        <h3 className="fc-card-name">{item.name}</h3>

        {/* Description */}
        <p className="fc-card-desc">{item.description}</p>

        {/* Spice + prep time badges */}
        {(item.isSpicy || item.estimatedPrepMinutes) && (
          <div className="fc-card-info-badges">
            {item.isSpicy && (
              <span className="fc-info-badge fc-info-badge--spicy">
                <Flame className="w-3 h-3" /> {item.spiceLabel || t("spicy")}
              </span>
            )}
            {item.estimatedPrepMinutes && (
              <span className="fc-info-badge">
                {item.estimatedPrepMinutes} min
              </span>
            )}
          </div>
        )}

        {/* Calories + allergens */}
        {(item.calories || (Array.isArray(item.allergens) && item.allergens.length > 0)) && (
          <div className="fc-card-meta">
            {item.calories && (
              <span className="fc-meta-pill">{item.calories} kcal</span>
            )}
            {Array.isArray(item.allergens) && item.allergens.length > 0 && (
              <span className="fc-meta-pill fc-meta-pill--warn">
                ⚠ {item.allergens.slice(0, 3).join(", ")}
              </span>
            )}
          </div>
        )}

        {/* Pair with */}
        {item.pairWithNames && item.pairWithNames.length > 0 && (
          <div className="fc-card-meta">
            {item.pairWithNames.slice(0, 2).map((name) => (
              <span key={name} className="fc-meta-pill fc-meta-pill--pair">
                Pairs with {name}
              </span>
            ))}
          </div>
        )}

        {/* Variants */}
        {visibleVariants.length > 0 && (
          <div className="fc-variants">
            {visibleVariants.map((v) => (
              <button
                key={v.id}
                onClick={() => onVariantChange?.(v.id)}
                className={`fc-variant-pill ${activeVariantId === v.id ? "fc-variant-pill--active" : ""}`}
              >
                {v.name} {v.priceDelta > 0 && `+₹${v.priceDelta}`}
              </button>
            ))}
          </div>
        )}

        {/* Price + Add row */}
        <div className="fc-bottom">
          <div className="fc-price-col">
            {hasDiscount && (
              <span className="fc-price-old">₹{displayBaseWithoutDiscount}</span>
            )}
            <span className="fc-price-main">₹{displayPrice}</span>
          </div>
          <AddButton />
        </div>
      </div>

      <FoodCardStyles />
    </div>
  );
};

/* ── Styles are now in globals.css to prevent hydration stripping ── */
function FoodCardStyles() {
  return null;
}


export default FoodCard;
