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
              <div className="fc-veg-dot-wrap">
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
              {displayBaseWithoutDiscount > displayPrice && (
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
            {displayBaseWithoutDiscount > displayPrice && (
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
            <div className={`fc-veg-dot ${item.isVeg ? "fc-veg" : "fc-nonveg"}`} />
          </div>
          {item.rating > 0 && (
            <div className={`fc-grid-rating ${ratingStyles.container}`}>
              <Star className={`w-2.5 h-2.5 ${ratingStyles.icon}`} />
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
              {displayBaseWithoutDiscount > displayPrice && (
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

  // ─── LIST layout (default) — reference-inspired card ──────────────────────────
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

        {/* Veg/Non-veg indicator */}
        <div className="fc-card-veg-badge">
          <div className={`fc-veg-dot ${item.isVeg ? "fc-veg" : "fc-nonveg"}`} />
        </div>

        {/* Rating */}
        {item.rating > 0 && (
          <div className="fc-card-rating">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{item.rating}</span>
          </div>
        )}

        {/* AR button */}
        {item.arModelGlb && (
          <button
            onClick={() => onArClick(item)}
            className={`fc-ar-btn ${showArTour ? "fc-ar-btn--tour" : ""}`}
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
        </div>
      </div>

      {/* Content */}
      <div className="fc-card-body">
        {/* Name row */}
        <h3 className="fc-card-name">{item.name}</h3>

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

        {/* Description */}
        <p className="fc-card-desc">{item.description}</p>

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
            {displayBaseWithoutDiscount > displayPrice && (
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

/* ── Shared Styles ────────────────────────────────────────────────────── */

function FoodCardStyles() {
  return (
    <style jsx global>{`
      /* ── Common ── */
      .fc-disabled { opacity: 0.55; pointer-events: none; }

      .fc-img-placeholder {
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
        animation: fc-shimmer 1.5s ease infinite;
      }
      @keyframes fc-shimmer {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
      }
      .fc-img-loaded { opacity: 1; }
      .fc-img-loading { opacity: 0; }

      .fc-veg-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
      }
      .fc-veg { background: #16a34a; }
      .fc-nonveg { background: #dc2626; }

      .fc-veg-dot-wrap {
        background: rgba(255,255,255,0.85);
        backdrop-filter: blur(4px);
        padding: 3px;
        border-radius: 4px;
        display: flex;
        align-items: center;
      }

      /* Badges */
      .fc-badge {
        font-size: 9px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        padding: 4px 10px;
        border-radius: 20px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
      .fc-badge--gold { background: #fbbf24; color: #78350f; }
      .fc-badge--green { background: #34d399; color: #064e3b; }
      .fc-badge--red { background: #fca5a5; color: #991b1b; }
      .fc-badge--sm { font-size: 8px; padding: 3px 7px; }

      /* Variants */
      .fc-variants {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 12px;
      }
      .fc-variants-sm { gap: 4px; margin-bottom: 8px; }
      .fc-variant-pill {
        padding: 5px 12px;
        border-radius: 20px;
        border: 1.5px solid #e2e8f0;
        background: #fff;
        color: #475569;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
      }
      .fc-variant-pill:hover { border-color: #cbd5e1; }
      .fc-variant-pill--active {
        background: #0f172a;
        border-color: #0f172a;
        color: #fff;
      }
      .fc-variant-pill--sm {
        padding: 3px 8px;
        font-size: 9px;
      }

      /* Price */
      .fc-bottom {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: auto;
        padding-top: 4px;
      }
      .fc-price-col {
        display: flex;
        flex-direction: column;
      }
      .fc-price-old {
        font-size: 11px;
        font-weight: 600;
        color: #94a3b8;
        text-decoration: line-through;
      }
      .fc-price-main {
        font-size: 20px;
        font-weight: 800;
        color: #0f172a;
        letter-spacing: -0.02em;
      }
      .fc-price-lg { font-size: 24px; }
      .fc-price-sm { font-size: 14px; }
      .fc-price-old.fc-price-sm { font-size: 10px; }

      /* Add button */
      .fc-add-btn {
        height: 34px;
        padding: 0 22px;
        border-radius: 12px;
        background: #0f172a;
        color: #fff;
        font-size: 12px;
        font-weight: 700;
        border: none;
        cursor: pointer;
        transition: all 0.2s;
        -webkit-tap-highlight-color: transparent;
      }
      .fc-add-btn:hover { background: #1e293b; }
      .fc-add-btn:active { transform: scale(0.95); }

      .fc-qty-stepper {
        display: flex;
        align-items: center;
        background: #0f172a;
        color: #fff;
        border-radius: 12px;
        overflow: hidden;
        height: 34px;
      }
      .fc-qty-btn {
        width: 34px;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: none;
        color: #fff;
        cursor: pointer;
        transition: background 0.15s;
      }
      .fc-qty-btn:hover { background: rgba(255,255,255,0.1); }
      .fc-qty-count {
        min-width: 24px;
        text-align: center;
        font-size: 12px;
        font-weight: 800;
      }

      .fc-unavailable {
        font-size: 11px;
        font-weight: 700;
        color: #ef4444;
      }

      /* AR button */
      .fc-ar-btn {
        position: absolute;
        bottom: 10px;
        right: 10px;
        padding: 7px;
        border-radius: 10px;
        background: rgba(0,0,0,0.55);
        backdrop-filter: blur(8px);
        color: #fff;
        border: none;
        cursor: pointer;
        transition: all 0.2s;
        z-index: 2;
      }
      .fc-ar-btn:hover { background: rgba(0,0,0,0.7); }
      .fc-ar-btn--tour {
        background: #16a34a;
        animation: fc-ar-pulse 1.5s ease infinite;
      }
      @keyframes fc-ar-pulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.4); }
        50% { box-shadow: 0 0 0 6px rgba(22, 163, 74, 0); }
      }

      /* Info badges */
      .fc-card-info-badges, .fc-card-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 8px;
      }
      .fc-info-badge {
        display: flex;
        align-items: center;
        gap: 3px;
        padding: 3px 8px;
        border-radius: 8px;
        font-size: 10px;
        font-weight: 700;
        background: #f1f5f9;
        color: #475569;
      }
      .fc-info-badge--spicy {
        background: #fef2f2;
        color: #dc2626;
      }
      .fc-meta-pill {
        font-size: 10px;
        font-weight: 600;
        padding: 3px 8px;
        border-radius: 8px;
        background: #f8fafc;
        color: #64748b;
      }
      .fc-meta-pill--warn { background: #fef3c7; color: #92400e; }
      .fc-meta-pill--pair { background: #f3e8ff; color: #7c3aed; }

      /* ── LIST Card (Default) — Reference-inspired ── */
      .fc-card {
        background: #fff;
        border-radius: 24px;
        overflow: hidden;
        box-shadow: 0 2px 16px rgba(0, 0, 0, 0.05);
        border: 1px solid rgba(0, 0, 0, 0.04);
        transition: transform 0.2s, box-shadow 0.2s;
      }
      .fc-card:hover {
        box-shadow: 0 6px 24px rgba(0, 0, 0, 0.08);
      }

      .fc-card-img-wrap {
        position: relative;
        width: 100%;
        aspect-ratio: 16 / 10;
        overflow: hidden;
        background: #f1f5f9;
      }
      .fc-card-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: opacity 0.4s ease, transform 0.6s ease;
      }
      .fc-card:hover .fc-card-img { transform: scale(1.03); }

      .fc-card-veg-badge {
        position: absolute;
        top: 12px;
        left: 12px;
        background: rgba(255,255,255,0.92);
        backdrop-filter: blur(8px);
        padding: 4px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        z-index: 2;
      }
      .fc-card-rating {
        position: absolute;
        top: 12px;
        right: 12px;
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 10px;
        border-radius: 20px;
        background: rgba(255,255,255,0.92);
        backdrop-filter: blur(8px);
        font-size: 12px;
        font-weight: 800;
        color: #0f172a;
        z-index: 2;
      }
      .fc-card-top-badges {
        position: absolute;
        bottom: 12px;
        left: 12px;
        display: flex;
        gap: 6px;
        z-index: 2;
      }
      .fc-card-oos-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 3;
      }
      .fc-card-oos-text {
        background: #ef4444;
        color: #fff;
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        padding: 6px 16px;
        border-radius: 12px;
      }

      .fc-card-body {
        padding: 16px 18px 18px;
        display: flex;
        flex-direction: column;
      }
      .fc-card-name {
        font-size: 17px;
        font-weight: 800;
        color: #0f172a;
        line-height: 1.3;
        margin-bottom: 6px;
        letter-spacing: -0.01em;
      }
      .fc-card-desc {
        font-size: 12.5px;
        color: #64748b;
        line-height: 1.55;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        margin-bottom: 10px;
        font-weight: 450;
      }

      .fc-desc {
        font-size: 13px;
        color: #64748b;
        line-height: 1.5;
        margin-bottom: 12px;
        font-weight: 450;
      }
      .fc-desc-sm { font-size: 11px; margin-bottom: 8px; }

      .fc-cal-badge {
        font-size: 10px;
        color: #94a3b8;
      }

      /* ── Magazine ── */
      .fc-magazine {
        border-radius: 24px;
        overflow: hidden;
        background: #fff;
        box-shadow: 0 4px 24px rgba(0,0,0,0.06);
        border: 1px solid rgba(0,0,0,0.04);
        display: flex;
        flex-direction: column;
      }
      .fc-magazine-img-wrap {
        position: relative;
        width: 100%;
        aspect-ratio: 4/3;
        overflow: hidden;
        background: #f1f5f9;
      }
      .fc-magazine-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: opacity 0.4s;
      }
      .fc-magazine-badges {
        position: absolute;
        top: 14px;
        left: 14px;
        display: flex;
        gap: 6px;
        z-index: 2;
      }
      .fc-magazine-overlay {
        position: absolute;
        inset-inline: 0;
        bottom: 0;
        background: linear-gradient(to top, rgba(15,23,42,0.85) 0%, transparent 100%);
        padding: 48px 18px 18px;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
      }
      .fc-magazine-name {
        font-size: 22px;
        font-weight: 800;
        color: #fff;
        line-height: 1.15;
        margin-bottom: 6px;
        text-shadow: 0 2px 8px rgba(0,0,0,0.2);
      }
      .fc-magazine-meta {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .fc-magazine-rating {
        display: flex;
        align-items: center;
        gap: 4px;
        color: #fbbf24;
        font-size: 13px;
        font-weight: 700;
      }
      .fc-magazine-cal {
        color: rgba(255,255,255,0.7);
        font-size: 12px;
        font-weight: 500;
      }
      .fc-magazine-body {
        padding: 16px 18px 18px;
        display: flex;
        flex-direction: column;
      }

      /* ── Compact ── */
      .fc-compact {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 0;
      }
      .fc-compact-img-wrap {
        position: relative;
        width: 48px;
        height: 48px;
        border-radius: 12px;
        overflow: hidden;
        background: #f1f5f9;
        flex-shrink: 0;
      }
      .fc-compact-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: opacity 0.3s;
      }
      .fc-compact-veg-wrap {
        position: absolute;
        top: 3px;
        left: 3px;
        background: rgba(255,255,255,0.9);
        padding: 2px;
        border-radius: 3px;
        display: flex;
      }
      .fc-compact-oos {
        position: absolute;
        inset: 0;
        background: rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 8px;
        font-weight: 800;
        text-transform: uppercase;
      }
      .fc-compact-body {
        flex: 1;
        min-width: 0;
      }
      .fc-compact-name {
        font-size: 13px;
        font-weight: 700;
        color: #0f172a;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .fc-compact-meta {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 2px;
      }
      .fc-compact-action {
        flex-shrink: 0;
      }

      /* ── Grid ── */
      .fc-grid {
        border-radius: 20px;
        overflow: hidden;
        background: #fff;
        box-shadow: 0 2px 12px rgba(0,0,0,0.04);
        border: 1px solid #f1f5f9;
        display: flex;
        flex-direction: column;
      }
      .fc-grid-img-wrap {
        position: relative;
        aspect-ratio: 4/3;
        overflow: hidden;
        background: #f1f5f9;
      }
      .fc-grid-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: opacity 0.3s;
      }
      .fc-grid-veg {
        position: absolute;
        top: 8px;
        left: 8px;
        background: rgba(255,255,255,0.9);
        padding: 3px;
        border-radius: 4px;
        display: flex;
      }
      .fc-grid-rating {
        position: absolute;
        top: 8px;
        right: 8px;
        display: flex;
        align-items: center;
        gap: 3px;
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 20px;
        font-weight: 700;
      }
      .fc-grid-oos {
        position: absolute;
        bottom: 8px;
        left: 8px;
        background: #ef4444;
        color: #fff;
        font-size: 9px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding: 3px 8px;
        border-radius: 8px;
      }
      .fc-grid-badges {
        position: absolute;
        bottom: 8px;
        left: 8px;
        display: flex;
        gap: 4px;
      }
      .fc-grid-body {
        padding: 12px;
        display: flex;
        flex-direction: column;
        flex: 1;
      }
      .fc-grid-name {
        font-size: 13px;
        font-weight: 700;
        color: #0f172a;
        line-height: 1.3;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        margin-bottom: 4px;
      }
    `}</style>
  );
}

export default FoodCard;
