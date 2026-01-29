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

export type Order = {
  id: string;
  items: CartItemDTO[];
  status: string;
  total: number;
  createdAt: string;
};

type CartState = {
  menuCache: any[];
  setMenuCache: (menu: any[]) => void;
  orders: Order[];
  addOrder: (order: Order) => void;
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
      cart: {},

      addItem: async (id, variantId, price) => {
        const key = getCartKey(id, variantId);
        const snapshot = get().cart;

        set({
          cart: {
            ...snapshot,
            [key]: {
              quantity: (snapshot[key]?.quantity || 0) + 1,
              price,
            },
          },
        });

        try {
          const res = await orderService.addItem(id, variantId, price);
          if (res?.items) set({ cart: res.items });
        } catch {
          set({ cart: snapshot });
        }
      },

      removeItem: async (id, variantId) => {
        const key = getCartKey(id, variantId);
        const snapshot = get().cart;

        const next = { ...snapshot };
        delete next[key];
        set({ cart: next });

        try {
          await orderService.removeItem(id, variantId);
        } catch {
          set({ cart: snapshot });
        }
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

        try {
          await orderService.decrementItem(id, variantId);
        } catch {
          set({ cart: snapshot });
        }
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
