"use client";

import React, { useMemo, useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  UtensilsCrossed,
  Trash2,
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
    removeItem,
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
          image:
            i.image ||
            "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
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

        const variant =
          variantId !== BASE_VARIANT
            ? item.variants?.find((v) => v.id === variantId)
            : undefined;

        const unitPrice =
          cartItem.price ||
          item.price + (variant?.priceDelta || 0);

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
      if (!orderId) return;

      await orderService.finalizeOrder(orderId);
      toast.success("Order placed");
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
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 bg-white border-b">
        <div className="max-w-md mx-auto px-4 py-3 flex justify-between">
          <button onClick={() => router.back()} className="flex gap-1">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <div className="text-right">
            <p className="font-bold">NOIR.</p>
            <p className="text-xs text-slate-500">Table #{tableNumber}</p>
          </div>
        </div>
      </div>

      <main className="max-w-md mx-auto px-4 pt-4 pb-32">
        {lines.length === 0 ? (
          <div className="text-center py-24">
            <UtensilsCrossed className="mx-auto mb-4" />
            <p>Your cart is empty</p>
          </div>
        ) : (
          <>
            <section className="bg-white p-4 rounded-xl border mb-4">
              <div className="flex justify-between mb-3">
                <p className="font-semibold">Order Items</p>
                <button
                  onClick={clearCart}
                  className="text-xs text-red-600 flex gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              </div>

              {lines.map((line) => (
                <div
                  key={line.key}
                  className="flex gap-3 p-3 border rounded-lg mb-2"
                >
                  <img
                    src={line.item.image}
                    className="w-16 h-16 rounded"
                  />
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <p className="font-semibold">
                        {line.item.name}
                      </p>
                      <p className="font-bold">
                        ₹{line.lineTotal}
                      </p>
                    </div>

                    <div className="flex items-center bg-slate-900 text-white rounded-full w-fit mt-2">
                      <button
                        onClick={() =>
                          decrementItem(
                            line.item.id,
                            line.variantId
                          )
                        }
                        className="w-8 h-8"
                      >
                        <Minus className="w-3 mx-auto" />
                      </button>
                      <span className="px-3">
                        {line.quantity}
                      </span>
                      <button
                        onClick={() =>
                          addItem(
                            line.item.id,
                            line.variantId
                          )
                        }
                        className="w-8 h-8"
                      >
                        <Plus className="w-3 mx-auto" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </section>

            <section className="bg-white p-4 rounded-xl border">
              <div className="flex justify-between">
                <span>Total</span>
                <span className="font-bold">₹{grandTotal}</span>
              </div>
            </section>
          </>
        )}
      </main>

      {lines.length > 0 && (
        <div className="fixed bottom-0 w-full bg-white border-t p-4">
          <div className="max-w-md mx-auto flex justify-between">
            <p className="font-bold">₹{grandTotal}</p>
            <button
              onClick={handlePlaceOrder}
              className="bg-slate-900 text-white px-6 py-2 rounded-lg"
            >
              Place Order
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutPage;
