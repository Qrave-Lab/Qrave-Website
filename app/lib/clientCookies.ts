import {
  getTokenCookie as serverGet,
  setTokenCookie as serverSet,
  removeTokenCookie as serverRemove,
} from "./cookies";

// The guest cookies are httpOnly, so the browser can only read them through a
// server action. Server actions run one at a time, so reading them on every
// API call made each add-to-cart wait behind several round trips. Keep a copy
// in memory: reads after the first are instant, and writes update the copy
// before the server action that stores the cookie.
//
// Only the guest-session cookies are cached. csrf_token is also set by the
// backend through Set-Cookie on staff login, so it is always read fresh.
const CACHED = new Set(["session_id", "order_id"]);

const values = new Map<string, string | null>();
const pendingReads = new Map<string, Promise<string | null>>();

const isBrowser = () => typeof window !== "undefined";

export async function getTokenCookie(name: string): Promise<string | null> {
  if (!isBrowser() || !CACHED.has(name)) {
    return serverGet(name);
  }
  if (values.has(name)) return values.get(name) ?? null;

  const inFlight = pendingReads.get(name);
  if (inFlight) return inFlight;

  const read = serverGet(name)
    .then((value) => {
      // A write that landed while this read was in flight wins.
      if (!values.has(name)) values.set(name, value);
      return values.get(name) ?? null;
    })
    .finally(() => pendingReads.delete(name));
  pendingReads.set(name, read);
  return read;
}

export async function setTokenCookie(name: string, value: string): Promise<void> {
  if (isBrowser() && CACHED.has(name)) values.set(name, value);
  await serverSet(name, value);
}

export async function removeTokenCookie(name: string): Promise<void> {
  if (isBrowser() && CACHED.has(name)) values.set(name, null);
  await serverRemove(name);
}
