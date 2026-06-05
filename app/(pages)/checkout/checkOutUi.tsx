"use client";

import { api } from "@/app/lib/api";
import { resolveRestaurantIdFromTenantSlug } from "@/app/lib/tenant";
import { orderService } from "@/services/orderService";
import { useCartStore } from "@/stores/cartStore";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Minus,
  Plus,
  ReceiptText,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

const BASE_VARIANT = "__base__";

type MenuItem = {
  id: string;
  name: string;
  price: number;
  offerPrice?: number;
  offerLabel?: string;
  image: string;
  variants?: {
    id: string;
    name: string;
    priceDelta: number;
    price?: number;
    label?: string;
  }[];
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

type AvailableCouponItem = {
  menu_item_id: string;
  item_discount_kind?: string | null;
  item_discount_value?: number | null;
};

type AvailableCoupon = {
  id: string;
  name: string;
  coupon_code: string;
  discount_type: string;
  discount_value: number;
  min_order_value?: number;
  description?: string;
  scope?: string;
  items?: AvailableCouponItem[];
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
  font_family: "'DM Sans','Inter','Segoe UI',sans-serif",
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
    bg: "#F7F2EB",
    surface: "#FFFFFF",
    text: "#3D2B1F",
    muted: "#6B5B4E",
    accent: "#3D2B1F",
    accent_text: "#F7F2EB",
  },
};

const mergeTheme = (raw?: ThemeConfig | null): ThemeConfig => ({
  ...DEFAULT_THEME,
  ...(raw || {}),
  bg_overlay_opacity: Math.min(
    0.98,
    Math.max(
      0.7,
      Number(raw?.bg_overlay_opacity ?? DEFAULT_THEME.bg_overlay_opacity),
    ),
  ),
  colors: {
    ...(DEFAULT_THEME.colors || {}),
    ...(raw?.colors || {}),
  },
});

// Unwraps Go NullStr objects ({ String: "...", Valid: true }) that the backend
// sends for nullable string fields. Without this, `item.imageUrl` is a truthy
// object but NOT a valid URL string, so images never render.
const resolve = (val: any): string | null => {
  if (!val) return null;
  if (typeof val === "object" && "String" in val) return val.String ?? null;
  const str = String(val).trim();
  return str.length > 0 ? str : null;
};

const formatPrice = (val: number): number => {
  return Math.round((val + Number.EPSILON) * 100) / 100;
};


const getCurrentStepIndex = (status: string) => {
  const s = status.toLowerCase();
  if (s === "pending" || s === "accepted") return 0;
  if (s === "preparing") return 1;
  if (s === "ready") return 2;
  if (s === "completed" || s === "served") return 3;
  return -1;
};

const calculateCouponDiscount = (coupon: AvailableCoupon, lines: CartLine[]): number => {
  if (!lines || lines.length === 0) return 0;

  const cartSubtotal = lines.reduce((s, l) => s + l.lineTotal, 0);

  if (coupon.min_order_value && cartSubtotal < coupon.min_order_value) {
    return 0;
  }

  const scope = coupon.scope || "full_menu";
  let totalDiscount = 0;

  if (scope === "full_menu") {
    const type = coupon.discount_type;
    const value = coupon.discount_value;
    if (type === "percent") {
      totalDiscount = cartSubtotal * (value / 100);
    } else if (type === "fixed" || type === "flat") {
      totalDiscount = value;
    } else if (type === "fixed_price") {
      totalDiscount = cartSubtotal - value;
    }
  } else if (scope === "selected_items") {
    if (!coupon.items || coupon.items.length === 0) return 0;

    for (const line of lines) {
      const override = coupon.items.find(
        (it) => String(it.menu_item_id) === String(line.item.id)
      );
      if (!override) continue;

      const lineAmount = line.lineTotal;
      const kind = override.item_discount_kind || coupon.discount_type;
      const value = typeof override.item_discount_value === "number" && override.item_discount_value > 0
        ? override.item_discount_value
        : coupon.discount_value;

      if (kind === "fixed_price") {
        const target = value * line.quantity;
        totalDiscount += Math.max(0, lineAmount - target);
      } else {
        if (kind === "percent") {
          totalDiscount += lineAmount * (value / 100);
        } else if (kind === "fixed" || kind === "flat") {
          totalDiscount += value;
        } else if (kind === "fixed_price") {
          totalDiscount += Math.max(0, lineAmount - value);
        }
      }
    }
  }

  if (totalDiscount < 0) totalDiscount = 0;
  return Math.min(totalDiscount, cartSubtotal);
};

