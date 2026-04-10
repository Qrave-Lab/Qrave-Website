export type PaymentStatus = "unpaid" | "partially_paid" | "paid" | "refunded" | "voided";

export function paymentLabel(mode?: string): string {
  const raw = String(mode || "").toLowerCase();
  if (!raw || raw === "later") return "PAY LATER";
  if (raw === "upi") return "UPI";
  return raw.toUpperCase();
}

export function paymentStatusLabel(status?: string, mode?: string): string {
  const s = String(status || "").toLowerCase();
  if (s === "paid") return paymentLabel(mode);
  if (s === "partially_paid") return "PARTIALLY PAID";
  if (s === "refunded") return "REFUNDED";
  if (s === "voided") return "VOIDED";
  return "PAY LATER";
}

export function normalizePaymentMode(mode?: string): string {
  const m = String(mode || "").trim().toLowerCase();
  if (!m || m === "later") return "";
  return m;
}
