"use client";

import React, { useState, useEffect } from "react";
import { Search, ChevronDown, ChevronRight, UtensilsCrossed, Bell, Droplets, Loader2 } from "lucide-react";
import { useCartStore, getCartKey } from "@/stores/cartStore";
import { useRouter } from "next/navigation";
import { Toaster, toast } from "react-hot-toast";
import FoodCard from "@/app/components/menu/FoodCard";
import { orderService } from "@/services/orderService";
import { api } from "@/app/lib/api";

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

const ModernFoodUI: React.FC<any> = ({ menuItems: initialMenu = [], tableNumber }) => {
  const [menuItems, setMenuItems] = useState(initialMenu);
  const [searchQuery, setSearchQuery] = useState("");
  const [isVegOnly, setIsVegOnly] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [isWaiterCalled, setIsWaiterCalled] = useState(false);
  const [isWaterRequested, setIsWaterRequested] = useState(false);
  const [showArTour, setShowArTour] = useState(false);
  const [hasArItems, setHasArItems] = useState(false);

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

  // Initialize all categories as expanded
  useEffect(() => {
    const cats = Array.from(
      new Set(menuItems.map((item: any) => getParentName(item)).filter(Boolean))
    );
    const initial: Record<string, boolean> = {};
    cats.forEach(c => initial[c as string] = true);
    setExpandedCategories(initial);
  }, [menuItems]);

  const handleAdd = async (id: string, vId?: string, price?: number) => {
    addItemStore(id, vId, price);
  };

  const handleRemove = async (id: string, vId?: string) => {
    decrementItemStore(id, vId);
  };

  const filteredItems = menuItems.filter((item: any) => {
    const query = searchQuery ? searchQuery.toLowerCase() : "";
    const matchesSearch = resolve(item.name).toLowerCase().includes(query) || resolve(item.description).toLowerCase().includes(query);
    return matchesSearch && (isVegOnly ? item.isVeg : true);
  });

  const categories = Array.from(
    new Set(menuItems.map((item: any) => getParentName(item)).filter(Boolean))
  ).map((cat) => ({ id: cat as string, name: cat as string }));

  const cartTotal = Object.entries(cart).reduce((acc, [_, item]) => acc + (item.price * item.quantity), 0);
  const totalItems = Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);
  const rawTableId = resolve(tableNumber);
  const storedTableId =
    typeof window !== "undefined"
      ? localStorage.getItem("table_number") || localStorage.getItem("table")
      : null;
  const tableId =
    rawTableId && rawTableId !== "N/A" ? rawTableId : storedTableId || "7";

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (tableId && tableId !== "N/A") {
      localStorage.setItem("table_number", tableId);
    }
  }, [tableId]);

  const normalizeItem = (item: any) => {
    const basePrice = Number(item.price || 0);
    const variants = Array.isArray(item.variants)
      ? item.variants.map((v: any) => {
          const variantPrice = Number(v.price ?? 0);
          return {
            id: String(v.id),
            name: v.name ?? v.label ?? "",
            priceDelta:
              typeof v.priceDelta === "number"
                ? v.priceDelta
                : variantPrice - basePrice,
          };
        })
      : [];

    return {
      ...item,
      id: String(item.id),
      price: basePrice,
      image: item.imageUrl || item.image,
      arModelGlb: item.modelGlb || item.arModelGlb,
      variants,
    };
  };

  useEffect(() => {
    const normalized = Array.isArray(initialMenu) ? initialMenu.map(normalizeItem) : [];
    setMenuItems(normalized);
    setHasArItems(normalized.some((i: any) => Boolean(i.arModelGlb)));
  }, [initialMenu]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem("ar_tour_seen") === "true";
    if (!seen && hasArItems) {
      setShowArTour(true);
    }
  }, [hasArItems]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] antialiased">
      <Toaster position="top-center" />

      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200/50">
        <div className="max-w-md mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-serif text-lg font-bold leading-none">NOIR.</h1>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mt-1">Table {tableId || "7"}</p>
            </div>
          </div>

          <button
            onClick={() => setIsVegOnly(!isVegOnly)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-300 active:scale-95 ${isVegOnly
              ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-100"
              : "bg-white border-slate-200 text-slate-600"
              }`}
          >
            <div className={`w-2 h-2 rounded-full ${isVegOnly ? "bg-white animate-pulse" : "bg-slate-300"}`} />
            <span className="text-[11px] font-bold">VEG</span>
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-6 pt-6 pb-44">
        {showArTour && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6">
            <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 overflow-hidden">
              <div className="px-6 pt-6 pb-4">
                <h2 className="text-lg font-black text-slate-900">AR Menu Walkthrough</h2>
                <p className="mt-2 text-sm text-slate-500">
                  See dishes on your table before you order. Here's how it works.
                </p>
              </div>
              <div className="px-6 pb-6 space-y-4 text-sm text-slate-600">
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">1</div>
                  <div>Tap the <span className="font-bold text-slate-900">AR</span> badge on any dish.</div>
                </div>
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">2</div>
                  <div>Point your camera at the table and move slowly to place the dish.</div>
                </div>
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">3</div>
                  <div>Adjust size or angle, then add to cart when you're ready.</div>
                </div>
              </div>
              <div className="px-6 pb-6">
                <button
                  onClick={() => {
                    setShowArTour(false);
                    localStorage.setItem("ar_tour_seen", "true");
                  }}
                  className="w-full rounded-2xl bg-slate-900 py-3 text-sm font-bold text-white shadow-xl transition-all active:scale-95"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="relative mb-10 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-slate-900" />
          <input
            type="text"
            className="w-full pl-11 pr-4 py-4 bg-white border border-slate-200/60 rounded-2xl text-sm shadow-sm focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all"
            placeholder="Search for delicacies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="space-y-10">
          {categories.map((category) => {
            const items = filteredItems.filter((item: any) => getParentName(item) === category.id);
            if (items.length === 0) return null;

            const subcategories = Array.from(
              new Set(items.map((item: any) => getSubcategoryName(item)))
            );
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
                    {subcategories.map((subcat) => {
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
                            {subItems.map((item: any) => {
                              const currentVId = selectedVariants[item.id] || item.variants?.[0]?.id;
                              const cartKey = getCartKey(item.id, currentVId);
                              const cartItem = cart[cartKey];
                              const quantity = cartItem ? cartItem.quantity : 0;

                              return (
                                <FoodCard
                                  key={item.id}
                                  item={{
                                    ...item,
                                    id: String(item.id),
                                    name: resolve(item.name),
                                    description: resolve(item.description),
                                    category: resolve(item.categoryName) || "General"
                                  }}
                                  ratingStyles={getRatingStyles(item.rating)}
                                  selectedVariantId={currentVId}
                                  onVariantChange={(vId: any) => setSelectedVariants((p) => ({ ...p, [item.id]: vId }))}
                                  currentQty={quantity}
                                  onAdd={handleAdd}
                                  onRemove={handleRemove}
                                  onArClick={() => { }}
                                />
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

      {/* Floating Service Actions */}
      <div className="fixed bottom-32 right-6 z-40 flex flex-col gap-4">
        <button
          onClick={async () => {
            try {
              await api("/api/customer/service-calls", {
                method: "POST",
                body: JSON.stringify({ type: "waiter" }),
              });
              setIsWaiterCalled(true);
              toast.success("Waiter notified");
            } catch {
              toast.error("Failed to call waiter");
            }
          }}
          className="w-14 h-14 rounded-2xl shadow-2xl bg-white border border-slate-100 flex items-center justify-center transition-all active:scale-90"
        >
          {isWaiterCalled ? <Loader2 className="animate-spin text-slate-900" /> : <Bell className="text-slate-600 w-6 h-6" />}
        </button>
        <button
          onClick={async () => {
            try {
              await api("/api/customer/service-calls", {
                method: "POST",
                body: JSON.stringify({ type: "water" }),
              });
              setIsWaterRequested(true);
              toast.success("Water requested");
            } catch {
              toast.error("Failed to request water");
            }
          }}
          className="w-14 h-14 rounded-2xl shadow-2xl bg-slate-900 text-white flex items-center justify-center transition-all active:scale-90"
        >
          {isWaterRequested ? <Loader2 className="animate-spin" /> : <Droplets className="w-6 h-6" />}
        </button>
      </div>

      {/* Cart Bar matched to Checkout button */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-white via-white/90 to-transparent p-6 pb-8">
          <div className="max-w-md mx-auto">
            <button
              onClick={() => router.push(`/checkout?table=${tableId}`)}
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
                  <span className="text-[10px] uppercase font-bold text-white/50 leading-none mb-1">View Cart</span>
                  <span className="font-black text-lg">₹{cartTotal}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white text-slate-900 px-4 py-2 rounded-xl font-bold text-sm">
                <span>Checkout</span>
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
