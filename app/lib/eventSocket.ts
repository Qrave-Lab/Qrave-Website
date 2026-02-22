export type EventSocketMessage = {
  type?: string;
  data?: unknown;
  [key: string]: unknown;
};

type ConnectParams = {
  baseUrl: string;
  getToken: () => Promise<string | null>;
  onMessage: (message: EventSocketMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
};

function normalizeWsBase(rawBase: string): string {
  const trimmed = rawBase.trim().replace(/\/+$/, "");
  if (trimmed.startsWith("wss://") || trimmed.startsWith("ws://")) {
    return trimmed;
  }
  if (trimmed.startsWith("https://")) {
    return `wss://${trimmed.slice("https://".length)}`;
  }
  if (trimmed.startsWith("http://")) {
    return `ws://${trimmed.slice("http://".length)}`;
  }
  return `wss://${trimmed}`;
}

export function connectEventSocket(params: ConnectParams): () => void {
  const { baseUrl, getToken, onMessage, onOpen, onClose } = params;
  const wsBase = normalizeWsBase(baseUrl);

  let disposed = false;
  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let retryCount = 0;

  const clearReconnect = () => {
    if (!reconnectTimer) return;
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  };

  const scheduleReconnect = () => {
    if (disposed) return;
    clearReconnect();
    const delay = Math.min(30000, 1000 * Math.pow(2, retryCount));
    retryCount += 1;
    reconnectTimer = setTimeout(() => {
      void connect();
    }, delay);
  };

  const connect = async () => {
    if (disposed) return;
    try {
      const token = await getToken();
      if (!token) {
        scheduleReconnect();
        return;
      }

      const ws = new WebSocket(`${wsBase}/ws?token=${encodeURIComponent(token)}`);
      socket = ws;

      ws.onopen = () => {
        retryCount = 0;
        onOpen?.();
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data) as EventSocketMessage;
          onMessage(parsed);
        } catch {
          // Ignore malformed frames.
        }
      };

      ws.onerror = () => {
        ws.close();
      };

      ws.onclose = () => {
        onClose?.();
        socket = null;
        scheduleReconnect();
      };
    } catch {
      scheduleReconnect();
    }
  };

  void connect();

  return () => {
    disposed = true;
    clearReconnect();
    if (socket) {
      socket.close();
      socket = null;
    }
  };
}
