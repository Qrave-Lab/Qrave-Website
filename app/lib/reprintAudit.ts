
/**
 * Log a receipt reprint event to the backend for audit purposes.
 * Fails silently if the endpoint does not exist (graceful degradation).
 */
export async function logReprint(params: {
  orderId?: string;
  sessionId?: string;
  invoiceId?: string;
  cashierName?: string;
  reprintType?: "bill" | "invoice" | "refund";
}): Promise<void> {
  try {
    const body = JSON.stringify({
      order_id: params.orderId || null,
      session_id: params.sessionId || null,
      invoice_id: params.invoiceId || null,
      reprinted_by: params.cashierName || "Unknown",
      reprinted_at: new Date().toISOString(),
      reprint_type: params.reprintType || "bill",
    });
    const res = await fetch("/api/proxy/api/admin/bills/reprint-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      credentials: "include",
    });
    // Silently ignore 404 — endpoint may not be deployed yet
    if (!res.ok && res.status !== 404) {
      console.warn("[reprintAudit] Audit log failed:", res.status);
    }
  } catch {
    // Never throw — audit must never block printing
  }
}
