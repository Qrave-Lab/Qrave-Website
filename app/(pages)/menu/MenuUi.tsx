"use client";

import CustomerBottomNav, {
  type CustomerTab,
} from "@/app/components/menu/CustomerBottomNav";
import FoodCard from "@/app/components/menu/FoodCard";
import ImmersiveMenu from "@/app/components/menu/ImmersiveMenu";
import OrdersView from "@/app/components/menu/OrdersView";
import ServicesView from "@/app/components/menu/ServicesView";
import { api } from "@/app/lib/api";
import { getCartKey, useCartStore } from "@/stores/cartStore";
import { useLanguageStore } from "@/stores/languageStore";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import {
  AlertTriangle,
  ChevronRight,
  Search,
  UtensilsCrossed,
  X,
  HelpCircle,
  Smartphone,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-hot-toast";

const resolve = (val: any): string => {
  if (!val) return "";
  if (typeof val === "object" && "String" in val) return val.String;
  return String(val);
};

const sanitizeModelUrl = (val: any): string => {
  const raw = resolve(val).trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();
  if (lower.startsWith("blob:")) return "";
  let url = raw;
  if (!raw.startsWith("http://") && !raw.startsWith("https://")) {
    if (raw.startsWith("//")) url = `https:${raw}`;
    else if (/^[a-z0-9-]+\.cloudfront\.net\//i.test(raw)) url = `https://${raw}`;
    else if (/^[a-z0-9.-]+\.amazonaws\.com\//i.test(raw)) url = `https://${raw}`;
  }
  // Route CloudFront .glb files through the Next.js server-side proxy to
  // avoid CORS errors — the rewrite in next.config.ts forwards /api/proxy-model/*
  // to CloudFront without the browser's Origin header restrictions.
  if (url && url.includes("cloudfront.net")) {
    try {
      const urlObj = new URL(url);
      return `/api/proxy-model${urlObj.pathname}`;
    } catch {
      // fall through to return url as-is
    }
  }
  return url;
};

const getCategoryEmoji = (name: string): string => {
  const n = name.toLowerCase();
  if (n.includes("main")) return "🍜";
  if (n.includes("drink") || n.includes("beverage")) return "🍹";
  if (n.includes("dessert") || n.includes("sweet")) return "🍰";
  if (n.includes("burger")) return "🍔";
  if (n.includes("pizza")) return "🍕";
  if (n.includes("starter") || n.includes("appetizer") || n.includes("salad"))
    return "🥗";
  if (n.includes("side") || n.includes("fry")) return "🍟";
  if (n.includes("rice") || n.includes("noodle")) return "🍚";
  if (n.includes("soup")) return "🥣";
  if (n.includes("coffee") || n.includes("tea")) return "☕";
  return "🍽️";
};

const getParentName = (item: any): string => {
  const parent = resolve(item.parentCategoryName);
  if (parent) return parent;
  const category = resolve(item.categoryName);
  return category || "Other";
};

const getSubcategoryName = (item: any): string => {
  const parent = resolve(item.parentCategoryName);
  const category = resolve(item.categoryName);
  if (parent && category) return category;
  if (category) return "General";
  return "General";
};

const getRatingStyles = (rating: number) => {
  if (rating > 4)
    return {
      container: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/50",
      icon: "text-emerald-500 fill-emerald-500",
    };
  if (rating >= 2.5)
    return {
      container: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/50",
      icon: "text-amber-400 fill-amber-400",
    };
  return {
    container: "bg-red-50 text-red-700 ring-1 ring-red-200/50",
    icon: "text-red-500 fill-red-500",
  };
};

// Hoisted outside the component so we can use it to pre-normalize the
// initial state — prevents the first render from ever seeing raw sql.NullString
// objects ({String,Valid}) leaking into JSX via useState(rawItems).
const normalizeItem = (item: any) => {
  const basePrice = Number(item.price || 0);
  const variants = Array.isArray(item.variants)
    ? item.variants.map((v: any) => {
        const variantPrice = Number(v.price ?? 0);
        return {
          id: String(v.id),
          name: resolve(v.name ?? v.label),
          priceDelta:
            typeof v.priceDelta === "number"
              ? v.priceDelta
              : variantPrice - basePrice,
        };
      })
    : [];

  const resolvedGlb = sanitizeModelUrl(item.modelGlb || item.arModelGlb);
  const resolvedUsdz = sanitizeModelUrl(item.modelUsdz || item.arModelUsdz);

  return {
    ...item,
    id: String(item.id),
    name: resolve(item.name),
    description: resolve(item.description),
    categoryName: resolve(item.categoryName),
    parentCategoryName: resolve(item.parentCategoryName),
    price: basePrice,
    offerPrice:
      typeof item.offerPrice === "number"
        ? Number(item.offerPrice)
        : typeof item.offer_price === "number"
          ? Number(item.offer_price)
          : undefined,
    offerLabel: resolve(item.offerLabel || item.offer_label),
    isTodaysSpecial: Boolean(item.isTodaysSpecial ?? item.is_todays_special),
    isChefSpecial: Boolean(item.isChefSpecial ?? item.is_chef_special),
    specialNote: resolve(item.specialNote || item.special_note),
    image: resolve(item.imageUrl) || item.image,
    arModelGlb: resolvedGlb || null,
    arModelUsdz: resolvedUsdz || null,
    ingredients:
      item.ingredients ||
      item.ingredient_list ||
      item.ingredientList ||
      (Array.isArray(item.ingredientsStructured)
        ? item.ingredientsStructured.map((x: any) => x?.name).filter(Boolean)
        : []),
    calories:
      typeof item.calories === "number"
        ? item.calories
        : item.kcal || item.nutrition?.calories,
    estimatedPrepMinutes:
      typeof item.estimatedPrepMinutes === "number"
        ? item.estimatedPrepMinutes
        : typeof item.estimated_prep_minutes === "number"
          ? item.estimated_prep_minutes
          : null,
    isVeg: Boolean(item.isVeg ?? item.is_veg ?? true),
    isBestseller: Boolean(item.isBestSeller ?? item.is_best_seller),
    isNew: Boolean(item.isNew ?? item.is_new),
    spiceLevel: resolve(item.spiceLevel || item.spice_level || "none"),
    isSpicy: resolve(item.spiceLevel || item.spice_level || "none") !== "none",
    spiceLabel: resolve(item.spiceLevel || item.spice_level || "none"),
    pairWithItemIds: Array.isArray(
      item.pairWithItemIds ?? item.pair_with_item_ids,
    )
      ? (item.pairWithItemIds ?? item.pair_with_item_ids).map(String)
      : [],
    publishAt: resolve(item.publishAt || item.publish_at),
    unpublishAt: resolve(item.unpublishAt || item.unpublish_at),
    allergens: Array.isArray(item.allergens)
      ? item.allergens
          .map((a: any) => String(a?.type || "").trim())
          .filter(Boolean)
      : [],
    variants,
  };
};

type ThemeConfig = {
  preset?: string;
  font_family?: string;
  heading_font?: string;
  font_size?: "sm" | "md" | "lg";
  hero_title?: string;
  hero_subtitle?: string;
  layout?: "list" | "grid" | "compact" | "magazine";
  image_style?: "none" | "small" | "large" | "full";
  spacing?: "compact" | "normal" | "relaxed";
  shadow?: "none" | "sm" | "md" | "lg";
  bg_image_url?: string;
  bg_overlay_opacity?: number;
  card_style?: "rounded" | "soft" | "sharp" | "";
  button_style?: "solid" | "outline" | "glass" | "";
  motif?: "thai" | "indian" | "minimal" | "custom" | "";
  ornament_level?: "off" | "subtle" | "bold" | "";
  header_style?: "classic" | "elegant" | "festival" | "";
  pattern_style?:
    | "none"
    | "silk"
    | "mandala"
    | "waves"
    | "leaf"
    | "dots"
    | "grid"
    | "chevron"
    | "";
  section_icon?: string;
  icon_pack?: "auto" | "thai" | "indian" | "minimal" | "";
  colors?: {
    bg?: string;
    surface?: string;
    text?: string;
    muted?: string;
    accent?: string;
    accent_text?: string;
    header_bg?: string;
    header_text?: string;
  };
};

const DEFAULT_THEME: ThemeConfig = {
  preset: "",
  font_family: "'Inter', 'Segoe UI', sans-serif",
  heading_font: "",
  font_size: "md",
  hero_title: "",
  hero_subtitle: "",
  layout: "list",
  image_style: "small",
  spacing: "normal",
  shadow: "sm",
  bg_image_url: "",
  bg_overlay_opacity: 0.92,
  card_style: "rounded",
  button_style: "solid",
  motif: "minimal",
  ornament_level: "off",
  header_style: "classic",
  pattern_style: "none",
  section_icon: "•",
  icon_pack: "auto",
  colors: {
    bg: "#FAF9F6",
    surface: "#FFFFFF",
    text: "#0F172A",
    muted: "#64748B",
    accent: "#0F172A",
    accent_text: "#FFFFFF",
    header_bg: "#FFFFFF",
    header_text: "#0F172A",
  },
};

const THEME_PRESETS: Record<string, ThemeConfig> = {
  thai: {
    preset: "thai",
    font_family: "'Noto Sans Thai', 'Trebuchet MS', sans-serif",
    card_style: "rounded",
    button_style: "solid",
    motif: "thai",
    ornament_level: "bold",
    header_style: "elegant",
    pattern_style: "silk",
    section_icon: "✦",
    icon_pack: "thai",
    colors: {
      bg: "#FFF7E8",
      surface: "#FFF1D2",
      text: "#3A1D0F",
      muted: "#8C5E3C",
      accent: "#C2410C",
      accent_text: "#FFFFFF",
    },
  },
  indian: {
    preset: "indian",
    font_family: "'Hind', 'Segoe UI', sans-serif",
    card_style: "soft",
    button_style: "solid",
    motif: "indian",
    ornament_level: "bold",
    header_style: "festival",
    pattern_style: "mandala",
    section_icon: "✺",
    icon_pack: "indian",
    colors: {
      bg: "#FFF9F2",
      surface: "#FFF1E4",
      text: "#1F2937",
      muted: "#8B5E3C",
      accent: "#D97706",
      accent_text: "#FFFFFF",
    },
  },
  minimal: {
    preset: "minimal",
    font_family: "'Inter', 'Segoe UI', sans-serif",
    card_style: "sharp",
    button_style: "outline",
    motif: "minimal",
    ornament_level: "off",
    header_style: "classic",
    pattern_style: "none",
    section_icon: "•",
    icon_pack: "minimal",
    colors: {
      bg: "#FAF9F6",
      surface: "#FFFFFF",
      text: "#0F172A",
      muted: "#64748B",
      accent: "#0F172A",
      accent_text: "#FFFFFF",
    },
  },
};

const mergeTheme = (raw?: ThemeConfig | null): ThemeConfig => {
  const presetBase = raw?.preset ? THEME_PRESETS[raw.preset] || {} : {};
  return {
    ...DEFAULT_THEME,
    ...presetBase,
    ...(raw || {}),
    colors: {
      ...(DEFAULT_THEME.colors || {}),
      ...(presetBase.colors || {}),
      ...(raw?.colors || {}),
    },
    bg_overlay_opacity: Math.min(
      0.98,
      Math.max(
        0.7,
        Number(
          raw?.bg_overlay_opacity ??
            presetBase.bg_overlay_opacity ??
            DEFAULT_THEME.bg_overlay_opacity,
        ),
      ),
    ),
  };
};

const getThemeAssetPack = (theme: ThemeConfig) => {
  const motif = theme.motif || "minimal";
  if (motif === "thai") {
    return {
      topStrip: "/theme/thai-border.svg",
      divider: "/theme/thai-border.svg",
    };
  }
  if (motif === "indian") {
    return {
      topStrip: "/theme/indian-rangoli.svg",
      divider: "/theme/indian-rangoli.svg",
    };
  }
  return {
    topStrip: "/theme/minimal-divider.svg",
    divider: "/theme/minimal-divider.svg",
  };
};

const resolveIconPack = (theme: ThemeConfig) => {
  if (theme.icon_pack && theme.icon_pack !== "auto") return theme.icon_pack;
  if (
    theme.motif === "thai" ||
    theme.motif === "indian" ||
    theme.motif === "minimal"
  ) {
    return theme.motif;
  }
  return "minimal";
};

const getRegionalCategoryIcon = (
  pack: string,
  category: string,
  fallback: string,
) => {
  const c = (category || "").toLowerCase();
  if (pack === "thai") {
    if (c.includes("starter")) return "🥟";
    if (c.includes("main")) return "🍜";
    if (c.includes("drink") || c.includes("beverage")) return "🧋";
    if (c.includes("dessert")) return "🥭";
    return "🪷";
  }
  if (pack === "indian") {
    if (c.includes("starter")) return "🥘";
    if (c.includes("main")) return "🍛";
    if (c.includes("drink") || c.includes("beverage")) return "🧉";
    if (c.includes("dessert")) return "🍮";
    return "🪔";
  }
  if (c.includes("starter")) return "•";
  if (c.includes("main")) return "•";
  if (c.includes("drink") || c.includes("beverage")) return "•";
  if (c.includes("dessert")) return "•";
  return fallback;
};

type ModernFoodUIProps = {
  menuItems?: any[];
  tableNumber?: string;
  isTableOccupied?: boolean;
  orderingEnabled?: boolean;
  initialThemeConfig?: ThemeConfig;
  previewMode?: boolean;
  previewThemeConfig?: ThemeConfig;
  previewRestaurantName?: string;
  previewRestaurantLogoUrl?: string;
};

type RecommendationItem = {
  id: string;
  reason?: string;
};

const ModernFoodUI: React.FC<ModernFoodUIProps> = ({
  menuItems: initialMenu = [],
  tableNumber,
  isTableOccupied = false,
  orderingEnabled = true,
  initialThemeConfig,
  previewMode = false,
  previewThemeConfig,
  previewRestaurantName,
  previewRestaurantLogoUrl,
}) => {
  const [menuItems, setMenuItems] = useState(() =>
    Array.isArray(initialMenu) ? initialMenu.map(normalizeItem) : [],
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isVegOnly, setIsVegOnly] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const offset = 145; // Height of header + category scroller + padding
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = el.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});
  const [selectedVariants, setSelectedVariants] = useState<
    Record<string, string>
  >({});
  const [tourReady, setTourReady] = useState(false);
  const [hasArItems, setHasArItems] = useState(false);
  const [scrolledHeader, setScrolledHeader] = useState(false);
  const [isImmersive, setIsImmersive] = useState(!orderingEnabled);
  const [arItem, setArItem] = useState<any | null>(null);
  const modelViewerRef = React.useRef<any>(null);
  const [isBrowser, setIsBrowser] = useState(false);
  const [modelViewerReady, setModelViewerReady] = useState(false);
  const [modelViewerFailed, setModelViewerFailed] = useState(false);
  const [arModelError, setArModelError] = useState("");
  const [arModelRenderKey, setArModelRenderKey] = useState(0);
  const [restaurantName, setRestaurantName] = useState("Restaurant");
  const [restaurantLogoUrl, setRestaurantLogoUrl] = useState("");
  const [isWaiterCalled, setIsWaiterCalled] = useState(false);
  const [isWaterRequested, setIsWaterRequested] = useState(false);
  const [showWaiterTooltip, setShowWaiterTooltip] = useState(false);
  const [showWaterTooltip, setShowWaterTooltip] = useState(false);
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(
    mergeTheme(initialThemeConfig || previewThemeConfig || DEFAULT_THEME),
  );
  const [previewCart, setPreviewCart] = useState<
    Record<string, { quantity: number; price: number }>
  >({});
  const [recommendations, setRecommendations] = useState<{
    frequently_bought_together: RecommendationItem[];
    popular_with_this: RecommendationItem[];
    margin_aware: RecommendationItem[];
  }>({
    frequently_bought_together: [],
    popular_with_this: [],
    margin_aware: [],
  });

  // ── Bottom nav tab state ──
  const [activeTab, setActiveTab] = useState<CustomerTab>("menu");

  const { t, setLanguage } = useLanguageStore();

  // Translation is disabled — always reset to English on mount
  useEffect(() => {
    setLanguage("en");
  }, []);

  const cart = useCartStore((state) => state.cart);
  const addItemStore = useCartStore((state) => state.addItem);
  const decrementItemStore = useCartStore((state) => state.decrementItem);
  const router = useRouter();
  const cartState = previewMode ? previewCart : cart;

  useEffect(() => {
    if (previewMode) return;
    const handleError = (e: any) => {
      toast.error(e.detail || "Update failed");
    };
    window.addEventListener("cart-error", handleError);
    return () => window.removeEventListener("cart-error", handleError);
  }, [previewMode]);

  useEffect(() => {
    if (!orderingEnabled) {
      setIsImmersive(true);
    }
  }, [orderingEnabled]);

  useEffect(() => {
    const normalized = Array.isArray(initialMenu)
      ? initialMenu.map(normalizeItem)
      : [];
    const now = Date.now();
    const visible = normalized.filter((item: any) => {
      const publishAt = item.publishAt
        ? new Date(item.publishAt).getTime()
        : null;
      const unpublishAt = item.unpublishAt
        ? new Date(item.unpublishAt).getTime()
        : null;
      if (publishAt && publishAt > now) return false;
      if (unpublishAt && unpublishAt <= now) return false;
      return true;
    });
    const names = new Map(
      visible.map((item: any) => [String(item.id), item.name]),
    );
    const enriched = visible.map((item: any) => ({
      ...item,
      pairWithNames: Array.isArray(item.pairWithItemIds)
        ? item.pairWithItemIds
            .map((id: string) => names.get(String(id)))
            .filter(Boolean)
        : [],
    }));
    setMenuItems(enriched);
    setHasArItems(enriched.some((i: any) => Boolean(i.arModelGlb)));
  }, [initialMenu]);

  useEffect(() => {
    if (previewMode) return;
    let cancelled = false;
    (async () => {
      try {
        if (
          typeof window !== "undefined" &&
          !localStorage.getItem("session_id")
        )
          return;
        const data = await api<{
          frequently_bought_together?: RecommendationItem[];
          popular_with_this?: RecommendationItem[];
          margin_aware?: RecommendationItem[];
        }>("/api/customer/recommendations");
        if (cancelled) return;
        setRecommendations({
          frequently_bought_together: data?.frequently_bought_together || [],
          popular_with_this: data?.popular_with_this || [],
          margin_aware: data?.margin_aware || [],
        });
      } catch {
        if (cancelled) return;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [previewMode]);

  // Translation disabled — items displayed in their original language
  const translatedItems = menuItems;

  useEffect(() => {
    const cats = Array.from(
      new Set(
        translatedItems.map((item: any) => getParentName(item)).filter(Boolean),
      ),
    );
    const initial: Record<string, boolean> = {};
    cats.forEach((c) => (initial[c as string] = true));
    setExpandedCategories(initial);
  }, [translatedItems]);

  const handleAdd = async (id: string, vId?: string, price?: number) => {
    if (previewMode) {
      const key = getCartKey(id, vId || "");
      setPreviewCart((prev) => ({
        ...prev,
        [key]: { quantity: (prev[key]?.quantity || 0) + 1, price: price || 0 },
      }));
      return;
    }
    if (!orderingEnabled) {
      toast("Ordering is currently disabled for this restaurant.", {
        icon: "ℹ️",
      });
      return;
    }
    addItemStore(id, vId || "", price || 0);
  };

  const handleRemove = async (id: string, vId?: string) => {
    if (previewMode) {
      const key = getCartKey(id, vId || "");
      setPreviewCart((prev) => {
        const current = prev[key];
        if (!current) return prev;
        const next = { ...prev };
        if (current.quantity <= 1) delete next[key];
        else next[key] = { ...current, quantity: current.quantity - 1 };
        return next;
      });
      return;
    }
    if (!orderingEnabled) return;
    decrementItemStore(id, vId || "");
  };

  // ── Category-aware filtering ──
  const filteredItems = translatedItems.filter((item: any) => {
    const query = searchQuery ? searchQuery.toLowerCase() : "";
    const matchesSearch =
      item.name.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query);
    return matchesSearch && (isVegOnly ? item.isVeg : true);
  });

  const offerItems = filteredItems.filter(
    (item: any) =>
      typeof item.offerPrice === "number" &&
      Number(item.offerPrice) >= 0 &&
      Number(item.offerPrice) < Number(item.price || 0),
  );
  const todaySpecialItems = filteredItems.filter(
    (item: any) => item.isTodaysSpecial,
  );
  const chefSpecialItems = filteredItems.filter(
    (item: any) => item.isChefSpecial && !item.isTodaysSpecial,
  );
  const recommendationIDs = Array.from(
    new Set([
      ...(recommendations.frequently_bought_together || []).map((r) =>
        String(r.id),
      ),
      ...(recommendations.popular_with_this || []).map((r) => String(r.id)),
      ...(recommendations.margin_aware || []).map((r) => String(r.id)),
    ]),
  );
  const recommendationItems = recommendationIDs
    .map((id) => filteredItems.find((item: any) => String(item.id) === id))
    .filter(Boolean) as any[];

  const categories = Array.from(
    new Set(
      translatedItems.map((item: any) => getParentName(item)).filter(Boolean),
    ),
  ).map((cat) => ({ id: cat as string, name: cat as string }));

  useEffect(() => {
    if (typeof window === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries.find((e) => e.isIntersecting);
        if (visibleEntry) {
          const id = visibleEntry.target.id.replace("category-", "");
          setActiveCategory(id);
        }
      },
      {
        rootMargin: "-25% 0px -55% 0px", // triggers when heading is roughly 25%-45% from top
      },
    );
    const elements = document.querySelectorAll('[id^="category-"]');
    elements.forEach((el) => observer.observe(el));
    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, [filteredItems, categories]);

  const cartTotal = Object.entries(cartState).reduce(
    (acc, [, item]) => acc + item.price * item.quantity,
    0,
  );
  const totalItems = Object.values(cartState).reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const rawTableId = resolve(tableNumber);
  const tableId = rawTableId && rawTableId !== "N/A" ? rawTableId : "N/A";

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (previewMode) return;
    if (tableId !== "N/A") {
      localStorage.setItem("table_number", tableId);
    }
  }, [tableId, previewMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (previewMode) return;
    const storedName = localStorage.getItem("restaurant_name");
    if (storedName) {
      setRestaurantName(storedName);
    }
  }, [previewMode]);

  useEffect(() => {
    if (!previewMode) return;
    if (previewRestaurantName) setRestaurantName(previewRestaurantName);
    if (previewRestaurantLogoUrl)
      setRestaurantLogoUrl(previewRestaurantLogoUrl);
    if (previewThemeConfig) setThemeConfig(mergeTheme(previewThemeConfig));
  }, [
    previewMode,
    previewRestaurantName,
    previewRestaurantLogoUrl,
    previewThemeConfig,
  ]);

  useEffect(() => {
    if (previewMode) return;
    if (initialThemeConfig) {
      setThemeConfig(mergeTheme(initialThemeConfig));
    }
  }, [initialThemeConfig, previewMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (previewMode) return;
    let cancelled = false;

    const applyLogo = (url?: string | null, version?: number | null) => {
      if (!url) return;
      const suffix = version ? `?v=${version}` : "";
      setRestaurantLogoUrl(`${url}${suffix}`);
    };
    const applyTheme = (theme?: ThemeConfig | null) => {
      if (!theme) return;
      const merged = mergeTheme(theme);
      setThemeConfig(merged);
      localStorage.setItem("menu_theme_config", JSON.stringify(merged));
    };

    const loadBranding = async () => {
      const rid = localStorage.getItem("restaurant_id");
      if (!rid || cancelled) return;

      try {
        const logo = await api<{ logo_url?: string | null }>(
          `/public/restaurants/${rid}/logo`,
        );
        if (cancelled) return;
        if (logo?.logo_url) {
          setRestaurantLogoUrl(logo.logo_url);
        }
      } catch {
        // keep header usable with text fallback
      }
      try {
        const theme = await api<{ theme_config?: ThemeConfig }>(
          `/public/restaurants/${rid}/theme`,
        );
        if (cancelled) return;
        applyTheme(theme?.theme_config || null);
      } catch {
        // theme is optional
      }
    };

    loadBranding();
    return () => {
      cancelled = true;
    };
  }, [previewMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (previewMode) return;
    const seen = localStorage.getItem("qrave_tour_seen") === "true";
    if (!seen) {
      setTourReady(true);
    }
  }, [previewMode]);

  const startTour = useCallback(() => {
    const allSteps: {
      element?: string;
      popover: { title: string; description: string; side?: any; align?: any };
    }[] = [
      {
        popover: {
          title: "👋 Welcome to Qrave!",
          description:
            "Let us show you around. We have some amazing features to help you decide what to eat.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: ".ar-view-btn",
        popover: {
          title: "✨ View in AR",
          description:
            "See it before you eat it! Tap this button to place a realistic 3D model of the dish right on your table.",
          side: "left",
          align: "center",
        },
      },
      {
        element: "#tour-search",
        popover: {
          title: "🔍 Search the menu",
          description:
            "Looking for something specific? Type a dish name or keyword here to instantly find it.",
          side: "bottom",
        },
      },
      {
        element: "#tour-veg-filter",
        popover: {
          title: "🥬 Veg-only filter",
          description: "One tap to show only vegetarian dishes.",
          side: "bottom",
        },
      },
      {
        element: "#tour-immersive",
        popover: {
          title: "📱 Immersive mode",
          description:
            "Want larger images? Switch to the full-screen immersive view.",
          side: "bottom",
        },
      },
      {
        element: "#tour-food-card",
        popover: {
          title: "🍽️ Add to cart",
          description:
            "Use the + button to add items. You can also customise variants here.",
          side: "top",
        },
      },
      {
        popover: {
          title: "🎉 Ready to order?",
          description:
            "Explore the menu and enjoy your meal! Tap the ? button anytime to replay this tour.",
          side: "bottom",
          align: "center",
        },
      },
    ];

    // Filter out steps whose target element isn't in the DOM right now
    const steps = allSteps.filter((step) => {
      if (!step.element) return true;
      return !!document.querySelector(step.element);
    });

    const driverObj = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      overlayColor: "rgba(15, 23, 42, 0.65)",
      stagePadding: 8,
      stageRadius: 16,
      popoverClass: "qrave-tour-popover",
      nextBtnText: "Next →",
      prevBtnText: "← Back",
      doneBtnText: "Let's order! 🍽️",
      onDestroyStarted: () => {
        localStorage.setItem("qrave_tour_seen", "true");
        setTourReady(false);
        driverObj.destroy();
      },
      steps,
    });
    driverObj.drive();
  }, [hasArItems, orderingEnabled]);

  useEffect(() => {
    if (!tourReady) return;
    const timer = setTimeout(() => startTour(), 800);
    return () => clearTimeout(timer);
  }, [tourReady, startTour]);

  useEffect(() => {
    setIsBrowser(true);
    const handleScroll = () => {
      setScrolledHeader(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let mounted = true;
    (async () => {
      try {
        await import("@google/model-viewer");
        if (!mounted) return;
        setModelViewerReady(true);
        setModelViewerFailed(false);
      } catch {
        if (!mounted) return;
        setModelViewerFailed(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const link = document.createElement("link");
    link.rel = "preconnect";
    link.href = "https://qrave-restaurant-profile.s3.amazonaws.com";
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
    return () => {
      if (link.parentNode) link.parentNode.removeChild(link);
    };
  }, []);

  // Background prefetch for 3D GLB models — uses <link rel="prefetch"> to stay CORS-safe
  useEffect(() => {
    if (typeof window === "undefined" || !menuItems || menuItems.length === 0)
      return;

    const injected: HTMLLinkElement[] = [];
    const startDelay = setTimeout(() => {
      menuItems.forEach((item: any) => {
        const modelUrl = sanitizeModelUrl(item.arModelGlb);
        if (!modelUrl) return;
        const link = document.createElement("link");
        link.rel = "prefetch";
        link.href = modelUrl;
        link.as = "fetch";
        link.crossOrigin = "anonymous";
        document.head.appendChild(link);
        injected.push(link);
      });
    }, 4000);

    return () => {
      clearTimeout(startDelay);
      injected.forEach((l) => l.parentNode?.removeChild(l));
    };
  }, [menuItems]);

  const [arScale, setArScale] = useState<string>("1 1 1");
  const [steamEnabled, setSteamEnabled] = useState<boolean>(false);
  const [selectedArModifiers, setSelectedArModifiers] = useState<Set<string>>(
    new Set(),
  );
  const [selectedArVariantId, setSelectedArVariantId] =
    useState<string>("default");

  useEffect(() => {
    const viewer = modelViewerRef.current;
    if (!viewer || !viewer.model) return;

    try {
      viewer.model.materials.forEach((material: any) => {
        const name = material.name.toLowerCase();

        if (name.includes("cheese")) {
          if (
            selectedArModifiers.has("Extra Cheese") ||
            selectedArModifiers.has("Cheese")
          ) {
            material.pbrMetallicRoughness.setBaseColorFactor([
              0.98, 0.75, 0.15, 1.0,
            ]);
            material.pbrMetallicRoughness.setRoughnessFactor(0.15);
          } else {
            material.pbrMetallicRoughness.setBaseColorFactor([
              0.9, 0.7, 0.2, 1.0,
            ]);
            material.pbrMetallicRoughness.setRoughnessFactor(0.4);
          }
        }

        if (name.includes("sauce") || name.includes("ketchup")) {
          if (
            selectedArModifiers.has("Extra Sauce") ||
            selectedArModifiers.has("Sauce")
          ) {
            material.pbrMetallicRoughness.setBaseColorFactor([
              0.7, 0.05, 0.05, 1.0,
            ]);
            material.pbrMetallicRoughness.setRoughnessFactor(0.05);
            material.pbrMetallicRoughness.setMetallicFactor(0.1);
          } else {
            material.pbrMetallicRoughness.setBaseColorFactor([
              0.5, 0.1, 0.1, 1.0,
            ]);
            material.pbrMetallicRoughness.setRoughnessFactor(0.3);
          }
        }
      });
    } catch (err) {
      console.warn("Failed to apply scene graph modifications:", err);
    }
  }, [selectedArModifiers, arItem, arModelRenderKey]);

  useEffect(() => {
    if (!arItem) return;
    const currentVariant = arItem.variants?.find(
      (v: any) => v.id === selectedArVariantId,
    );

    const viewer = modelViewerRef.current;
    const cachedX = viewer?.getAttribute("data-base-scale-x");
    const cachedY = viewer?.getAttribute("data-base-scale-y");
    const cachedZ = viewer?.getAttribute("data-base-scale-z");

    const baseScaleX = cachedX ? parseFloat(cachedX) : 1.0;
    const baseScaleY = cachedY ? parseFloat(cachedY) : 1.0;
    const baseScaleZ = cachedZ ? parseFloat(cachedZ) : 1.0;

    let variantYMultiplier = 1.0;
    if (currentVariant) {
      const name = (currentVariant.name || "").toLowerCase();
      if (
        name.includes("triple") ||
        name.includes("jumbo") ||
        name.includes("xl")
      ) {
        variantYMultiplier = 1.55;
      } else if (
        name.includes("double") ||
        name.includes("large") ||
        name.includes("big")
      ) {
        variantYMultiplier = 1.3;
      }
    }

    setArScale(
      `${baseScaleX} ${baseScaleY * variantYMultiplier} ${baseScaleZ}`,
    );
  }, [selectedArVariantId, arItem]);

  const handleArOpen = (item: any) => {
    setArModelError("");
    setArModelRenderKey((v) => v + 1);
    setArItem(item);
    setSteamEnabled(Boolean(item.hasSteam ?? item.has_steam ?? false));
    setArScale("1 1 1");
    setSelectedArModifiers(new Set());
    const defaultVId = item.variants?.[0]?.id || "";
    setSelectedArVariantId(defaultVId);

    // Reset scale caches
    const viewer = modelViewerRef.current;
    if (viewer) {
      viewer.removeAttribute("data-base-scale-x");
      viewer.removeAttribute("data-base-scale-y");
      viewer.removeAttribute("data-base-scale-z");
    }
  };

  const handleArClose = () => {
    setArItem(null);
    setArModelError("");
    setSteamEnabled(false);
  };

  const activateAr = () => {
    const viewer = modelViewerRef.current;
    if (viewer && typeof viewer.activateAR === "function") {
      viewer.activateAR();
    }
  };

  const getIngredients = (item: any): string[] => {
    if (!item) return [];
    if (Array.isArray(item.ingredients)) return item.ingredients;
    if (typeof item.ingredients === "string") {
      return item.ingredients
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean);
    }
    return [];
  };

  const activeTheme = useMemo(() => mergeTheme(themeConfig), [themeConfig]);
  const themeRadiusClass =
    activeTheme.card_style === "sharp"
      ? "qr-theme-radius-sharp"
      : activeTheme.card_style === "soft"
        ? "qr-theme-radius-soft"
        : "qr-theme-radius-rounded";
  const themeButtonClass =
    activeTheme.button_style === "outline"
      ? "qr-theme-btn-outline"
      : activeTheme.button_style === "glass"
        ? "qr-theme-btn-glass"
        : "qr-theme-btn-solid";
  const motifClass =
    activeTheme.motif === "thai"
      ? "qr-theme-motif-thai"
      : activeTheme.motif === "indian"
        ? "qr-theme-motif-indian"
        : activeTheme.motif === "custom"
          ? "qr-theme-motif-custom"
          : "qr-theme-motif-minimal";
  const patternClass =
    activeTheme.pattern_style === "silk"
      ? "qr-theme-pattern-silk"
      : activeTheme.pattern_style === "mandala"
        ? "qr-theme-pattern-mandala"
        : activeTheme.pattern_style === "waves"
          ? "qr-theme-pattern-waves"
          : activeTheme.pattern_style === "leaf"
            ? "qr-theme-pattern-leaf"
            : "qr-theme-pattern-none";
  const headerClass =
    activeTheme.header_style === "festival"
      ? "qr-theme-header-festival"
      : activeTheme.header_style === "elegant"
        ? "qr-theme-header-elegant"
        : "qr-theme-header-classic";
  const ornamentClass =
    activeTheme.ornament_level === "bold"
      ? "qr-theme-ornament-bold"
      : activeTheme.ornament_level === "subtle"
        ? "qr-theme-ornament-subtle"
        : "qr-theme-ornament-off";
  const sectionIcon = (activeTheme.section_icon || "•").trim() || "•";
  const assetPack = useMemo(
    () => getThemeAssetPack(activeTheme),
    [activeTheme],
  );
  const iconPack = useMemo(() => resolveIconPack(activeTheme), [activeTheme]);
  const layoutGridClass =
    activeTheme.layout === "grid"
      ? "mu-grid-2"
      : activeTheme.layout === "compact" || activeTheme.layout === "magazine"
        ? "mu-grid-1"
        : "mu-grid-1";
  const themeStyle = {
    ["--qr-bg" as string]: activeTheme.colors?.bg || "#FAF9F6",
    ["--qr-surface" as string]: activeTheme.colors?.surface || "#FFFFFF",
    ["--qr-text" as string]: activeTheme.colors?.text || "#0F172A",
    ["--qr-muted" as string]: activeTheme.colors?.muted || "#64748B",
    ["--qr-accent" as string]: activeTheme.colors?.accent || "#0F172A",
    ["--qr-accent-text" as string]:
      activeTheme.colors?.accent_text || "#FFFFFF",
    ["--qr-font" as string]:
      activeTheme.font_family || "'Inter','Segoe UI',sans-serif",
    ["--qr-bg-image" as string]: activeTheme.bg_image_url
      ? `linear-gradient(rgba(255,255,255,${activeTheme.bg_overlay_opacity ?? 0.92}), rgba(255,255,255,${activeTheme.bg_overlay_opacity ?? 0.92})), url("${activeTheme.bg_image_url}")`
      : "none",
  } as React.CSSProperties;

  /* ── Collapsible section toggle helper ── */
  const SectionToggle = ({
    title,
    color,
    count,
    sectionId,
    expanded,
    onToggle,
  }: {
    title: string;
    color: string;
    count: number;
    sectionId: string;
    expanded: boolean;
    onToggle: () => void;
  }) => (
    <button id={sectionId} onClick={onToggle} className="mu-section-toggle">
      <div className="mu-section-toggle-left">
        <div
          className="mu-section-accent-strip"
          style={{ background: color }}
        />
        <h2 className="mu-section-title">{title}</h2>
        <span className="mu-section-count">{count}</span>
      </div>
      <ChevronRight
        size={16}
        className={`mu-section-chevron ${expanded ? "mu-section-chevron--open" : ""}`}
      />
    </button>
  );

  /* ── Render food card helper ── */
  const renderCard = (item: any, keyPrefix: string, idx?: number) => {
    const currentVId =
      selectedVariants[item.id] || item.variants?.[0]?.id || "";
    const cartKey = getCartKey(item.id, currentVId);
    const cartItem = cartState[cartKey];
    const quantity = cartItem ? cartItem.quantity : 0;
    const isFirstCard = keyPrefix === "main" && idx === 0;
    return (
      <div
        key={`${keyPrefix}-${item.id}`}
        id={isFirstCard ? "tour-food-card" : undefined}
      >
        <FoodCard
          item={{
            ...item,
            id: String(item.id),
            name: item.name,
            description: item.description,
            category: item.categoryName || "General",
          }}
          ratingStyles={getRatingStyles(item.rating)}
          selectedVariantId={currentVId}
          onVariantChange={(vId: any) =>
            setSelectedVariants((p) => ({ ...p, [item.id]: vId }))
          }
          currentQty={quantity}
          onAdd={handleAdd}
          onRemove={handleRemove}
          onArClick={handleArOpen}
          orderingEnabled={orderingEnabled}
          layout={activeTheme.layout as any}
        />
      </div>
    );
  };

  return (
    <div
      className={`qr-theme-root ${themeRadiusClass} ${themeButtonClass} ${motifClass} ${patternClass} ${headerClass} ${ornamentClass} min-h-screen antialiased`}
      style={themeStyle}
    >
      <div className="qr-theme-overlay" />
      <div className="qr-theme-top-strip-wrap">
        <div
          className="qr-theme-top-strip"
          style={{ backgroundImage: `url('${assetPack.topStrip}')` }}
        />
      </div>
      <div className="qr-theme-corner qr-theme-corner-tl" aria-hidden />
      <div className="qr-theme-corner qr-theme-corner-tr" aria-hidden />
      <div className="qr-theme-corner qr-theme-corner-bl" aria-hidden />
      <div className="qr-theme-corner qr-theme-corner-br" aria-hidden />

      {isImmersive && (
        <ImmersiveMenu
          items={filteredItems}
          categories={categories}
          cart={cartState}
          onAdd={handleAdd}
          onRemove={handleRemove}
          onClose={() => orderingEnabled && setIsImmersive(false)}
          tableNumber={tableId}
          orderingEnabled={orderingEnabled}
          restaurantName={restaurantName}
          logoUrl={restaurantLogoUrl}
          onArClick={handleArOpen}
        />
      )}

      {arItem && isBrowser
        ? createPortal(
            <div
              onClick={(e) => {
                if (e.target === e.currentTarget) handleArClose();
              }}
              className="fixed inset-0 z-[9999] bg-[#3D2B1F]/30 backdrop-blur-[4px] flex items-end sm:items-center justify-center p-0 sm:p-6 transition-all"
            >
              <style dangerouslySetInnerHTML={{__html: `
                @keyframes arSteamRise {
                  0% {
                    transform: translateY(60px) scaleX(0.5) translateX(0);
                    opacity: 0;
                  }
                  15% {
                    opacity: 0.55;
                  }
                  50% {
                    transform: translateY(20px) scaleX(1.3) translateX(8px);
                    opacity: 0.35;
                  }
                  100% {
                    transform: translateY(-80px) scaleX(2) translateX(-12px);
                    opacity: 0;
                  }
                }
                .ar-steam-particle {
                  animation: arSteamRise 4s infinite linear;
                  filter: blur(8px);
                  border-radius: 50%;
                  background: radial-gradient(circle, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 70%);
                }
              `}} />

              <div
                className="w-full sm:max-w-md rounded-t-[32px] sm:rounded-[32px] bg-[#FFFFFF] border border-[#F0E9DF] shadow-2xl overflow-hidden relative"
                style={{ position: "relative", zIndex: 10000 }}
              >
                {/* Drag handle */}
                <div className="flex justify-center pt-3 pb-1 sm:hidden">
                  <div className="w-10 h-1 rounded-full bg-[#EDE5D8]" />
                </div>

                {/* Header */}
                <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#EDE5D8] text-[9px] font-bold uppercase tracking-wider text-[#8B6E4F] font-dm-sans">
                        <span>✦</span> 3D View
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-[#3D2B1F] leading-tight truncate font-dm-sans">
                      {arItem.name}
                    </h2>
                    {arItem.description && (
                      <p className="text-[12px] text-[#6B5B4E] mt-0.5 line-clamp-1 font-dm-sans">
                        {arItem.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleArClose}
                    className="shrink-0 h-8 w-8 rounded-full bg-[#EDE5D8] text-[#6B5B4E] flex items-center justify-center hover:bg-[#DDD5C5] transition-all active:scale-90"
                    aria-label="Close"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* 3D Viewer */}
                <div
                  className="mx-5 rounded-2xl overflow-hidden relative bg-[#F7F2EB] border border-[#F0E9DF]"
                  style={{ height: 300 }}
                >
                  {/* Hot Steam Effect */}
                  {steamEnabled && (
                    <div className="absolute bottom-[20%] left-1/2 -translate-x-1/2 w-32 h-40 pointer-events-none z-10 flex justify-around opacity-80">
                      <div className="ar-steam-particle w-4 h-24" style={{ animationDelay: "0s", animationDuration: "4s" }} />
                      <div className="ar-steam-particle w-5 h-24" style={{ animationDelay: "1.2s", animationDuration: "4.5s" }} />
                      <div className="ar-steam-particle w-4 h-24" style={{ animationDelay: "2.5s", animationDuration: "3.5s" }} />
                    </div>
                  )}

                  {!modelViewerReady ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                      <div
                        className="w-8 h-8 border-3 border-[#EDE5D8] border-t-[#8B6E4F] rounded-full animate-spin"
                        style={{ borderWidth: 3 }}
                      />
                      <p className="text-[11px] font-semibold text-[#9B8677] font-dm-sans">
                        {modelViewerFailed
                          ? "3D viewer unavailable"
                          : "Loading 3D viewer…"}
                      </p>
                    </div>
                  ) : (
                    <model-viewer
                      key={`${arItem.id || arItem.name}-${arModelRenderKey}`}
                      ref={modelViewerRef}
                      src={sanitizeModelUrl(arItem.arModelGlb)}
                      ios-src={
                        sanitizeModelUrl(arItem.arModelUsdz) || undefined
                      }
                      alt={arItem.name}
                      auto-rotate
                      ar
                      ar-modes="webxr scene-viewer quick-look"
                      ar-scale="fixed"
                      camera-controls
                      interaction-prompt="none"
                      camera-orbit="0deg 75deg 1.8m"
                      tone-mapping="commerce"
                      shadow-intensity="1"
                      scale={arScale}
                      onLoad={() => {
                        setArModelError("");
                        const viewer = modelViewerRef.current;
                        if (viewer) {
                          try {
                            const dim = (viewer as any).getDimensions();
                            if (dim && dim.x > 0 && dim.y > 0 && dim.z > 0) {
                              const targetW = arItem.width_cm || arItem.widthCM;
                              const targetH =
                                arItem.height_cm || arItem.heightCM;
                              const targetD = arItem.depth_cm || arItem.depthCM;
                              if (targetW && targetH && targetD) {
                                const scaleMultiplier = arItem.modelScale ?? arItem.model_scale ?? 1.00;
                                const scaleX = (targetW / (dim.x * 100)) * scaleMultiplier;
                                const scaleY = (targetH / (dim.y * 100)) * scaleMultiplier;
                                const scaleZ = (targetD / (dim.z * 100)) * scaleMultiplier;
                                viewer.setAttribute("data-base-scale-x", String(scaleX));
                                viewer.setAttribute("data-base-scale-y", String(scaleY));
                                viewer.setAttribute("data-base-scale-z", String(scaleZ));
                                setArScale(`${scaleX} ${scaleY} ${scaleZ}`);
                              } else if (targetW) {
                                const scaleMultiplier = arItem.modelScale ?? arItem.model_scale ?? 1.00;
                                const scaleX = (targetW / (dim.x * 100)) * scaleMultiplier;
                                viewer.setAttribute("data-base-scale-x", String(scaleX));
                                viewer.setAttribute("data-base-scale-y", String(scaleX));
                                viewer.setAttribute("data-base-scale-z", String(scaleX));
                                setArScale(`${scaleX} ${scaleX} ${scaleX}`);
                              }
                            }
                          } catch {}
                        }
                      }}
                      onError={() =>
                        setArModelError("3D model failed to load.")
                      }
                      style={{ width: "100%", height: "300px" }}
                    />
                  )}
                  {arModelError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#FFFFFF]/90 gap-2">
                      <p className="text-[12px] font-semibold text-[#C62828] font-dm-sans">
                        {arModelError}
                      </p>
                      <button
                        type="button"
                        onClick={() => setArModelRenderKey((v) => v + 1)}
                        className="px-4 py-1.5 rounded-full bg-[#3D2B1F] text-[#F7F2EB] text-xs font-bold font-dm-sans transition-colors hover:bg-[#5C4033]"
                      >
                        Retry
                      </button>
                    </div>
                  )}
                </div>

                {/* Info + Variants */}
                <div className="p-5 space-y-4">
                  {/* Variant selector */}
                  {arItem.variants && arItem.variants.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-[#9B8677] uppercase tracking-wider mb-2 font-dm-sans">
                        Size
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {arItem.variants.map((v: any) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => setSelectedArVariantId(v.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold border font-dm-sans transition-all ${
                              selectedArVariantId === v.id
                                ? "bg-[#3D2B1F] border-[#3D2B1F] text-[#F7F2EB]"
                                : "bg-[#FFFFFF] border-[#DDD5C5] text-[#6B5B4E] hover:border-[#8B6E4F]"
                            }`}
                          >
                            {v.name}{" "}
                            {v.priceDelta > 0 ? `(+₹${v.priceDelta})` : ""}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Calories, Allergens & Ingredients */}
                  {(arItem.calories ||
                    getIngredients(arItem).length > 0 ||
                    (Array.isArray(arItem.allergens) &&
                      arItem.allergens.length > 0)) && (
                    <div className="flex flex-col gap-2.5">
                      {/* Calories & Allergens Row */}
                      {(arItem.calories ||
                        (Array.isArray(arItem.allergens) &&
                          arItem.allergens.length > 0)) && (
                        <div className="grid grid-cols-2 gap-2.5">
                          {arItem.calories && (
                            <div
                              className={`rounded-xl bg-[#F7F2EB] border border-[#F0E9DF] p-3 flex flex-col justify-between ${!(Array.isArray(arItem.allergens) && arItem.allergens.length > 0) ? "col-span-2" : ""}`}
                            >
                              <p className="text-[9px] font-bold uppercase tracking-wider text-[#8B6E4F] font-dm-sans">
                                Calories
                              </p>
                              <p className="mt-1 text-[15px] font-bold text-[#3D2B1F] font-dm-sans leading-none">
                                {arItem.calories} kcal
                              </p>
                            </div>
                          )}
                          {Array.isArray(arItem.allergens) &&
                            arItem.allergens.length > 0 && (
                              <div
                                className={`rounded-xl bg-[#FFF9F6] border border-[#FEE8E2] p-3 flex flex-col justify-between ${!arItem.calories ? "col-span-2" : ""}`}
                              >
                                <p className="text-[9px] font-bold uppercase tracking-wider text-[#C62828] font-dm-sans flex items-center gap-1">
                                  <AlertTriangle
                                    size={11}
                                    className="text-[#C62828] shrink-0"
                                  />
                                  Allergen Warning
                                </p>
                                <p className="mt-1 text-[11px] font-semibold text-[#C62828] font-dm-sans leading-tight">
                                  Contains: {arItem.allergens.join(", ")}
                                </p>
                              </div>
                            )}
                        </div>
                      )}

                      {/* Ingredients Box */}
                      {getIngredients(arItem).length > 0 && (
                        <div className="rounded-xl bg-[#F7F2EB] border border-[#F0E9DF] p-3">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-[#8B6E4F] font-dm-sans">
                            Ingredients
                          </p>
                          <p className="mt-1 text-[11px] text-[#6B5B4E] font-dm-sans leading-relaxed line-clamp-2">
                            {getIngredients(arItem).join(", ")}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* View in AR button */}
                  <button
                    onClick={activateAr}
                    className="w-full rounded-2xl py-3.5 text-sm font-bold text-[#F7F2EB] bg-[#3D2B1F] transition-all active:scale-[0.98] hover:bg-[#5C4033] shadow-md shadow-[#3D2B1F]/10 font-dm-sans"
                  >
                    View in AR
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {/* ── HEADER ── */}
      <header
        className={`mu-header ${scrolledHeader ? "mu-header--scrolled" : ""}`}
      >
        <div className="mu-header-inner">
          <div className="mu-header-left">
            <div className="mu-logo-wrap">
              {restaurantLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={restaurantLogoUrl}
                  alt={`${restaurantName} logo`}
                  className="mu-logo-img"
                />
              ) : (
                <div className="mu-logo-fallback">
                  <UtensilsCrossed className="w-5 h-5" />
                </div>
              )}
            </div>
            <div>
              <h1 className="mu-restaurant-name">{restaurantName}</h1>
              <div className="mu-table-chip">
                <span className="mu-table-chip-dot" />
                <span className="mu-table-label">Table {tableId || "7"}</span>
              </div>
            </div>
          </div>

          <div className="mu-header-right">
            <button
              id="tour-veg-filter"
              onClick={() => setIsVegOnly(!isVegOnly)}
              className={`mu-veg-btn ${isVegOnly ? "mu-veg-btn--active" : ""}`}
              aria-label="Vegetarian filter"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 2 8 0 5.5-4.5 10-10 10Z" />
                <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
              </svg>
            </button>
            {orderingEnabled && (
              <button
                id="tour-immersive"
                onClick={() => setIsImmersive(true)}
                className="mu-header-btn"
                aria-label="Immersive menu"
              >
                <Smartphone size={16} />
              </button>
            )}
            <button
              id="tour-search"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="mu-header-btn"
              aria-label="Search menu"
            >
              <Search size={16} />
            </button>
            <button
              onClick={() => startTour()}
              className="mu-header-btn"
              aria-label="Replay tour"
            >
              <HelpCircle size={16} />
            </button>
          </div>
        </div>

        {/* Search bar — slides down when open */}
        {isSearchOpen && (
          <div className="mu-search-bar">
            <div className="mu-search-bar-inner">
              <Search className="mu-search-icon" size={16} />
              <input
                type="text"
                className="mu-search-input"
                placeholder={t("search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="mu-search-clear"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Occupied notice */}
        {isTableOccupied && orderingEnabled && (
          <div className="mu-occupied-notice">
            This table already has an active session. You are viewing the active
            table.
          </div>
        )}

        {/* Category pills — only on menu tab */}
        {activeTab === "menu" && categories.length > 0 && (
          <div className="mu-category-pills">
            {offerItems.length > 0 && (
              <button
                onClick={() => scrollToSection("category-offers")}
                className={`mu-pill ${activeCategory === "offers" ? "mu-pill--active" : ""}`}
              >
                Offers
              </button>
            )}
            {todaySpecialItems.length > 0 && (
              <button
                onClick={() => scrollToSection("category-specials")}
                className={`mu-pill ${activeCategory === "specials" ? "mu-pill--active" : ""}`}
              >
                Specials
              </button>
            )}
            {chefSpecialItems.length > 0 && (
              <button
                onClick={() => scrollToSection("category-chef")}
                className={`mu-pill ${activeCategory === "chef" ? "mu-pill--active" : ""}`}
              >
                Chef&apos;s Pick
              </button>
            )}

            {categories.map((cat) => {
              const count = filteredItems.filter(
                (item: any) => getParentName(item) === cat.id,
              ).length;
              if (count === 0) return null;
              return (
                <button
                  key={cat.id}
                  onClick={() => scrollToSection(`category-${cat.id}`)}
                  className={`mu-pill ${activeCategory === cat.id ? "mu-pill--active" : ""}`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="mu-main">
        {activeTab === "menu" && (
          <div className="mu-menu-content">

            {/* Today's Specials */}
            {todaySpecialItems.length > 0 && (
              <section className="mu-section">
                <SectionToggle
                  title={t("todaysSpecials")}
                  color="#B45309"
                  count={todaySpecialItems.length}
                  sectionId="category-specials"
                  expanded={expandedCategories["__specials"] !== false}
                  onToggle={() =>
                    setExpandedCategories((p) => ({
                      ...p,
                      __specials: p["__specials"] === false,
                    }))
                  }
                />
                {expandedCategories["__specials"] !== false && (
                  <div className={layoutGridClass}>
                    {todaySpecialItems.map((item: any) =>
                      renderCard(item, "todays"),
                    )}
                  </div>
                )}
              </section>
            )}

            {/* Offers */}
            {offerItems.length > 0 && (
              <section className="mu-section">
                <SectionToggle
                  title={t("offerProducts")}
                  color="#15803D"
                  count={offerItems.length}
                  sectionId="category-offers"
                  expanded={expandedCategories["__offers"] !== false}
                  onToggle={() =>
                    setExpandedCategories((p) => ({
                      ...p,
                      __offers: p["__offers"] === false,
                    }))
                  }
                />
                {expandedCategories["__offers"] !== false && (
                  <div className={layoutGridClass}>
                    {offerItems
                      .slice(0, 8)
                      .map((item: any) => renderCard(item, "offer"))}
                  </div>
                )}
              </section>
            )}

            {/* Chef Specials */}
            {chefSpecialItems.length > 0 && (
              <section className="mu-section">
                <SectionToggle
                  title={t("chefSpecials")}
                  color="#B45309"
                  count={chefSpecialItems.length}
                  sectionId="category-chef"
                  expanded={expandedCategories["__chef"] !== false}
                  onToggle={() =>
                    setExpandedCategories((p) => ({
                      ...p,
                      __chef: p["__chef"] === false,
                    }))
                  }
                />
                {expandedCategories["__chef"] !== false && (
                  <div className={layoutGridClass}>
                    {chefSpecialItems.map((item: any) =>
                      renderCard(item, "chef"),
                    )}
                  </div>
                )}
              </section>
            )}


            {/* Regular categories */}
            {categories.map((category) => {
              const items = filteredItems.filter(
                (item: any) => getParentName(item) === category.id,
              );
              if (items.length === 0) return null;

              const subcategories = Array.from(
                new Set(
                  items
                    .map((item: any) => getSubcategoryName(item))
                    .filter(Boolean),
                ),
              ) as string[];

              const catColor =
                (category.name || "").toLowerCase().includes("drink") ||
                (category.name || "").toLowerCase().includes("beverage")
                  ? "#1D4ED8"
                  : "#8B6E4F";

              return (
                <section key={category.id} className="mu-section">
                  <SectionToggle
                    title={category.name}
                    color={catColor}
                    count={items.length}
                    sectionId={`category-${category.id}`}
                    expanded={expandedCategories[category.id] !== false}
                    onToggle={() =>
                      setExpandedCategories((p) => ({
                        ...p,
                        [category.id]: !p[category.id],
                      }))
                    }
                  />

                  {expandedCategories[category.id] && (
                    <div className="mu-subcategories">
                      {subcategories.map((subcat: string) => {
                        const subItems = items.filter(
                          (item: any) => getSubcategoryName(item) === subcat,
                        );
                        if (subItems.length === 0) return null;

                        return (
                          <div key={`${category.id}-${subcat}`}>
                            {subcategories.length > 1 && (
                              <h3 className="mu-subcategory-name">{subcat}</h3>
                            )}
                            <div className={layoutGridClass}>
                              {subItems.map((item: any, itemIdx: number) =>
                                renderCard(
                                  item,
                                  categories.indexOf(category) === 0 &&
                                    subcategories.indexOf(subcat) === 0
                                    ? "main"
                                    : `cat-${category.id}`,
                                  itemIdx,
                                ),
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}

        {activeTab === "orders" && <OrdersView previewMode={previewMode} />}

        {activeTab === "services" && (
          <ServicesView
            previewMode={previewMode}
            orderingEnabled={orderingEnabled}
          />
        )}
      </main>

      {/* ── CHECKOUT BAR ── */}
      {orderingEnabled && totalItems > 0 && (
        <div className="mu-checkout-bar-wrap">
          <button
            onClick={() => {
              if (previewMode) return;
              router.push(`/checkout`);
            }}
            className="mu-checkout-bar"
          >
            <div className="mu-checkout-left">
              <span className="mu-checkout-badge">{totalItems}</span>
              <span className="mu-checkout-label">View Cart</span>
            </div>
            <div className="mu-checkout-right">
              <span className="mu-checkout-total">₹{cartTotal}</span>
              <ChevronRight size={16} className="mu-checkout-arrow" />
            </div>
          </button>
        </div>
      )}

      {/* ── BOTTOM NAV ── */}
      {orderingEnabled && (
        <CustomerBottomNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          cartItemCount={totalItems}
          orderingEnabled={orderingEnabled}
        />
      )}
    </div>
  );
};

export default ModernFoodUI;
