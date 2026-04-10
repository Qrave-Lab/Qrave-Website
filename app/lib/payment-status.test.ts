import { describe, expect, it } from "vitest";
import { normalizePaymentMode, paymentLabel, paymentStatusLabel } from "./payment-status";

describe("payment status helpers", () => {
  it("renders payment labels", () => {
    expect(paymentLabel(undefined)).toBe("PAY LATER");
    expect(paymentLabel("later")).toBe("PAY LATER");
    expect(paymentLabel("upi")).toBe("UPI");
    expect(paymentLabel("cash")).toBe("CASH");
    expect(paymentLabel("card")).toBe("CARD");
  });

  it("renders payment status labels", () => {
    expect(paymentStatusLabel("unpaid", "cash")).toBe("PAY LATER");
    expect(paymentStatusLabel("partially_paid", "cash")).toBe("PARTIALLY PAID");
    expect(paymentStatusLabel("paid", "cash")).toBe("CASH");
    expect(paymentStatusLabel("paid", "upi")).toBe("UPI");
    expect(paymentStatusLabel("refunded", "cash")).toBe("REFUNDED");
    expect(paymentStatusLabel("voided", "cash")).toBe("VOIDED");
  });

  it("normalizes mark later mode to backend empty value", () => {
    expect(normalizePaymentMode(undefined)).toBe("");
    expect(normalizePaymentMode("later")).toBe("");
    expect(normalizePaymentMode("  CARD  ")).toBe("card");
  });
});
