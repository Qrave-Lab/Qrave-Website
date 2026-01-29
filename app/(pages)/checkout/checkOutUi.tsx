"use client";

import React, { useMemo, useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  UtensilsCrossed,
  Trash2,
  ReceiptText,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCartStore } from "@/stores/cartStore";
import { orderService } from "@/services/orderService";
import { toast } from "react-hot-toast";

const BASE_VARIANT = "__base__";

type MenuItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  image: string;
  isVeg: boolean;
  rating: number;
  variants?: { id: string; name: string; priceDelta: number }[];
};

type CartLine = {
  key: string;
  item: MenuItem;
  variantId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

const CheckoutPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tableNumber = searchParams.get("table") || "7";

  const {
    cart,
    addItem,
    decrementItem,
    clearCart,
    syncCart,
    menuCache,
    setMenuCache,
  } = useCartStore();

  const [menuItems, setMenuItems] = useState<MenuItem[]>(menuCache || []);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  useEffect(() => {
    orderService.getMenu().then((data) => {
      const mapped =
        data?.map((i: any) => ({
          ...i,
          id: String(i.id),
          image: i.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
        })) || [];
      setMenuItems(mapped);
      setMenuCache(mapped);
    });

    orderService.getCart().then((res) => {
      if (res?.items) syncCart(res.items);
    });
  }, [syncCart, setMenuCache]);

  const lines: CartLine[] = useMemo(() => {
    return Object.entries(cart)
      .map(([key, cartItem]) => {
        if (cartItem.quantity <= 0) return null;
        const [itemId, rawVariantId] = key.split("::");
        const variantId = rawVariantId || BASE_VARIANT;
        const item = menuItems.find((i) => i.id === itemId);
        if (!item) return null;

        const variant = variantId !== BASE_VARIANT
          ? item.variants?.find((v) => v.id === variantId)
          : undefined;

        const unitPrice = cartItem.price || item.price + (variant?.priceDelta || 0);

        return {
          key,
          item,
          variantId,
          quantity: cartItem.quantity,
          unitPrice,
          lineTotal: unitPrice * cartItem.quantity,
        };
      })
      .filter(Boolean) as CartLine[];
  }, [cart, menuItems]);

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const tax = Math.round(subtotal * 0.05);
  const grandTotal = subtotal + tax;

  const handlePlaceOrder = async () => {
    if (lines.length === 0 || isPlacingOrder) return;
    setIsPlacingOrder(true);

    try {
      const orderId = localStorage.getItem("order_id");
      if (!orderId) {
        toast.error("Session expired");
        return;
      }

      await orderService.finalizeOrder(orderId);
      toast.success("Order placed successfully");
      clearCart();
      localStorage.removeItem("order_id");
      router.push(`/status?order_id=${orderId}`);
    } catch {
      toast.error("Failed to place order");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-36">
      <header className="sticky top-0 z-50 w-full bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between px-6 py-4">
          <button
            onClick={() => router.back()}
            className="group flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 transition-all active:scale-90"
          >
            <ChevronLeft className="h-5 w-5 text-slate-600 group-hover:text-slate-900" />
          </button>
          <div className="text-center">
            <h1 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Checkout</h1>
            <p className="font-serif text-xl font-bold text-slate-900">NOIR.</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white shadow-lg">
            T-{tableNumber}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-6 pt-4">
        {lines.length === 0 ? (
          <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 animate-ping rounded-full bg-slate-100 opacity-75"></div>
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-xl ring-1 ring-slate-100">
                <UtensilsCrossed className="h-10 w-10 text-slate-300" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Your cart is empty</h2>
            <p className="mt-2 max-w-[240px] text-sm leading-relaxed text-slate-500">
              Your table is ready, but your plate is empty. Let's fix that!
            </p>
            <button
              onClick={() => router.push("/menu")}
              className="mt-10 flex items-center gap-2 rounded-2xl bg-slate-900 px-10 py-4 text-sm font-bold text-white shadow-2xl transition-all active:scale-95"
            >
              Browse Menu
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            <section>
              <div className="mb-4 flex items-end justify-between px-1">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Your Selection</h2>
                  <p className="text-xs font-medium text-slate-400">{lines.length} items added</p>
                </div>
                <button
                  onClick={clearCart}
                  className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold text-red-500 transition-colors hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>RESET</span>
                </button>
              </div>

              <div className="space-y-3">
                {lines.map((line) => (
                  <div
                    key={line.key}
                    className="flex gap-4 rounded-3xl border border-white bg-white/80 p-3 shadow-sm transition-all hover:shadow-md"
                  >
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                      <img
                        src={line.item.image}
                        alt={line.item.name}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="flex flex-1 flex-col justify-between py-0.5">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="line-clamp-1 text-sm font-bold text-slate-800">
                          {line.item.name}
                        </h3>
                        <span className="text-sm font-black text-slate-900">
                          ₹{line.lineTotal}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-tight text-slate-400">
                          ₹{line.unitPrice} / unit
                        </span>

                        <div className="flex items-center gap-3 rounded-full bg-slate-50 p-1 ring-1 ring-slate-200/50">
                          <button
                            onClick={() => decrementItem(line.item.id, line.variantId)}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm transition-transform active:scale-75"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-4 text-center text-xs font-bold text-slate-900">
                            {line.quantity}
                          </span>
                          <button
                            onClick={() => addItem(line.item.id, line.variantId)}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-white shadow-md transition-transform active:scale-75"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="overflow-hidden rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
              <div className="mb-4 flex items-center gap-2">
                <ReceiptText className="h-4 w-4 text-slate-400" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Bill Summary
                </h3>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-bold text-slate-700">₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Taxes (GST 5%)</span>
                  <span className="font-bold text-slate-700">₹{tax}</span>
                </div>
                <div className="border-t border-dashed border-slate-200 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-slate-900">Payable Amount</span>
                    <span className="text-xl font-black text-slate-900">₹{grandTotal}</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {lines.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-[60] bg-gradient-to-t from-white via-white/90 to-transparent p-6 pb-8">
          <div className="mx-auto flex max-w-md items-center gap-4">
            <div className="hidden flex-col sm:flex">
              <span className="text-[10px] font-bold uppercase text-slate-400">Grand Total</span>
              <span className="text-lg font-black text-slate-900">₹{grandTotal}</span>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={isPlacingOrder}
              className="relative flex h-14 flex-1 items-center justify-center overflow-hidden rounded-2xl bg-slate-900 font-bold text-white transition-all active:scale-[0.98] disabled:opacity-80"
            >
              {isPlacingOrder ? (
                <div className="flex items-center gap-3">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <span>Processing...</span>
                </div>
              ) : (
                <div className="flex w-full items-center justify-between px-6">
                  <div className="flex flex-col items-start sm:hidden">
                    <span className="text-[8px] uppercase text-white/50">Total</span>
                    <span className="text-sm">₹{grandTotal}</span>
                  </div>
                  <span className="flex-1 text-center">Place Order</span>
                  <ChevronRight className="h-5 w-5 opacity-50" />
                </div>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutPage;