// Browser-based thermal print utility for Qrave POS
// Works with any 80mm thermal printer connected to the browser machine.
// No native driver required — the browser sends to the default printer.

export type KOTModifier = {
  label: string;
  price_delta?: number;
  quantity?: number;
};

export type KOTItem = {
  menu_item_name: string;
  variant_label?: string | null;
  quantity: number;
  modifiers?: KOTModifier[];
};

export type KOTData = {
  restaurant_name: string;
  table_number: number;
  order_number?: number | null;
  daily_order_number?: number | null;
  order_id?: string;
  items: KOTItem[];
  created_at: string;
  kot_type?: 'dine-in' | 'takeaway';
};

export type ReceiptItem = {
  name: string;
  variant_label?: string | null;
  quantity: number;
  unit_price: number;
};

export type ReceiptData = {
  restaurant_name: string;
  table_number?: number;
  order_number?: number | null;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  service_charge: number;
  tax: number;
  total: number;
  tax_percent: number;
  service_percent: number;
  payment_mode: string;
  paid_at?: string;
  cashier_name?: string;
  gst_number?: string;
  tax_details?: string; // stringified ItemTaxDetail[]
};

export type EODData = {
  restaurant_name: string;
  date: string;
  gross_sales: number;
  net_subtotal: number;
  tax_collected: number;
  service_charge: number;
  discounts_given: number;
  completed_orders_count: number;
  cancelled_orders_count: number;
  cancelled_orders_value: number;
  void_items_count: number;
  payments_breakdown: Record<string, number>;
  hsn_summary: Array<{ hsn_code: string; taxable_value: number; tax_amount: number; quantity: number }>;
};

const fmtINR = (n: number) =>
  `Rs.${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const line = (left: string, right: string, width = 42): string => {
  const space = Math.max(1, width - left.length - right.length);
  return left + ' '.repeat(space) + right;
};

const divider = (char = '-', width = 42) => char.repeat(width);

const center = (text: string, width = 42) => {
  const pad = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(pad) + text;
};

const KOT_CSS = `
  @page { size: 80mm auto; margin: 4mm; }
  @media print { html, body { width: 80mm; } }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px;
    line-height: 1.4;
    color: #000;
    margin: 0;
    padding: 0;
    white-space: pre-wrap;
    width: 72mm;
  }
  .bold { font-weight: bold; font-size: 14px; }
  .large { font-size: 18px; font-weight: bold; }
  .center { text-align: center; }
  .modifier { font-size: 11px; padding-left: 6mm; }
`;

const RECEIPT_CSS = `
  @page { size: 80mm auto; margin: 4mm; }
  @media print { html, body { width: 80mm; } }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px;
    line-height: 1.5;
    color: #000;
    margin: 0;
    padding: 0;
    width: 72mm;
  }
  .bold { font-weight: bold; }
  .large { font-size: 16px; font-weight: bold; }
  .center { text-align: center; }
  .total-line { font-size: 14px; font-weight: bold; }
`;

function openPrintWindow(html: string): void {
  const w = window.open('', '_blank', 'width=400,height=600');
  if (!w) {
    alert('Please allow popups for print to work.');
    return;
  }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => {
    w.print();
    setTimeout(() => w.close(), 500);
  }, 300);
}

export function printKOT(data: KOTData): void {
  const now = new Date(data.created_at);
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const lines: string[] = [
    center('*** KITCHEN ORDER TICKET ***'),
    center(data.restaurant_name.toUpperCase()),
    divider(),
    line('Type:', data.kot_type === 'takeaway' ? 'TAKEAWAY' : 'DINE-IN'),
    line('Table:', `T${data.table_number}`),
    data.daily_order_number ? line('Order #:', `#${data.daily_order_number}`) : '',
    line('Time:', `${timeStr} ${dateStr}`),
    divider(),
    center('ITEMS'),
    divider(),
  ].filter(Boolean);

  for (const item of data.items) {
    const nameLabel = item.variant_label
      ? `${item.menu_item_name} (${item.variant_label})`
      : item.menu_item_name;
    lines.push(line(`x${item.quantity}  ${nameLabel}`, ''));
    if (item.modifiers && item.modifiers.length > 0) {
      for (const mod of item.modifiers) {
        lines.push(`       >> ${mod.label}${mod.price_delta && mod.price_delta !== 0 ? ` (+${mod.price_delta})` : ''}`);
      }
    }
  }

  lines.push(divider());
  lines.push(center('-- END OF KOT --'));

  const body = lines.join('\n');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>KOT</title><style>${KOT_CSS}</style></head><body><pre>${body}</pre></body></html>`;
  openPrintWindow(html);
}

export function printReceipt(data: ReceiptData): void {
  const now = data.paid_at ? new Date(data.paid_at) : new Date();
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  // Try parsing itemized tax details
  let taxDetailsList: any[] = [];
  try {
    if (data.tax_details) {
      taxDetailsList = JSON.parse(data.tax_details);
    }
  } catch {
    // no-op
  }

  const lines: string[] = [
    center(data.restaurant_name.toUpperCase()),
    center(data.gst_number ? 'TAX INVOICE' : 'TAX INVOICE / RECEIPT'),
    data.gst_number ? center(`GSTIN: ${data.gst_number}`) : '',
    divider('='),
    line('Date:', dateStr),
    line('Time:', timeStr),
    data.table_number ? line('Table:', `T${data.table_number}`) : '',
    data.order_number ? line('Order #:', `#${data.order_number}`) : '',
    data.cashier_name ? line('Served by:', data.cashier_name) : '',
    divider(),
    line('Item', 'Amount'),
    divider(),
  ].filter(Boolean);

  for (const item of data.items) {
    // Find HSN code from tax details
    const taxMatch = taxDetailsList.find(
      (td) => td.menu_item_name === item.name || td.menu_item_name === `${item.name} (${item.variant_label})`
    );
    const hsnLabel = taxMatch && taxMatch.hsn_code ? ` [HSN: ${taxMatch.hsn_code}]` : '';

    const nameLabel = item.variant_label ? `${item.name} (${item.variant_label})${hsnLabel}` : `${item.name}${hsnLabel}`;
    const amount = item.quantity * item.unit_price;

    if (nameLabel.length > 28) {
      lines.push(nameLabel.slice(0, 28));
      lines.push(line(`  x${item.quantity} @ ${fmtINR(item.unit_price)}`, fmtINR(amount)));
    } else {
      lines.push(line(`x${item.quantity} ${nameLabel}`, fmtINR(amount)));
    }
  }

  lines.push(divider());
  lines.push(line('Subtotal:', fmtINR(data.subtotal)));
  if (data.discount > 0) {
    lines.push(line('Discount:', `-${fmtINR(data.discount)}`));
  }
  if (data.service_charge > 0) {
    lines.push(line(`Service (${data.service_percent}%):`, fmtINR(data.service_charge)));
  }
  if (data.tax > 0) {
    lines.push(line(`Tax (${data.tax_percent}%):`, fmtINR(data.tax)));
  }
  lines.push(divider('='));
  lines.push(line('TOTAL PAID:', fmtINR(data.total)));
  lines.push(divider('='));
  lines.push(line('Payment Mode:', data.payment_mode.toUpperCase()));
  lines.push(divider());

  // Print HSN summary table if GST details exist
  if (taxDetailsList.length > 0) {
    lines.push(center('GST TAX SUMMARY'));
    lines.push(divider('-'));
    // Header
    const colLeft = 'HSN Code   Taxable  Rate %   Tax Amt';
    lines.push(colLeft);
    lines.push(divider('-'));

    // Group by HSN and GST Rate
    const hsnAgg: Record<string, { code: string; rate: number; taxable: number; amt: number }> = {};
    for (const td of taxDetailsList) {
      const hsn = td.hsn_code || 'General';
      const key = `${hsn}-${td.gst_rate}`;
      if (!hsnAgg[key]) {
        hsnAgg[key] = { code: hsn, rate: td.gst_rate, taxable: 0, amt: 0 };
      }
      hsnAgg[key].taxable += td.taxable_value;
      hsnAgg[key].amt += td.tax_amount;
    }

    for (const key in hsnAgg) {
      const entry = hsnAgg[key];
      const hsnStr = entry.code.padEnd(10, ' ').slice(0, 10);
      const taxStr = entry.taxable.toFixed(1).padStart(8, ' ');
      const rateStr = `${entry.rate}%`.padStart(7, ' ');
      const amtStr = entry.amt.toFixed(1).padStart(7, ' ');
      lines.push(`${hsnStr}${taxStr}${rateStr}${amtStr}`);
    }
    lines.push(divider('-'));
  }

  lines.push(center('Thank you! Visit again.'));

  const body = lines.join('\n');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt</title><style>${RECEIPT_CSS}</style></head><body><pre>${body}</pre></body></html>`;
  openPrintWindow(html);
}

export function printEOD(data: EODData): void {
  const dateStr = new Date(data.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const lines: string[] = [
    center('*** END OF DAY REPORT ***'),
    center(data.restaurant_name.toUpperCase()),
    center(`Closing Date: ${dateStr}`),
    divider('='),
    center('FINANCIAL SUMMARY'),
    divider(),
    line('Gross Revenue:', fmtINR(data.gross_sales)),
    line('Net Sales Subtotal:', fmtINR(data.net_subtotal)),
    line('Total Tax Collected:', fmtINR(data.tax_collected)),
    line('Service Charge:', fmtINR(data.service_charge)),
    line('Discounts Given:', `-${fmtINR(data.discounts_given)}`),
    divider(),
    line('Completed Orders:', String(data.completed_orders_count)),
    line('Cancelled Orders:', String(data.cancelled_orders_count)),
    line('Cancelled Value:', fmtINR(data.cancelled_orders_value)),
    line('Void Items Count:', String(data.void_items_count)),
    divider(),
    center('PAYMENTS BREAKDOWN'),
    divider(),
  ];

  for (const [mode, amt] of Object.entries(data.payments_breakdown)) {
    lines.push(line(`${mode.toUpperCase()}:`, fmtINR(amt)));
  }

  if (data.hsn_summary && data.hsn_summary.length > 0) {
    lines.push(divider());
    center('HSN CODE GST REPORT');
    lines.push(divider());
    lines.push('HSN Code       Qty      Taxable      Tax');
    lines.push(divider('-'));
    for (const hsn of data.hsn_summary) {
      const code = hsn.hsn_code.padEnd(12, ' ').slice(0, 12);
      const qty = String(hsn.quantity).padStart(5, ' ');
      const val = hsn.taxable_value.toFixed(1).padStart(11, ' ');
      const tax = hsn.tax_amount.toFixed(1).padStart(10, ' ');
      lines.push(`${code}${qty}${val}${tax}`);
    }
  }

  lines.push(divider('='));
  lines.push(center('-- END OF EOD SUMMARY --'));

  const body = lines.join('\n');
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>EOD Closing Report</title><style>${RECEIPT_CSS}</style></head><body><pre>${body}</pre></body></html>`;
  openPrintWindow(html);
}
