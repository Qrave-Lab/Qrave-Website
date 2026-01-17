import { api } from "@/app/lib/api";

export const orderService = {
  getMenu: () => api("/api/customer/menu"),
  getCart: () => {
    const orderId = typeof window !== "undefined" ? localStorage.getItem("order_id") : null;
    return api(`/api/customer/orders/cart${orderId ? `?order_id=${orderId}` : ""}`);
  },
async addItem(id, variantId, price) {
  let orderId = localStorage.getItem("order_id");
  const sessionId = localStorage.getItem("session_id");

  if (!orderId) {
    const created = await api("/api/customer/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        restaurant_id: "d7e5553a-bf08-463b-a19c-114391930dc7"
      }),
      credentials: "include"
    });

    orderId = created.order_id;
    localStorage.setItem("order_id", orderId);
  }

  const res = await api("/api/customer/orders/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      order_id: orderId,
      menu_item_id: id,
      restaurant_id: "d7e5553a-bf08-463b-a19c-114391930dc7",
      variant_id: variantId || null,
      quantity: 1,
      price
    }),
    credentials: "include"
  });

  return res;
}

,

  decrementItem: (itemId: number, variantId?: string | number) => {
    const orderId = typeof window !== "undefined" ? localStorage.getItem("order_id") : null;
    return api(`/api/customer/orders/decrement${orderId ? `?order_id=${orderId}` : ""}`, {
      method: "POST",
      body: JSON.stringify({
        itemId: Number(itemId),
        variantId: variantId ? Number(variantId) : null
      }),
    });
  },
  removeItem: (itemId: number, variantId?: string | number) => {
    const orderId = typeof window !== "undefined" ? localStorage.getItem("order_id") : null;
    return api(`/api/customer/orders/remove${orderId ? `?order_id=${orderId}` : ""}`, {
      method: "POST",
      body: JSON.stringify({
        itemId: Number(itemId),
        variantId: variantId ? Number(variantId) : null
      }),
    });
  }
};
