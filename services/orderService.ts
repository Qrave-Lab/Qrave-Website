import { api } from "@/app/lib/api";

export type CartItemDTO = {
  quantity: number;
  price: number;
};

export type CartRes = {
  items: Record<string, CartItemDTO>;
};

export const orderService = {
  getMenu: () => {
    const sessionId =
      typeof window !== "undefined" ? localStorage.getItem("session_id") : null;
    const suffix = sessionId ? `?session_id=${sessionId}` : "";
    return api<any[]>(`/api/customer/menu${suffix}`);
  },

  getCart: async (orderIdOverride?: string) => {
    let orderId = orderIdOverride;
    if (!orderId && typeof window !== "undefined") {
      orderId = localStorage.getItem("order_id") || undefined;
    }
    return api<CartRes>(`/api/customer/orders/cart${orderId ? `?order_id=${orderId}` : ""}`);
  },

  getOrders: () => {
    const sessionId =
      typeof window !== "undefined" ? localStorage.getItem("session_id") : null;
    const suffix = sessionId ? `?session_id=${sessionId}` : "";
    return api<{ orders: any[] }>(`/api/customer/orders${suffix}`);
  },

  async addItem(id: string, variantId: string | null, price: number): Promise<any> {
    let orderId = localStorage.getItem("order_id");
    const sessionId = localStorage.getItem("session_id");

    if (!orderId) {
      const created = await api<{ order_id: string }>("/api/customer/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
        }),
        credentials: "include"
      });

      orderId = created.order_id;
      localStorage.setItem("order_id", orderId);
    }

    try {
      const res = await api<any>("/api/customer/orders/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId,
          menu_item_id: id,
          variant_id: variantId || null,
          quantity: 1,
          price
        }),
        credentials: "include"
      });
      return res;
    } catch (e: any) {
      if (e.message && (e.message.includes("order not found") || e.message.includes("violates foreign key constraint"))) {
        localStorage.removeItem("order_id");
        return this.addItem(id, variantId, price);
      }
      throw e;
    }
  },

  decrementItem: (itemId: string, variantId?: string | number) => {
    const orderId = typeof window !== "undefined" ? localStorage.getItem("order_id") : null;
    return api<CartRes>(`/api/customer/orders/decrement${orderId ? `?order_id=${orderId}` : ""}`, {
      method: "POST",
      body: JSON.stringify({
        order_id: orderId,
        menu_item_id: itemId,
        variant_id: variantId || null,
      }),
    });
  },

  removeItem: (itemId: string, variantId?: string | number) => {
    const orderId = typeof window !== "undefined" ? localStorage.getItem("order_id") : null;
    return api(`/api/customer/orders/remove${orderId ? `?order_id=${orderId}` : ""}`, {
      method: "POST",
      body: JSON.stringify({
        order_id: orderId,
        menu_item_id: itemId,
        variant_id: variantId || null,
      }),
    });
  },

  getTotalBreakdown: (orderId: string) => {
    return api<any>(`/api/customer/orders/breakdown?order_id=${orderId}`);
  },

  finalizeOrder: (orderId: string) => {
    return api("/api/customer/orders/finalize", {
      method: "POST",
      body: JSON.stringify({ order_id: orderId }),
    });
  }
};
