"use client";

import React, { useState, useEffect } from "react";
import { Search, ChevronDown, ChevronRight, UtensilsCrossed, Bell, Droplets, Loader2 } from "lucide-react";
import { useCartStore, getCartKey } from "@/stores/cartStore";
import { useRouter } from "next/navigation";
import { Toaster, toast } from "react-hot-toast";
import FoodCard from "@/app/components/menu/FoodCard";
import { orderService } from "@/services/orderService";

const resolve = (val: any): string => {
  if (!val) return "";
  if (typeof val === "object" && "String" in val) return val.String;
  return String(val);
};

const getRatingStyles = (rating: number) => {
  if (rating > 4) return { container: "bg-emerald-50 border-emerald-200 text-emerald-700", icon: "text-emerald-500 fill-emerald-500" };
  if (rating >= 2.5) return { container: "bg-amber-50 border-amber-200 text-amber-700", icon: "text-amber-400 fill-amber-400" };
  return { container: "bg-red-50 border-red-200 text-red-700", icon: "text-red-500 fill-red-500" };
};

const ModernFoodUI: React.FC<any> = ({ menuItems: initialMenu = [], tableNumber }) => {
  const [menuItems, setMenuItems] = useState(initialMenu);
  const [searchQuery, setSearchQuery] = useState("");
  const [isVegOnly, setIsVegOnly] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [selectedVariants, setSelectedVariants] = useState<Record<number, string>>({});
  const [isWaiterCalled, setIsWaiterCalled] = useState(false);
  const [isWaterRequested, setIsWaterRequested] = useState(false);
  const cart = useCartStore((state) => state.cart);
  const addItemStore = useCartStore((state) => state.addItem);
  const removeItemStore = useCartStore((state) => state.removeItem);
  const syncCart = useCartStore((state) => state.syncCart);
  const router = useRouter();

  useEffect(() => {
    async function init() {
      try {
        const menuData = await orderService.getMenu();
        let cartData = await orderService.getCart();
        if (menuData) setMenuItems(menuData);
        if (cartData?.items) syncCart(cartData.items);

        const order = localStorage.getItem("order_id");

if (order) {
  const cartData = await orderService.getCart(order);
  syncCart(cartData.items);
}
        const cats = Array.from(new Set(menuData.map((i: any) => resolve(i.categoryId)).filter(Boolean)));
        setExpandedCategories(cats.reduce((acc, c) => ({ ...acc, [c as string]: true }), {}));
      } catch (err: any) {

        toast.error(err.message || "Failed to load menu and cart");
      }
    }
    init();
  }, [syncCart]);

const handleAdd = async (id: number, vId?: string, price?: number) => {
  try {
    const res = await orderService.addItem(id, vId, price);

    if (res.order_id) {
      localStorage.setItem("order_id", res.order_id);
    }

    syncCart(res.items);
  } catch (err) {
    toast.error("Failed to add item");
  }
};


  const handleRemove = async (id: number, vId?: string) => {
    try {
      removeItemStore(id, vId);
      const res = await orderService.decrementItem(id, vId);
      if (res?.items) syncCart(res.items);
    } catch (err: any) {
      addItemStore(id, vId);
      toast.error(err.message || "Failed to remove item");
    }
  };

  const filteredItems = menuItems.filter((item) => {
    const matchesSearch = resolve(item.name).toLowerCase().includes(searchQuery.toLowerCase()) || resolve(item.description).toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch && (isVegOnly ? item.isVeg : true);
  });

  const categories = Array.from(new Set(menuItems.map((item) => resolve(item.categoryId)).filter(Boolean))).map((cat) => ({ id: cat, name: cat }));

  const normalize = (val: any) => Number(val) || 0;
  const cartTotal = Object.entries(cart).reduce((acc, [key, qty]) => {
    const [id, vId] = key.split("::");
    const item = menuItems.find((i: any) => String(i.id) === id);
    if (!item) return acc;
    const variant = item.variants?.find((v: any) => String(v.id) === vId);
    return acc + (normalize(item.price) + normalize(variant?.priceDelta)) * qty;
  }, 0);

  const totalItems = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  const tableId = resolve(tableNumber);

  return (
    <div className="min-h-screen bg-white antialiased">
      <Toaster position="top-center" />
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
          <button onClick={() => setIsVegOnly(!isVegOnly)} className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${isVegOnly ? "bg-green-600 border-green-600 text-white" : "bg-white border-slate-200 text-slate-700"}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isVegOnly ? "bg-white" : "bg-slate-400"}`} />
            <span className="text-xs font-medium">VEG</span>
          </button>
        </div>
      </div>
      <div className="max-w-md mx-auto px-5 pt-8 pb-44">
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 outline-none" placeholder="Search dishes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div className="space-y-8">
          {categories.map((category) => {
            const items = filteredItems.filter((item) => resolve(item.categoryId) === category.id);
            if (items.length === 0) return null;
            return (
              <div key={category.id}>
                <button onClick={() => setExpandedCategories((p) => ({ ...p, [category.id]: !p[category.id] }))} className="w-full flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">{category.name}</h2>
                  <ChevronDown className={`w-5 h-5 transition-transform ${expandedCategories[category.id] ? "rotate-180" : ""}`} />
                </button>
                {expandedCategories[category.id] && (
                  <div className="space-y-6">
                    {items.map((item) => {
                      const currentVId = selectedVariants[item.id] || item.variants?.[0]?.id;
                      return (
                        <FoodCard
                          key={item.id}
                          item={{ ...item, name: resolve(item.name), description: resolve(item.description), category: resolve(item.categoryId) }}
                          ratingStyles={getRatingStyles(item.rating)}
                          selectedVariantId={currentVId}
                          onVariantChange={(vId: any) => setSelectedVariants((p) => ({ ...p, [item.id]: vId }))}
                          currentQty={cart[getCartKey(item.id, currentVId)] || 0}
                          onAdd={handleAdd}
                          onRemove={handleRemove}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="fixed bottom-32 right-5 z-40 flex flex-col gap-3">
        <button onClick={() => { setIsWaiterCalled(true); toast.success("Waiter notified"); }} className="w-12 h-12 rounded-full shadow-lg bg-white border flex items-center justify-center">
          {isWaiterCalled ? <Loader2 className="animate-spin" /> : <Bell />}
        </button>
        <button onClick={() => { setIsWaterRequested(true); toast.success("Water requested"); }} className="w-12 h-12 rounded-full shadow-lg bg-blue-500 text-white flex items-center justify-center">
          {isWaterRequested ? <Loader2 className="animate-spin" /> : <Droplets />}
        </button>
      </div>
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t p-4 pb-6">
          <div className="max-w-md mx-auto">
            <button onClick={() => router.push(`/checkout?table=${tableId}`)} className="w-full bg-slate-900 text-white p-4 rounded-xl flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="bg-white/20 px-2 py-1 rounded text-sm">{totalItems}</span>
                <span className="font-semibold text-lg">₹{cartTotal}</span>
              </div>
              <span className="flex items-center gap-1">Checkout <ChevronRight size={18} /></span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModernFoodUI;
