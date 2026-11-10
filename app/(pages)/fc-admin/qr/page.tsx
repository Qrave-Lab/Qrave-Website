"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Loader2, Printer } from "lucide-react";
import { fcAdmin, type QRToken } from "@/app/lib/foodCourtAdmin";
import { useOperator } from "../FcAdminShell";

export default function QRPage() {
  const me = useOperator();
  const [tokens, setTokens] = useState<QRToken[] | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    fcAdmin
      .qrTokens()
      .then((r) => {
        setTokens(r.tokens);
        setOrigin(window.location.origin);
      })
      .catch(() => setTokens([]));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 print:hidden">
        <div>
          <h2 className="text-xl font-extrabold">QR codes</h2>
          <p className="text-sm text-slate-500">
            Put these on tables, pillars and entrances. Each one opens the whole food court, and analytics show which code was scanned.
          </p>
        </div>
        {tokens && tokens.length > 0 && (
          <button
            onClick={() => window.print()}
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-900 px-3 py-2 text-sm font-bold text-white"
          >
            <Printer size={16} /> Print
          </button>
        )}
      </div>

      {!tokens ? (
        <div className="flex justify-center py-16 text-slate-400">
          <Loader2 className="animate-spin" />
        </div>
      ) : tokens.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          No QR codes yet. Ask Qrave to create them for your tables and entrances.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-3">
          {tokens.map((t) => (
            <div key={t.token} className="flex break-inside-avoid flex-col items-center rounded-2xl border border-slate-200 bg-white p-4 text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-orange-600">{me.court.name}</p>
              <QRCodeSVG value={`${origin}/fc/qr/${t.token}`} size={140} className="my-3" />
              <p className="text-sm font-extrabold">Scan for every menu</p>
              {t.zoneLabel && <p className="text-xs text-slate-500">{t.zoneLabel}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
