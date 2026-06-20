"use client";

export type OfflineEventStatus =
  | "pending"
  | "syncing"
  | "synced"
  | "failed"
  | "manual_review";

export type OfflineEvent = {
  id: string;
  local_id: string;
  idempotency_key: string;
  type: string;
  payload: Record<string, unknown>;
  status: OfflineEventStatus;
  retry_count: number;
  last_error: string | null;
  last_attempt_at: string | null;
  synced_at: string | null;
  server_order_id: string | null;
  created_at: string;
  updated_at: string;
};

export type OfflineEventStatusUpdate = {
  id?: string;
  local_id?: string;
  status?: OfflineEventStatus;
  increment_retry?: boolean;
  last_error?: string | null;
  last_attempt_at?: string;
  synced_at?: string;
  server_order_id?: string | null;
};

type ApiCacheRecord = {
  key: string;
  data: unknown;
  expiresAt: number;
  updatedAt: string;
};

type NamedCacheRecord = {
  key: string;
  value: unknown;
  updatedAt: string;
};

const DB_NAME = "qrave_pos_offline";
const DB_VERSION = 1;
const API_CACHE_STORE = "api_cache";
const NAMED_CACHE_STORE = "named_cache";
const OFFLINE_EVENTS_STORE = "offline_events";
const IDEMPOTENCY_INDEX = "by_idempotency_key";
const STATUS_INDEX = "by_status";

let dbPromise: Promise<IDBDatabase> | null = null;

function canUseIndexedDb() {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function openDb(): Promise<IDBDatabase> {
  if (!canUseIndexedDb()) {
    return Promise.reject(new Error("IndexedDB is not available in this environment."));
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(API_CACHE_STORE)) {
        db.createObjectStore(API_CACHE_STORE, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(NAMED_CACHE_STORE)) {
        db.createObjectStore(NAMED_CACHE_STORE, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(OFFLINE_EVENTS_STORE)) {
        const eventStore = db.createObjectStore(OFFLINE_EVENTS_STORE, {
          keyPath: "local_id",
        });
        eventStore.createIndex(IDEMPOTENCY_INDEX, "idempotency_key", {
          unique: true,
        });
        eventStore.createIndex(STATUS_INDEX, "status", { unique: false });
      }
    };

    request.onerror = () => reject(request.error || new Error("Failed to open IndexedDB."));
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
  });

  return dbPromise;
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = fn(store);
    let result: T;

    if (request) {
      request.onsuccess = () => {
        result = request.result;
      };
      request.onerror = () => reject(request.error || tx.error);
    }

    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error || new Error(`IndexedDB transaction failed for ${storeName}.`));
    tx.onabort = () => reject(tx.error || new Error(`IndexedDB transaction aborted for ${storeName}.`));
  });
}

function dispatchQueueUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("sync-queue-updated"));
  }
}

export async function getApiCache<T>(key: string): Promise<{ data: T; expiresAt: number } | null> {
  try {
    const record = await withStore<ApiCacheRecord | undefined>(
      API_CACHE_STORE,
      "readonly",
      (store) => store.get(key),
    );
    if (!record) return null;
    return { data: record.data as T, expiresAt: record.expiresAt };
  } catch {
    return null;
  }
}

export async function setApiCache(key: string, data: unknown, expiresAt: number): Promise<void> {
  try {
    await withStore(API_CACHE_STORE, "readwrite", (store) =>
      store.put({ key, data, expiresAt, updatedAt: new Date().toISOString() }),
    );
  } catch {
    // Cache writes should never break the POS flow.
  }
}

export async function bustApiCache(prefix: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(API_CACHE_STORE, "readwrite");
      const store = tx.objectStore(API_CACHE_STORE);
      const request = store.openCursor();

      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        if (String(cursor.key).startsWith(prefix)) {
          cursor.delete();
        }
        cursor.continue();
      };
      request.onerror = () => reject(request.error || tx.error);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Failed to bust API cache."));
    });
  } catch {
    // Best-effort cache invalidation.
  }
}

