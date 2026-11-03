// In-page order alerts for guests. These fire while the menu is open or
// backgrounded in the browser/installed app; they are not server push.

export function canNotify(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notifyPermission(): NotificationPermission | "unsupported" {
  return canNotify() ? Notification.permission : "unsupported";
}

export async function requestNotifyPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!canNotify()) return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export async function notifyGuest(title: string, body: string, tag: string): Promise<void> {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.([200, 100, 200]);
    if (notifyPermission() !== "granted") return;
    const opts: NotificationOptions = { body, tag, icon: "/pwa-icon/192", data: { url: window.location.pathname } };
    const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (reg) await reg.showNotification(title, opts);
    else new Notification(title, opts);
  } catch {
    /* alerts are best-effort */
  }
}
