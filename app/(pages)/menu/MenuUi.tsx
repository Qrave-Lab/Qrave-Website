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
import { useRouter } from "next/navigation";
import { Toaster, toast } from "react-hot-toast";

const resolve = (val: any): string => {
  if (!val) return "";
  if (typeof val === "object" && "String" in val) return val.String;
  return String(val);
};

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

type MenuItem = {
  id: number;
  name: any;
  categoryId: any;
  price: number;
  description: any;
  image: string;
  isVeg?: boolean;
  rating: number;
  arModelGlb: string | null;
  arModelUsdz?: string | null;
  macros?: { calories: number; protein: number; carbs: number; fats: number };
  allergens?: string[];
  isAvailable?: boolean;
  isBestseller?: boolean;
  isSpicy?: boolean;
  variants?: { id: string; name: string; priceDelta: number }[];
};

interface ModernFoodUIProps {
  menuItems: MenuItem[];
  tableNumber?: any;
}

const fallbackGlb = "/models/default.glb";

const getItemPrice = (item: MenuItem, variantId?: string) => {
  const variant = item.variants?.find((v) => v.id === variantId);
  return item.price + (variant?.priceDelta || 0);
};

const ModernFoodUI: React.FC<ModernFoodUIProps> = ({ menuItems = [], tableNumber }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isVegOnly, setIsVegOnly] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
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
    const cats = Array.from(new Set(menuItems.map(item => resolve(item.categoryId)).filter(Boolean)));
    const initial = cats.reduce((acc, cat) => ({ ...acc, [cat]: true }), {});
    setExpandedCategories(initial);
  }, [menuItems]);

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

  const categories = Array.from(
    new Set(menuItems.map(item => resolve(item.categoryId)).filter(Boolean))
  ).map(cat => ({ id: cat, name: cat }));

  const cartTotal = Object.entries(cart).reduce((total, [key, quantity]) => {
    const [itemIdStr, variantIdRaw] = key.split("::");
    const item = menuItems.find((i) => i.id === Number(itemIdStr));
    if (!item) return total;
    const variantId = variantIdRaw === "default" ? undefined : variantIdRaw;
    return total + getItemPrice(item, variantId) * quantity;
  }, 0);

  const filteredItems = menuItems.filter((item) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = resolve(item.name).toLowerCase().includes(q) || resolve(item.description).toLowerCase().includes(q);
    const matchesVeg = isVegOnly ? item.isVeg : true;
    return matchesSearch && matchesVeg;
  });

  const totalItems = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  const tableId = resolve(tableNumber);
  
  const existingBillTotal = Object.values(orders || {})
    .filter((o) => o.tableNumber === tableId && o.status !== "pending")
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
    if (distance > minSwipeDistance) navigateArItem("next");
    if (distance < -minSwipeDistance) navigateArItem("prev");
  };

  const navigateArItem = (direction: "next" | "prev") => {
    if (!selectedArItem) return;
    const currentIndex = filteredItems.findIndex((item) => item.id === selectedArItem.id);
    if (currentIndex === -1) return;
    let newIndex = direction === "next" ? (currentIndex + 1) % filteredItems.length : (currentIndex - 1 + filteredItems.length) % filteredItems.length;
    setSelectedArItem(filteredItems[newIndex]);
  };

  const handleCallWaiter = () => {
    if (isWaiterCalled) return;
    setIsWaiterCalled(true);
    toast.success("Waiter has been notified", { icon: "🔔", style: { borderRadius: "12px", background: "#1e293b", color: "#fff" } });
    setTimeout(() => setIsWaiterCalled(false), 10000);
  };

  const handleRequestWater = () => {
    if (isWaterRequested) return;
    setIsWaterRequested(true);
    toast.success("Water request sent", { icon: "💧", style: { borderRadius: "12px", background: "#eff6ff", color: "#1e40af", border: "1px solid #bfdbfe" } });
    setTimeout(() => setIsWaterRequested(false), 10000);
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 antialiased relative">
      <Toaster position="top-center" reverseOrder={false} />
      <style jsx global>{`
        @keyframes swipe-hint {
          0% { transform: translateX(20px); opacity: 0; }
          20% { transform: translateX(20px); opacity: 1; }
          60% { transform: translateX(-20px); opacity: 1; }
          100% { transform: translateX(-20px); opacity: 0; }
        }
        .animate-swipe { animation: swipe-hint 2s ease-in-out infinite; }
      `}</style>

      <div className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-md mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold">NOIR.</h1>
              <p className="text-xs text-slate-500">Table #{tableId || "N/A"}</p>
            </div>
          </div>
          <button onClick={() => setIsVegOnly(!isVegOnly)} className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${isVegOnly ? "bg-green-600 border-green-600 text-white" : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isVegOnly ? "bg-white" : "bg-slate-400"}`}></div>
            <span className="text-xs font-medium">VEG</span>
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 pt-8 pb-44">
        <div className="relative mb-8">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input type="text" className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all" placeholder="Search dishes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>

        <div className="space-y-8">
          {categories.map((category) => {
            const categoryItems = filteredItems.filter(item => resolve(item.categoryId) === category.id);
            if (categoryItems.length === 0) return null;
            return (
              <div key={category.id} className="pb-4">
                <button onClick={() => setExpandedCategories(p => ({ ...p, [category.id]: !p[category.id] }))} className="w-full flex items-center justify-between mb-4 group">
                  <h2 className="text-lg font-semibold text-slate-900">{resolve(category.name)}</h2>
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${expandedCategories[category.id] ? "rotate-180" : ""}`} />
                </button>
                {expandedCategories[category.id] && (
                  <div className="space-y-5">
                    {categoryItems.map((item) => {
                      const ratingStyles = getRatingStyles(item.rating);
                      const isAvailable = item.isAvailable !== false;
                      const activeVariantId = item.variants && item.variants.length > 0 ? selectedVariants[item.id] || item.variants[0].id : undefined;
                      const qty = cart[getCartKey(item.id, activeVariantId)] || 0;
                      return (
                        <div key={item.id} className="w-full">
                          <div className={`flex gap-4 ${!isAvailable ? "opacity-60" : ""}`}>
                            <div className="relative w-28 h-28 flex-shrink-0 rounded-xl overflow-hidden bg-slate-100">
                              <img src={item.image} alt={resolve(item.name)} className="w-full h-full object-cover" />
                              <div className="absolute top-2 left-2 bg-white/95 p-1 rounded flex items-center gap-1">
                                <div className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? "bg-green-600" : "bg-red-600"}`}></div>
                              </div>
                              {item.arModelGlb && <button onClick={() => setSelectedArItem(item)} className="absolute bottom-2 right-2 p-1.5 rounded-lg text-white bg-black/60 hover:bg-black/80"><Scan className="w-3.5 h-3.5" /></button>}
                            </div>
                            <div className="flex-1 flex flex-col justify-between py-0.5">
                              <div>
                                <div className="flex justify-between items-start mb-1.5">
                                  <h3 className="font-medium text-slate-900 text-sm leading-snug">{resolve(item.name)}</h3>
                                  <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${ratingStyles.container}`}>
                                    <Star className={`w-3 h-3 ${ratingStyles.icon}`} /><span>{item.rating}</span>
                                  </div>
                                </div>
                                <p className="text-xs text-slate-500 line-clamp-2 mb-3">{resolve(item.description)}</p>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-base font-semibold text-slate-900">₹{getItemPrice(item, activeVariantId)}</span>
                                {isAvailable ? (qty > 0 ? (
                                  <div className="flex items-center h-8 bg-slate-900 text-white rounded-lg overflow-hidden">
                                    <button onClick={() => removeItem(item.id, activeVariantId)} className="w-8 h-full flex items-center justify-center"><Minus className="w-3.5 h-3.5" /></button>
                                    <span className="min-w-[2rem] text-center text-xs font-medium">{qty}</span>
                                    <button onClick={() => addItem(item.id, activeVariantId)} className="w-8 h-full flex items-center justify-center"><Plus className="w-3.5 h-3.5" /></button>
                                  </div>
                                ) : <button onClick={() => addItem(item.id, activeVariantId)} className="h-8 px-4 bg-slate-900 text-white text-xs font-medium rounded-lg">Add</button>
                                ) : <span className="text-xs font-semibold text-red-500">Unavailable</span>}
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
        </div>
      </div>

      {!selectedArItem && (
        <div className="fixed bottom-32 right-5 z-40 flex flex-col gap-3">
          <button onClick={handleCallWaiter} disabled={isWaiterCalled} className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all bg-white text-slate-700 border border-slate-200 ${isWaiterCalled && "opacity-50"}`}>
            {isWaiterCalled ? <Loader2 className="w-5 h-5 animate-spin" /> : <Bell className="w-5 h-5" />}
          </button>
          <button onClick={handleRequestWater} disabled={isWaterRequested} className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all bg-blue-500 text-white ${isWaterRequested && "opacity-50"}`}>
            {isWaterRequested ? <Loader2 className="w-5 h-5 animate-spin" /> : <Droplets className="w-5 h-5" />}
          </button>
        </div>
      )}

      {selectedArItem && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
          <div className="flex items-center justify-between px-4 py-3 text-white z-20">
            <div><p className="text-sm font-medium">AR View</p><p className="text-xs text-white/70">{resolve(selectedArItem.name)}</p></div>
            <button onClick={() => setSelectedArItem(null)} className="text-xs px-3 py-1.5 rounded-full bg-white/10">Close</button>
          </div>
          <div className="relative flex-1 flex flex-col overflow-hidden">
            <button onClick={() => navigateArItem("prev")} className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"><ChevronLeft size={24} /></button>
            <button onClick={() => navigateArItem("next")} className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"><ChevronRight size={24} /></button>
            {/* @ts-ignore */}
            <model-viewer key={selectedArItem.id} src={selectedArItem.arModelGlb || fallbackGlb} ios-src={selectedArItem.arModelUsdz || undefined} ar ar-modes="webxr scene-viewer quick-look" camera-controls auto-rotate shadow-intensity="1" style={{ width: "100%", height: "100%" }} />
          </div>
        </div>
      )}

      {!selectedArItem && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 p-4 pb-6">
          <div className="max-w-md mx-auto space-y-3">
            {totalItems > 0 ? (
              <div className="bg-slate-900 text-white px-5 py-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 w-9 h-9 rounded-lg flex items-center justify-center font-semibold text-sm">{totalItems}</div>
                  <div><span className="text-xs text-white/60 block">~20 mins</span><span className="font-semibold text-lg">₹{cartTotal}</span></div>
                </div>
                <button onClick={() => router.push(`/checkout?table=${tableId}`)} className="flex items-center gap-2 bg-white text-slate-900 px-5 py-2.5 rounded-lg font-medium text-sm">Checkout <ChevronRight size={16} /></button>
              </div>
            ) : existingBillTotal > 0 ? (
              <div className="bg-slate-900 text-white px-5 py-4 rounded-xl flex items-center justify-between">
                <div><span className="text-xs text-white/60 block">Current Bill</span><span className="font-semibold text-lg">₹{existingBillTotal}</span></div>
                <button onClick={() => router.push(`/checkout?table=${tableId}`)} className="flex items-center gap-2 bg-white text-slate-900 px-4 py-2.5 rounded-lg font-medium text-sm">View bill <ChevronRight size={16} /></button>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModernFoodUI;