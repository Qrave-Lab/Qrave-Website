"use client";

import React, { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  UtensilsCrossed,
  Trash2,
  Clock3,
  X,
  CreditCard,
  QrCode,
  Wallet,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCartStore, type Order } from "@/stores/cartStore";

// --- Types ---
type Macros = {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
};

type Variant = {
  id: string;
  name: string;
  priceDelta: number;
};

type MenuItem = {
  id: number;
  name: string;
  category: string;
  price: number;
  description: string;
  image: string;
  isVeg: boolean;
  rating: number;
  arModelGlb: string | null;
  arModelUsdz?: string | null;
  macros?: Macros;
  allergens?: string[];
  isAvailable?: boolean;
  isBestseller?: boolean;
  isSpicy?: boolean;
  variants?: Variant[];
};

// --- Data ---
const menuItems: MenuItem[] = [
  {
    id: 101,
    name: "Truffle Fries",
    category: "starters",
    price: 249,
    description: "Shoestring fries tossed with truffle oil and parmesan.",
    image:
      "https://images.unsplash.com/photo-1573080496987-a199f8cd4054?w=800&q=80",
    isVeg: true,
    rating: 4.8,
    arModelGlb: "/models/pizza.glb",
    arModelUsdz: "/models/Pizza.usdz",
    macros: { calories: 420, protein: 6, carbs: 45, fats: 24 },
    allergens: ["Gluten", "Dairy"],
    isAvailable: true,
    isBestseller: true,
    isSpicy: false,
    variants: [
      { id: "regular", name: "Regular", priceDelta: 0 },
      { id: "large", name: "Large", priceDelta: 60 },
    ],
  },
  {
    id: 201,
    name: "Grilled Salmon",
    category: "main-course",
    price: 699,
    description: "Atlantic salmon with asparagus and lemon butter sauce.",
    image:
      "https://images.unsplash.com/photo-1467003909585-2f8a7270028d?w=800&q=80",
    isVeg: false,
    rating: 4.9,
    arModelGlb: null,
    arModelUsdz: null,
    macros: { calories: 520, protein: 38, carbs: 10, fats: 32 },
    allergens: ["Fish"],
    isAvailable: false,
    isBestseller: false,
    isSpicy: false,
  },
  {
    id: 202,
    name: "Ribeye Steak",
    category: "main-course",
    price: 899,
    description: "Premium cut served with mashed potatoes.",
    image:
      "https://images.unsplash.com/photo-1600891964092-4316c288032e?w=800&q=80",
    isVeg: false,
    rating: 4.8,
    arModelGlb: null,
    arModelUsdz: null,
    macros: { calories: 780, protein: 45, carbs: 18, fats: 52 },
    allergens: ["Dairy"],
    isAvailable: true,
    isBestseller: true,
    isSpicy: false,
    variants: [
      { id: "250g", name: "250g", priceDelta: 0 },
      { id: "350g", name: "350g", priceDelta: 150 },
    ],
  },
  {
    id: 301,
    name: "Burrata Pizza",
    category: "pizza-pasta",
    price: 499,
    description:
      "San Marzano tomato sauce, fresh basil, creamy burrata.",
    image:
      "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=80",
    isVeg: true,
    rating: 4.7,
    arModelGlb: null,
    arModelUsdz: null,
    macros: { calories: 640, protein: 22, carbs: 70, fats: 28 },
    allergens: ["Gluten", "Dairy"],
    isAvailable: true,
    isBestseller: true,
    isSpicy: false,
    variants: [
      { id: "personal", name: "Personal", priceDelta: 0 },
      { id: "medium", name: "Medium", priceDelta: 120 },
      { id: "large", name: "Large", priceDelta: 220 },
    ],
  },
  {
    id: 401,
    name: "Smash Burger",
    category: "burgers",
    price: 349,
    description: "Double beef patty, cheddar, onions, secret sauce.",
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80",
    isVeg: false,
    rating: 4.6,
    arModelGlb: "/models/burger.glb",
    arModelUsdz: "/models/burger.usdz",
    macros: { calories: 680, protein: 32, carbs: 38, fats: 42 },
    allergens: ["Gluten", "Dairy", "Egg"],
    isAvailable: true,
    isBestseller: true,
    isSpicy: true,
    variants: [
      { id: "single", name: "Single Patty", priceDelta: 0 },
      { id: "double", name: "Double Patty", priceDelta: 80 },
    ],
  },
  {
    id: 501,
    name: "Tiramisu",
    category: "desserts",
    price: 299,
    description:
      "Classic Italian dessert with mascarpone and espresso.",
    image:
      "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=500&q=80",
    isVeg: true,
    rating: 4.9,
    arModelGlb: null,
    arModelUsdz: null,
    macros: { calories: 380, protein: 7, carbs: 42, fats: 20 },
    allergens: ["Dairy", "Egg", "Gluten"],
    isAvailable: true,
    isBestseller: false,
    isSpicy: false,
  },
];

const getItemPrice = (item: MenuItem, variantId?: string) => {
  const variant = item.variants?.find((v) => v.id === variantId);
  return item.price + (variant?.priceDelta || 0);
};

type CartLine = {
  key: string;
  item: MenuItem;
  variant?: Variant;
  variantId?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

type PaymentMethod = "pay_at_counter" | "upi" | "card";

const CheckoutPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tableParam = searchParams.get("table");
  const tableNumber = tableParam || "7";

  const cart = useCartStore((state) => state.cart);
  const addItem = useCartStore((state) => state.addItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);

  const orders = useCartStore((state) => state.orders);
  const addOrder = useCartStore((state) => state.addOrder);

  const [note, setNote] = useState("");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [isOrderSuccess, setIsOrderSuccess] = useState(false);

  // New: checkout flow states
  const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>("pay_at_counter");

  const lines: CartLine[] = useMemo(() => {
    return Object.entries(cart)
      .map(([key, quantity]) => {
        if (quantity <= 0) return null;
        const [itemIdStr, variantIdRaw] = key.split("::");
        const item = menuItems.find(
          (i) => i.id === Number(itemIdStr)
        );
        if (!item) return null;
        const variantId =
          variantIdRaw === "default" ? undefined : variantIdRaw;
        const variant = variantId
          ? item.variants?.find((v) => v.id === variantId)
          : undefined;
        const unitPrice = getItemPrice(item, variantId);
        const lineTotal = unitPrice * quantity;
        return {
          key,
          item,
          variant,
          variantId,
          quantity,
          unitPrice,
          lineTotal,
        };
      })
      .filter((x): x is CartLine => x !== null);
  }, [cart]);

  const tableOrders: Order[] = useMemo(() => {
    const all = Object.values(orders).filter(
      (o) => o.tableNumber === tableNumber
    );
    return all.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [orders, tableNumber]);

  const hasServiceChargeAlready = tableOrders.some(
    (o) => (o.serviceCharge ?? 0) > 0
  );

  const hasPendingOrderForTable = tableOrders.some(
    (o) => o.status === "pending"
  );

  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const cgst = Math.round(subtotal * 0.025);
  const sgst = Math.round(subtotal * 0.025);
  const tax = cgst + sgst;
  const serviceCharge =
    subtotal > 0 && !hasServiceChargeAlready ? 20 : 0;
  const grandTotal = subtotal + tax + serviceCharge;
  const totalItems = lines.reduce(
    (sum, l) => sum + l.quantity,
    0
  );

  const existingBillTotal = tableOrders
    .filter((o) => o.status !== "pending")
    .reduce((sum, o) => sum + o.total, 0);

  const fullBillIfPlaced = existingBillTotal + grandTotal;

  const handlePlaceOrder = () => {
    if (lines.length === 0 || isPlacingOrder || hasPendingOrderForTable)
      return;
    setIsPlacingOrder(true);
    setIsOrderSuccess(false);
    const orderId = `NOIR-${Date.now().toString().slice(-6)}`;
    const order: Order = {
      id: orderId,
      tableNumber,
      note,
      paymentMethod: "pay_at_counter", // internal default; not shown in UI
      subtotal,
      cgst,
      sgst,
      tax,
      serviceCharge,
      total: grandTotal,
      items: lines.map((l) => ({
        itemId: l.item.id,
        name: l.item.name,
        variantId: l.variantId,
        variantName: l.variant?.name,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        lineTotal: l.lineTotal,
      })),
      createdAt: new Date().toISOString(),
      status: "pending",
    };
    addOrder(order);
    clearCart();
    setIsPlacingOrder(false);
    setIsOrderSuccess(true);
    setNote("");
  };

  const isButtonDisabled =
    lines.length === 0 || isPlacingOrder || hasPendingOrderForTable;

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleCheckoutClick = () => {
    setShowCheckoutConfirm(true);
  };

  const handleCheckoutConfirm = () => {
    setShowCheckoutConfirm(false);
    setShowPaymentMethods(true);
  };

  const handleCompletePayment = () => {
    // Hook this into your real payment flow:
    // e.g. router.push(`/payment?table=${tableNumber}&method=${selectedPaymentMethod}`)
    // or update a "paid" flag in your store.
    console.log(
      "Complete payment for table",
      tableNumber,
      "with method",
      selectedPaymentMethod
    );
    setShowPaymentMethods(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors font-medium"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-md">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
            <div className="text-right">
              <p className="text-sm font-bold tracking-tight">NOIR.</p>
              <p className="text-xs text-slate-500">
                Table #{tableNumber}
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-md mx-auto px-4 pt-4 pb-32 space-y-4">
        {/* Previous Orders List */}
        {tableOrders.length > 0 && (
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-semibold text-slate-900">
                Previous orders
              </p>
              <span className="text-xs text-slate-500">
                Table #{tableNumber}
              </span>
            </div>

            <div className="space-y-2.5">
              {tableOrders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-semibold text-slate-900">
                        #{order.id}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock3 className="w-3 h-3" />
                        {formatTime(order.createdAt)}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs font-bold text-slate-900">
                        ₹{order.total}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                          order.status === "pending"
                            ? "border-sky-400 bg-sky-50 text-sky-700"
                            : order.status === "preparing"
                            ? "border-amber-400 bg-amber-50 text-amber-700"
                            : order.status === "served"
                            ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                            : "border-slate-300 bg-slate-50 text-slate-700"
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                  </div>

                  {order.items && order.items.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {order.items.map((item) => (
                        <span
                          key={`${order.id}-${item.itemId}-${item.variantId ?? "default"}`}
                          className="text-xs px-2.5 py-1 rounded-lg bg-white text-slate-700 border border-slate-200 font-medium"
                        >
                          {item.name}
                          {item.variantName
                            ? ` (${item.variantName})`
                            : ""}{" "}
                          × {item.quantity}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <p className="text-xs font-medium text-slate-600">
                Current table bill
              </p>
              <p className="text-sm font-bold text-slate-900">
                ₹{existingBillTotal}
              </p>
            </div>
          </section>
        )}

        {/* Current Cart / Empty State */}
        {lines.length === 0 ? (
          tableOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-full bg-white shadow-md flex items-center justify-center mb-4">
                <UtensilsCrossed className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-800 mb-1">
                Your cart is empty
              </p>
              <p className="text-xs text-slate-500 mb-5 max-w-xs">
                Add some delicious dishes from the menu to place an order.
              </p>
              <button
                onClick={() => router.push(`/menu`)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all"
              >
                Browse menu
              </button>
            </div>
          ) : null
        ) : (
          <>
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-3">
              <div className="flex items-center justify-between pb-1">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    New order items
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {totalItems} item{totalItems > 1 && "s"}
                  </p>
                </div>
                <button
                  onClick={() => clearCart()}
                  className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {lines.map((line) => (
                  <div
                    key={line.key}
                    className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-200 flex-shrink-0">
                      <img
                        src={line.item.image}
                        alt={line.item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-slate-900">
                              {line.item.name}
                            </p>
                            {line.variant && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-medium">
                                {line.variant.name}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            ₹{line.unitPrice} × {line.quantity}
                          </p>
                        </div>

                        <span
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            line.item.isVeg
                              ? "border-green-600"
                              : "border-red-600"
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              line.item.isVeg
                                ? "bg-green-600"
                                : "bg-red-600"
                            }`}
                          />
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center h-8 bg-slate-900 text-white rounded-full overflow-hidden">
                          <button
                            onClick={() =>
                              removeItem(line.item.id, line.variantId)
                            }
                            className="w-8 h-full flex items-center justify-center hover:bg-white/10 transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="min-w-[2.5rem] text-center text-sm font-medium">
                            {line.quantity}
                          </span>
                          <button
                            onClick={() =>
                              addItem(line.item.id, line.variantId)
                            }
                            className="w-8 h-full flex items-center justify-center hover:bg-white/10 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-sm font-bold text-slate-900">
                          ₹{line.lineTotal}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-slate-500 pt-1 text-center">
                Fresh preparation • ~20 mins
              </p>
            </section>

            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-2.5">
              <p className="text-sm font-semibold text-slate-900 pb-1">
                Bill summary
              </p>

              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-600">Items total</p>
                <p className="text-sm font-medium text-slate-800">
                  ₹{subtotal}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-600">CGST (2.5%)</p>
                <p className="text-sm font-medium text-slate-800">
                  ₹{cgst}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-600">SGST (2.5%)</p>
                <p className="text-sm font-medium text-slate-800">
                  ₹{sgst}
                </p>
              </div>
              {serviceCharge > 0 && (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-600">
                    Service charge
                  </p>
                  <p className="text-sm font-medium text-slate-800">
                    ₹{serviceCharge}
                  </p>
                </div>
              )}

              <div className="border-t border-slate-200 my-2" />

              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-900">
                  This order total
                </p>
                <p className="text-lg font-bold text-slate-900">
                  ₹{grandTotal}
                </p>
              </div>

              {existingBillTotal > 0 && (
                <>
                  <div className="border-t border-dashed border-slate-200 my-2" />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-600">
                      Previous orders
                    </p>
                    <p className="text-sm font-medium text-slate-800">
                      ₹{existingBillTotal}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-sm font-bold text-slate-900">
                      Table total after placing
                    </p>
                    <p className="text-lg font-bold text-emerald-600">
                      ₹{fullBillIfPlaced}
                    </p>
                  </div>
                </>
              )}
            </section>
            {/* Payment section intentionally hidden until final checkout */}
          </>
        )}
      </main>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-lg">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex-1">
            {lines.length > 0 ? (
              <>
                <p className="text-xs text-slate-500">
                  New order: ₹{grandTotal}
                  {existingBillTotal > 0 &&
                    ` • Previous: ₹${existingBillTotal}`}
                </p>
                <p className="text-base font-bold text-slate-900">
                  {existingBillTotal > 0
                    ? `Table total: ₹${fullBillIfPlaced}`
                    : `Total: ₹${grandTotal}`}
                </p>
              </>
            ) : tableOrders.length > 0 ? (
              <>
                <p className="text-xs text-slate-500">
                  Current table bill
                </p>
                <p className="text-base font-bold text-slate-900">
                  ₹{existingBillTotal}
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-500">Cart is empty</p>
            )}
          </div>

          {lines.length > 0 ? (
            <button
              onClick={handlePlaceOrder}
              disabled={isButtonDisabled}
              className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg active:scale-95 ${
                isPlacingOrder
                  ? "bg-slate-800 text-white"
                  : "bg-slate-900 text-white"
              }`}
            >
              {hasPendingOrderForTable ? (
                <span>Waiting for counter...</span>
              ) : isPlacingOrder ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Placing...</span>
                </>
              ) : (
                <>
                  <span>Place order</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          ) : tableOrders.length > 0 ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  router.push(`/?table=${tableNumber}`)
                }
                className="px-3 py-2.5 rounded-xl border-2 border-slate-300 text-xs sm:text-sm font-semibold text-slate-800 bg-white hover:bg-slate-50 transition-colors"
              >
                Add more
              </button>
              <button
                onClick={handleCheckoutClick}
                className="px-4 py-2.5 rounded-xl bg-slate-900 text-xs sm:text-sm font-bold text-white shadow-md hover:shadow-lg active:scale-95 transition-all"
              >
                Checkout
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Confirm Checkout Modal */}
      {showCheckoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-slate-900">
                Confirm checkout
              </p>
              <button
                onClick={() => setShowCheckoutConfirm(false)}
                className="p-1 rounded-full hover:bg-slate-100"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <p className="text-xs text-slate-600 mb-4">
              You&apos;re about to request the final bill for{" "}
              <span className="font-semibold">
                Table #{tableNumber}
              </span>
              . You won&apos;t be able to add this to an existing order
              after payment is completed.
            </p>

            <div className="flex items-center justify-end gap-2 mt-1">
              <button
                onClick={() => setShowCheckoutConfirm(false)}
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCheckoutConfirm}
                className="px-4 py-2 rounded-xl bg-slate-900 text-xs font-bold text-white shadow-sm hover:shadow-md active:scale-95 transition-all"
              >
                Continue to payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Method Modal */}
      {showPaymentMethods && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">
                Select payment method
              </p>
              <button
                onClick={() => setShowPaymentMethods(false)}
                className="p-1 rounded-full hover:bg-slate-100"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Settle the bill of{" "}
              <span className="font-semibold">
                ₹{existingBillTotal}
              </span>{" "}
              for Table #{tableNumber}.
            </p>

            <div className="space-y-2">
              <button
                onClick={() =>
                  setSelectedPaymentMethod("pay_at_counter")
                }
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs sm:text-sm ${
                  selectedPaymentMethod === "pay_at_counter"
                    ? "border-slate-900 bg-slate-900/5"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-slate-700" />
                  <div className="flex flex-col items-start">
                    <span className="font-medium text-slate-900">
                      Pay at counter
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Settle with staff at the counter
                    </span>
                  </div>
                </div>
                <span className="w-3 h-3 rounded-full border border-slate-400 flex items-center justify-center">
                  {selectedPaymentMethod === "pay_at_counter" && (
                    <span className="w-2 h-2 rounded-full bg-slate-900" />
                  )}
                </span>
              </button>

              <button
                onClick={() => setSelectedPaymentMethod("upi")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs sm:text-sm ${
                  selectedPaymentMethod === "upi"
                    ? "border-slate-900 bg-slate-900/5"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-slate-700" />
                  <div className="flex flex-col items-start">
                    <span className="font-medium text-slate-900">
                      UPI / QR
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Scan QR and pay via UPI
                    </span>
                  </div>
                </div>
                <span className="w-3 h-3 rounded-full border border-slate-400 flex items-center justify-center">
                  {selectedPaymentMethod === "upi" && (
                    <span className="w-2 h-2 rounded-full bg-slate-900" />
                  )}
                </span>
              </button>

              <button
                onClick={() => setSelectedPaymentMethod("card")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs sm:text-sm ${
                  selectedPaymentMethod === "card"
                    ? "border-slate-900 bg-slate-900/5"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-slate-700" />
                  <div className="flex flex-col items-start">
                    <span className="font-medium text-slate-900">
                      Card
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Pay using debit / credit card
                    </span>
                  </div>
                </div>
                <span className="w-3 h-3 rounded-full border border-slate-400 flex items-center justify-center">
                  {selectedPaymentMethod === "card" && (
                    <span className="w-2 h-2 rounded-full bg-slate-900" />
                  )}
                </span>
              </button>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowPaymentMethods(false)}
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Back
              </button>
              <button
                onClick={handleCompletePayment}
                className="px-4 py-2 rounded-xl bg-slate-900 text-xs font-bold text-white shadow-sm hover:shadow-md active:scale-95 transition-all"
              >
                Confirm &amp; pay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutPage;
