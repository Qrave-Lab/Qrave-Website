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
  Loader2,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCartStore } from "@/stores/cartStore";
import { orderService } from "@/services/orderService";
import { api } from "@/app/lib/api";
import { resolveRestaurantIdFromTenantSlug } from "@/app/lib/tenant";
import { toast } from "react-hot-toast";

const BASE_VARIANT = "__base__";

type MenuItem = {
  id: string;
  name: string;
  price: number;
  image: string;
  variants?: { id: string; name: string; priceDelta: number; price?: number; label?: string }[];
};

type CartLine = {
  key: string;
  item: MenuItem;
  variantId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

type ThemeConfig = {
  preset?: "thai" | "indian" | "minimal" | "";
  font_family?: string;
  bg_image_url?: string;
  bg_overlay_opacity?: number;
  card_style?: "rounded" | "soft" | "sharp" | "";
  button_style?: "solid" | "outline" | "glass" | "";
  motif?: "thai" | "indian" | "minimal" | "custom" | "";
  ornament_level?: "off" | "subtle" | "bold" | "";
  header_style?: "classic" | "elegant" | "festival" | "";
  pattern_style?: "none" | "silk" | "mandala" | "waves" | "leaf" | "";
  section_icon?: string;
  icon_pack?: "auto" | "thai" | "indian" | "minimal" | "";
  colors?: {
    bg?: string;
    surface?: string;
    text?: string;
    muted?: string;
    accent?: string;
    accent_text?: string;
  };
};

const DEFAULT_THEME: ThemeConfig = {
  preset: "",
  font_family: "'Inter','Segoe UI',sans-serif",
  bg_image_url: "",
  bg_overlay_opacity: 0.92,
  card_style: "rounded",
  button_style: "solid",
  motif: "minimal",
  ornament_level: "off",
  header_style: "classic",
  pattern_style: "none",
  section_icon: "•",
  icon_pack: "auto",
  colors: {
    bg: "#F8FAFC",
    surface: "#FFFFFF",
    text: "#0F172A",
    muted: "#64748B",
    accent: "#0F172A",
    accent_text: "#FFFFFF",
  },
};

const mergeTheme = (raw?: ThemeConfig | null): ThemeConfig => ({
  ...DEFAULT_THEME,
  ...(raw || {}),
  bg_overlay_opacity: Math.min(0.98, Math.max(0.7, Number(raw?.bg_overlay_opacity ?? DEFAULT_THEME.bg_overlay_opacity))),
  colors: {
    ...(DEFAULT_THEME.colors || {}),
    ...(raw?.colors || {}),
  },
});

const CheckoutPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTable = searchParams.get("table");
  const tableNumber =
    rawTable && rawTable !== "N/A"
      ? rawTable
      : typeof window !== "undefined"
        ? localStorage.getItem("table_number") ||
        localStorage.getItem("table") ||
        "7"
        : "7";

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (tableNumber && tableNumber !== "N/A") {
      localStorage.setItem("table_number", tableNumber);
    }
  }, [tableNumber]);

  const [isMounted, setIsMounted] = useState(false);
  const [isCartReady, setIsCartReady] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [isSyncingAfterPlace, setIsSyncingAfterPlace] = useState(false);
  const [isWaitingConfirmation, setIsWaitingConfirmation] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [isSeparateBill, setIsSeparateBill] = useState(false);
  const [isTableOccupied, setIsTableOccupied] = useState(false);
  const [myOrderIds, setMyOrderIds] = useState<Set<string>>(new Set());
  const [restaurantName, setRestaurantName] = useState("Restaurant");
  const [restaurantLogoUrl, setRestaurantLogoUrl] = useState("");
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(() => {
    if (typeof window === "undefined") return DEFAULT_THEME;
    try {
      const cached = localStorage.getItem("menu_theme_config");
      return cached ? mergeTheme(JSON.parse(cached)) : DEFAULT_THEME;
    } catch {
      return DEFAULT_THEME;
    }
  });

  const {
    cart,
    addItem,
    decrementItem,
    clearCart,
    syncCart,
    menuCache,
    setMenuCache,
    orders,
    setOrders,
  } = useCartStore();

  const [menuItems, setMenuItems] = useState<MenuItem[]>(menuCache || []);

  useEffect(() => {
    setIsMounted(true);
    setIsSeparateBill(localStorage.getItem("separate_bill") === "1");
    setIsTableOccupied(localStorage.getItem("table_occupied") === "1");
    try {
      const stored = JSON.parse(localStorage.getItem("my_order_ids") || "[]");
      if (Array.isArray(stored)) setMyOrderIds(new Set(stored));
    } catch { /* ignore */ }

    const ensureSession = async () => {
      if (typeof window === "undefined") return null;
      let session = localStorage.getItem("session_id");
      if (session) return session;

      const restaurantId =
        localStorage.getItem("restaurant_id") ||
        (await resolveRestaurantIdFromTenantSlug());
      const rawTable =
        tableNumber && tableNumber !== "N/A"
          ? tableNumber
          : localStorage.getItem("table_number") || localStorage.getItem("table");

      if (!rawTable) return null;

      const isUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawTable);
      const normalizedTable = rawTable.trim().toLowerCase().startsWith("t") ? rawTable.trim().slice(1) : rawTable.trim();
      const tableNumberParsed = Number.parseInt(normalizedTable, 10);

      try {
        if (!Number.isNaN(tableNumberParsed)) {
          if (!restaurantId) return null;
          const res = await api<{ session_id: string }>("/public/session/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              restaurant_id: restaurantId,
              table_number: tableNumberParsed,
            }),
            credentials: "include",
          });
          localStorage.setItem("session_id", res.session_id);
          return res.session_id;
        }

        if (isUUID) {
          const res = await api<{ session_id: string; restaurant_id?: string; table_number?: number }>("/public/session/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              table_id: rawTable,
            }),
            credentials: "include",
          });
          localStorage.setItem("session_id", res.session_id);
          if (res.restaurant_id) {
            localStorage.setItem("restaurant_id", res.restaurant_id);
          }
          if (res.table_number) {
            localStorage.setItem("table_number", String(res.table_number));
          }
          return res.session_id;
        }
      } catch (e) {
        localStorage.removeItem("session_id");
      }

      return null;
    };

    const load = async () => {
      if (typeof window !== "undefined") {
        setCurrentOrderId(localStorage.getItem("order_id"));
      }

      await ensureSession();

      Promise.all([
        orderService.getMenu(),
        orderService.getCart(),
        orderService.getOrders(),
      ])
        .then(([menu, cartRes, ordersRes]) => {
          const mapped =
            menu?.map((i: any) => {
              const basePrice = Number(i.price || 0);
              const variants = Array.isArray(i.variants)
                ? i.variants.map((v: any) => {
                  const variantPrice = Number(v.price ?? 0);
                  return {
                    id: String(v.id),
                    name: v.name ?? v.label ?? "",
                    label: v.label,
                    price: variantPrice,
                    priceDelta:
                      typeof v.priceDelta === "number"
                        ? v.priceDelta
                        : variantPrice - basePrice,
                  };
                })
                : [];

              return {
                ...i,
                id: String(i.id),
                price: basePrice,
                variants,
                image:
                  i.image ||
                  i.imageUrl ||
                  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
              };
            }) || [];

          setMenuItems(mapped);
          setMenuCache(mapped);

          if (cartRes?.items) {
            syncCart(cartRes.items);
          }
          if (ordersRes?.orders) {
            setOrders(ordersRes.orders);
          }
        })
        .finally(() => {
          setIsCartReady(true);
        });
    };

    load();
  }, [syncCart, setMenuCache, setOrders]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const id = localStorage.getItem("order_id");
      setCurrentOrderId(id);
    }
  }, [cart]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;

    const storedName = localStorage.getItem("restaurant_name");
    if (storedName) {
      setRestaurantName(storedName);
    }

    const loadBranding = async () => {
      try {
        const me = await api<{
          restaurant?: string;
          logo_url?: string | null;
          logo_version?: number | null;
          theme_config?: ThemeConfig;
        }>("/api/admin/me", { skipAuthRedirect: true });
        if (cancelled) return;
        const name = me?.restaurant?.trim();
        if (name) {
          setRestaurantName(name);
          localStorage.setItem("restaurant_name", name);
        }
        if (me?.theme_config) {
          const merged = mergeTheme(me.theme_config);
          setThemeConfig(merged);
          localStorage.setItem("menu_theme_config", JSON.stringify(merged));
        }
        if (me?.logo_url) {
          const suffix = me?.logo_version ? `?v=${me.logo_version}` : "";
          setRestaurantLogoUrl(`${me.logo_url}${suffix}`);
          return;
        }
      } catch {
        if (cancelled) return;
      }

      const rid = localStorage.getItem("restaurant_id");
      if (!rid || cancelled) return;

      try {
        const logo = await api<{ logo_url?: string | null }>(`/public/restaurants/${rid}/logo`);
        if (cancelled) return;
        if (logo?.logo_url) {
          setRestaurantLogoUrl(logo.logo_url);
        }
      } catch {
        // keep checkout header usable with text fallback
      }
      try {
        const theme = await api<{ theme_config?: ThemeConfig }>(`/public/restaurants/${rid}/theme`, {
          skipAuthRedirect: true,
          suppressErrorLog: true,
        });
        if (cancelled) return;
        if (theme?.theme_config) {
          const merged = mergeTheme(theme.theme_config);
          setThemeConfig(merged);
          localStorage.setItem("menu_theme_config", JSON.stringify(merged));
        }
      } catch {
        // theme is optional
      }
    };

    loadBranding();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeTheme = useMemo(() => mergeTheme(themeConfig), [themeConfig]);
  const themedSurfaceStyle: React.CSSProperties = {
    background: "var(--co-surface)",
    borderColor: "color-mix(in srgb, var(--co-muted) 20%, transparent)",
  };
  const themedAppStyle: React.CSSProperties = {
    ["--co-bg" as string]: activeTheme.colors?.bg || "#F8FAFC",
    ["--co-surface" as string]: activeTheme.colors?.surface || "#FFFFFF",
    ["--co-text" as string]: activeTheme.colors?.text || "#0F172A",
    ["--co-muted" as string]: activeTheme.colors?.muted || "#64748B",
    ["--co-accent" as string]: activeTheme.colors?.accent || "#0F172A",
    ["--co-accent-text" as string]: activeTheme.colors?.accent_text || "#FFFFFF",
    ["--co-font" as string]: activeTheme.font_family || "'Inter','Segoe UI',sans-serif",
    backgroundColor: "var(--co-bg)",
    color: "var(--co-text)",
    fontFamily: "var(--co-font)",
    backgroundImage: activeTheme.bg_image_url
      ? `linear-gradient(rgba(255,255,255,${activeTheme.bg_overlay_opacity ?? 0.92}), rgba(255,255,255,${activeTheme.bg_overlay_opacity ?? 0.92})), url('${activeTheme.bg_image_url}')`
      : "none",
    backgroundSize: "cover",
    backgroundAttachment: "fixed",
  };

  const lines: CartLine[] = useMemo(() => {
    if (!isMounted || !isCartReady) return [];

    return Object.entries(cart)
      .map(([key, cartItem]) => {
        if (cartItem.quantity <= 0) return null;

        const [itemId, rawVariantId] = key.split("::");
        const normalizedVariantId =
          rawVariantId && rawVariantId !== "00000000-0000-0000-0000-000000000000"
            ? rawVariantId
            : BASE_VARIANT;

        const item = menuItems.find((i) => i.id === itemId);
        if (!item) return null;

        const variant =
          normalizedVariantId !== BASE_VARIANT
            ? item.variants?.find((v) => v.id === normalizedVariantId)
            : undefined;

        const unitPrice =
          cartItem.price ||
          (variant?.price ?? item.price + (variant?.priceDelta || 0));

        return {
          key,
          item,
          variantId: rawVariantId || "",
          quantity: cartItem.quantity,
          unitPrice,
          lineTotal: unitPrice * cartItem.quantity,
        };
      })
      .filter(Boolean) as CartLine[];
  }, [cart, menuItems, isMounted, isCartReady]);

  if (!isMounted || !isCartReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-slate-300 mx-auto mb-4" />
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Loading cart…
          </p>
        </div>
      </div>
    );
  }

  const allPlacedOrders = orders.filter(
    (o) =>
      o.id !== currentOrderId &&
      o.status !== "cart" &&
      Array.isArray(o.items) &&
      o.items.length > 0
  );

  const placedOrders = isSeparateBill
    ? allPlacedOrders.filter((o) => myOrderIds.has(o.id))
    : allPlacedOrders;

  const cartSubtotal = lines.reduce((s, l) => s + l.lineTotal, 0);

  const previousOrdersTotal = placedOrders.reduce((acc, order) => {
    return acc + order.items.reduce((s, i) => s + (i.price * i.quantity), 0);
  }, 0);

  const subtotal = cartSubtotal + previousOrdersTotal;
  const tax = Math.round(subtotal * 0.05);
  const grandTotal = subtotal + tax;

  const handlePlaceOrder = async () => {
    if (lines.length === 0 || isPlacingOrder) return;
    setIsPlacingOrder(true);
    setIsSyncingAfterPlace(false);

    try {
      const orderId = localStorage.getItem("order_id");
      if (!orderId) {
        toast.error("Session expired");
        return;
      }
      await orderService.finalizeOrder(orderId);
      toast.success("Order placed!");

      const prevIds: string[] = JSON.parse(localStorage.getItem("my_order_ids") || "[]");
      if (!prevIds.includes(orderId)) prevIds.push(orderId);
      localStorage.setItem("my_order_ids", JSON.stringify(prevIds));
      setMyOrderIds(new Set(prevIds));
      setIsSyncingAfterPlace(true);
      const res = await orderService.getOrders();
      if (res?.orders) {
        setOrders(res.orders);
      }
      localStorage.removeItem("order_id");
      clearCart();
      setCurrentOrderId(null);
    } catch {
      toast.error("Failed to place order");
    } finally {
      setIsSyncingAfterPlace(false);
      setIsPlacingOrder(false);
    }
  };

  const reloadOrders = async () => {
    const res = await orderService.getOrders();
    if (res?.orders) setOrders(res.orders);
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      await orderService.cancelOrder(orderId);
      toast.success("Order cancelled");
      await reloadOrders();
    } catch {
      toast.error("Unable to cancel order");
    }
  };

  const handleCancelOrderItem = async (orderId: string, itemId: string, variantId: string) => {
    try {
      await orderService.cancelOrderItem(orderId, itemId, variantId || null, 1);
      toast.success("Item cancelled");
      await reloadOrders();
    } catch {
      toast.error("Unable to cancel item");
    }
  };

  const currentCartHasItems = lines.length > 0;
  const hasPlacedOrders = placedOrders.length > 0;

  return (
    <div className="min-h-screen pb-36" style={themedAppStyle}>
      <header
        className="sticky top-0 z-50 w-full backdrop-blur-md"
        style={{ background: "color-mix(in srgb, var(--co-surface) 82%, transparent)" }}
      >
        <div className="mx-auto flex max-w-lg items-center justify-between px-6 py-4">
          <button
            onClick={() => router.back()}
            className="group flex h-10 w-10 items-center justify-center rounded-full shadow-sm ring-1 transition-all active:scale-90"
            style={themedSurfaceStyle}
          >
            <ChevronLeft className="h-5 w-5 group-hover:opacity-80" style={{ color: "var(--co-text)" }} />
          </button>
          <div className="text-center">
            <h1 className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: "var(--co-muted)" }}>
              Checkout
            </h1>
            <div className="mt-1 flex items-center justify-center gap-2">
              <div className="h-6 w-6 rounded-md overflow-hidden border shrink-0" style={themedSurfaceStyle}>
                {restaurantLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={restaurantLogoUrl} alt={`${restaurantName} logo`} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center">
                    {(restaurantName || "R").trim().slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <p className="font-serif text-xl font-bold" style={{ color: "var(--co-text)" }}>
                {restaurantName}
              </p>
            </div>
          </div>
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full text-[10px] font-bold shadow-lg"
            style={{ background: "var(--co-accent)", color: "var(--co-accent-text)" }}
          >
            T-{tableNumber}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-6 pt-4">
        {!currentCartHasItems && !hasPlacedOrders && !isSyncingAfterPlace ? (
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
            {hasPlacedOrders && (
              <section>
                <div className="mb-4 flex items-end justify-between px-1">
                  <h2 className="text-xl font-bold text-slate-900">Previous Orders</h2>
                </div>
                <div className="space-y-3">
                  {placedOrders.map((order) => (
                    <div key={order.id} className="rounded-3xl border p-4 shadow-sm" style={themedSurfaceStyle}>
                      <div
                        className="mb-3 flex items-center justify-between border-b border-dashed pb-2"
                        style={{ borderColor: "color-mix(in srgb, var(--co-muted) 25%, transparent)" }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            Order #{order.id.slice(0, 4)}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-widest ${order.status === "accepted" ? "text-green-500" : ""}`}
                            style={order.status !== "accepted" ? { color: "var(--co-muted)" } : undefined}
                          >
                            {order.status}
                          </span>
                        </div>
                        {order.status === "pending" && (
                          <button
                            onClick={() => handleCancelOrder(order.id)}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-rose-700"
                          >
                            Cancel Order
                          </button>
                        )}
                      </div>
                      <div className="space-y-2">
                        {order.items.map((item, idx) => {
                          const menuItem = menuItems.find((m) => m.id === item.menu_item_id);
                          const variant = menuItem?.variants?.find((v) => v.id === item.variant_id);
                          const variantLabel = variant?.name || variant?.label;
                          const name = menuItem
                            ? variantLabel
                              ? `${menuItem.name} (${variantLabel})`
                              : menuItem.name
                            : "Unknown Item";

                          return (
                            <div key={`${order.id}-${idx}`} className="flex justify-between text-sm">
                              <span className="text-slate-600">
                                <span className="font-bold text-slate-900">{item.quantity}x</span> {name}
                                {order.status === "pending" && (
                                  <button
                                    onClick={() => handleCancelOrderItem(order.id, item.menu_item_id, item.variant_id)}
                                    className="ml-2 text-[10px] font-bold uppercase tracking-widest text-rose-600 hover:underline"
                                  >
                                    Cancel 1
                                  </button>
                                )}
                              </span>
                              <span className="font-bold text-slate-900">₹{item.price * item.quantity}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {currentCartHasItems && (
              <section>
                <div className="mb-4 flex items-end justify-between px-1">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Your Selection</h2>
                    <p className="text-xs font-medium text-slate-400">{lines.length} items added</p>
                  </div>
                  {!isWaitingConfirmation && (
                    <button
                      onClick={clearCart}
                      className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold text-red-500 transition-colors hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>RESET</span>
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {lines.map((line) => (
                    <div key={line.key} className="flex gap-4 rounded-3xl border p-3 shadow-sm transition-all hover:shadow-md" style={themedSurfaceStyle}>
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

                          {!isWaitingConfirmation && (
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
                                onClick={() => addItem(line.item.id, line.variantId, line.unitPrice)}
                                className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-white shadow-md transition-transform active:scale-75"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="overflow-hidden rounded-3xl p-6 shadow-sm ring-1" style={themedSurfaceStyle}>
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

      {(currentCartHasItems || hasPlacedOrders) && (
        <div
          className="fixed bottom-0 left-0 right-0 z-[60] p-6 pb-8"
          style={{ background: "linear-gradient(to top, var(--co-surface), color-mix(in srgb, var(--co-surface) 90%, transparent), transparent)" }}
        >
          <div className="mx-auto flex max-w-md items-center gap-4">
            <div className="hidden flex-col sm:flex">
              <span className="text-[10px] font-bold uppercase text-slate-400">Grand Total</span>
              <span className="text-lg font-black text-slate-900">₹{grandTotal}</span>
            </div>

            {!currentCartHasItems && hasPlacedOrders ? (
              <div className="flex flex-1 gap-3">
                <button
                  onClick={() => router.push("/menu")}
                  className="flex-1 rounded-2xl py-4 text-sm font-bold shadow-xl ring-1 transition-all active:scale-95"
                  style={themedSurfaceStyle}
                >
                  Add More Items
                </button>
                <button
                  onClick={() => toast.success("Bill Requested!")}
                  className="flex-1 rounded-2xl py-4 text-sm font-bold shadow-xl transition-all active:scale-95"
                  style={{ background: "var(--co-accent)", color: "var(--co-accent-text)" }}
                >
                  Get Bill
                </button>
              </div>
            ) : (
              <button
                onClick={handlePlaceOrder}
                disabled={isPlacingOrder || isWaitingConfirmation}
                className={`relative flex h-14 flex-1 items-center justify-center overflow-hidden rounded-2xl font-bold text-white transition-all active:scale-[0.98] ${isWaitingConfirmation ? "bg-amber-500 shadow-amber-200 shadow-lg" : "bg-slate-900 disabled:opacity-80 shadow-2xl"
                  }`}
                style={!isWaitingConfirmation ? { background: "var(--co-accent)", color: "var(--co-accent-text)" } : undefined}
              >
                {isWaitingConfirmation ? (
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Waiting for confirmation...</span>
                  </div>
                ) : isPlacingOrder || isSyncingAfterPlace ? (
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{isSyncingAfterPlace ? "Updating orders..." : "Processing..."}</span>
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
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutPage;
