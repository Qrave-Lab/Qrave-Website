"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { Search, ChevronDown, ChevronRight, UtensilsCrossed, Bell, Droplets, Loader2, Smartphone } from "lucide-react";
import { useCartStore, getCartKey } from "@/stores/cartStore";
import { useRouter } from "next/navigation";
import { Toaster, toast } from "react-hot-toast";
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

const ModernFoodUI: React.FC<any> = ({ menuItems: initialMenu = [], tableNumber, isTableOccupied = false, orderingEnabled = true }) => {
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
  const [restaurantName, setRestaurantName] = useState("Restaurant");
  const [restaurantLogoUrl, setRestaurantLogoUrl] = useState("");

  const { t, tContent, language, setLanguage } = useLanguageStore();

  const cart = useCartStore((state) => state.cart);
  const addItemStore = useCartStore((state) => state.addItem);
  const decrementItemStore = useCartStore((state) => state.decrementItem);
  const router = useRouter();

  useEffect(() => {
    const handleError = (e: any) => {
      toast.error(e.detail || "Update failed");
    };
    window.addEventListener("cart-error", handleError);
    return () => window.removeEventListener("cart-error", handleError);
  }, []);

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

    const resolvedGlb = resolve(item.modelGlb || item.arModelGlb);
    const resolvedUsdz = resolve(item.modelUsdz || item.arModelUsdz);

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
    if (!orderingEnabled) {
      toast("Ordering is currently disabled for this restaurant.", { icon: "ℹ️" });
      return;
    }
    addItemStore(id, vId || "", price || 0);
  };

  const handleRemove = async (id: string, vId?: string) => {
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

  const cartTotal = Object.entries(cart).reduce((acc, [_, item]) => acc + (item.price * item.quantity), 0);
  const totalItems = Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);
  const rawTableId = resolve(tableNumber);
  const tableId = rawTableId && rawTableId !== "N/A" ? rawTableId : "N/A";

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (tableId !== "N/A") {
      localStorage.setItem("table_number", tableId);
    }
  }, [tableId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedName = localStorage.getItem("restaurant_name");
    if (storedName) {
      setRestaurantName(storedName);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;

    const applyLogo = (url?: string | null, version?: number | null) => {
      if (!url) return;
      const suffix = version ? `?v=${version}` : "";
      setRestaurantLogoUrl(`${url}${suffix}`);
    };

    const loadBranding = async () => {
      try {
        const me = await api<{
          restaurant?: string;
          logo_url?: string | null;
          logo_version?: number | null;
        }>("/api/admin/me", { skipAuthRedirect: true });
        if (cancelled) return;
        const name = me?.restaurant?.trim();
        if (name) {
          setRestaurantName(name);
          localStorage.setItem("restaurant_name", name);
        }
        applyLogo(me?.logo_url, me?.logo_version ?? null);
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
    };

    loadBranding();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem("qrave_tour_seen") === "true";
    if (!seen) {
      setTourReady(true);
    }
  }, []);

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
    if (document.querySelector("script[data-model-viewer]")) return;
    const script = document.createElement("script");
    script.type = "module";
    script.src = "https://unpkg.com/@google/model-viewer@4.1.0/dist/model-viewer.min.js";
    script.setAttribute("data-model-viewer", "true");
    document.head.appendChild(script);
  }, []);

  const toggleLanguage = () => {
    const langs = ['en', 'hi', 'ml'] as const;
    const currentIdx = langs.indexOf(language as any);
    const nextIdx = (currentIdx + 1) % langs.length;
    setLanguage(langs[nextIdx]);
  };

  const handleArOpen = (item: any) => {
    setArItem(item);
  };

  const handleArClose = () => {
    setArItem(null);
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

  return (
    <div className="min-h-screen bg-[#F8FAFC] antialiased">
      <Toaster position="top-center" />

      {isImmersive && (
        <ImmersiveMenu
          items={filteredItems}
          categories={categories}
          cart={cart}
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
                  <model-viewer
                    ref={modelViewerRef}
                    src={arItem.arModelGlb}
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
                    style={{ width: "100%", height: "280px", background: "#f1f5f9" }}
                  />
                </div>

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
                <button
                  onClick={() => setExpandedCategories((p) => ({ ...p, [category.id]: !p[category.id] }))}
                  className="w-full flex items-center justify-between mb-6 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-1 w-8 bg-slate-900 rounded-full" />
                    <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase">{category.name}</h2>
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
                              const cartItem = cart[cartKey];
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
        <div className="fixed bottom-32 right-6 z-40 flex flex-col gap-4">
          <button
            id="tour-waiter"
            onClick={async () => {
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
            className="w-14 h-14 rounded-2xl shadow-2xl bg-white border border-slate-100 flex items-center justify-center transition-all active:scale-90"
          >
            {isWaiterCalled ? <Loader2 className="animate-spin text-slate-900" /> : <Bell className="text-slate-600 w-6 h-6" />}
          </button>
          <button
            id="tour-water"
            onClick={async () => {
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
            className="w-14 h-14 rounded-2xl shadow-2xl bg-slate-900 text-white flex items-center justify-center transition-all active:scale-90"
          >
            {isWaterRequested ? <Loader2 className="animate-spin" /> : <Droplets className="w-6 h-6" />}
          </button>
        </div>
      )}



      {orderingEnabled && totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-white via-white/90 to-transparent p-6 pb-8">
          <div className="max-w-md mx-auto">
            <button
              onClick={() => router.push(`/checkout`)}
              className="group w-full h-16 bg-slate-900 text-white px-6 rounded-2xl flex justify-between items-center shadow-2xl shadow-slate-400 transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-black text-slate-900">
                    {totalItems}
                  </span>
                  <div className="p-2 bg-white/10 rounded-lg">
                    <UtensilsCrossed size={18} />
                  </div>
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-[10px] uppercase font-bold text-white/50 leading-none mb-1">{t('viewCart')}</span>
                  <span className="font-black text-lg">₹{cartTotal}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white text-slate-900 px-4 py-2 rounded-xl font-bold text-sm">
                <span>{t('checkout')}</span>
                <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModernFoodUI;