const CheckoutPage: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
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
  const [billRequested, setBillRequested] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [lastPlacedNums, setLastPlacedNums] = useState<{
    orderNumber: number;
    dailyOrderNumber: number;
  } | null>(null);
  const [isSeparateBill, setIsSeparateBill] = useState(false);
  const [isTableOccupied, setIsTableOccupied] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCouponDiscount, setAppliedCouponDiscount] = useState(0);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [couponDrawerOpen, setCouponDrawerOpen] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<AvailableCoupon[]>(
    [],
  );
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [myOrderIds, setMyOrderIds] = useState<Set<string>>(new Set());
  const [restaurantName, setRestaurantName] = useState("Restaurant");
  const [restaurantLogoUrl, setRestaurantLogoUrl] = useState("");
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>(
    [],
  );
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(() => {
    if (typeof window === "undefined") return DEFAULT_THEME;
    try {
      const cached = localStorage.getItem("menu_theme_config");
      return cached ? mergeTheme(JSON.parse(cached)) : DEFAULT_THEME;
    } catch {
      return DEFAULT_THEME;
    }
  });
  const [orderBreakdowns, setOrderBreakdowns] = useState<Record<string, any>>(
    {},
  );

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
    } catch {
      /* ignore */
    }

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
          : localStorage.getItem("table_number") ||
            localStorage.getItem("table");

      if (!rawTable) return null;

      const isUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          rawTable,
        );
      const normalizedTable = rawTable.trim().toLowerCase().startsWith("t")
        ? rawTable.trim().slice(1)
        : rawTable.trim();
      const tableNumberParsed = Number.parseInt(normalizedTable, 10);

      try {
        if (!Number.isNaN(tableNumberParsed)) {
          if (!restaurantId) return null;
          const res = await api<{ session_id: string }>(
            "/public/session/start",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                restaurant_id: restaurantId,
                table_number: tableNumberParsed,
              }),
              credentials: "include",
            },
          );
          localStorage.setItem("session_id", res.session_id);
          return res.session_id;
        }

        if (isUUID) {
          const res = await api<{
            session_id: string;
            restaurant_id?: string;
            table_number?: number;
          }>("/public/session/start", {
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

      if (typeof window !== "undefined") {
        const sessionId = localStorage.getItem("session_id");
        if (sessionId && localStorage.getItem(`bill_requested_${sessionId}`) === "true") {
          setBillRequested(true);
        }
      }

      Promise.all([
        orderService.getMenu(),
        orderService.getCart(),
        orderService.getOrders(),
        api<{
          popular_with_this?: RecommendationItem[];
          margin_aware?: RecommendationItem[];
        }>("/api/customer/recommendations", { method: "GET" }),
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
                image: resolve(i.imageUrl) ?? resolve(i.image) ?? null,
              };
            }) || [];

          setMenuItems(mapped);
          setMenuCache(mapped);

          if (cartRes?.items) {
            const localCart = useCartStore.getState().cart;
            const localKeys = Object.keys(localCart);
            const remoteKeys = Object.keys(cartRes.items);

            if (localKeys.length > 0) {
              let mismatch = false;
              if (localKeys.length !== remoteKeys.length) {
                mismatch = true;
              } else {
                for (const key of localKeys) {
                  if (!cartRes.items[key] || cartRes.items[key].quantity !== localCart[key].quantity) {
                    mismatch = true;
                    break;
                  }
                }
              }

              if (mismatch) {
                (async () => {
                  try {
                    await orderService.ensureOrderId();
                    // 1. Remove all items from remote cart
                    for (const key of remoteKeys) {
                      const [itemId, variantId] = key.split("::");
                      const cleanVariantId =
                        variantId === "undefined" ||
                        variantId === "null" ||
                        variantId === "__base__" ||
                        !variantId
                          ? null
                          : variantId;
                      try {
                        await orderService.removeItem(itemId, cleanVariantId || undefined);
                      } catch (e) {
                        console.error(`Failed to remove item ${itemId}:`, e);
                      }
                    }
                    // 2. Add all items from local cart
                    for (const [key, item] of Object.entries(localCart)) {
                      const [itemId, variantId] = key.split("::");
                      const cleanVariantId =
                        variantId === "undefined" ||
                        variantId === "null" ||
                        variantId === "__base__" ||
                        !variantId
                          ? null
                          : variantId;
                      for (let q = 0; q < item.quantity; q++) {
                        await orderService.addItem(itemId, cleanVariantId, item.price);
                      }
                    }
                    const updatedCartRes = await orderService.getCart();
                    if (updatedCartRes?.items) {
                      syncCart(updatedCartRes.items);
                    }
                  } catch (err) {
                    console.error("Failed to sync mismatched cart to backend:", err);
                  }
                })();
              }
            } else if (remoteKeys.length > 0) {
              syncCart(cartRes.items);
            }
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
          const unique = recos
            .filter((r) => {
              if (seen.has(String(r.id))) return false;
              seen.add(String(r.id));
              return true;
            })
            .slice(0, 4);
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
      const isStaffOrPreview =
        typeof window !== "undefined" &&
        (window.location.pathname.startsWith("/staff") ||
          window.location.pathname.startsWith("/preview"));

      let loadedFromMe = false;
      if (isStaffOrPreview) {
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
          }
          loadedFromMe = true;
        } catch {
          if (cancelled) return;
        }
      }

      if (loadedFromMe) return;

      const rid = localStorage.getItem("restaurant_id");
      if (!rid || cancelled) return;

      try {
        const logo = await api<{ logo_url?: string | null }>(
          `/public/restaurants/${rid}/logo`,
        );
        if (cancelled) return;
        if (logo?.logo_url) {
          setRestaurantLogoUrl(logo.logo_url);
        }
      } catch {
        // keep checkout header usable with text fallback
      }
      try {
        const theme = await api<{ theme_config?: ThemeConfig }>(
          `/public/restaurants/${rid}/theme`,
          {
            skipAuthRedirect: true,
            suppressErrorLog: true,
          },
        );
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
  }, [pathname]);

  const activeTheme = useMemo(() => mergeTheme(themeConfig), [themeConfig]);
  const themedSurfaceStyle: React.CSSProperties = {
    background: "var(--co-surface)",
    borderColor: "#F0E9DF",
  };
  const themedAppStyle: React.CSSProperties = {
    ["--co-bg" as string]: activeTheme.colors?.bg || "#F7F2EB",
    ["--co-surface" as string]: activeTheme.colors?.surface || "#FFFFFF",
    ["--co-text" as string]: activeTheme.colors?.text || "#3D2B1F",
    ["--co-muted" as string]: activeTheme.colors?.muted || "#6B5B4E",
    ["--co-accent" as string]: activeTheme.colors?.accent || "#3D2B1F",
    ["--co-accent-text" as string]:
      activeTheme.colors?.accent_text || "#F7F2EB",
    ["--co-font" as string]:
      activeTheme.font_family || "'DM Sans','Inter','Segoe UI',sans-serif",
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
          rawVariantId &&
          rawVariantId !== "00000000-0000-0000-0000-000000000000"
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
            (typeof item.offerPrice === "number"
              ? item.offerPrice
              : item.price) + (variant?.priceDelta || 0));

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

  const applicableCoupons = useMemo(() => {
    return availableCoupons.filter((c) => calculateCouponDiscount(c, lines) > 0);
  }, [availableCoupons, lines]);

  const allPlacedOrders = orders.filter(
    (o) =>
      o.id !== currentOrderId &&
      o.status !== "cart" &&
      Array.isArray(o.items) &&
      o.items.length > 0,
  );

  const placedOrders = isSeparateBill
    ? allPlacedOrders.filter((o) => myOrderIds.has(o.id))
    : allPlacedOrders;

  useEffect(() => {
    if (couponCode && currentOrderId && isCartReady) {
      const timer = setTimeout(() => {
        orderService
          .applyCoupon(currentOrderId, couponCode)
          .then((res) => {
            setAppliedCouponDiscount(Number(res?.discount || 0));
          })
          .catch((e) => {
            console.error("Failed to silently reapply coupon:", e);
            setAppliedCouponDiscount(0);
            setCouponCode("");
          });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [lines, couponCode, currentOrderId, isCartReady]);

  useEffect(() => {
    let cancelled = false;
    async function fetchBreakdowns() {
      const breakdowns: Record<string, any> = {};
      await Promise.all(
        placedOrders.map(async (order) => {
          try {
            breakdowns[order.id] = await orderService.getTotalBreakdown(
              order.id,
            );
          } catch {
            breakdowns[order.id] = null;
          }
        }),
      );
      if (!cancelled) setOrderBreakdowns(breakdowns);
    }
    if (placedOrders.length > 0) fetchBreakdowns();
    return () => {
      cancelled = true;
    };
  }, [placedOrders]);

  if (!isMounted || !isCartReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F2EB]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#C9B89A] mx-auto mb-4" />
          <p className="text-xs font-bold uppercase tracking-widest text-[#9B8677]">
            Loading cart…
          </p>
        </div>
      </div>
    );
  }

  const cartSubtotal = formatPrice(lines.reduce((s, l) => s + l.lineTotal, 0));

  const previousOrdersTotal = formatPrice(
    placedOrders
      .filter((o) => o.status !== "cancelled")
      .reduce((acc, order) => {
        return acc + order.items.reduce((s, i) => s + i.price * i.quantity, 0);
      }, 0)
  );

  const subtotal = formatPrice(cartSubtotal + previousOrdersTotal);
  const couponDiscount = formatPrice(Math.min(appliedCouponDiscount, cartSubtotal));
  const subtotalAfterDiscount = formatPrice(Math.max(0, subtotal - couponDiscount));
  const tax = formatPrice(Math.round(subtotalAfterDiscount * 0.05));
  const grandTotal = formatPrice(subtotalAfterDiscount + tax);

  const handlePlaceOrder = async () => {
    if (lines.length === 0 || isPlacingOrder) return;
    setIsPlacingOrder(true);
    setIsSyncingAfterPlace(false);

    try {
      let orderId = localStorage.getItem("order_id");
      if (!orderId) {
        toast.error("Session expired");
        return;
      }
      let finalizeRes;
      try {
        finalizeRes = await orderService.finalizeOrder(orderId);
      } catch (err: any) {
        const msg = String(err?.message || "").toLowerCase();
        if (
          msg.includes("order not found") ||
          msg.includes("no rows") ||
          msg.includes("order_id is required") ||
          msg.includes("uuid")
        ) {
          localStorage.removeItem("order_id");
          const freshOrderId = await orderService.ensureOrderId();
          if (freshOrderId) {
            orderId = freshOrderId;
            const currentCart = useCartStore.getState().cart;
            for (const [key, item] of Object.entries(currentCart)) {
              const [menuItemId, variantId] = key.split("::");
              const cleanVariantId =
                variantId === "undefined" || variantId === "null" || !variantId
                  ? null
                  : variantId;
              for (let i = 0; i < item.quantity; i++) {
                await orderService.addItem(
                  menuItemId,
                  cleanVariantId,
                  item.price,
                );
              }
            }
            finalizeRes = await orderService.finalizeOrder(orderId);
          } else {
            throw err;
          }
        } else {
          throw err;
        }
      }
      const orderNumber = finalizeRes?.order_number ?? null;
      const dailyOrderNumber = finalizeRes?.daily_order_number ?? null;
      if (orderNumber && dailyOrderNumber) {
        setLastPlacedNums({ orderNumber, dailyOrderNumber });
      }
      toast.success(
        dailyOrderNumber
          ? `Order #${dailyOrderNumber} placed!`
          : "Order placed!",
      );

      const prevIds: string[] = JSON.parse(
        localStorage.getItem("my_order_ids") || "[]",
      );
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

  const handleCancelOrderItem = async (
    orderId: string,
    itemId: string,
    variantId: string,
  ) => {
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
  const recommendationItems = recommendations
    .map((rec) => {
      const cached = menuItems.find((m) => m.id === String(rec.id));
      return {
        id: String(rec.id),
        name: cached?.name || rec.name || "Item",
        price: cached?.price ?? rec.price ?? 0,
        offerPrice: cached?.offerPrice,
        image: cached?.image || rec.image_url || "",
      };
    })
    .filter((r) => r.price > 0);

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
            style={{
              background:
                "color-mix(in srgb, var(--co-muted) 12%, transparent)",
            }}
          >
            <ChevronLeft
              className="h-4 w-4"
              style={{ color: "var(--co-text)" }}
            />
          </button>

          <div className="flex items-center gap-2.5">
            {restaurantLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={restaurantLogoUrl}
                alt="logo"
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-black"
                style={{
                  background: "var(--co-accent)",
                  color: "var(--co-accent-text)",
                }}
              >
                {(restaurantName || "R").slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <p
                className="text-xs font-black leading-none"
                style={{ color: "var(--co-text)" }}
              >
                {restaurantName}
              </p>
              <p
                className="text-[10px] mt-0.5"
                style={{ color: "var(--co-muted)" }}
              >
                Table {tableNumber}
              </p>
            </div>
          </div>

          <div
            className="rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-widest"
            style={{
              background:
                "color-mix(in srgb, var(--co-accent) 12%, transparent)",
              color: "var(--co-accent)",
            }}
          >
            Checkout
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-5 pt-5">
        {!currentCartHasItems && !hasPlacedOrders && !isSyncingAfterPlace ? (
          /* ── Empty State ──────────────────────────────────────────── */
          <div className="flex min-h-[70vh] flex-col items-center justify-center text-center gap-8 px-6 relative overflow-hidden">
            <div className="relative flex items-center justify-center">
              {/* Glowing accent circle */}
              <div className="absolute w-36 h-36 bg-[#C9B89A]/15 blur-2xl rounded-full animate-pulse" />
              
              {/* Center Icon */}
              <div className="relative z-10 h-28 w-28 rounded-full flex items-center justify-center bg-[#FFFFFF] border border-[#F0E9DF] shadow-md">
                <UtensilsCrossed
                  className="h-10 w-10 text-[#3D2B1F]"
                />
              </div>

              {/* Floating Dishes Illustration using Framer Motion */}
              {[
                { emoji: "🍕", delay: 0, x: -60, y: -40, scale: 1.1 },
                { emoji: "🍔", delay: 0.5, x: 60, y: -30, scale: 1.0 },
                { emoji: "🍜", delay: 1.0, x: -70, y: 30, scale: 1.2 },
                { emoji: "🍰", delay: 0.8, x: 50, y: 40, scale: 0.95 },
                { emoji: "🥗", delay: 0.3, x: 0, y: -80, scale: 1.05 }
              ].map((dish, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ 
                    opacity: 1, 
                    scale: dish.scale,
                    y: [dish.y, dish.y - 12, dish.y] 
                  }}
                  transition={{
                    opacity: { duration: 0.5, delay: index * 0.1 },
                    scale: { duration: 0.5, delay: index * 0.1 },
                    y: {
                      duration: 3 + index,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: dish.delay
                    }
                  }}
                  className="absolute text-2xl select-none"
                  style={{
                    transform: `translate(${dish.x}px, ${dish.y}px)`,
                    left: "50%",
                    top: "50%",
                    marginLeft: dish.x - 12,
                    marginTop: dish.y - 12
                  }}
                >
                  {dish.emoji}
                </motion.div>
              ))}
            </div>

            <div className="relative z-10 max-w-sm">
              <h2 className="text-3xl font-black text-[#3D2B1F] tracking-tight">
                Your cart is empty
              </h2>
              <p className="mt-3 text-[14px] leading-relaxed text-[#6B5B4E] max-w-[260px] mx-auto font-light">
                Your table is ready, but no items have been added yet. Let's find something delicious!
              </p>
            </div>

            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push("/menu")}
              className="relative z-10 rounded-2xl bg-[#3D2B1F] text-[#F7F2EB] font-black text-sm uppercase tracking-widest px-10 py-4.5 shadow-xl hover:bg-[#5C4033] transition-all hover:shadow-2xl cursor-pointer font-dm-sans"
            >
              Explore Menu →
            </motion.button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* ── Previous Orders ─────────────────────────────────────── */}
            {hasPlacedOrders && (
              <section>
                {/* success nudge after the most recent placement */}
                {lastPlacedNums && (
                  <div
                    className="mb-3 flex items-center gap-3 rounded-2xl px-4 py-3"
                    style={{
                      background: "rgba(16,185,129,0.10)",
                      border: "1px solid rgba(16,185,129,0.25)",
                    }}
                  >
                    <span className="text-xl">✅</span>
                    <div>
                      <p className="text-sm font-black text-emerald-700">
                        Order&nbsp;
                        <span className="text-base">
                          #{lastPlacedNums.dailyOrderNumber}
                        </span>
                        &nbsp;placed!
                      </p>
                      <p className="text-[10px] text-emerald-600 mt-0.5">
                        Kitchen is on it!
                      </p>
                    </div>
                  </div>
                )}
                <p
                  className="mb-3 text-[10px] font-black uppercase tracking-widest px-1"
                  style={{ color: "var(--co-muted)" }}
                >
                  Previous Orders
                </p>
                <div className="space-y-3">
                  {placedOrders.map((order) => {
                    const isCancelled = order.status === "cancelled";
                    const isCompleted =
                      order.status === "completed" || order.status === "served";
                    const isAccepted =
                      order.status === "accepted" ||
                      order.status === "preparing" ||
                      order.status === "ready";

                    const statusBg = isCancelled
                      ? "rgba(239,68,68,0.10)"
                      : isAccepted || isCompleted
                        ? "rgba(16,185,129,0.12)"
                        : "color-mix(in srgb, var(--co-muted) 10%, transparent)";
                    const statusColor = isCancelled
                      ? "#dc2626"
                      : isAccepted || isCompleted
                        ? "#059669"
                        : "var(--co-muted)";

                    const breakdown = orderBreakdowns[order.id];
                    const eta = breakdown?.eta;
                    const progress = breakdown?.progress;
                    const progressLabel = breakdown?.progress_label;

                    return (
                      <div
                        key={order.id}
                        className="rounded-2xl border overflow-hidden"
                        style={{
                          ...themedSurfaceStyle,
                          borderColor: isCancelled
                            ? "rgba(239,68,68,0.25)"
                            : undefined,
                          opacity: isCancelled ? 0.75 : 1,
                        }}
                      >
                        <div
                          className="flex items-center justify-between px-4 py-2.5"
                          style={{
                            background:
                              "color-mix(in srgb, var(--co-muted) 6%, transparent)",
                            borderBottom:
                              "1px solid color-mix(in srgb, var(--co-muted) 12%, transparent)",
                          }}
                        >
                          <div className="flex items-center gap-2">
                            {/* Daily order number badge */}
                            {order.daily_order_number ? (
                              <span
                                className="rounded-lg px-2 py-0.5 text-xs font-black"
                                style={{
                                  background: "var(--co-accent)",
                                  color: "var(--co-accent-text)",
                                }}
                              >
                                #{order.daily_order_number}
                              </span>
                            ) : (
                              <span
                                className="text-[10px] font-bold uppercase tracking-widest"
                                style={{ color: "var(--co-muted)" }}
                              >
                                #{order.id.slice(0, 6).toUpperCase()}
                              </span>
                            )}
                            <span
                              className="rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider"
                              style={{
                                background: statusBg,
                                color: statusColor,
                              }}
                            >
                              {isCancelled ? "Cancelled" : order.status}
                            </span>
                            {/* Removed overall order number for professionalism */}
                          </div>
                          {order.status === "pending" && (
                            <button
                              onClick={() => handleCancelOrder(order.id)}
                              className="rounded-lg px-2.5 py-1 text-[10px] font-bold text-rose-600"
                              style={{ background: "rgba(239,68,68,0.08)" }}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                        {/* live tracking timeline for active orders */}
                        {!isCancelled && (
                          <div className="px-4 py-4 bg-[#F7F2EB]/50 border-t border-[#F0E9DF] flex items-center justify-between text-center gap-1">
                            {(() => {
                              const currentIdx = getCurrentStepIndex(order.status);
                              return [
                                { label: "Received", index: 0 },
                                { label: "Preparing", index: 1 },
                                { label: "Ready", index: 2 },
                                { label: "Served", index: 3 }
                              ].map((step, sIdx, sArr) => {
                                const isCompleted = sIdx < currentIdx;
                                const isCurrent = sIdx === currentIdx;
                                const isActive = isCompleted || isCurrent;
                                const isNextActive = sIdx < sArr.length - 1 && (sIdx + 1 <= currentIdx);
                                return (
                                  <React.Fragment key={step.label}>
                                    <div className="flex flex-col items-center gap-1.5 shrink-0">
                                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border transition-all ${
                                        isCurrent
                                          ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-200 animate-pulse relative"
                                          : isCompleted
                                            ? "bg-emerald-600 border-emerald-600 text-white"
                                            : "bg-[#FFFFFF] border-[#DDD5C5] text-[#9B8677]"
                                      }`}>
                                        {isCurrent ? (
                                          <span className="flex h-2.5 w-2.5 relative">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                                          </span>
                                        ) : isCompleted ? (
                                          "✓"
                                        ) : (
                                          sIdx + 1
                                        )}
                                      </div>
                                      <span className={`text-[9px] font-black uppercase tracking-wider ${isActive ? "text-[#3D2B1F]" : "text-[#9B8677]"}`}>
                                        {step.label}
                                      </span>
                                    </div>
                                    {sIdx < sArr.length - 1 && (
                                      <div className={`flex-1 h-0.5 -mt-4 mx-1 border-t-2 border-dashed transition-all ${
                                        isNextActive ? "border-emerald-500" : "border-[#DDD5C5]"
                                      }`} />
                                    )}
                                  </React.Fragment>
                                );
                              });
                            })()}
                          </div>
                        )}
                        <div className="px-4 py-3 space-y-2">
                          {isCancelled && (
                            <p className="text-[10px] font-semibold text-rose-500 mb-1">
                              This order was cancelled.
                            </p>
                          )}
                          {order.items.map((item, idx) => {
                            const menuItem = menuItems.find(
                              (m) => m.id === item.menu_item_id,
                            );
                            const variant = menuItem?.variants?.find(
                              (v) => v.id === item.variant_id,
                            );
                            const variantLabel =
                              variant?.name || variant?.label;
                            const name = menuItem
                              ? variantLabel
                                ? `${menuItem.name} · ${variantLabel}`
                                : menuItem.name
                              : "Unknown Item";
                            return (
                              <div
                                key={`${order.id}-${idx}`}
                                className="flex items-center justify-between gap-3"
                                style={{ opacity: isCancelled ? 0.6 : 1 }}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className="flex-none h-5 w-5 rounded text-[10px] font-black flex items-center justify-center"
                                    style={{
                                      background:
                                        "color-mix(in srgb, var(--co-accent) 10%, transparent)",
                                      color: "var(--co-accent)",
                                    }}
                                  >
                                    {item.quantity}
                                  </span>
                                  <span
                                    className="text-sm truncate"
                                    style={{ color: "var(--co-text)" }}
                                  >
                                    {name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span
                                    className="text-sm font-bold"
                                    style={{ color: "var(--co-text)" }}
                                  >
                                    ₹{formatPrice(item.price * item.quantity)}
                                  </span>
                                  {order.status === "pending" && (
                                    <button
                                      onClick={() =>
                                        handleCancelOrderItem(
                                          order.id,
                                          item.menu_item_id,
                                          item.variant_id,
                                        )
                                      }
                                      className="text-[10px] font-bold text-rose-500 hover:underline"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ── Your Selection ───────────────────────────────────────── */}
            {currentCartHasItems && (
              <section>
                <div className="flex items-center justify-between mb-3 px-1">
                  <div>
                    <p
                      className="text-[10px] font-black uppercase tracking-widest"
                      style={{ color: "var(--co-muted)" }}
                    >
                      Your Selection
                    </p>
                    <p
                      className="text-lg font-black"
                      style={{ color: "var(--co-text)" }}
                    >
                      {lines.length} {lines.length === 1 ? "item" : "items"}
                    </p>
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
                    <div
                      key={line.key}
                      className="flex gap-3 rounded-2xl p-3 border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
                      style={themedSurfaceStyle}
                    >
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
                                p.style.background =
                                  "linear-gradient(135deg,#667eea,#764ba2)";
                                p.innerHTML =
                                  "<div style='display:flex;align-items:center;justify-content:center;height:100%;font-size:1.5rem'>🍽️</div>";
                              }
                            }}
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center text-2xl"
                            style={{
                              background:
                                "linear-gradient(135deg,#667eea,#764ba2)",
                            }}
                          >
                            🍽️
                          </div>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col justify-between min-w-0 py-0.5">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className="text-sm font-extrabold tracking-tight leading-snug line-clamp-2"
                            style={{ color: "var(--co-text)" }}
                          >
                            {line.item.name}
                          </p>
                          <p
                            className="text-sm font-black shrink-0"
                            style={{ color: "var(--co-text)" }}
                          >
                            ₹{formatPrice(line.lineTotal)}
                          </p>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <p
                            className="text-[11px]"
                            style={{ color: "var(--co-muted)" }}
                          >
                            ₹{formatPrice(line.unitPrice)} each
                          </p>
                          {!isWaitingConfirmation && (
                            <div
                              className="flex items-center rounded-lg overflow-hidden border"
                              style={{
                                borderColor: "#DDD5C5",
                              }}
                            >
                              <button
                                onClick={() =>
                                  decrementItem(line.item.id, line.variantId)
                                }
                                className="flex h-7 w-7 items-center justify-center transition-all active:scale-75"
                                style={{
                                  color: "#3D2B1F",
                                  background: "#EDE5D8",
                                }}
                              >
                                <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
                              </button>
                              <span
                                className="w-8 text-center text-xs font-bold font-dm-sans"
                                style={{ color: "#3D2B1F" }}
                              >
                                {line.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  addItem(
                                    line.item.id,
                                    line.variantId,
                                    line.unitPrice,
                                  )
                                }
                                className="flex h-7 w-7 items-center justify-center transition-all active:scale-75"
                                style={{
                                  background: "#3D2B1F",
                                  color: "#F7F2EB",
                                }}
                              >
                                <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
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
                    <p
                      className="text-[10px] font-black uppercase tracking-widest"
                      style={{ color: "var(--co-accent)" }}
                    >
                      ✦ You might also like
                    </p>
                    <p
                      className="text-base font-black"
                      style={{ color: "var(--co-text)" }}
                    >
                      Pair it perfectly
                    </p>
                  </div>
                  <p
                    className="text-[11px]"
                    style={{ color: "var(--co-muted)" }}
                  >
                    {recommendationItems.length} picks
                  </p>
                </div>
                <div className="-mx-5 px-5">
                  <div
                    className="flex gap-3 overflow-x-auto pb-2"
                    style={{ scrollbarWidth: "none" }}
                  >
                    {recommendationItems.map((item) => (
                      <div
                        key={`reco-${item.id}`}
                        className="flex-none w-40 rounded-2xl overflow-hidden border"
                        style={{
                          ...themedSurfaceStyle,
                          borderColor: "#F0E9DF",
                        }}
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
                                  p.style.background =
                                    "linear-gradient(135deg,#667eea,#764ba2)";
                                  p.innerHTML =
                                    "<div style='display:flex;align-items:center;justify-content:center;height:100%;font-size:2.25rem'>🍽️</div>";
                                }
                              }}
                            />
                          ) : (
                            <div
                              className="w-full h-full flex items-center justify-center text-4xl"
                              style={{
                                background:
                                  "linear-gradient(135deg,#667eea,#764ba2)",
                              }}
                            >
                              🍽️
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <p
                            className="truncate text-xs font-bold"
                            style={{ color: "var(--co-text)" }}
                          >
                            {item.name}
                          </p>
                          <p
                            className="text-[11px] mt-0.5 font-semibold"
                            style={{ color: "var(--co-muted)" }}
                          >
                            ₹{formatPrice(item.offerPrice ?? item.price)}
                          </p>
                          <button
                            onClick={() =>
                              addItem(
                                item.id,
                                "",
                                Number(item.offerPrice ?? item.price),
                              )
                            }
                            className="mt-2.5 w-full rounded-xl py-1.5 text-[11px] font-black uppercase tracking-wider transition-all active:scale-95"
                            style={{
                              background: "var(--co-accent)",
                              color: "var(--co-accent-text)",
                            }}
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
              className="rounded-2xl overflow-hidden border"
              style={{
                ...themedSurfaceStyle,
                borderStyle: "dashed",
                borderWidth: "1.5px",
                borderColor: "#C9B89A",
              }}
            >
              <button
                type="button"
                onClick={async () => {
                  const next = !couponDrawerOpen;
                  setCouponDrawerOpen(next);
                  if (next && availableCoupons.length === 0) {
                    setCouponsLoading(true);
                    try {
                      const res = await api<{
                        offers?: AvailableCoupon[];
                        coupons?: AvailableCoupon[];
                      }>("/api/customer/offers");
                      setAvailableCoupons(res?.coupons || []);
                    } catch {
                      /* silent */
                    } finally {
                      setCouponsLoading(false);
                    }
                  }
                }}
                className="flex w-full items-center justify-between px-4 py-3.5"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">🏷️</span>
                  <div className="text-left">
                    <p
                      className="text-xs font-black uppercase tracking-widest"
                      style={{ color: "var(--co-accent)" }}
                    >
                      Coupons &amp; Offers
                    </p>
                    {couponDiscount > 0 ? (
                      <p className="text-sm font-bold text-emerald-600">
                        ✓ ₹{couponDiscount} saved!
                      </p>
                    ) : (
                      <p
                        className="text-sm font-medium"
                        style={{ color: "var(--co-muted)" }}
                      >
                        View available deals
                      </p>
                    )}
                  </div>
                </div>
                <ChevronRight
                  className={`h-4 w-4 transition-transform duration-300 ${couponDrawerOpen ? "rotate-90" : ""}`}
                  style={{ color: "var(--co-muted)" }}
                />
              </button>

              {couponDrawerOpen && (
                <div
                  className="border-t px-4 pb-4 pt-4 space-y-4"
                  style={{
                    borderColor:
                      "color-mix(in srgb, var(--co-accent) 20%, transparent)",
                  }}
                >
                  {couponsLoading ? (
                    <div
                      className="flex items-center justify-center py-5 gap-2"
                      style={{ color: "var(--co-muted)" }}
                    >
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-xs font-medium">
                        Finding deals…
                      </span>
                    </div>
                  ) : applicableCoupons.length > 0 ? (
                    <div>
                      <p
                        className="mb-2.5 text-[10px] font-black uppercase tracking-widest"
                        style={{ color: "var(--co-muted)" }}
                      >
                        Available Offers
                      </p>
                      <div
                        className="flex gap-3 overflow-x-auto pb-1"
                        style={{ scrollbarWidth: "none" }}
                      >
                        {applicableCoupons.map((c) => (
                          <motion.button
                            key={c.id}
                            type="button"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              setCouponCode(c.coupon_code);
                              setCouponDrawerOpen(false);
                              handleApplyCoupon(c.coupon_code);
                            }}
                            className="relative flex-none w-48 text-left rounded-xl overflow-hidden shadow-sm transition-all border border-[#F0E9DF] bg-[#FFFFFF]"
                          >
                            {/* Left Punch */}
                            <div className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#F7F2EB] border border-[#F0E9DF]" />
                            {/* Right Punch */}
                            <div className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#F7F2EB] border border-[#F0E9DF]" />
 
                            <div className="p-4 flex flex-col justify-between h-full">
                              {/* Top Part */}
                              <div>
                                <span className="inline-block px-2 py-0.5 bg-[#EDE5D8] border border-[#DDD5C5] rounded text-[9px] font-black uppercase tracking-widest text-[#3D2B1F]">
                                  {c.coupon_code}
                                </span>
                                <p className="mt-2 text-lg font-black text-[#3D2B1F] leading-none">
                                  {c.discount_type === "percent"
                                    ? `${c.discount_value}% OFF`
                                    : `₹${formatPrice(c.discount_value)} OFF`}
                                </p>
                              </div>
 
                              {/* Dashed Line */}
                              <div className="border-t-2 border-dashed border-[#F0E9DF] my-3" />
 
                              {/* Bottom Part */}
                              <div>
                                <p className="text-[10px] text-[#6B5B4E] leading-snug line-clamp-2">
                                  {c.description || c.name}
                                </p>
                                {c.min_order_value && (
                                  <p className="mt-1 text-[8px] font-black text-[#9B8677] uppercase tracking-wider">
                                    Min order ₹{formatPrice(c.min_order_value)}
                                  </p>
                                )}
                                <div className="mt-3 bg-[#3D2B1F] text-[#F7F2EB] text-[9px] font-black uppercase tracking-wider py-1.5 rounded text-center">
                                  Claim Ticket
                                </div>
                              </div>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p
                      className="text-center text-xs py-3"
                      style={{ color: "var(--co-muted)" }}
                    >
                      No active offers right now.
                    </p>
                  )}
                  <div>
                    <p
                      className="mb-2 text-[10px] font-black uppercase tracking-wider"
                      style={{ color: "var(--co-muted)" }}
                    >
                      Have a code?
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        value={couponCode}
                        onChange={(e) =>
                          setCouponCode(e.target.value.toUpperCase())
                        }
                        placeholder="ENTER CODE"
                        className="h-11 flex-1 rounded-xl border px-4 text-sm font-bold uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-[#3D2B1F] placeholder:font-normal placeholder:lowercase placeholder:tracking-normal"
                        style={{
                          borderColor: "#DDD5C5",
                          background: "#FFFFFF",
                          color: "var(--co-text)",
                        }}
                      />
                      <button
                        onClick={() => handleApplyCoupon()}
                        disabled={
                          isApplyingCoupon ||
                          !currentOrderId ||
                          !currentCartHasItems
                        }
                        className="h-11 rounded-xl px-5 text-xs font-black uppercase tracking-wider disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center"
                        style={{
                          background: "var(--co-accent)",
                          color: "var(--co-accent-text)",
                        }}
                      >
                        {isApplyingCoupon ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Apply"
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>
 
            {/* ── Bill Summary ──────────────────────────────────────────── */}
            <section
              className="co-receipt-card"
              style={{
                background: "var(--co-surface)",
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <ReceiptText
                  className="h-4 w-4"
                  style={{ color: "var(--co-muted)" }}
                />
                <p
                  className="text-[10px] font-black uppercase tracking-widest"
                  style={{ color: "var(--co-muted)" }}
                >
                  Bill Summary
                </p>
              </div>
              <div className="space-y-3">
                {hasPlacedOrders && previousOrdersTotal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: "var(--co-muted)" }}>
                      Previous orders
                    </span>
                    <span
                      className="font-mono font-bold"
                      style={{ color: "var(--co-text)" }}
                    >
                      ₹{previousOrdersTotal}
                    </span>
                  </div>
                )}
                {currentCartHasItems && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: "var(--co-muted)" }}>
                      Current cart
                    </span>
                    <span
                      className="font-mono font-bold"
                      style={{ color: "var(--co-text)" }}
                    >
                      ₹{cartSubtotal}
                    </span>
                  </div>
                )}
                {couponDiscount > 0 && (
                  <div className="flex justify-between items-center text-sm bg-[#EDE5D8]/50 border border-[#DDD5C5] rounded-xl px-3 py-2">
                    <span className="text-[#3D2B1F] font-bold flex items-center gap-1.5">
                      <span>🏷️</span> Coupon ({couponCode})
                    </span>
                    <span className="font-mono font-black text-[#3D2B1F]">
                      −₹{couponDiscount}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span style={{ color: "var(--co-muted)" }}>GST (5%)</span>
                  <span
                    className="font-mono font-bold"
                    style={{ color: "var(--co-text)" }}
                  >
                    ₹{tax}
                  </span>
                </div>
              </div>
              <div className="co-receipt-line" />
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className="text-[10px] font-black uppercase tracking-widest"
                    style={{ color: "var(--co-muted)" }}
                  >
                    Grand Total
                  </p>
                  <p
                    className="text-2xl font-black mt-0.5 font-mono"
                    style={{ color: "var(--co-text)" }}
                  >
                    ₹{grandTotal}
                  </p>
                </div>
                {couponDiscount > 0 && (
                  <div
                    className="rounded-xl px-3 py-1.5 text-xs font-black text-[#3D2B1F]"
                    style={{ background: "#EDE5D8" }}
                  >
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
          style={{
            background:
              "linear-gradient(to top, var(--co-bg) 60%, transparent)",
          }}
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
                {!billRequested && (
                  <button
                    onClick={async () => {
                      try {
                        await orderService.requestBill();
                        toast.success("Bill requested!");
                        const sessionId = localStorage.getItem("session_id");
                        if (sessionId) {
                          localStorage.setItem(`bill_requested_${sessionId}`, "true");
                        }
                        setBillRequested(true);
                      } catch (err: any) {
                        toast.error(err?.message || "Failed to request bill");
                      }
                    }}
                    className="flex-1 rounded-2xl py-4 text-sm font-bold shadow-xl transition-all active:scale-95"
                    style={{
                      background: "var(--co-accent)",
                      color: "var(--co-accent-text)",
                    }}
                  >
                    Request Bill
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={handlePlaceOrder}
                disabled={isPlacingOrder || isWaitingConfirmation}
                className="relative flex h-14 w-full items-center justify-between overflow-hidden rounded-2xl px-6 font-black shadow-2xl transition-all hover:scale-[1.01] hover:shadow-3xl hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-80"
                style={
                  isWaitingConfirmation
                    ? { background: "#F59E0B", color: "#fff" }
                    : {
                        background: "var(--co-accent)",
                        color: "var(--co-accent-text)",
                      }
                }
              >
                {isWaitingConfirmation ? (
                  <div className="flex w-full items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Waiting for confirmation…</span>
                  </div>
                ) : isPlacingOrder || isSyncingAfterPlace ? (
                  <div className="flex w-full items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>
                      {isSyncingAfterPlace ? "Updating…" : "Processing…"}
                    </span>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="text-[9px] uppercase tracking-widest opacity-70 leading-none">
                        Total
                      </p>
                      <p className="text-base font-black leading-tight">
                        ₹{grandTotal}
                      </p>
                    </div>
                    <span className="text-sm font-black uppercase tracking-widest">
                      Place Order
                    </span>
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