export async function getNamedCache<T>(key: string, fallback: T): Promise<T> {
  try {
    const record = await withStore<NamedCacheRecord | undefined>(
      NAMED_CACHE_STORE,
      "readonly",
      (store) => store.get(key),
    );
    return record ? (record.value as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function setNamedCache(key: string, value: unknown): Promise<void> {
  try {
    await withStore(NAMED_CACHE_STORE, "readwrite", (store) =>
      store.put({ key, value, updatedAt: new Date().toISOString() }),
    );
  } catch {
    // Page caches are opportunistic.
  }
}

export async function queueOfflineEvent(payload: Record<string, unknown>) {
  const localId = String(payload.local_order_id || crypto.randomUUID());
  const idempotencyKey = String(payload.idempotency_key || "").trim();
  if (!idempotencyKey) {
    return { ok: false, error: "Missing idempotency_key" };
  }

  try {
    const db = await openDb();
    const now = new Date().toISOString();
    const existing = await new Promise<OfflineEvent | undefined>((resolve, reject) => {
      const tx = db.transaction(OFFLINE_EVENTS_STORE, "readonly");
      const index = tx.objectStore(OFFLINE_EVENTS_STORE).index(IDEMPOTENCY_INDEX);
      const request = index.get(idempotencyKey);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || tx.error);
    });

    if (existing) {
      dispatchQueueUpdated();
      return { ok: true, duplicate: true, id: existing.local_id };
    }

    const event: OfflineEvent = {
      id: localId,
      local_id: localId,
      idempotency_key: idempotencyKey,
      type: String(payload.type || "CREATE_ORDER"),
      payload,
      status: "pending",
      retry_count: 0,
      last_error: null,
      last_attempt_at: null,
      synced_at: null,
      server_order_id: null,
      created_at: now,
      updated_at: now,
    };

    await withStore(OFFLINE_EVENTS_STORE, "readwrite", (store) => store.add(event));
    dispatchQueueUpdated();
    return { ok: true, id: event.local_id };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to save offline event",
    };
  }
}

export async function getOfflineQueueStatus() {
  try {
    const events = await withStore<OfflineEvent[]>(
      OFFLINE_EVENTS_STORE,
      "readonly",
      (store) => store.getAll(),
    );
    const queue = (events || []).filter((event) =>
      ["pending", "failed", "syncing", "manual_review"].includes(event.status),
    );
    return {
      count: queue.filter((event) =>
        event.status === "pending" ||
        event.status === "failed" ||
        event.status === "syncing",
      ).length,
      failedCount: queue.filter((event) => event.status === "manual_review").length,
      queue: queue.sort((a, b) => a.created_at.localeCompare(b.created_at)),
    };
  } catch {
    return { count: 0, failedCount: 0, queue: [] as OfflineEvent[] };
  }
}

export async function updateOfflineEventStatus(input: OfflineEventStatusUpdate) {
  const localId = String(input.local_id || input.id || "");
  if (!localId) return { ok: false, error: "Missing local_id" };

  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(OFFLINE_EVENTS_STORE, "readwrite");
      const store = tx.objectStore(OFFLINE_EVENTS_STORE);
      const request = store.get(localId);

      request.onsuccess = () => {
        const event = request.result as OfflineEvent | undefined;
        if (!event) {
          reject(new Error("Offline event not found"));
          return;
        }
        const next: OfflineEvent = {
          ...event,
          status: input.status || event.status,
          retry_count: input.increment_retry ? Number(event.retry_count || 0) + 1 : Number(event.retry_count || 0),
          last_error: Object.prototype.hasOwnProperty.call(input, "last_error")
            ? input.last_error ?? null
            : event.last_error,
          last_attempt_at: input.last_attempt_at || event.last_attempt_at,
          synced_at: input.synced_at || event.synced_at,
          server_order_id: Object.prototype.hasOwnProperty.call(input, "server_order_id")
            ? input.server_order_id ?? null
            : event.server_order_id,
          updated_at: new Date().toISOString(),
        };
        store.put(next);
      };
      request.onerror = () => reject(request.error || tx.error);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Failed to update offline event."));
    });
    dispatchQueueUpdated();
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to update offline event",
    };
  }
}

export async function removeSyncedOfflineEvents(syncedIds: string[]) {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(OFFLINE_EVENTS_STORE, "readwrite");
      const store = tx.objectStore(OFFLINE_EVENTS_STORE);
      syncedIds.forEach((id) => store.delete(id));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Failed to remove synced events."));
    });
    dispatchQueueUpdated();
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to remove synced events",
    };
  }
}
