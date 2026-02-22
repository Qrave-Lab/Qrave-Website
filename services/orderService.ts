import { api } from "@/app/lib/api";
import { resolveRestaurantIdFromTenantSlug } from "@/app/lib/tenant";

export type CartItemDTO = {
  quantity: number;
  price: number;
};

export type CartRes = {
  items: Record<string, CartItemDTO>;
  order_id?: string;
};

let orderCreationPromise: Promise<string> | null = null;

export const orderService = {
  ensureOrderId: async () => {
    if (typeof window === "undefined") {
      throw new Error("order_id is required");
    }
    const existing = localStorage.getItem("order_id");
    if (existing) return existing;

    if (orderCreationPromise) {
      return orderCreationPromise;
    }

    orderCreationPromise = (async () => {
      let sessionId = localStorage.getItem("session_id");
      if (!sessionId) {
        sessionId = await orderService.ensureSession();
      }
      if (!sessionId) {
        throw new Error("session_id is required");
      }
      const created = await api<{ order_id: string }>("/api/customer/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
        }),
        credentials: "include"
      });
      localStorage.setItem("order_id", created.order_id);
      return created.order_id;
    })().finally(() => {
      orderCreationPromise = null;
    });

    return orderCreationPromise;
  },

  ensureSession: async () => {
    if (typeof window === "undefined") return null;
    let sessionId = localStorage.getItem("session_id");
    if (sessionId) return sessionId;

    const searchParams = new URLSearchParams(window.location.search);
    const restaurantFromUrl = searchParams.get("restaurant") || searchParams.get("r");
    const tableFromQuery = searchParams.get("table");
    const tableFromPath = (() => {
      const parts = window.location.pathname.split("/").filter(Boolean);
      const idx = parts.indexOf("t");
      if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
      const menuIdx = parts.indexOf("menu");
      if (menuIdx !== -1 && parts[menuIdx + 1] === "t" && parts[menuIdx + 2]) return parts[menuIdx + 2];
      return null;
    })();

    const restaurantId =
      localStorage.getItem("restaurant_id") ||
      restaurantFromUrl ||
      (await resolveRestaurantIdFromTenantSlug()) ||
      null;
    const rawTable =
      localStorage.getItem("table_number") ||
      localStorage.getItem("table") ||
      tableFromQuery ||
      tableFromPath ||
      null;

    const nextContextKey = `${restaurantId || "na"}::${rawTable || "na"}`;
    const prevContextKey = localStorage.getItem("session_context_key");
    if (prevContextKey && prevContextKey !== nextContextKey) {
      localStorage.removeItem("session_id");
      localStorage.removeItem("order_id");
      localStorage.removeItem("cart-storage");
      sessionId = null;
    }
    localStorage.setItem("session_context_key", nextContextKey);

    if (restaurantFromUrl) {
      localStorage.setItem("restaurant_id", restaurantFromUrl);
    }
    if (rawTable) {
      localStorage.setItem("table_number", rawTable);
    }

    if (!rawTable) return null;

    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawTable);
    const normalizedTable = rawTable.trim().toLowerCase().startsWith("t")
      ? rawTable.trim().slice(1)
      : rawTable.trim();
    const tableNumber = Number.parseInt(normalizedTable, 10);

    try {
      if (!Number.isNaN(tableNumber)) {
        if (!restaurantId) return null;
        const res = await api<{ session_id: string }>(`/public/session/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            restaurant_id: restaurantId,
            table_number: tableNumber,
          }),
          credentials: "include",
        });
        sessionId = res.session_id;
        localStorage.setItem("session_id", sessionId);
        return sessionId;
      }

      if (isUUID) {
        const res = await api<{ session_id: string; restaurant_id?: string; table_number?: number }>(`/public/session/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            table_id: rawTable,
          }),
          credentials: "include",
        });
        sessionId = res.session_id;
        localStorage.setItem("session_id", sessionId);
        if (res.restaurant_id) {
          localStorage.setItem("restaurant_id", res.restaurant_id);
        }
        if (res.table_number) {
          localStorage.setItem("table_number", String(res.table_number));
        }
        return sessionId;
      }
    } catch {
      localStorage.removeItem("session_id");
    }

    return null;
  },
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
    const res = await api<CartRes>(`/api/customer/orders/cart${orderId ? `?order_id=${orderId}` : ""}`);
    if (res.order_id) {
      localStorage.setItem("order_id", res.order_id);
    }
    return res;
  },

  getOrders: () => {
    const sessionId =
      typeof window !== "undefined" ? localStorage.getItem("session_id") : null;
    if (!sessionId) {
      return Promise.resolve({ orders: [] });
    }
    const suffix = sessionId ? `?session_id=${sessionId}` : "";
    return api<{ orders: any[] }>(`/api/customer/orders${suffix}`);
  },

  async addItem(id: string, variantId: string | null, price: number): Promise<any> {
    let sessionId = await orderService.ensureSession();
    if (!sessionId && typeof window !== "undefined") {
      sessionId = localStorage.getItem("session_id");
    }
    let orderId = localStorage.getItem("order_id");

    if (!orderId) {
      orderId = await orderService.ensureOrderId();
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
      if (res.order_id) {
        localStorage.setItem("order_id", res.order_id);
      }
      return res;
    } catch (e: any) {
      if (e.message && (e.message.includes("session_id is required") || e.message.includes("session expired"))) {
        localStorage.removeItem("session_id");
        return this.addItem(id, variantId, price);
      }
      if (e.message && (e.message.includes("order not found") || e.message.includes("violates foreign key constraint"))) {
        localStorage.removeItem("order_id");
        return this.addItem(id, variantId, price);
      }
      throw e;
    }
  },

  decrementItem: async (itemId: string, variantId?: string | number) => {
    const orderId = typeof window !== "undefined" ? localStorage.getItem("order_id") : null;
    const res = await api<CartRes>(`/api/customer/orders/decrement${orderId ? `?order_id=${orderId}` : ""}`, {
      method: "POST",
      body: JSON.stringify({
        order_id: orderId,
        menu_item_id: itemId,
        variant_id: variantId || null,
      }),
    });
    if (res.order_id) {
      localStorage.setItem("order_id", res.order_id);
    }
    return res;
  },

  removeItem: async (itemId: string, variantId?: string | number) => {
    const orderId = typeof window !== "undefined" ? localStorage.getItem("order_id") : null;
    const res = await api<any>(`/api/customer/orders/remove${orderId ? `?order_id=${orderId}` : ""}`, {
      method: "POST",
      body: JSON.stringify({
        order_id: orderId,
        menu_item_id: itemId,
        variant_id: variantId || null,
      }),
    });
    if (res.order_id) {
      localStorage.setItem("order_id", res.order_id);
    }
    return res;
  },

  getTotalBreakdown: (orderId: string) => {
    return api<any>(`/api/customer/orders/breakdown?order_id=${orderId}`);
  },

  finalizeOrder: (orderId: string) => {
    return api("/api/customer/orders/finalize", {
      method: "POST",
      body: JSON.stringify({ order_id: orderId }),
    });
  },

  cancelOrder: (orderId: string) => {
    return api("/api/customer/orders/cancel", {
      method: "POST",
      body: JSON.stringify({ order_id: orderId }),
    });
  },

  cancelOrderItem: (orderId: string, itemId: string, variantId?: string | null, quantity?: number) => {
    return api("/api/customer/orders/cancel-item", {
      method: "POST",
      body: JSON.stringify({
        order_id: orderId,
        menu_item_id: itemId,
        variant_id: variantId || null,
        quantity: quantity || 1,
      }),
    });
  }
};
