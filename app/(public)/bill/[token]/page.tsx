"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";

type LineItem = { menu_item_name: string; hsn_code?: string; quantity: number; taxable_value: number | string; gst_rate: number | string; total: number | string };

type Bill = {
  restaurant: { name: string; address: string; phone: string; logo_url: string };
  invoice_number: string;
  invoice_date: string;
  status: string;
  gstin: string;
  customer_name: string;
  customer_gstin: string;
  line_items: LineItem[];
  subtotal: number | string;
  discount: number | string;
  service_charge: number | string;
  cgst: number | string;
  sgst: number | string;
  igst: number | string;
  grand_total: number | string;
  can_review?: boolean;
  einvoice?: { irn: string; ack_no?: string; ack_date?: string; signed_qr?: string } | null;
};

function backendBase() {
  if (typeof window !== "undefined" && window.location.hostname === "localhost") return "http://localhost:9090";
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") || "";
}

const inr = (v: number | string | undefined) =>
  `₹${Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function ReviewPrompt({ token, restaurantName }: { token: string; restaurantName: string }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<{ google?: string } | null>(null);

  const submit = async (r: number, c: string) => {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`${backendBase()}/public/bills/${encodeURIComponent(token)}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: r, comment: c }),
      });
      if (res.status === 409) { setDone({}); return; }
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDone({ google: data.google_review_url });
    } catch {
      setErr("Couldn't send your feedback. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="mt-6 rounded-xl border border-slate-200 p-4 text-center print:hidden">
        <p className="text-sm font-bold text-slate-800">Thank you for your feedback!</p>
        {done.google && (
          <>
            <p className="mt-1 text-xs text-slate-500">Mind sharing it on Google? It really helps {restaurantName}.</p>
            <a
              href={done.google}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block rounded-xl bg-[#fe5c13] px-5 py-2.5 text-sm font-bold text-white"
            >
              Review on Google
            </a>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-slate-200 p-4 text-center print:hidden">
      <p className="text-sm font-bold text-slate-800">How was your visit?</p>
      <div className="mt-2 flex justify-center gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            disabled={busy}
            onClick={() => (n >= 4 ? (setRating(n), submit(n, "")) : setRating(n))}
            className={`text-3xl leading-none ${n <= rating ? "text-amber-400" : "text-slate-300"}`}
          >
            ★
          </button>
        ))}
      </div>
      {rating > 0 && rating < 4 && (
        <div className="mt-3">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Sorry to hear that. What could we do better?"
            className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 outline-none focus:border-[#fe5c13]"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => submit(rating, comment)}
            className="mt-2 w-full rounded-xl bg-slate-900 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            Send feedback
          </button>
        </div>
      )}
      {err && <p className="mt-2 text-xs text-rose-600">{err}</p>}
    </div>
  );
}

export default function PublicBillPage() {
  const { token } = useParams<{ token: string }>();
  const [bill, setBill] = useState<Bill | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    fetch(`${backendBase()}/public/bills/${encodeURIComponent(token)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(r.status === 404 ? "This bill link is invalid or has expired." : "Couldn't load the bill. Please try again.");
        return r.json();
      })
      .then(setBill)
      .catch((e) => setError(e.message));
  }, [token]);

  if (error) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-center text-slate-600">{error}</main>;
  }
  if (!bill) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-400">Loading bill…</main>;
  }

  const n = (v: number | string | undefined) => Number(v || 0);
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 print:bg-white print:p-0">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm print:shadow-none">
        <div className="text-center">
          {bill.restaurant.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={bill.restaurant.logo_url} alt="" className="mx-auto mb-2 h-14 w-14 rounded-full object-cover" />
          )}
          <h1 className="text-lg font-black text-slate-900">{bill.restaurant.name}</h1>
          {bill.restaurant.address && <p className="text-xs text-slate-500">{bill.restaurant.address}</p>}
          {bill.gstin && <p className="text-xs text-slate-500">GSTIN: {bill.gstin}</p>}
          <p className="mt-3 text-xs font-bold uppercase tracking-widest text-slate-400">Tax invoice</p>
          <p className="text-sm font-semibold text-slate-700">{bill.invoice_number}</p>
          <p className="text-xs text-slate-500">
            {new Date(bill.invoice_date).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
          </p>
          {bill.status === "voided" && <p className="mt-2 rounded bg-rose-50 py-1 text-xs font-bold text-rose-700">This invoice was cancelled</p>}
        </div>

        {(bill.customer_name || bill.customer_gstin) && (
          <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
            {bill.customer_name && <div>Billed to: <b>{bill.customer_name}</b></div>}
            {bill.customer_gstin && <div>GSTIN: {bill.customer_gstin}</div>}
          </div>
        )}

        <table className="mt-4 w-full text-sm">
          <thead className="border-b border-slate-200 text-xs text-slate-400">
            <tr>
              <th className="py-2 text-left font-semibold">Item</th>
              <th className="py-2 text-right font-semibold">Qty</th>
              <th className="py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {bill.line_items.map((li, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="py-2 pr-2 text-slate-800">{li.menu_item_name}</td>
                <td className="py-2 text-right text-slate-600">{li.quantity}</td>
                <td className="py-2 text-right text-slate-800">{inr(li.taxable_value)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="mt-4 space-y-1 text-sm">
          <div className="flex justify-between text-slate-600"><dt>Subtotal</dt><dd>{inr(bill.subtotal)}</dd></div>
          {n(bill.discount) > 0 && <div className="flex justify-between text-emerald-700"><dt>Discount</dt><dd>-{inr(bill.discount)}</dd></div>}
          {n(bill.service_charge) > 0 && <div className="flex justify-between text-slate-600"><dt>Service charge</dt><dd>{inr(bill.service_charge)}</dd></div>}
          {n(bill.cgst) > 0 && <div className="flex justify-between text-slate-600"><dt>CGST</dt><dd>{inr(bill.cgst)}</dd></div>}
          {n(bill.sgst) > 0 && <div className="flex justify-between text-slate-600"><dt>SGST</dt><dd>{inr(bill.sgst)}</dd></div>}
          {n(bill.igst) > 0 && <div className="flex justify-between text-slate-600"><dt>IGST</dt><dd>{inr(bill.igst)}</dd></div>}
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-black text-slate-900"><dt>Total</dt><dd>{inr(bill.grand_total)}</dd></div>
        </dl>

        {bill.einvoice?.irn && (
          <div className="mt-5 rounded-xl border border-slate-200 p-3 text-center">
            {bill.einvoice.signed_qr && <QRCodeSVG value={bill.einvoice.signed_qr} size={160} level="L" className="mx-auto" />}
            <p className="mt-2 break-all font-mono text-[10px] text-slate-500">IRN: {bill.einvoice.irn}</p>
            {bill.einvoice.ack_no && <p className="text-[10px] text-slate-500">Ack No: {bill.einvoice.ack_no}</p>}
          </div>
        )}

        {bill.can_review && <ReviewPrompt token={token} restaurantName={bill.restaurant.name} />}

        <div className="mt-6 flex gap-2 print:hidden">
          <button onClick={() => window.print()} className="flex-1 rounded-xl bg-slate-900 py-2.5 text-sm font-bold text-white">
            Save / Print
          </button>
          {bill.restaurant.phone && (
            <a href={`tel:${bill.restaurant.phone}`} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-center text-sm font-bold text-slate-700">
              Call restaurant
            </a>
          )}
        </div>
        <p className="mt-4 text-center text-[10px] text-slate-400">Powered by Qrave</p>
      </div>
    </main>
  );
}
