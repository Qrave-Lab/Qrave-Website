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
  staffName?: string;
  orderRefs?: Array<{ dailyOrderNumber?: number | null; orderNumber?: number | null }>;
  items: Array<{ name: string; qty: number; amount: number }>;
  total: number;
  gstin?: string;
  invoiceNumber?: string;
  financialYear?: string;
  cgst?: number;
  sgst?: number;
  taxableValue?: number;
  lineItems?: any[];
  isDuplicate?: boolean;
  reprintAuditFn?: () => Promise<void>;
};

export type BillTemplate = "cafe" | "fine_dining" | "retail" | "fast_food" | "tax_invoice" | "compact" | "dinefine";

export type BillConfig = {
  templateId: BillTemplate;
  // Toggles for Store & Header
  showLogo: boolean;
  logoUrl?: string;
  showRestaurantName: boolean;
  restaurantName: string;
  showAddress: boolean;
  addressLine1: string;
  addressLine2: string;
  showPhone: boolean;
  storePhone: string;
  showWebsite: boolean;
  storeWebsite: string;
  showGstin: boolean;
  gstin: string;
  headerText: string;
  
  // Toggles for Order & Meta
  showReceiptNumber: boolean;
  receiptPrefix: string;
  receiptNumber: string;
  showDateTime: boolean;
  showTime?: boolean;
  showTable: boolean;
  tableCode: string;
  showCashier: boolean;
  staffName: string;
  showGuests: boolean;
  guestCount: number;
  showOrderNumber: boolean;
  showDiscounts: boolean;
  
  // Financials & Currency
  currencySymbol: string;
  taxPercent: number;
  showTaxBreakdown: boolean;
  
  // Footers & Codes
  showTipNotice: boolean;
  tipNotice: string;
  secondaryNotice: string;
  showFooterText: boolean;
  footerText: string;
  wifiDetails: string;
  showTipLine: boolean;
  showBarcode: boolean;
  barcodeValue: string;
  showQrCode: boolean;
  upiId: string;
  
  // Legacy / unused
  showPaymentBlock: boolean;
  paymentType?: string;
  cardLast4?: string;
  entryMode?: string;
  authRef?: string;
  authStatus?: string;
};

export const DEFAULT_BILL_CONFIG: BillConfig = {
  templateId: "dinefine",
  showLogo: true,
  logoUrl: "",
  showRestaurantName: true,
  restaurantName: "DINEFINE RESTAURANT",
  showAddress: true,
  addressLine1: "123 CULINARY AVENUE",
  addressLine2: "DOWNTOWN DISTRICT",
  showPhone: true,
  storePhone: "(555) 123-4567",
  showWebsite: true,
  storeWebsite: "WWW.DINEFINE.COM",
  showGstin: false,
  gstin: "",
  headerText: "DINEFINE RESTAURANT\n123 CULINARY AVENUE\nDOWNTOWN DISTRICT",
  
  showReceiptNumber: true,
  receiptPrefix: "R-",
  receiptNumber: "2547",
  showDateTime: true,
  showTable: true,
  tableCode: "12",
  showCashier: true,
  staffName: "MARIA G.",
  showGuests: true,
  guestCount: 2,
  showOrderNumber: true,
  showDiscounts: true,
  
  currencySymbol: "₹",
  taxPercent: 5,
  showTaxBreakdown: true,
  
  showTipNotice: false,
  tipNotice: "",
  secondaryNotice: "",
  showFooterText: true,
  footerText: "THANK YOU, VISIT AGAIN!",
  wifiDetails: "",
  showTipLine: false,
  
  showBarcode: true,
  barcodeValue: "254720250930",
  showQrCode: false,
  upiId: "",
  showPaymentBlock: false,
};

export function getBillConfig(): BillConfig {
  if (typeof window === "undefined") return DEFAULT_BILL_CONFIG;
  try {
    const stored = window.localStorage.getItem("qrave_pos_bill_config");
    if (stored) {
      const parsed = JSON.parse(stored);
      const res = { ...DEFAULT_BILL_CONFIG, ...parsed };
      if (!res.footerText || res.footerText.includes("GST APPLICABLE") || res.footerText.includes("RULE 46") || res.footerText.includes("THANK YOU FOR DINING")) {
        res.footerText = "THANK YOU, VISIT AGAIN!";
      }
      if (res.secondaryNotice && (res.secondaryNotice.includes("INVOICE") || res.secondaryNotice.includes("PLEASE COME AGAIN"))) {
        res.secondaryNotice = "";
      }
      return res;
    }
  } catch (e) {}
  
  // Fallback for legacy ID
  const legacy = window.localStorage.getItem("qrave_pos_bill_template") as BillTemplate;
  if (legacy) {
    return { ...DEFAULT_BILL_CONFIG, templateId: legacy };
  }
  return DEFAULT_BILL_CONFIG;
}

export function setBillConfig(config: BillConfig): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("qrave_pos_bill_config", JSON.stringify(config));
  // for legacy compatibility if anything else reads it
  window.localStorage.setItem("qrave_pos_bill_template", config.templateId);
}

export function getBillTemplate(): BillTemplate {
  if (typeof window === "undefined") return "retail";
  return (window.localStorage.getItem("qrave_pos_bill_template") as BillTemplate) || "retail";
}

export function setBillTemplate(template: BillTemplate): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("qrave_pos_bill_template", template);
}


