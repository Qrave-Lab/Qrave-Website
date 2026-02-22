import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { orderService } from "@/services/orderService";

export const getCartKey = (id: string, variantId: string) =>
  `${id}::${variantId}`;

type CartItemDTO = {
  quantity: number;
  price: number;
};

type Cart = Record<string, CartItemDTO>;
const mutationQueueByKey = new Map<string, Promise<void>>();

const enqueueByKey = (key: string, op: () => Promise<void>) => {
  const prev = mutationQueueByKey.get(key) || Promise.resolve();
  const next = prev
    .catch(() => { })
    .then(op)
    .finally(() => {
      if (mutationQueueByKey.get(key) === next) {
        mutationQueueByKey.delete(key);
      }
    });
  mutationQueueByKey.set(key, next);
  return next;
};

export type Order = {
  id: string;
  items: {
    menu_item_id: string;
    variant_id: string;
    quantity: number;
    price: number;
  }[];
  status: string;
  createdAt: string;
};

type CartState = {
  menuCache: any[];
  setMenuCache: (menu: any[]) => void;
  orders: Order[];
  addOrder: (order: Order) => void;
  setOrders: (orders: Order[]) => void;
  cart: Cart;
  addItem: (id: string, variantId: string, price: number) => Promise<void>;
  removeItem: (id: string, variantId: string) => Promise<void>;
  decrementItem: (id: string, variantId: string) => Promise<void>;
  clearCart: () => void;
  syncCart: (items: Cart) => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      menuCache: [],
      setMenuCache: (menu) => set({ menuCache: menu }),
      orders: [],
      addOrder: (order) => set((state) => ({ orders: [...state.orders, order] })),
      setOrders: (orders) => set({ orders }),
      cart: {},

      addItem: async (id, variantId, price) => {
        const key = getCartKey(id, variantId);
        set((state) => ({
          cart: {
            ...state.cart,
            [key]: {
              quantity: (state.cart[key]?.quantity || 0) + 1,
              price,
            },
          },
        }));

        return enqueueByKey(key, async () => {
          try {
            await orderService.addItem(id, variantId, price);
          } catch (error: any) {
            set((state) => {
              const current = state.cart[key];
              if (!current) return state;
              const next = { ...state.cart };
              if (current.quantity <= 1) {
                delete next[key];
              } else {
                next[key] = { ...current, quantity: current.quantity - 1 };
              }
              return { cart: next };
            });
            if (typeof window !== "undefined") {
              const message =
                error?.message?.includes("item unavailable")
                  ? "Item is out of stock"
                  : "Update failed";
              window.dispatchEvent(new CustomEvent("cart-error", { detail: message }));
            }
          }
        });
      },

      removeItem: async (id, variantId) => {
        const key = getCartKey(id, variantId);
        const snapshot = get().cart;
        const removed = snapshot[key];

        const next = { ...snapshot };
        delete next[key];
        set({ cart: next });

        return enqueueByKey(key, async () => {
          try {
            await orderService.removeItem(id, variantId);
          } catch (error: any) {
            if (error?.message?.includes("order not found")) {
              set({ cart: {} });
              localStorage.removeItem("order_id");
            } else if (removed) {
              set((state) => ({ cart: { ...state.cart, [key]: removed } }));
            }
          }
        });
      },

      decrementItem: async (id, variantId) => {
        const key = getCartKey(id, variantId);
        const snapshot = get().cart;
        const item = snapshot[key];
        if (!item) return;

        const next = { ...snapshot };
        if (item.quantity > 1) {
          next[key] = { ...item, quantity: item.quantity - 1 };
        } else {
          delete next[key];
        }
        set({ cart: next });

        return enqueueByKey(key, async () => {
          try {
            await orderService.decrementItem(id, variantId);
          } catch (error: any) {
            if (error?.message?.includes("order not found")) {
              set({ cart: {} });
              localStorage.removeItem("order_id");
            } else {
              set((state) => {
                const current = state.cart[key];
                const restoredQty = (current?.quantity || 0) + 1;
                return {
                  cart: {
                    ...state.cart,
                    [key]: {
                      quantity: restoredQty,
                      price: item.price,
                    },
                  },
                };
              });
            }
          }
        });
      },

      clearCart: () => set({ cart: {} }),

      syncCart: (items) => set({ cart: items }),
    }),
    {
      name: "cart-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
