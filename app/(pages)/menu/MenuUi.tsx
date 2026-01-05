"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Star,
  Plus,
  Minus,
  Scan,
  ChevronRight,
  ChevronLeft,
  UtensilsCrossed,
  Leaf,
  ChevronDown,
  Bell,
  Droplets,
  Hand,
  Loader2,
} from "lucide-react";
import { useCartStore, getCartKey } from "@/stores/cartStore";
import { useRouter, useSearchParams } from "next/navigation";
import { Toaster, toast } from "react-hot-toast";
import { api } from "@/app/lib/api";



const getRatingStyles = (rating: number) => {
  if (rating > 4) {
    return {
      container: "bg-emerald-50 border-emerald-200 text-emerald-700",
      icon: "text-emerald-500 fill-emerald-500",
    };
  } else if (rating >= 2.5) {
    return {
      container: "bg-amber-50 border-amber-200 text-amber-700",
      icon: "text-amber-400 fill-amber-400",
    };
  } else {
    return {
      container: "bg-red-50 border-red-200 text-red-700",
      icon: "text-red-500 fill-red-500",
    };
  }
};

type Macros = {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
};

type Variant = {
  id: string;
  name: string;
  priceDelta: number;
};

type MenuItem = {
  id: number;
  name: string;
  category: string;
  price: number;
  description: string;
  image: string;
  isVeg?: boolean;
  rating: number;
  arModelGlb: string | null;
  arModelUsdz?: string | null;
  macros?: Macros;
  allergens?: string[];
  isAvailable?: boolean;
  isBestseller?: boolean;
  isSpicy?: boolean;
  variants?: Variant[];
};

const fallbackGlb = "/models/default.glb";

const getItemPrice = (item: MenuItem, variantId?: string) => {
  const variant = item.variants?.find((v) => v.id === variantId);
  return item.price + (variant?.priceDelta || 0);
};