export function generateBillText(input: BillTicketInput, config: BillConfig): string {
  const template = config.templateId;
  const orderNums = (input.orderRefs || [])
    .filter((r) => r.dailyOrderNumber)
    .map((r) => `#${r.dailyOrderNumber}`)
    .join(", ");
    
  const staffName = input.staffName && input.staffName !== "NA" ? input.staffName : "Staff";
  const staffLine = config.showCashier ? `Served By : ${staffName}` : "";
  const tableLine = config.showTable ? `Table : ${input.tableCode}` : "";
  const timeLine = (config.showDateTime ?? config.showTime) ? `Time  : ${input.printedAt.split(',')[1]?.trim() || ""}` : "";

  // Helper to center text
  const centerText = (str: string, width = 32) => {
    if (str.length >= width) return str.substring(0, width);
    const pad = Math.floor((width - str.length) / 2);
    return " ".repeat(pad) + str + " ".repeat(width - str.length - pad);
  };

  let header: string[] = [];
  if (config.headerText) {
    header = config.headerText.split("\n").map(l => centerText(l.trim(), 34));
  }
  
  if (config.gstin) {
    header.push(centerText(`GSTIN: ${config.gstin}`, 34));
  }
  
  let metaLines = [tableLine, timeLine, staffLine].filter(Boolean);
  let metaBlock = metaLines.length > 0 ? metaLines.join(" | ") : "";
  if (metaBlock.length > 34) {
    metaBlock = metaLines.join("\n");
  }

  let body = "";

  if (template === "dinefine") {
    const cur = config.currencySymbol || "₹";
    const name = config.restaurantName || "DINEFINE RESTAURANT";
    const addr1 = config.addressLine1 || "123 CULINARY AVENUE";
    const addr2 = config.addressLine2 || "DOWNTOWN DISTRICT";
    const phone = config.storePhone ? `PHONE: ${config.storePhone}` : "";
    const web = config.storeWebsite || "";
    
    const lines = input.items.map((i) => {
      const left = `${i.qty}X ${i.name.toUpperCase()}`.substring(0, 24);
      const right = `${cur}${i.amount.toFixed(2)}`;
      const pad = Math.max(1, 34 - left.length - right.length);
      return `${left}${" ".repeat(pad)}${right}`;
    });

    const subtotal = input.total;
    const taxAmt = Number((subtotal * ((config.taxPercent || 8) / 100)).toFixed(2));
    const grandTotal = subtotal + taxAmt;

    const activeOrderNum = (input.orderRefs || [])
      .filter((r) => r.dailyOrderNumber || r.orderNumber)
      .map((r) => r.dailyOrderNumber || r.orderNumber)[0] || input.invoiceNumber || config.receiptNumber || "2547";
    const receiptNum = config.showReceiptNumber ? `RECEIPT: #${config.receiptPrefix || "R-"}${activeOrderNum}` : "";
    const tableNum = config.showTable ? `TABLE:   ${config.tableCode || input.tableCode || "12"}` : "";
    const serverStr = config.showCashier ? `SERVER:  ${config.staffName || input.staffName || "MARIA G."}` : "";
    const guestStr = config.showGuests ? `GUESTS:   ${config.guestCount || 2}` : "";

    const padRow = (l: string, r: string) => {
      const p = Math.max(1, 34 - l.length - r.length);
      return `${l}${" ".repeat(p)}${r}`;
    };

    body = [
      config.showLogo ? centerText("ψq", 34) : "",
      config.showRestaurantName ? centerText(name, 34) : "",
      config.showAddress ? centerText(addr1, 34) : "",
      (config.showAddress && addr2) ? centerText(addr2, 34) : "",
      (config.showPhone && phone) ? centerText(phone, 34) : "",
      (config.showWebsite && web) ? centerText(web, 34) : "",
      (config.showGstin && config.gstin) ? centerText(`GSTIN: ${config.gstin}`, 34) : "",
      "----------------------------------",
      centerText(input.printedAt || "30/09/2025 20:15", 34),
      padRow(receiptNum, tableNum),
      padRow(serverStr, guestStr),
      "----------------------------------",
      ...lines,
      "----------------------------------",
      padRow("SUBTOTAL:", `${cur}${subtotal.toFixed(2)}`),
      padRow("TAX:", `${cur}${taxAmt.toFixed(2)}`),
      padRow("TOTAL:", `${cur}${grandTotal.toFixed(2)}`),
      "----------------------------------",
      
      config.tipNotice ? centerText(config.tipNotice, 34) : "",
      config.secondaryNotice ? centerText(config.secondaryNotice, 34) : "",
      config.wifiDetails ? centerText(`WIFI: ${config.wifiDetails}`, 34) : "",
      "",
      centerText(config.footerText || "THANK YOU, VISIT AGAIN!", 34),
      config.showBarcode ? [
        "",
        centerText("||||||||||||||||||||||||||||||||||||", 34),
        centerText(config.barcodeValue || "254720250930", 34),
      ].join("\n") : "",
    ].filter(Boolean).join("\n");
  } else if (template === "cafe") {
    const lines = input.items.map((i) => {
      const left = `${i.qty}x ${i.name}`;
      const right = `${i.amount.toFixed(2)}`;
      const pad = Math.max(1, 34 - left.length - right.length);
      return `${left}${" ".repeat(pad)}${right}`;
    });
    body = [
      ...header,
      "==================================",
      metaBlock,
      "----------------------------------",
      ...lines,
      "----------------------------------",
      `Subtotal                  ${input.total.toFixed(2).padStart(8)}`,
      `TOTAL                     ${input.total.toFixed(2).padStart(8)}`,
      "",
      config.showTipLine ? "Tip:  ___________________________\n\nSign: ___________________________\n" : "",
      ...(config.wifiDetails ? [centerText("WiFi: " + config.wifiDetails, 34), ""] : []), centerText(config.footerText || "Thank you!", 34),
    ].filter(Boolean).join("\n");
  } else if (template === "fine_dining") {
    const lines = input.items.map((i) => {
      const left = `   ${i.qty}   ${i.name.substring(0, 15)}`;
      const right = i.amount.toFixed(2);
      const pad = Math.max(1, 34 - left.length - right.length);
      return `${left}${" ".repeat(pad)}${right}`;
    });
    body = [
      ...header,
      "..................................",
      metaBlock,
      "..................................",
      ...lines,
      "..................................",
      `          Subtotal:  ${input.total.toFixed(2).padStart(7)}`,
      "",
      `        GRAND TOTAL: ${input.total.toFixed(2).padStart(7)}`,
      "..................................",
      ...(config.wifiDetails ? [centerText("WiFi: " + config.wifiDetails, 34), ""] : []), centerText(config.footerText || "Thank you!", 34),
    ].filter(Boolean).join("\n");
  } else if (template === "fast_food") {
    const lines = input.items.map((i) => {
      const left = `${i.qty}  ${i.name.substring(0, 18).toUpperCase()}`;
      const right = i.amount.toFixed(2);
      const pad = Math.max(1, 34 - left.length - right.length);
      return `${left}${" ".repeat(pad)}${right}`;
    });
    const mainOrder = orderNums ? orderNums.split(',')[0].trim() : `#???`;
    body = [
      ...header,
      "==================================",
      centerText(`ORDER ${mainOrder}`, 34),
      "==================================",
      metaBlock,
      "----------------------------------",
      ...lines,
      "----------------------------------",
      `DUE:                       ${input.total.toFixed(2).padStart(7)}`,
      "==================================",
      ...(config.wifiDetails ? [centerText("WiFi: " + config.wifiDetails, 34), ""] : []), centerText(config.footerText || "Thank you!", 34),
    ].filter(Boolean).join("\n");
  } else if (template === "tax_invoice") {
    const lines = input.items.map((i) => {
      const name = i.name.substring(0, 14).padEnd(14);
      const qty = String(i.qty).padStart(3);
      const rate = (i.amount/i.qty).toFixed(2).padStart(6);
      const val = i.amount.toFixed(2).padStart(7);
      return `${name} ${qty} ${rate} ${val}`;
    });
    body = [
      ...header,
      "----------------------------------",
      metaBlock,
      "----------------------------------",
      "Item           Qty   Rate    Value",
      "----------------------------------",
      ...lines,
      "----------------------------------",
      `Subtotal                   ${input.total.toFixed(2).padStart(7)}`,
      "----------------------------------",
      `GRAND TOTAL                ${input.total.toFixed(2).padStart(7)}`,
      "----------------------------------",
      ...(config.wifiDetails ? [centerText("WiFi: " + config.wifiDetails, 34), ""] : []), centerText(config.footerText || "Thank you!", 34),
    ].filter(Boolean).join("\n");
  } else if (template === "compact") {
    const lines = input.items.map((i) => `${i.qty}x ${i.name.substring(0,18).padEnd(18)} ${i.amount.toFixed(2).padStart(8)}`);
    body = [
      ...header,
      metaBlock,
      "----------------------------------",
      ...lines,
      "----------------------------------",
      `TOT:                       ${input.total.toFixed(2).padStart(7)}`,
      ...(config.wifiDetails ? ["WiFi: " + config.wifiDetails] : []), config.footerText || "Thx!",
    ].filter(Boolean).join("\n");
  } else {
    // retail
    const lines = input.items.flatMap((i) => {
      const title = i.name.substring(0, 34);
      const sub = `  ${i.qty} @ ${(i.amount/i.qty).toFixed(2)}`;
      const total = i.amount.toFixed(2);
      const pad = Math.max(1, 34 - sub.length - total.length);
      return [title, `${sub}${" ".repeat(pad)}${total}`];
    });
    const itemsCount = input.items.reduce((sum, i) => sum + i.qty, 0);
    body = [
      ...header,
      metaBlock,
      "----------------------------------",
      "Item                  Qty    Total",
      "----------------------------------",
      ...lines,
      "----------------------------------",
      `TOTAL DUE:                  ${input.total.toFixed(2).padStart(7)}`,
      "----------------------------------",
      centerText(`Items Sold: ${itemsCount}`, 34),
      ...(config.wifiDetails ? [centerText("WiFi: " + config.wifiDetails, 34), ""] : []), centerText(config.footerText || "Thank you!", 34),
    ].filter(Boolean).join("\n");
  }
  
  // NOTE: QR code is handled visually in the UI preview, but for physical printing we 
  // just print the UPI link since ESC/POS requires specialized commands for QR codes.
  if (config.upiId) {
    const upiLink = `upi://pay?pa=${config.upiId}&pn=Store&am=${input.total.toFixed(2)}&cu=INR`;
    body += "\n" + centerText("SCAN TO PAY", 34) + "\n\n";
    body += centerText(upiLink, 34) + "\n";
  }

  return body;
}

export async function printBillTicket(input: BillTicketInput): Promise<void> {
  const config = getBillConfig();
  const body = generateBillText(input, config);
  await printTicket("billing", "Customer Bill", body);
}
