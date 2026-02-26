export type PrinterChannel = "kitchen" | "billing" | "bar";
export type PrinterMode = "serial" | "system";

export type PrinterProfile = {
  id: string;
  name: string;
  channel: PrinterChannel;
  mode: PrinterMode;
  baudRate: number;
  enabled: boolean;
  updatedAt: number;
};

type SerialPortLike = {
  open: (options: { baudRate: number }) => Promise<void>;
  close: () => Promise<void>;
  writable?: WritableStream<Uint8Array>;
};

type NavigatorWithSerial = Navigator & {
  serial?: {
    requestPort: () => Promise<SerialPortLike>;
  };
};

const STORAGE_KEY = "qrave_pos_printers";

const defaultProfiles: PrinterProfile[] = [
  {
    id: "kitchen-default",
    name: "Kitchen Printer",
    channel: "kitchen",
    mode: "system",
    baudRate: 9600,
    enabled: true,
    updatedAt: Date.now(),
  },
  {
    id: "billing-default",
    name: "Billing Printer",
    channel: "billing",
    mode: "system",
    baudRate: 9600,
    enabled: true,
    updatedAt: Date.now(),
  },
];

export function loadPrinterProfiles(): PrinterProfile[] {
  if (typeof window === "undefined") return defaultProfiles;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProfiles;
    const parsed = JSON.parse(raw) as PrinterProfile[];
    if (!Array.isArray(parsed) || parsed.length === 0) return defaultProfiles;
    return parsed;
  } catch {
    return defaultProfiles;
  }
}

export function savePrinterProfiles(profiles: PrinterProfile[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

export function getPrinterForChannel(channel: PrinterChannel): PrinterProfile | null {
  const profiles = loadPrinterProfiles();
  const candidates = profiles
    .filter((p) => p.enabled && p.channel === channel)
    .sort((a, b) => b.updatedAt - a.updatedAt);
  return candidates[0] || null;
}

function escPosBytesFromText(text: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(`\x1B\x40${text}\n\n\n\x1D\x56\x00`);
}

async function printSystemText(title: string, text: string): Promise<void> {
  const w = window.open("", "_blank", "width=420,height=700");
  if (!w) throw new Error("Popup blocked while opening print window");
  const safeTitle = title.replace(/[<>]/g, "");
  const safeText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  w.document.write(`
    <html>
      <head>
        <title>${safeTitle}</title>
        <style>
          body { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; margin: 12px; }
          pre { white-space: pre-wrap; font-size: 12px; line-height: 1.45; }
        </style>
      </head>
      <body><pre>${safeText}</pre></body>
    </html>
  `);
  w.document.close();
  w.focus();
  w.print();
  w.close();
}

async function printSerialText(profile: PrinterProfile, text: string): Promise<void> {
  const nav = navigator as NavigatorWithSerial;
  if (!nav.serial) {
    throw new Error("Serial printing requires Chrome/Edge desktop");
  }
  const port = await nav.serial.requestPort();
  await port.open({ baudRate: profile.baudRate || 9600 });
  try {
    if (!port.writable) throw new Error("Connected serial port is not writable");
    const writer = port.writable.getWriter();
    try {
      await writer.write(escPosBytesFromText(text));
    } finally {
      writer.releaseLock();
    }
  } finally {
    await port.close();
  }
}

export async function printTicket(
  channel: PrinterChannel,
  title: string,
  text: string,
): Promise<void> {
  const profile = getPrinterForChannel(channel);
  if (!profile) {
    throw new Error(`No enabled printer configured for ${channel}`);
  }
  if (profile.mode === "serial") {
    await printSerialText(profile, text);
    return;
  }
  await printSystemText(title, text);
}

type KitchenTicketInput = {
  orderId: string;
  tableCode: string;
  placedAt: string;
  orderNumber?: number | null;
  dailyOrderNumber?: number | null;
  items: Array<{ name: string; qty: number }>;
};

export async function printKitchenTicket(input: KitchenTicketInput): Promise<void> {
  const orderRef = input.dailyOrderNumber
    ? `#${input.dailyOrderNumber} (today)`
    : input.orderId.slice(0, 8).toUpperCase();

  const body = [
    "QRAVE - KITCHEN TICKET",
    "------------------------------",
    `Order : ${orderRef}`,
    ...(input.orderNumber ? [`Seq   : #${input.orderNumber} overall`] : []),
    `Table : ${input.tableCode}`,
    `Time  : ${input.placedAt}`,
    "------------------------------",
    ...input.items.map((i) => `${String(i.qty).padStart(2, " ")} x ${i.name}`),
    "------------------------------",
    "Status: NEW ORDER",
  ].join("\n");
  await printTicket("kitchen", "Kitchen Ticket", body);
}

type BillTicketInput = {
  tableCode: string;
  printedAt: string;
  orderRefs?: Array<{ dailyOrderNumber?: number | null; orderNumber?: number | null }>;
  items: Array<{ name: string; qty: number; amount: number }>;
  total: number;
};

export async function printBillTicket(input: BillTicketInput): Promise<void> {
  const lines = input.items.map((i) => {
    const left = `${i.qty}x ${i.name}`;
    const right = i.amount.toFixed(2);
    const pad = Math.max(1, 30 - left.length - right.length);
    return `${left}${" ".repeat(pad)}${right}`;
  });

  // Build compact order reference line
  const orderNums = (input.orderRefs || [])
    .filter((r) => r.dailyOrderNumber)
    .map((r) => `#${r.dailyOrderNumber}`)
    .join(", ");

  const body = [
    "QRAVE - CUSTOMER BILL",
    "------------------------------",
    `Table : ${input.tableCode}`,
    ...(orderNums ? [`Orders: ${orderNums}`] : []),
    `Time  : ${input.printedAt}`,
    "------------------------------",
    ...lines,
    "------------------------------",
    `TOTAL : ${input.total.toFixed(2)}`,
    "------------------------------",
    "Thank you!",
  ].join("\n");
  await printTicket("billing", "Customer Bill", body);
}