const ModernFoodUI: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isVegOnly, setIsVegOnly] = useState(false);
  const searchParams = useSearchParams();
  const tableNumber = searchParams.get("table");

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    starters: true,
    "main-course": true,
    "pizza-pasta": true,
    burgers: true,
    desserts: true,
  });
  const [selectedVariants, setSelectedVariants] = useState<Record<number, string>>({});
  const [loadedImages, setLoadedImages] = useState<Record<number, boolean>>({});
  const [showTour, setShowTour] = useState(true);
  const [selectedArItem, setSelectedArItem] = useState<MenuItem | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const [isWaiterCalled, setIsWaiterCalled] = useState(false);
  const [isWaterRequested, setIsWaterRequested] = useState(false);
  const minSwipeDistance = 50;

  const cart = useCartStore((state) => state.cart);
  const addItem = useCartStore((state) => state.addItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const orders = useCartStore((state) => state.orders);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      import("@google/model-viewer");
      const seenTour = localStorage.getItem("noir-tour");
      if (seenTour) setShowTour(false);
    }
  }, []);

  useEffect(() => {
    if (selectedArItem) {
      const seenSwipeHint = sessionStorage.getItem("noir-swipe-hint");
      if (!seenSwipeHint) {
        setShowSwipeHint(true);
        const timer = setTimeout(() => {
          setShowSwipeHint(false);
          sessionStorage.setItem("noir-swipe-hint", "true");
        }, 3000);
        return () => clearTimeout(timer);
      }
    } else {
      setShowSwipeHint(false);
    }
  }, [selectedArItem]);

  const finishTour = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("noir-tour", "true");
    }
    setShowTour(false);
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const categories = [
    { id: "starters", name: "Starters" },
    { id: "main-course", name: "Main Course" },
    { id: "pizza-pasta", name: "Pizza & Pasta" },
    { id: "burgers", name: "Burgers" },
    { id: "desserts", name: "Desserts" },
  ];

  const menuItems: MenuItem[] = [
    {
      id: 101,
      name: "Truffle Fries",
      category: "starters",
      price: 249,
      description: "Shoestring fries tossed with truffle oil and parmesan.",
      image: "https://images.unsplash.com/photo-1573080496987-a199f8cd4054?w=800&q=80",
      isVeg: true,
      rating: 4.8,
      arModelGlb: "/models/pizza.glb",
      macros: { calories: 420, protein: 6, carbs: 45, fats: 24 },
      allergens: ["Gluten", "Dairy"],
      isAvailable: true,
      isBestseller: true,
      variants: [
        { id: "regular", name: "Regular", priceDelta: 0 },
        { id: "large", name: "Large", priceDelta: 60 },
      ],
    },
    {
      id: 201,
      name: "Grilled Salmon",
      category: "main-course",
      price: 699,
      description: "Atlantic salmon with asparagus and lemon butter sauce.",
      image: "https://images.unsplash.com/photo-1467003909585-2f8a7270028d?w=800&q=80",
      isVeg: false,
      rating: 4.9,
      arModelGlb: null,
      macros: { calories: 520, protein: 38, carbs: 10, fats: 32 },
      allergens: ["Fish"],
      isAvailable: false,
    },
    {
      id: 202,
      name: "Ribeye Steak",
      category: "main-course",
      price: 899,
      description: "Premium cut served with mashed potatoes.",
      image: "https://images.unsplash.com/photo-1600891964092-4316c288032e?w=800&q=80",
      isVeg: false,
      rating: 4.8,
      arModelGlb: null,
      macros: { calories: 780, protein: 45, carbs: 18, fats: 52 },
      allergens: ["Dairy"],
      isAvailable: true,
      isBestseller: true,
      variants: [
        { id: "250g", name: "250g", priceDelta: 0 },
        { id: "350g", name: "350g", priceDelta: 150 },
      ],
    },
    {
      id: 301,
      name: "Burrata Pizza",
      category: "pizza-pasta",
      price: 499,
      description: "San Marzano tomato sauce, fresh basil, creamy burrata.",
      image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=80",
      isVeg: true,
      rating: 4.7,
      arModelGlb: null,
      macros: { calories: 640, protein: 22, carbs: 70, fats: 28 },
      allergens: ["Gluten", "Dairy"],
      isAvailable: true,
      isBestseller: true,
      variants: [
        { id: "personal", name: "Personal", priceDelta: 0 },
        { id: "medium", name: "Medium", priceDelta: 120 },
        { id: "large", name: "Large", priceDelta: 220 },
      ],
    },
    {
      id: 401,
      name: "Smash Burger",
      category: "burgers",
      price: 349,
      description: "Double beef patty, cheddar, onions, secret sauce.",
      image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80",
      isVeg: false,
      rating: 4.6,
      arModelGlb: "/models/burger.glb",
      macros: { calories: 680, protein: 32, carbs: 38, fats: 42 },
      allergens: ["Gluten", "Dairy", "Egg"],
      isAvailable: true,
      isBestseller: true,
      isSpicy: true,
      variants: [
        { id: "single", name: "Single Patty", priceDelta: 0 },
        { id: "double", name: "Double Patty", priceDelta: 80 },
      ],
    },
    {
      id: 501,
      name: "Tiramisu",
      category: "desserts",
      price: 299,
      description: "Classic Italian dessert with mascarpone and espresso.",
      image: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=500&q=80",
      isVeg: true,
      rating: 4.9,
      arModelGlb: null,
      macros: { calories: 380, protein: 7, carbs: 42, fats: 20 },
      allergens: ["Dairy", "Egg", "Gluten"],
      isAvailable: true,
    },
  ];


  const MenuItems: MenuItem[]= async ()=>{
    const data = await api('/api/menu',
      {method:'GET'}
    );


  }

  const totalItems = Object.values(cart).reduce((sum, qty) => sum + qty, 0);

  const cartTotal = Object.entries(cart).reduce((total, [key, quantity]) => {
    const [itemIdStr, variantIdRaw] = key.split("::");
    const item = menuItems.find((i) => i.id === Number(itemIdStr));
    if (!item) return total;
    const variantId = variantIdRaw === "default" ? undefined : variantIdRaw;
    const price = getItemPrice(item, variantId);
    return total + price * quantity;
  }, 0);

  const filteredItems = menuItems.filter((item) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      item.name.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q);
    const matchesVeg = isVegOnly ? item.isVeg : true;
    return matchesSearch && matchesVeg;
  });

  const tableOrders = Object.values(orders || {}).filter(
    (o) => o.tableNumber === tableNumber
  );

  const existingBillTotal = tableOrders
    .filter((o) => o.status !== "pending")
    .reduce((sum, o) => sum + o.total, 0);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) navigateArItem("next");
    if (isRightSwipe) navigateArItem("prev");
  };

  const navigateArItem = (direction: "next" | "prev") => {
    if (!selectedArItem) return;
    const currentIndex = filteredItems.findIndex(
      (item) => item.id === selectedArItem.id
    );
    if (currentIndex === -1) return;
    let newIndex;
    if (direction === "next") {
      newIndex = (currentIndex + 1) % filteredItems.length;
    } else {
      newIndex = (currentIndex - 1 + filteredItems.length) % filteredItems.length;
    }
    setShowSwipeHint(false);
    sessionStorage.setItem("noir-swipe-hint", "true");
    setSelectedArItem(filteredItems[newIndex]);
  };

  const handleCallWaiter = () => {
    if (isWaiterCalled) return;
    setIsWaiterCalled(true);
    toast.success("Waiter has been notified", {
      icon: "🔔",
      style: {
        borderRadius: "12px",
        background: "#1e293b",
        color: "#fff",
      },
    });
    setTimeout(() => {
      setIsWaiterCalled(false);
    }, 10000);
  };

  const handleRequestWater = () => {
    if (isWaterRequested) return;
    setIsWaterRequested(true);
    toast.success("Water request sent", {
      icon: "💧",
      style: {
        borderRadius: "12px",
        background: "#eff6ff",
        color: "#1e40af",
        border: "1px solid #bfdbfe",
      },
    });
    setTimeout(() => {
      setIsWaterRequested(false);
    }, 10000);
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 antialiased relative">
      <Toaster position="top-center" reverseOrder={false} />
      <style jsx global>{`
        @keyframes swipe-hint {
          0% {
            transform: translateX(20px);
            opacity: 0;
          }
          20% {
            transform: translateX(20px);
            opacity: 1;
          }
          60% {
            transform: translateX(-20px);
            opacity: 1;
          }
          100% {
            transform: translateX(-20px);
            opacity: 0;
          }
        }
        .animate-swipe {
          animation: swipe-hint 2s ease-in-out infinite;
        }
      `}</style>

      <div className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-md mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold">NOIR.</h1>
              <p className="text-xs text-slate-500">Table #{tableNumber}</p>
            </div>
          </div>

          <button
            onClick={() => setIsVegOnly(!isVegOnly)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
              isVegOnly
                ? "bg-green-600 border-green-600 text-white"
                : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
            }`}
          >
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                isVegOnly ? "bg-white" : "bg-slate-400"
              }`}
            ></div>
            <span className="text-xs font-medium">VEG</span>
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 pt-8 pb-44">
        <div className="relative mb-8">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
            placeholder="Search dishes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="space-y-8">
          {categories.map((category) => {
            const categoryItems = filteredItems.filter(
              (item) => item.category === category.id
            );
            if (categoryItems.length === 0) return null;

            return (
              <div key={category.id} className="pb-4">
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full flex items-center justify-between mb-4 group"
                >
                  <h2 className="text-lg font-semibold text-slate-900">
                    {category.name}
                  </h2>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 transition-transform ${
                      expandedCategories[category.id] ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {expandedCategories[category.id] && (
                  <div className="space-y-5">
                    {categoryItems.map((item) => {
                      const ratingStyles = getRatingStyles(item.rating);
                      const isAvailable = item.isAvailable !== false;
                      const activeVariantId =
                        item.variants && item.variants.length > 0
                          ? selectedVariants[item.id] ||
                            item.variants[0].id ||
                            undefined
                          : undefined;
                      const variantKey = getCartKey(item.id, activeVariantId);
                      const currentQty = cart[variantKey] || 0;

                      return (
                        <div key={item.id} className="w-full">
                          <div
                            className={`flex gap-4 ${
                              !isAvailable ? "opacity-60" : ""
                            }`}
                          >
                            <div className="relative w-28 h-28 flex-shrink-0 rounded-xl overflow-hidden bg-slate-100">
                              {!loadedImages[item.id] && (
                                <div className="absolute inset-0 bg-slate-200 animate-pulse" />
                              )}
                              <img
                                src={item.image}
                                alt={item.name}
                                className={`w-full h-full object-cover transition-opacity duration-300 ${
                                  loadedImages[item.id]
                                    ? "opacity-100"
                                    : "opacity-0"
                                }`}
                                onLoad={() =>
                                  setLoadedImages((prev) => ({
                                    ...prev,
                                    [item.id]: true,
                                  }))
                                }
                              />
                              <div className="absolute top-2 left-2 bg-white/95 p-1 rounded flex items-center gap-1">
                                <div
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    item.isVeg ? "bg-green-600" : "bg-red-600"
                                  }`}
                                ></div>
                              </div>

                              {!isAvailable && (
                                <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide">
                                  Sold out
                                </div>
                              )}

                              {item.arModelGlb ? (
                                <button
                                  onClick={() => setSelectedArItem(item)}
                                  className={`absolute bottom-2 right-2 p-1.5 rounded-lg text-white transition-colors ${
                                    showTour
                                      ? "bg-emerald-600 animate-pulse"
                                      : "bg-black/60 hover:bg-black/80"
                                  }`}
                                  aria-label={`AR view ${item.name}`}
                                >
                                  <Scan className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <div className="absolute bottom-2 right-2 bg-black/40 px-2 py-1 rounded-lg text-[10px] text-white/80">
                                  AR coming soon
                                </div>
                              )}
                            </div>

                            <div className="flex-1 flex flex-col justify-between py-0.5">
                              <div>
                                <div className="flex justify-between items-start mb-1.5">
                                  <div className="space-y-1 pr-2">
                                    <h3 className="font-medium text-slate-900 text-sm leading-snug">
                                      {item.name}
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                      {item.isBestseller && (
                                        <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                                          Bestseller
                                        </span>
                                      )}
                                      {item.isSpicy && (
                                        <span className="text-[10px] font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                          <span>🌶</span> Spicy
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div
                                    className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${ratingStyles.container}`}
                                  >
                                    <Star
                                      className={`w-3 h-3 ${ratingStyles.icon}`}
                                    />
                                    <span>{item.rating}</span>
                                  </div>
                                </div>

                                <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-3">
                                  {item.description}
                                </p>

                                {item.variants && item.variants.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mb-2">
                                    {item.variants.map((variant) => {
                                      const isActive =
                                        activeVariantId === variant.id;
                                      return (
                                        <button
                                          key={variant.id}
                                          type="button"
                                          onClick={() =>
                                            setSelectedVariants((prev) => ({
                                              ...prev,
                                              [item.id]: variant.id,
                                            }))
                                          }
                                          className={`px-2 py-1 rounded-full border text-[10px] font-medium ${
                                            isActive
                                              ? "bg-slate-900 text-white border-slate-900"
                                              : "bg-white text-slate-700 border-slate-200"
                                          }`}
                                        >
                                          {variant.name}
                                          {variant.priceDelta > 0 &&
                                            ` +₹${variant.priceDelta}`}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center justify-between">
                                <span className="text-base font-semibold text-slate-900">
                                  ₹{getItemPrice(item, activeVariantId)}
                                </span>

                                {isAvailable ? (
                                  currentQty > 0 ? (
                                    <div className="flex items-center h-8 bg-slate-900 text-white rounded-lg overflow-hidden">
                                      <button
                                        onClick={() =>
                                          removeItem(item.id, activeVariantId)
                                        }
                                        className="w-8 h-full flex items-center justify-center hover:bg-white/10 transition-colors"
                                      >
                                        <Minus className="w-3.5 h-3.5" />
                                      </button>
                                      <span className="min-w-[2rem] text-center text-xs font-medium">
                                        {currentQty}
                                      </span>
                                      <button
                                        onClick={() =>
                                          addItem(item.id, activeVariantId)
                                        }
                                        className="w-8 h-full flex items-center justify-center hover:bg-white/10 transition-colors"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() =>
                                        addItem(item.id, activeVariantId)
                                      }
                                      className="h-8 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg flex items-center justify-center transition-colors"
                                    >
                                      Add
                                    </button>
                                  )
                                ) : (
                                  <span className="text-xs font-semibold text-red-500">
                                    Unavailable
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-100 mb-3">
                <Leaf className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-slate-500 text-sm mb-3">
                No items match your filters
              </p>
              <button
                onClick={() => {
                  setIsVegOnly(false);
                  setSearchQuery("");
                }}
                className="text-sm text-slate-900 font-medium underline"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {!selectedArItem && (
        <div className="fixed bottom-32 right-5 z-40 flex flex-col gap-3">
          <button
            onClick={handleCallWaiter}
            disabled={isWaiterCalled}
            className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95 border ${
              isWaiterCalled
                ? "bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
            aria-label="Call Waiter"
          >
            {isWaiterCalled ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Bell className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={handleRequestWater}
            disabled={isWaterRequested}
            className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95 ${
              isWaterRequested
                ? "bg-blue-200 text-blue-50 cursor-not-allowed"
                : "bg-blue-500 text-white shadow-blue-500/30 hover:bg-blue-600"
            }`}
            aria-label="Request Water"
          >
            {isWaterRequested ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Droplets className="w-5 h-5" />
            )}
          </button>
        </div>
      )}

      {selectedArItem && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="flex items-center justify-between px-4 py-3 text-white z-20">
            <div>
              <p className="text-sm font-medium">AR View</p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-white/70">{selectedArItem.name}</p>
                <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white/50">
                  {filteredItems.findIndex((i) => i.id === selectedArItem.id) + 1} /{" "}
                  {filteredItems.length}
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedArItem(null)}
              className="text-xs px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              Close
            </button>
          </div>

          <div className="relative flex-1 flex flex-col overflow-hidden">
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigateArItem("prev");
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                navigateArItem("next");
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {showSwipeHint && (
              <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
                <div className="flex flex-col items-center gap-2 bg-black/40 backdrop-blur-sm px-6 py-4 rounded-2xl animate-pulse">
                  <div className="w-12 h-12 flex items-center justify-center animate-swipe">
                    <Hand className="w-8 h-8 text-white rotate-12" />
                  </div>
                  <p className="text-white text-xs font-semibold tracking-wide uppercase opacity-90">
                    Swipe to browse
                  </p>
                </div>
              </div>
            )}

            {/* @ts-ignore */}
            <model-viewer
              key={selectedArItem.id}
              src={selectedArItem.arModelGlb || fallbackGlb}
              ios-src={selectedArItem.arModelUsdz || undefined}
              alt={selectedArItem.name}
              ar
              ar-modes="webxr scene-viewer quick-look"
              ar-scale="auto"
              camera-controls
              auto-rotate
              shadow-intensity="1"
              style={{ width: "100%", height: "100%" }}
            />

            <div className="pointer-events-none absolute inset-x-4 bottom-4 space-y-3 z-10">
              {selectedArItem.macros && (
                <div className="pointer-events-auto rounded-xl bg-black/70 backdrop-blur-md px-4 py-3 text-xs text-white border border-white/10">
                  <p className="text-[11px] uppercase tracking-wide text-white/60 mb-2">
                    Nutrition (per serving)
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[11px] text-white/60">
                        Calories
                      </span>
                      <span className="text-sm font-semibold">
                        {selectedArItem.macros.calories} kcal
                      </span>
                    </div>
                    <div className="flex gap-4 text-[11px]">
                      <div className="flex flex-col items-center">
                        <span className="text-white/60">Protein</span>
                        <span className="font-medium">
                          {selectedArItem.macros.protein} g
                        </span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-white/60">Carbs</span>
                        <span className="font-medium">
                          {selectedArItem.macros.carbs} g
                        </span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-white/60">Fats</span>
                        <span className="font-medium">
                          {selectedArItem.macros.fats} g
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedArItem.allergens &&
                selectedArItem.allergens.length > 0 && (
                  <div className="pointer-events-auto rounded-full bg-red-900/80 backdrop-blur-md px-4 py-2 text-[11px] text-red-50 border border-red-500/50 flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide">
                      Allergens:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {selectedArItem.allergens.map((allergen) => (
                        <span
                          key={allergen}
                          className="rounded-full bg-red-600/80 px-2 py-0.5 text-[10px] font-medium"
                        >
                          {allergen}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}

      {!selectedArItem && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 p-4 pb-6">
          <div className="max-w-md mx-auto space-y-3">
            {totalItems > 0 ? (
              <div className="bg-slate-900 text-white px-5 py-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 w-9 h-9 rounded-lg flex items-center justify-center font-semibold text-sm">
                    {totalItems}
                  </div>
                  <div>
                    <span className="text-xs text-white/60 block">
                      {totalItems} item{totalItems > 1 && "s"} • ~20 mins
                    </span>
                    <span className="font-semibold text-lg">₹{cartTotal}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    router.push(`/checkout?table=${tableNumber}`);
                  }}
                  className="flex items-center gap-2 bg-white text-slate-900 px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-slate-100 transition-colors"
                >
                  Checkout
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ) : existingBillTotal > 0 ? (
              <div className="bg-slate-900 text-white px-5 py-4 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-white/60 block">
                    Table bill • Table #{tableNumber}
                  </span>
                  <span className="font-semibold text-lg">
                    ₹{existingBillTotal}
                  </span>
                </div>

                <button
                  onClick={() => {
                    router.push(`/checkout?table=${tableNumber}`);
                  }}
                  className="flex items-center gap-2 bg-white text-slate-900 px-4 py-2.5 rounded-lg font-medium text-sm hover:bg-slate-100 transition-colors"
                >
                  View bill
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {showTour && !selectedArItem && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center px-6">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-semibold">
                AR
              </div>
              <div>
                <p className="text-sm font-semibold">Try dishes in AR</p>
                <p className="text-xs text-slate-500">
                  Preview selected dishes in 3D before you order.
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-700">
              Look for the{" "}
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 text-white text-xs">
                <Scan className="w-3 h-3" />
                scan icon
              </span>{" "}
              on dishes that support AR. Tap it to place the dish on your table.
            </p>
            <p className="text-xs text-slate-500">
              You can also call a waiter or request water anytime using the
              buttons at the bottom.
            </p>
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={finishTour}
                className="text-xs text-slate-500 underline"
              >
                Skip
              </button>
              <button
                onClick={finishTour}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModernFoodUI;