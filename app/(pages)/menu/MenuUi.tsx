"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { Search, ChevronDown, ChevronRight, UtensilsCrossed, Bell, Droplets, Loader2, Smartphone } from "lucide-react";
import { useCartStore, getCartKey } from "@/stores/cartStore";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import FoodCard from "@/app/components/menu/FoodCard";
import ImmersiveMenu from "@/app/components/menu/ImmersiveMenu";
import { api } from "@/app/lib/api";
import { useLanguageStore } from "@/stores/languageStore";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

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
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;
  if (/^[a-z0-9-]+\.cloudfront\.net\//i.test(raw)) return `https://${raw}`;
  if (/^[a-z0-9.-]+\.amazonaws\.com\//i.test(raw)) return `https://${raw}`;
  return raw;
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
  if (rating > 4) return { container: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/50", icon: "text-emerald-500 fill-emerald-500" };
  if (rating >= 2.5) return { container: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/50", icon: "text-amber-400 fill-amber-400" };
  return { container: "bg-red-50 text-red-700 ring-1 ring-red-200/50", icon: "text-red-500 fill-red-500" };
};

type ThemeConfig = {
  preset?: "thai" | "indian" | "minimal" | "";
  font_family?: string;
  bg_image_url?: string;
  bg_overlay_opacity?: number;
  card_style?: "rounded" | "soft" | "sharp" | "";
  button_style?: "solid" | "outline" | "glass" | "";
  motif?: "thai" | "indian" | "minimal" | "custom" | "";
  ornament_level?: "off" | "subtle" | "bold" | "";
  header_style?: "classic" | "elegant" | "festival" | "";
  pattern_style?: "none" | "silk" | "mandala" | "waves" | "leaf" | "";
  section_icon?: string;
  icon_pack?: "auto" | "thai" | "indian" | "minimal" | "";
  colors?: {
    bg?: string;
    surface?: string;
    text?: string;
    muted?: string;
    accent?: string;
    accent_text?: string;
  };
};

const DEFAULT_THEME: ThemeConfig = {
  preset: "",
  font_family: "'Inter', 'Segoe UI', sans-serif",
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
    bg: "#F8FAFC",
    surface: "#FFFFFF",
    text: "#0F172A",
    muted: "#64748B",
    accent: "#0F172A",
    accent_text: "#FFFFFF",
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
      bg: "#F8FAFC",
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
    bg_overlay_opacity: Math.min(0.98, Math.max(0.7, Number(raw?.bg_overlay_opacity ?? presetBase.bg_overlay_opacity ?? DEFAULT_THEME.bg_overlay_opacity))),
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
  if (theme.motif === "thai" || theme.motif === "indian" || theme.motif === "minimal") {
    return theme.motif;
  }
  return "minimal";
};

const getRegionalCategoryIcon = (pack: string, category: string, fallback: string) => {
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
  const [menuItems, setMenuItems] = useState(initialMenu);
  const [searchQuery, setSearchQuery] = useState("");
  const [isVegOnly, setIsVegOnly] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [isWaiterCalled, setIsWaiterCalled] = useState(false);
  const [isWaterRequested, setIsWaterRequested] = useState(false);
  const [tourReady, setTourReady] = useState(false);
  const [hasArItems, setHasArItems] = useState(false);
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
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(
    mergeTheme(initialThemeConfig || previewThemeConfig || DEFAULT_THEME)
  );
  const [previewCart, setPreviewCart] = useState<Record<string, { quantity: number; price: number }>>({});

  const { t, tContent, language, setLanguage } = useLanguageStore();

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
      image: resolve(item.imageUrl) || item.image,
      arModelGlb: resolvedGlb || null,
      arModelUsdz: resolvedUsdz || null,
      ingredients: item.ingredients || item.ingredient_list || item.ingredientList || [],
      calories: item.calories || item.kcal || item.nutrition?.calories,
      variants,
    };
  };

  useEffect(() => {
    const normalized = Array.isArray(initialMenu) ? initialMenu.map(normalizeItem) : [];
    setMenuItems(normalized);
    setHasArItems(normalized.some((i: any) => Boolean(i.arModelGlb)));
  }, [initialMenu]);

  const translatedItems = useMemo(() => {
    return menuItems.map((item: any) => ({
      ...item,
      name: tContent(item.name),
      description: tContent(item.description),
      categoryName: tContent(item.categoryName),
      parentCategoryName: tContent(item.parentCategoryName),
      variants: (item.variants || []).map((v: any) => ({
        ...v,
        name: tContent(v.name)
      }))
    }));
  }, [menuItems, language, tContent]);

  useEffect(() => {
    const cats = Array.from(
      new Set(translatedItems.map((item: any) => getParentName(item)).filter(Boolean))
    );
    const initial: Record<string, boolean> = {};
    cats.forEach(c => initial[c as string] = true);
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
      toast("Ordering is currently disabled for this restaurant.", { icon: "ℹ️" });
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

  const filteredItems = translatedItems.filter((item: any) => {
    const query = searchQuery ? searchQuery.toLowerCase() : "";
    const matchesSearch = item.name.toLowerCase().includes(query) || item.description.toLowerCase().includes(query);
    return matchesSearch && (isVegOnly ? item.isVeg : true);
  });

  const categories = Array.from(
    new Set(translatedItems.map((item: any) => getParentName(item)).filter(Boolean))
  ).map((cat) => ({ id: cat as string, name: cat as string }));

  const cartTotal = Object.entries(cartState).reduce((acc, [, item]) => acc + (item.price * item.quantity), 0);
  const totalItems = Object.values(cartState).reduce((sum, item) => sum + item.quantity, 0);
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
    if (previewRestaurantLogoUrl) setRestaurantLogoUrl(previewRestaurantLogoUrl);
    if (previewThemeConfig) setThemeConfig(mergeTheme(previewThemeConfig));
  }, [previewMode, previewRestaurantName, previewRestaurantLogoUrl, previewThemeConfig]);

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
      try {
        const me = await api<{
          restaurant?: string;
          logo_url?: string | null;
          logo_version?: number | null;
          theme_config?: ThemeConfig;
        }>("/api/admin/me", { skipAuthRedirect: true });
        if (cancelled) return;
        const name = me?.restaurant?.trim();
        if (name) {
          setRestaurantName(name);
          localStorage.setItem("restaurant_name", name);
        }
        applyLogo(me?.logo_url, me?.logo_version ?? null);
        applyTheme(me?.theme_config || null);
      } catch {
        if (cancelled) return;
      }

      const rid = localStorage.getItem("restaurant_id");
      if (!rid || cancelled) return;

      try {
        const logo = await api<{ logo_url?: string | null }>(`/public/restaurants/${rid}/logo`);
        if (cancelled) return;
        if (logo?.logo_url) {
          setRestaurantLogoUrl(logo.logo_url);
        }
      } catch {
        // keep header usable with text fallback
      }
      try {
        const theme = await api<{ theme_config?: ThemeConfig }>(`/public/restaurants/${rid}/theme`);
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
      steps: [
        {
          popover: {
            title: "👋 Welcome to Qrave!",
            description: "Let us show you around. We have some amazing features to help you decide what to eat.",
            side: "bottom" as const,
            align: "center" as const,
          },
        },
        {
          element: ".ar-view-btn",
          popover: {
            title: "✨ View in AR",
            description: "See it before you eat it! Tap this button to place a realistic 3D model of the dish right on your table.",
            side: "left" as const,
            align: "center" as const,
          },
        },
        {
          element: "#tour-search",
          popover: {
            title: "🔍 Search the menu",
            description: "Looking for something specific? Type a dish name or keyword here to instantly find it.",
            side: "bottom" as const,
          },
        },
        {
          element: "#tour-veg-filter",
          popover: {
            title: "🥬 Veg-only filter",
            description: "One tap to show only vegetarian dishes.",
            side: "bottom" as const,
          },
        },
        {
          element: "#tour-language",
          popover: {
            title: "🌐 Switch language",
            description: "Instantly translate the entire menu to your preferred language.",
            side: "bottom" as const,
          },
        },
        {
          element: "#tour-immersive",
          popover: {
            title: "📱 Immersive mode",
            description: "Want larger images? Switch to the full-screen immersive view.",
            side: "bottom" as const,
          },
        },
        {
          element: "#tour-food-card",
          popover: {
            title: "🍽️ Add to cart",
            description: "Use the + button to add items. You can also customize variants here.",
            side: "top" as const,
          },
        },
        {
          element: "#tour-waiter",
          popover: {
            title: "🔔 Call a waiter",
            description: "Need help? Tap here to alert the staff.",
            side: "left" as const,
          },
        },
        {
          element: "#tour-water",
          popover: {
            title: "💧 Request water",
            description: "Thirsty? Request water with a single tap.",
            side: "left" as const,
          },
        },
        {
          popover: {
            title: "🎉 Ready to order?",
            description: "Explore the menu and enjoy your meal! You can revisit this tour anytime by clearing your browser data.",
            side: "bottom" as const,
            align: "center" as const,
          },
        },
      ],
    });
    driverObj.drive();
  }, []);

  useEffect(() => {
    if (!tourReady) return;
    const timer = setTimeout(() => startTour(), 800);
    return () => clearTimeout(timer);
  }, [tourReady, startTour]);

  useEffect(() => {
    setIsBrowser(true);
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

  useEffect(() => {
    if (!arItem?.arModelGlb) return;
    const modelUrl = sanitizeModelUrl(arItem.arModelGlb);
    if (!modelUrl) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 7000);
    fetch(modelUrl, {
      method: "HEAD",
      cache: "force-cache",
      signal: controller.signal,
    }).catch(() => {});
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [arItem?.arModelGlb]);

  const toggleLanguage = () => {
    const langs = ['en', 'hi', 'ml'] as const;
    const currentIdx = langs.indexOf(language as any);
    const nextIdx = (currentIdx + 1) % langs.length;
    setLanguage(langs[nextIdx]);
  };

  const handleArOpen = (item: any) => {
    setArModelError("");
    setArModelRenderKey((v) => v + 1);
    setArItem(item);
  };

  const handleArClose = () => {
    setArItem(null);
    setArModelError("");
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
      return item.ingredients.split(",").map((s: string) => s.trim()).filter(Boolean);
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
  const assetPack = useMemo(() => getThemeAssetPack(activeTheme), [activeTheme]);
  const iconPack = useMemo(() => resolveIconPack(activeTheme), [activeTheme]);
  const themeStyle = {
    ["--qr-bg" as string]: activeTheme.colors?.bg || "#F8FAFC",
    ["--qr-surface" as string]: activeTheme.colors?.surface || "#FFFFFF",
    ["--qr-text" as string]: activeTheme.colors?.text || "#0F172A",
    ["--qr-muted" as string]: activeTheme.colors?.muted || "#64748B",
    ["--qr-accent" as string]: activeTheme.colors?.accent || "#0F172A",
    ["--qr-accent-text" as string]: activeTheme.colors?.accent_text || "#FFFFFF",
    ["--qr-font" as string]: activeTheme.font_family || "'Inter','Segoe UI',sans-serif",
    ["--qr-bg-image" as string]: activeTheme.bg_image_url
      ? `linear-gradient(rgba(255,255,255,${activeTheme.bg_overlay_opacity ?? 0.92}), rgba(255,255,255,${activeTheme.bg_overlay_opacity ?? 0.92})), url("${activeTheme.bg_image_url}")`
      : "none",
  } as React.CSSProperties;

  return (
    <div className={`qr-theme-root ${themeRadiusClass} ${themeButtonClass} ${motifClass} ${patternClass} ${headerClass} ${ornamentClass} min-h-screen antialiased`} style={themeStyle}>
      <div className="qr-theme-overlay" />
      <div className="qr-theme-top-strip-wrap">
        <div className="qr-theme-top-strip" style={{ backgroundImage: `url('${assetPack.topStrip}')` }} />
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

      {arItem && isBrowser &&
        createPortal(
          <div className="fixed inset-0 z-[9999] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden relative">
              <div className="p-5 border-b border-slate-100 flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900">{arItem.name}</h2>
                  <p className="text-xs text-slate-500 mt-1">{arItem.description}</p>
                </div>
                <button
                  onClick={handleArClose}
                  className="h-8 w-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200"
                >
                  <span className="text-lg leading-none">×</span>
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden">
                  {!modelViewerReady ? (
                    <div className="w-full h-[280px] flex items-center justify-center text-xs font-bold text-slate-500 bg-slate-100">
                      {modelViewerFailed ? "3D viewer failed to initialize" : "Loading 3D viewer..."}
                    </div>
                  ) : (
                    <model-viewer
                      key={`${arItem.id || arItem.name}-${arModelRenderKey}`}
                      ref={modelViewerRef}
                      src={sanitizeModelUrl(arItem.arModelGlb)}
                      alt={arItem.name}
                      auto-rotate
                      ar
                      ar-modes="scene-viewer webxr"
                      ar-scale="fixed"
                      disable-zoom
                      interaction-prompt="none"
                      camera-orbit="0deg 75deg 1.8m"
                      min-camera-orbit="auto auto 1.8m"
                      max-camera-orbit="auto auto 1.8m"
                      tone-mapping="commerce"
                      shadow-intensity="1"
                      onLoad={() => setArModelError("")}
                      onError={() =>
                        setArModelError("3D model failed to load. Try again or re-upload an optimized GLB.")
                      }
                      style={{ width: "100%", height: "280px", background: "#f1f5f9" }}
                    />
                  )}
                </div>
                {arModelError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">
                    {arModelError}
                    <button
                      type="button"
                      onClick={() => setArModelRenderKey((v) => v + 1)}
                      className="ml-2 underline"
                    >
                      Retry
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-200 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Calories</p>
                    <p className="mt-1 text-lg font-black text-slate-900">
                      {arItem.calories ? `${arItem.calories} kcal` : "—"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ingredients</p>
                    <p className="mt-1 text-xs text-slate-600 line-clamp-2">
                      {getIngredients(arItem).length > 0 ? getIngredients(arItem).join(", ") : "Not listed"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={activateAr}
                  className="w-full rounded-2xl bg-slate-900 py-3 text-sm font-bold text-white shadow-xl transition-all active:scale-95"
                >
                  View In AR
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200/50">
        <div className="max-w-md mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200 overflow-hidden border border-slate-200 bg-white">
              {restaurantLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={restaurantLogoUrl} alt={`${restaurantName} logo`} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-slate-900 text-white flex items-center justify-center">
                  <UtensilsCrossed className="w-5 h-5" />
                </div>
              )}
            </div>
            <div>
              <h1 className="font-serif text-lg font-bold leading-none">{restaurantName}</h1>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mt-1">{t('table')} {tableId || "7"}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="tour-language"
              onClick={toggleLanguage}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 font-bold text-xs uppercase hover:bg-slate-200 transition-colors"
            >
              {language}
            </button>
            {orderingEnabled && (
              <button
                id="tour-immersive"
                onClick={() => setIsImmersive(!isImmersive)}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-900 text-white shadow-lg shadow-slate-200 transition-transform active:scale-95"
              >
                <Smartphone size={16} />
              </button>
            )}
            <button
              id="tour-veg-filter"
              onClick={() => setIsVegOnly(!isVegOnly)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-300 active:scale-95 ${isVegOnly
                ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-100"
                : "bg-white border-slate-200 text-slate-600"
                }`}
            >
              <div className={`w-2 h-2 rounded-full ${isVegOnly ? "bg-white animate-pulse" : "bg-slate-300"}`} />
              <span className="text-[10px] font-bold">{t('veg')}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-6 pt-6 pb-44">
        {isTableOccupied && orderingEnabled && (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">
            This table already has an active session. You are viewing the active table.
          </div>
        )}
        <div id="tour-search" className="relative mb-10 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-slate-900" />
          <input
            type="text"
            className="w-full pl-11 pr-4 py-4 bg-white border border-slate-200/60 rounded-2xl text-sm shadow-sm focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all"
            placeholder={t('search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="space-y-10">
          {categories.map((category) => {
            const items = filteredItems.filter((item: any) => getParentName(item) === category.id);
            if (items.length === 0) return null;

            const subcategories = Array.from(
              new Set(items.map((item: any) => getSubcategoryName(item)).filter(Boolean))
            ) as string[];
            return (
              <div key={category.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="qr-theme-divider mb-4" style={{ backgroundImage: `url('${assetPack.divider}')` }} />
                <button
                  onClick={() => setExpandedCategories((p) => ({ ...p, [category.id]: !p[category.id] }))}
                  className="w-full flex items-center justify-between mb-6 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-1 w-8 bg-slate-900 rounded-full" />
                    <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase flex items-center gap-2">
                      <span className="qr-theme-section-icon">{getRegionalCategoryIcon(iconPack, category.name, sectionIcon)}</span>
                      {category.name}
                    </h2>
                  </div>
                  <div className="p-1 rounded-full bg-slate-100 group-hover:bg-slate-200 transition-colors">
                    <ChevronDown className={`w-4 h-4 text-slate-600 transition-transform duration-300 ${expandedCategories[category.id] ? "rotate-180" : ""}`} />
                  </div>
                </button>

                {expandedCategories[category.id] && (
                  <div className="space-y-8">
                    {subcategories.map((subcat: string) => {
                      const subItems = items.filter((item: any) => getSubcategoryName(item) === subcat);
                      if (subItems.length === 0) return null;

                      return (
                        <div key={`${category.id}-${subcat}`}>
                          <div className="mb-4 flex items-center gap-3">
                            <div className="h-1 w-6 bg-slate-200 rounded-full" />
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">
                              {subcat}
                            </h3>
                          </div>
                          <div className="grid gap-6">
                            {subItems.map((item: any, itemIdx: number) => {
                              const currentVId = selectedVariants[item.id] || item.variants?.[0]?.id || "";
                              const cartKey = getCartKey(item.id, currentVId);
                              const cartItem = cartState[cartKey];
                              const quantity = cartItem ? cartItem.quantity : 0;
                              const isFirstCard = categories.indexOf(category) === 0 && subcategories.indexOf(subcat) === 0 && itemIdx === 0;

                              return (
                                <div key={item.id} id={isFirstCard ? "tour-food-card" : undefined}>
                                  <FoodCard
                                    item={{
                                      ...item,
                                      id: String(item.id),
                                      name: item.name,
                                      description: item.description,
                                      category: item.categoryName || "General"
                                    }}
                                    ratingStyles={getRatingStyles(item.rating)}
                                    selectedVariantId={currentVId}
                                    onVariantChange={(vId: any) => setSelectedVariants((p) => ({ ...p, [item.id]: vId }))}
                                    currentQty={quantity}
                                    onAdd={handleAdd}
                                    onRemove={handleRemove}
                                    onArClick={handleArOpen}
                                    orderingEnabled={orderingEnabled}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {orderingEnabled && (
        <div className="fixed right-4 sm:right-6 bottom-24 sm:bottom-28 z-[60] flex flex-col items-end gap-3">
          <button
            id="tour-waiter"
            onClick={async () => {
              if (previewMode) return;
              if (!orderingEnabled) {
                toast("Ordering is currently disabled for this restaurant.", { icon: "ℹ️" });
                return;
              }
              try {
                await api("/api/customer/service-calls", {
                  method: "POST",
                  body: JSON.stringify({ type: "waiter" }),
                });
                setIsWaiterCalled(true);
                toast.success(t('waiterCalled'));
              } catch {
                toast.error(t('waiterCalled') + " failed");
              }
            }}
            className="w-12 h-12 rounded-2xl shadow-2xl bg-white border border-slate-100 flex items-center justify-center transition-all active:scale-90"
          >
            {isWaiterCalled ? <Loader2 className="animate-spin text-slate-900" /> : <Bell className="text-slate-600 w-6 h-6" />}
          </button>
          <button
            id="tour-water"
            onClick={async () => {
              if (previewMode) return;
              if (!orderingEnabled) {
                toast("Ordering is currently disabled for this restaurant.", { icon: "ℹ️" });
                return;
              }
              try {
                await api("/api/customer/service-calls", {
                  method: "POST",
                  body: JSON.stringify({ type: "water" }),
                });
                setIsWaterRequested(true);
                toast.success(t('waterRequested'));
              } catch {
                toast.error(t('waterRequested') + " failed");
              }
            }}
            className="w-12 h-12 rounded-2xl shadow-2xl bg-slate-900 text-white flex items-center justify-center transition-all active:scale-90"
          >
            {isWaterRequested ? <Loader2 className="animate-spin" /> : <Droplets className="w-6 h-6" />}
          </button>
        </div>
      )}



      {orderingEnabled && totalItems > 0 && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-4 sm:bottom-6 z-[65]">
          <button
            onClick={() => {
              if (previewMode) return;
              router.push(`/checkout`);
            }}
            className="group h-16 min-w-[460px] max-w-[calc(100vw-0.5rem)] bg-slate-900 text-white px-5 rounded-2xl flex items-center justify-between gap-4 shadow-2xl shadow-slate-400 transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-black text-slate-900">
                  {totalItems}
                </span>
                <div className="p-2 bg-white/10 rounded-lg">
                  <UtensilsCrossed size={18} />
                </div>
              </div>
              <div className="flex flex-col items-start min-w-0">
                <span className="text-[10px] uppercase font-bold text-white/50 leading-none mb-1">{t('viewCart')}</span>
                <span className="font-black text-lg leading-none truncate">₹{cartTotal}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white text-slate-900 px-5 py-2 rounded-xl font-bold text-sm shrink-0">
              <span>{t('checkout')}</span>
              <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
            </div>
          </button>
        </div>
      )}
      <style jsx>{`
        .qr-theme-root {
          background-color: var(--qr-bg);
          background-image: var(--qr-bg-image);
          background-size: cover;
          background-attachment: fixed;
          font-family: var(--qr-font);
          color: var(--qr-text);
          position: relative;
          overflow-x: hidden;
        }
        .qr-theme-overlay {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          opacity: 0.1;
        }
        .qr-theme-ornament-subtle .qr-theme-overlay { opacity: 0.06; }
        .qr-theme-ornament-bold .qr-theme-overlay { opacity: 0.12; }
        .qr-theme-top-strip-wrap {
          position: fixed;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: min(100%, 460px);
          pointer-events: none;
          z-index: 3;
        }
        .qr-theme-top-strip {
          position: relative;
          height: 42px;
          background-repeat: repeat-x;
          background-size: auto 42px;
          pointer-events: none;
          opacity: 0.42;
        }
        .qr-theme-divider {
          height: 20px;
          background-repeat: repeat-x;
          background-size: auto 20px;
          opacity: 0.3;
        }
        .qr-theme-pattern-none .qr-theme-overlay { background: none; }
        .qr-theme-pattern-silk .qr-theme-overlay {
          background:
            radial-gradient(circle at 20% 15%, color-mix(in oklab, var(--qr-accent), #fff 70%) 0%, transparent 45%),
            radial-gradient(circle at 80% 75%, color-mix(in oklab, var(--qr-accent), #fff 75%) 0%, transparent 50%);
        }
        .qr-theme-pattern-mandala .qr-theme-overlay {
          background:
            radial-gradient(circle, color-mix(in oklab, var(--qr-accent), #fff 78%) 1px, transparent 1px);
          background-size: 26px 26px;
        }
        .qr-theme-pattern-waves .qr-theme-overlay {
          background:
            repeating-linear-gradient(
              135deg,
              transparent 0 14px,
              color-mix(in oklab, var(--qr-accent), #fff 82%) 14px 16px
            );
        }
        .qr-theme-pattern-leaf .qr-theme-overlay {
          background:
            radial-gradient(ellipse at 30% 40%, color-mix(in oklab, var(--qr-accent), #fff 80%) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 60%, color-mix(in oklab, var(--qr-accent), #fff 84%) 0%, transparent 50%);
        }
        .qr-theme-corner {
          position: fixed;
          width: 84px;
          height: 84px;
          pointer-events: none;
          z-index: 1;
          opacity: 0.2;
          border: 2px solid color-mix(in oklab, var(--qr-accent), #fff 45%);
        }
        .qr-theme-corner-tl { top: 10px; left: 10px; border-right: 0; border-bottom: 0; border-radius: 22px 0 0 0; }
        .qr-theme-corner-tr { top: 10px; right: 10px; border-left: 0; border-bottom: 0; border-radius: 0 22px 0 0; }
        .qr-theme-corner-bl { bottom: 10px; left: 10px; border-right: 0; border-top: 0; border-radius: 0 0 0 22px; }
        .qr-theme-corner-br { bottom: 10px; right: 10px; border-left: 0; border-top: 0; border-radius: 0 0 22px 0; }
        .qr-theme-ornament-off .qr-theme-corner { display: none; }
        .qr-theme-ornament-off .qr-theme-top-strip,
        .qr-theme-ornament-off .qr-theme-divider { display: none; }
        .qr-theme-ornament-subtle .qr-theme-corner { display: none; }
        .qr-theme-ornament-subtle .qr-theme-divider { opacity: 0.14; }
        .qr-theme-ornament-bold .qr-theme-corner { opacity: 0.26; }
        .qr-theme-ornament-bold .qr-theme-divider { opacity: 0.32; }
        .qr-theme-section-icon {
          color: color-mix(in oklab, var(--qr-accent), #fff 20%);
          font-size: 0.92rem;
        }
        .qr-theme-header-festival :global(header) {
          box-shadow: 0 6px 24px color-mix(in oklab, var(--qr-accent), transparent 82%);
        }
        .qr-theme-header-elegant :global(header) {
          border-bottom-width: 2px;
        }
        .qr-theme-motif-thai .qr-theme-corner {
          border-style: double;
        }
        .qr-theme-motif-indian .qr-theme-corner {
          filter: saturate(1.25);
        }
        .qr-theme-pattern-mandala .qr-theme-overlay {
          background-size: 38px 38px;
        }
        .qr-theme-pattern-silk .qr-theme-overlay {
          filter: saturate(0.8);
        }
        .qr-theme-root :global(.bg-white) { background-color: var(--qr-surface) !important; }
        .qr-theme-root :global(.bg-slate-50), .qr-theme-root :global(.bg-slate-100) { background-color: color-mix(in oklab, var(--qr-surface), #000 4%) !important; }
        .qr-theme-root :global(.text-slate-900) { color: var(--qr-text) !important; }
        .qr-theme-root :global(.text-slate-600), .qr-theme-root :global(.text-slate-500), .qr-theme-root :global(.text-slate-400) { color: var(--qr-muted) !important; }
        .qr-theme-root :global(.bg-slate-900) { background-color: var(--qr-accent) !important; }
        .qr-theme-root :global(.text-white) { color: var(--qr-accent-text) !important; }
        .qr-theme-root :global(.border-slate-200), .qr-theme-root :global(.border-slate-100) { border-color: color-mix(in oklab, var(--qr-text), #fff 85%) !important; }
        .qr-theme-root :global(.shadow-slate-200), .qr-theme-root :global(.shadow-slate-400) { box-shadow: 0 10px 24px color-mix(in oklab, var(--qr-accent), transparent 78%) !important; }
        .qr-theme-root :global(.bg-emerald-500), .qr-theme-root :global(.bg-emerald-600) { background-color: var(--qr-accent) !important; }
        .qr-theme-root :global(.text-emerald-500), .qr-theme-root :global(.text-emerald-600), .qr-theme-root :global(.text-indigo-600) { color: var(--qr-accent) !important; }
        .qr-theme-root :global(.border-emerald-500), .qr-theme-root :global(.border-indigo-500) { border-color: var(--qr-accent) !important; }
        .qr-theme-radius-rounded :global(.rounded-2xl), .qr-theme-radius-rounded :global(.rounded-xl) { border-radius: 1rem !important; }
        .qr-theme-radius-soft :global(.rounded-2xl), .qr-theme-radius-soft :global(.rounded-xl) { border-radius: 1.4rem !important; }
        .qr-theme-radius-sharp :global(.rounded-2xl), .qr-theme-radius-sharp :global(.rounded-xl) { border-radius: 0.35rem !important; }
        .qr-theme-btn-outline :global(button.bg-slate-900) {
          background: transparent !important;
          color: var(--qr-accent) !important;
          border: 1px solid var(--qr-accent) !important;
        }
        .qr-theme-btn-glass :global(button.bg-slate-900) {
          background: color-mix(in oklab, var(--qr-accent), transparent 65%) !important;
          backdrop-filter: blur(8px);
          color: var(--qr-accent-text) !important;
        }
        .qr-theme-root :global(main),
        .qr-theme-root :global(header) {
          position: relative;
          z-index: 2;
        }
      `}</style>
    </div>
  );
};

export default ModernFoodUI;
