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
  offerPrice?: number;
  offerLabel?: string;
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

type RecommendationItem = {
  id: string;
  name?: string;
  price?: number;
  image_url?: string;
  reason?: string;
};

type AvailableCoupon = {
  id: string;
  name: string;
  coupon_code: string;
  discount_type: "percent" | "flat";
  discount_value: number;
  min_order_value?: number;
  description?: string;
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

// Unwraps Go NullStr objects ({ String: "...", Valid: true }) that the backend
// sends for nullable string fields. Without this, `item.imageUrl` is a truthy
// object but NOT a valid URL string, so images never render.
const resolve = (val: any): string => {
  if (!val) return "";
  if (typeof val === "object" && "String" in val) return val.String;
  return String(val);
};

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
  const [couponCode, setCouponCode] = useState("");
  const [appliedCouponDiscount, setAppliedCouponDiscount] = useState(0);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [couponDrawerOpen, setCouponDrawerOpen] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<AvailableCoupon[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [myOrderIds, setMyOrderIds] = useState<Set<string>>(new Set());
  const [restaurantName, setRestaurantName] = useState("Restaurant");
  const [restaurantLogoUrl, setRestaurantLogoUrl] = useState("");
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
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
        api<{ popular_with_this?: RecommendationItem[]; margin_aware?: RecommendationItem[] }>("/api/customer/recommendations", { method: "GET" }),
      ])
        .then(([menu, cartRes, ordersRes, recoRes]) => {
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
                offerPrice:
                  typeof i.offerPrice === "number"
                    ? Number(i.offerPrice)
                    : typeof i.offer_price === "number"
                      ? Number(i.offer_price)
                      : undefined,
                offerLabel: i.offerLabel || i.offer_label,
                variants,
                // backend sends imageUrl as a NullStr {String,Valid} object — must use resolve()
                image:
                  resolve(i.imageUrl) ||
                  resolve(i.image) ||
                  "",
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
          const recos = [
            ...(recoRes?.popular_with_this || []),
            ...(recoRes?.margin_aware || []),
          ];
          // Preserve full recommendation data (id + image_url + name + price) — don't strip to just {id}
          const seen = new Set<string>();
          const unique = recos.filter((r) => {
            if (seen.has(String(r.id))) return false;
            seen.add(String(r.id));
            return true;
          }).slice(0, 4);
          setRecommendations(unique);
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
    setAppliedCouponDiscount(0);
    setCouponCode("");
  }, [currentOrderId]);

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
          (variant?.price ??
            ((typeof item.offerPrice === "number" ? item.offerPrice : item.price) +
              (variant?.priceDelta || 0)));

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
  const couponDiscount = Math.min(appliedCouponDiscount, cartSubtotal);
  const subtotalAfterDiscount = Math.max(0, subtotal - couponDiscount);
  const tax = Math.round(subtotalAfterDiscount * 0.05);
  const grandTotal = subtotalAfterDiscount + tax;

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
      setAppliedCouponDiscount(0);
      setCouponCode("");
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

  const handleApplyCoupon = async (explicitCode?: string) => {
    if (!currentOrderId) {
      toast.error("No active cart order");
      return;
    }
    const code = (explicitCode || couponCode).trim().toUpperCase();
    if (!code) {
      toast.error("Enter a coupon code");
      return;
    }
    setIsApplyingCoupon(true);
    try {
      const res = await orderService.applyCoupon(currentOrderId, code);
      setAppliedCouponDiscount(Number(res?.discount || 0));
      setCouponCode(code);
      toast.success("Coupon applied!");
    } catch (e: any) {
      toast.error(e?.message || "Invalid coupon");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const currentCartHasItems = lines.length > 0;
  const hasPlacedOrders = placedOrders.length > 0;
  // Merge reco data with menuItems (reco has image_url/name/price from backend)
  const recommendationItems = recommendations.map((rec) => {
    const cached = menuItems.find((m) => m.id === String(rec.id));
    return {
      id: String(rec.id),
      name: cached?.name || rec.name || "Item",
      price: cached?.price ?? rec.price ?? 0,
      offerPrice: cached?.offerPrice,
      image: cached?.image || rec.image_url || "",
    };
  }).filter((r) => r.price > 0);

  return (
    <div className="min-h-screen pb-40" style={themedAppStyle}>
      {/* ── Glassy Header ────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 w-full border-b"
        style={{
          background: "color-mix(in srgb, var(--co-surface) 80%, transparent)",
          borderColor: "color-mix(in srgb, var(--co-muted) 12%, transparent)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div className="mx-auto flex max-w-lg items-center justify-between px-5 py-3.5">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full transition-all active:scale-90"
            style={{ background: "color-mix(in srgb, var(--co-muted) 12%, transparent)" }}
          >
            <ChevronLeft className="h-4 w-4" style={{ color: "var(--co-text)" }} />
          </button>

          <div className="flex items-center gap-2.5">
            {restaurantLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={restaurantLogoUrl} alt="logo" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <div className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-black" style={{ background: "var(--co-accent)", color: "var(--co-accent-text)" }}>
                {(restaurantName || "R").slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-xs font-black leading-none" style={{ color: "var(--co-text)" }}>{restaurantName}</p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--co-muted)" }}>Table {tableNumber}</p>
            </div>
          </div>

          <div
            className="rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-widest"
            style={{ background: "color-mix(in srgb, var(--co-accent) 12%, transparent)", color: "var(--co-accent)" }}
          >
            Checkout
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-5 pt-5">
        {!currentCartHasItems && !hasPlacedOrders && !isSyncingAfterPlace ? (
          /* ── Empty State ──────────────────────────────────────────── */
          <div className="flex min-h-[65vh] flex-col items-center justify-center text-center gap-6">
            <div className="relative">
              <div className="h-32 w-32 rounded-full flex items-center justify-center" style={{ background: "color-mix(in srgb, var(--co-accent) 8%, transparent)" }}>
                <UtensilsCrossed className="h-14 w-14" style={{ color: "color-mix(in srgb, var(--co-accent) 40%, transparent)" }} />
              </div>
              <div className="absolute -bottom-2 -right-2 text-3xl">🍽️</div>
            </div>
            <div>
              <h2 className="text-2xl font-black" style={{ color: "var(--co-text)" }}>Your cart is empty</h2>
              <p className="mt-2 text-sm leading-relaxed max-w-[220px] mx-auto" style={{ color: "var(--co-muted)" }}>
                Your table is set. Pick something delicious!
              </p>
            </div>
            <button
              onClick={() => router.push("/menu")}
              className="rounded-2xl px-10 py-4 text-sm font-bold shadow-xl transition-all active:scale-95"
              style={{ background: "var(--co-accent)", color: "var(--co-accent-text)" }}
            >
              Browse Menu →
            </button>
          </div>
        ) : (
          <div className="space-y-6">

            {/* ── Previous Orders ─────────────────────────────────────── */}
            {hasPlacedOrders && (
              <section>
                <p className="mb-3 text-[10px] font-black uppercase tracking-widest px-1" style={{ color: "var(--co-muted)" }}>
                  Previous Orders
                </p>
                <div className="space-y-3">
                  {placedOrders.map((order) => (
                    <div key={order.id} className="rounded-2xl border overflow-hidden" style={themedSurfaceStyle}>
                      <div
                        className="flex items-center justify-between px-4 py-2.5"
                        style={{ background: "color-mix(in srgb, var(--co-muted) 6%, transparent)", borderBottom: "1px solid color-mix(in srgb, var(--co-muted) 12%, transparent)" }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--co-muted)" }}>#{order.id.slice(0, 6).toUpperCase()}</span>
                          <span
                            className="rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider"
                            style={{
                              background: order.status === "accepted" || order.status === "served" ? "rgba(16,185,129,0.12)" : "color-mix(in srgb, var(--co-muted) 10%, transparent)",
                              color: order.status === "accepted" || order.status === "served" ? "#059669" : "var(--co-muted)",
                            }}
                          >
                            {order.status}
                          </span>
                        </div>
                        {order.status === "pending" && (
                          <button onClick={() => handleCancelOrder(order.id)} className="rounded-lg px-2.5 py-1 text-[10px] font-bold text-rose-600" style={{ background: "rgba(239,68,68,0.08)" }}>
                            Cancel
                          </button>
                        )}
                      </div>
                      <div className="px-4 py-3 space-y-2">
                        {order.items.map((item, idx) => {
                          const menuItem = menuItems.find((m) => m.id === item.menu_item_id);
                          const variant = menuItem?.variants?.find((v) => v.id === item.variant_id);
                          const variantLabel = variant?.name || variant?.label;
                          const name = menuItem ? (variantLabel ? `${menuItem.name} · ${variantLabel}` : menuItem.name) : "Unknown Item";
                          return (
                            <div key={`${order.id}-${idx}`} className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="flex-none h-5 w-5 rounded text-[10px] font-black flex items-center justify-center" style={{ background: "color-mix(in srgb, var(--co-accent) 10%, transparent)", color: "var(--co-accent)" }}>
                                  {item.quantity}
                                </span>
                                <span className="text-sm truncate" style={{ color: "var(--co-text)" }}>{name}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-sm font-bold" style={{ color: "var(--co-text)" }}>₹{item.price * item.quantity}</span>
                                {order.status === "pending" && (
                                  <button onClick={() => handleCancelOrderItem(order.id, item.menu_item_id, item.variant_id)} className="text-[10px] font-bold text-rose-500 hover:underline">✕</button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Your Selection ───────────────────────────────────────── */}
            {currentCartHasItems && (
              <section>
                <div className="flex items-center justify-between mb-3 px-1">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--co-muted)" }}>Your Selection</p>
                    <p className="text-lg font-black" style={{ color: "var(--co-text)" }}>{lines.length} {lines.length === 1 ? "item" : "items"}</p>
                  </div>
                  {!isWaitingConfirmation && (
                    <button
                      onClick={clearCart}
                      className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-bold text-rose-500 transition-all active:scale-95"
                      style={{ background: "rgba(239,68,68,0.08)" }}
                    >
                      <Trash2 className="h-3 w-3" /> Clear
                    </button>
                  )}
                </div>
                <div className="space-y-2.5">
                  {lines.map((line) => (
                    <div key={line.key} className="flex gap-3 rounded-2xl p-3 transition-all" style={themedSurfaceStyle}>
                      <div className="h-[72px] w-[72px] shrink-0 rounded-xl overflow-hidden relative">
                        {line.item.image ? (
                          <img
                            src={line.item.image}
                            alt={line.item.name}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                              const p = e.currentTarget.parentElement;
                              if (p) {
                                p.style.background = "linear-gradient(135deg,#667eea,#764ba2)";
                                p.innerHTML = "<div style='display:flex;align-items:center;justify-content:center;height:100%;font-size:1.5rem'>🍽️</div>";
                              }
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl" style={{ background: "linear-gradient(135deg,#667eea,#764ba2)" }}>🍽️</div>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col justify-between min-w-0 py-0.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-bold leading-snug line-clamp-2" style={{ color: "var(--co-text)" }}>{line.item.name}</p>
                          <p className="text-sm font-black shrink-0" style={{ color: "var(--co-text)" }}>₹{line.lineTotal}</p>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-[11px]" style={{ color: "var(--co-muted)" }}>₹{line.unitPrice} each</p>
                          {!isWaitingConfirmation && (
                            <div
                              className="flex items-center rounded-full overflow-hidden border"
                              style={{ borderColor: "color-mix(in srgb, var(--co-muted) 18%, transparent)" }}
                            >
                              <button
                                onClick={() => decrementItem(line.item.id, line.variantId)}
                                className="flex h-7 w-7 items-center justify-center transition-all active:scale-75"
                                style={{ color: "var(--co-text)", background: "color-mix(in srgb, var(--co-muted) 8%, transparent)" }}
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-8 text-center text-xs font-black" style={{ color: "var(--co-text)" }}>{line.quantity}</span>
                              <button
                                onClick={() => addItem(line.item.id, line.variantId, line.unitPrice)}
                                className="flex h-7 w-7 items-center justify-center transition-all active:scale-75"
                                style={{ background: "var(--co-accent)", color: "var(--co-accent-text)" }}
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

            {/* ── AI Recommendations ───────────────────────────────────── */}
            {recommendationItems.length > 0 && (
              <section>
                <div className="flex items-end justify-between mb-3 px-1">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--co-accent)" }}>✦ You might also like</p>
                    <p className="text-base font-black" style={{ color: "var(--co-text)" }}>Pair it perfectly</p>
                  </div>
                  <p className="text-[11px]" style={{ color: "var(--co-muted)" }}>{recommendationItems.length} picks</p>
                </div>
                <div className="-mx-5 px-5">
                  <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                    {recommendationItems.map((item) => (
                      <div
                        key={`reco-${item.id}`}
                        className="flex-none w-40 rounded-2xl overflow-hidden"
                        style={{ ...themedSurfaceStyle, border: "1px solid color-mix(in srgb, var(--co-muted) 15%, transparent)" }}
                      >
                        <div className="h-28 relative overflow-hidden">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                const t = e.currentTarget;
                                t.style.display = "none";
                                const p = t.parentElement;
                                if (p) {
                                  p.style.background = "linear-gradient(135deg,#667eea,#764ba2)";
                                  p.innerHTML = "<div style='display:flex;align-items:center;justify-content:center;height:100%;font-size:2.25rem'>🍽️</div>";
                                }
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl" style={{ background: "linear-gradient(135deg,#667eea,#764ba2)" }}>🍽️</div>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="truncate text-xs font-bold" style={{ color: "var(--co-text)" }}>{item.name}</p>
                          <p className="text-[11px] mt-0.5 font-semibold" style={{ color: "var(--co-muted)" }}>₹{item.offerPrice ?? item.price}</p>
                          <button
                            onClick={() => addItem(item.id, "", Number(item.offerPrice ?? item.price))}
                            className="mt-2.5 w-full rounded-xl py-1.5 text-[11px] font-black uppercase tracking-wider transition-all active:scale-95"
                            style={{ background: "var(--co-accent)", color: "var(--co-accent-text)" }}
                          >
                            + Add
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* ── Coupons & Offers ─────────────────────────────────────── */}
            <section
              className="rounded-2xl overflow-hidden"
              style={{ ...themedSurfaceStyle, border: "1.5px dashed color-mix(in srgb, var(--co-accent) 35%, transparent)" }}
            >
              <button
                type="button"
                onClick={async () => {
                  const next = !couponDrawerOpen;
                  setCouponDrawerOpen(next);
                  if (next && availableCoupons.length === 0) {
                    setCouponsLoading(true);
                    try {
                      const res = await api<{ offers?: AvailableCoupon[]; coupons?: AvailableCoupon[] }>("/api/customer/offers");
                      setAvailableCoupons(res?.coupons || []);
                    } catch { /* silent */ } finally {
                      setCouponsLoading(false);
                    }
                  }
                }}
                className="flex w-full items-center justify-between px-4 py-3.5"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">🏷️</span>
                  <div className="text-left">
                    <p className="text-xs font-black uppercase tracking-widest" style={{ color: "var(--co-accent)" }}>Coupons &amp; Offers</p>
                    {couponDiscount > 0 ? (
                      <p className="text-sm font-bold text-emerald-600">✓ ₹{couponDiscount} saved!</p>
                    ) : (
                      <p className="text-sm font-medium" style={{ color: "var(--co-muted)" }}>View available deals</p>
                    )}
                  </div>
                </div>
                <ChevronRight className={`h-4 w-4 transition-transform duration-300 ${couponDrawerOpen ? "rotate-90" : ""}`} style={{ color: "var(--co-muted)" }} />
              </button>

              {couponDrawerOpen && (
                <div className="border-t px-4 pb-4 pt-4 space-y-4" style={{ borderColor: "color-mix(in srgb, var(--co-accent) 20%, transparent)" }}>
                  {couponsLoading ? (
                    <div className="flex items-center justify-center py-5 gap-2" style={{ color: "var(--co-muted)" }}>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-xs font-medium">Finding deals…</span>
                    </div>
                  ) : availableCoupons.length > 0 ? (
                    <div>
                      <p className="mb-2.5 text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--co-muted)" }}>Available Offers</p>
                      <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                        {availableCoupons.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setCouponCode(c.coupon_code);
                              setCouponDrawerOpen(false);
                              handleApplyCoupon(c.coupon_code);
                            }}
                            className="flex-none w-48 text-left rounded-2xl overflow-hidden transition-all active:scale-95"
                            style={{
                              border: `2px solid ${couponCode === c.coupon_code ? "var(--co-accent)" : "color-mix(in srgb, var(--co-muted) 18%, transparent)"}`,
                              background: "var(--co-surface)",
                            }}
                          >
                            <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg, var(--co-accent), color-mix(in srgb, var(--co-accent) 60%, #818cf8))" }} />
                            <div className="p-3.5">
                              <p className="text-[11px] font-black uppercase tracking-[0.15em]" style={{ color: "var(--co-accent)" }}>{c.coupon_code}</p>
                              <p className="mt-1.5 text-base font-black" style={{ color: "var(--co-text)" }}>
                                {c.discount_type === "percent" ? `${c.discount_value}% OFF` : `₹${c.discount_value} OFF`}
                              </p>
                              <p className="mt-0.5 text-[10px] leading-snug line-clamp-2" style={{ color: "var(--co-muted)" }}>{c.description || c.name}</p>
                              {c.min_order_value ? <p className="mt-1 text-[9px] font-semibold" style={{ color: "var(--co-muted)" }}>Min order ₹{c.min_order_value}</p> : null}
                              <div className="mt-3 rounded-xl py-2 text-center text-[10px] font-black uppercase tracking-wider" style={{ background: "var(--co-accent)", color: "var(--co-accent-text)" }}>
                                Tap to Claim
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-center text-xs py-3" style={{ color: "var(--co-muted)" }}>No active offers right now.</p>
                  )}
                  <div>
                    <p className="mb-2 text-[10px] font-black uppercase tracking-wider" style={{ color: "var(--co-muted)" }}>Have a code?</p>
                    <div className="flex items-center gap-2">
                      <input
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="ENTER CODE"
                        className="h-11 flex-1 rounded-xl border px-4 text-sm font-bold uppercase tracking-widest focus:outline-none focus:ring-2 placeholder:font-normal placeholder:lowercase placeholder:tracking-normal"
                        style={{
                          borderColor: "color-mix(in srgb, var(--co-muted) 20%, transparent)",
                          background: "color-mix(in srgb, var(--co-muted) 5%, transparent)",
                          color: "var(--co-text)",
                        }}
                      />
                      <button
                        onClick={() => handleApplyCoupon()}
                        disabled={isApplyingCoupon || !currentOrderId || !currentCartHasItems}
                        className="h-11 rounded-xl px-5 text-xs font-black uppercase tracking-wider disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center"
                        style={{ background: "var(--co-accent)", color: "var(--co-accent-text)" }}
                      >
                        {isApplyingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* ── Bill Summary ──────────────────────────────────────────── */}
            <section className="rounded-2xl overflow-hidden p-5" style={themedSurfaceStyle}>
              <div className="flex items-center gap-2 mb-4">
                <ReceiptText className="h-4 w-4" style={{ color: "var(--co-muted)" }} />
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--co-muted)" }}>Bill Summary</p>
              </div>
              <div className="space-y-3">
                {hasPlacedOrders && previousOrdersTotal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: "var(--co-muted)" }}>Previous orders</span>
                    <span className="font-semibold" style={{ color: "var(--co-text)" }}>₹{previousOrdersTotal}</span>
                  </div>
                )}
                {currentCartHasItems && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: "var(--co-muted)" }}>Current cart</span>
                    <span className="font-semibold" style={{ color: "var(--co-text)" }}>₹{cartSubtotal}</span>
                  </div>
                )}
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-600 font-medium">Coupon ({couponCode})</span>
                    <span className="font-bold text-emerald-600">−₹{couponDiscount}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span style={{ color: "var(--co-muted)" }}>GST (5%)</span>
                  <span className="font-semibold" style={{ color: "var(--co-text)" }}>₹{tax}</span>
                </div>
              </div>
              <div className="mt-4 pt-4 flex items-center justify-between border-t" style={{ borderColor: "color-mix(in srgb, var(--co-muted) 15%, transparent)", borderStyle: "dashed" }}>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--co-muted)" }}>Grand Total</p>
                  <p className="text-2xl font-black mt-0.5" style={{ color: "var(--co-text)" }}>₹{grandTotal}</p>
                </div>
                {couponDiscount > 0 && (
                  <div className="rounded-xl px-3 py-1.5 text-xs font-black text-emerald-700" style={{ background: "rgba(16,185,129,0.1)" }}>
                    💰 ₹{couponDiscount} saved
                  </div>
                )}
              </div>
            </section>

          </div>
        )}
      </main>

      {/* ── Sticky Bottom Bar ─────────────────────────────────────────── */}
      {(currentCartHasItems || hasPlacedOrders) && (
        <div
          className="fixed bottom-0 left-0 right-0 z-[60] px-5 pb-8 pt-4"
          style={{ background: "linear-gradient(to top, var(--co-bg) 60%, transparent)" }}
        >
          <div className="mx-auto max-w-lg">
            {!currentCartHasItems && hasPlacedOrders ? (
              <div className="flex gap-3">
                <button
                  onClick={() => router.push("/menu")}
                  className="flex-1 rounded-2xl py-4 text-sm font-bold shadow-sm transition-all active:scale-95 border"
                  style={{ ...themedSurfaceStyle, color: "var(--co-text)" }}
                >
                  + Add Items
                </button>
                <button
                  onClick={() => toast.success("Bill requested!")}
                  className="flex-1 rounded-2xl py-4 text-sm font-bold shadow-xl transition-all active:scale-95"
                  style={{ background: "var(--co-accent)", color: "var(--co-accent-text)" }}
                >
                  Request Bill
                </button>
              </div>
            ) : (
              <button
                onClick={handlePlaceOrder}
                disabled={isPlacingOrder || isWaitingConfirmation}
                className="relative flex h-14 w-full items-center justify-between overflow-hidden rounded-2xl px-6 font-bold shadow-2xl transition-all active:scale-[0.98] disabled:opacity-80"
                style={isWaitingConfirmation ? { background: "#F59E0B", color: "#fff" } : { background: "var(--co-accent)", color: "var(--co-accent-text)" }}
              >
                {isWaitingConfirmation ? (
                  <div className="flex w-full items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Waiting for confirmation…</span>
                  </div>
                ) : isPlacingOrder || isSyncingAfterPlace ? (
                  <div className="flex w-full items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{isSyncingAfterPlace ? "Updating…" : "Processing…"}</span>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="text-[9px] uppercase tracking-widest opacity-70 leading-none">Total</p>
                      <p className="text-base font-black leading-tight">₹{grandTotal}</p>
                    </div>
                    <span className="text-sm font-black uppercase tracking-widest">Place Order</span>
                    <ChevronRight className="h-5 w-5 opacity-60" />
                  </>
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
