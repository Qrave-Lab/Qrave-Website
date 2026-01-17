import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const getCartKey = (id: number, variantId?: string) =>
  `${id}::${variantId || "default"}`;

type Cart = Record<string, number>;

export type OrderItem = {
  itemId: number;
  name: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type OrderStatus = "preparing" | "completed" | "served";

export type Order = {
  id: string;
  tableNumber: string;
  note: string;
  paymentMethod: string;
  subtotal: number;
  cgst: number;
  sgst: number;
  tax: number;
  serviceCharge: number;
  total: number;
  items: OrderItem[];
  createdAt: string;
  status: OrderStatus;
};

type CartState = {
  cart: Cart;
  addItem: (id: number, variantId?: string) => void;
  removeItem: (id: number, variantId?: string) => void;
  clearCart: () => void;
  syncCart: (items: Cart) => void;
  orders: Record<string, Order>;
  activeOrderId?: string;
  addOrder: (order: Order) => void;
  setActiveOrder: (orderId?: string) => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      cart: {},
      addItem: (id: number, variantId?: string) =>
        set((state) => {
          const key = getCartKey(id, variantId);
          const prev = state.cart[key] || 0;
          return {
            cart: {
              ...state.cart,
              [key]: prev + 1,
            },
          };
        }),
      removeItem: (id: number, variantId?: string) =>
        set((state) => {
          const key = getCartKey(id, variantId);
          const prev = state.cart[key] || 0;
          if (prev <= 1) {
            const { [key]: _, ...rest } = state.cart;
            return { cart: rest };
          }
          return {
            cart: {
              ...state.cart,
              [key]: prev - 1,
            },
          };
        }),
      clearCart: () => set({ cart: {} }),
      syncCart: (items: Cart) => set({ cart: items || {} }),
      orders: {},
      activeOrderId: undefined,
      addOrder: (order: Order) =>
        set((state) => ({
          orders: {
            ...state.orders,
            [order.id]: order,
          },
          activeOrderId: order.id,
        })),
      setActiveOrder: (orderId?: string) =>
        set({
          activeOrderId: orderId,
        }),
    }),
    {
      name: "cart-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
