import { api } from "@/app/lib/api";

export type AREvent = "view_3d" | "ar_open" | "ar_unsupported";

const sent = new Set<string>();

type ARSink = (menuItemId: string, event: AREvent) => void;
let sink: ARSink | null = null;

/**
 * Sends AR events somewhere other than the table-session endpoint, e.g. food
 * court pages, which have no session. Pass null to restore the default.
 */
export function setARSink(next: ARSink | null): void {
  sink = next;
}

/** Records 3D/AR usage for the owner's stats. Fire-and-forget, once per dish per page visit. */
export function trackAR(menuItemId: string | undefined, event: AREvent): void {
  if (!menuItemId) return;
  const key = `${menuItemId}:${event}`;
  if (sent.has(key)) return;
  sent.add(key);
  if (sink) {
    sink(menuItemId, event);
    return;
  }
  void api("/api/customer/ar-events", {
    method: "POST",
    body: JSON.stringify({ menu_item_id: menuItemId, event }),
    suppressErrorLog: true,
    skipAuthRedirect: true,
  } as any).catch(() => sent.delete(key));
}

const HINT_KEY = "qrave_ar_hint_seen";

export function arHintSeen(): boolean {
  try {
    return window.localStorage.getItem(HINT_KEY) === "1";
  } catch {
    return true;
  }
}

export function markArHintSeen(): void {
  try {
    window.localStorage.setItem(HINT_KEY, "1");
  } catch {
    // private mode: hint just shows again next time
  }
}
