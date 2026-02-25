"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ClipboardList } from "lucide-react";
import { api } from "@/app/lib/api";
import SettingsPageLayout from "@/app/components/settings/SettingsPageLayout";
import toast from "react-hot-toast";

type AuditLog = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  user_role: string;
  user_name?: string | null;
  created_at: string;
  meta: Record<string, unknown> | null;
};

function formatLabel(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmt(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

function FormatAuditDetails({ log }: { log: AuditLog }) {
  const meta = log.meta || {};

  // Order status change
  if (log.action === "order.status.updated") {
    const from = fmt(meta.from_status);
    const to = fmt(meta.to_status);
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-600">{formatLabel(from)}</span>
        <span className="text-slate-400">→</span>
        <span className="rounded bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">{formatLabel(to)}</span>
      </div>
    );
  }

  // Order cancelled
  if (log.action === "order.cancelled") {
    return <span className="rounded bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-600">Order cancelled</span>;
  }

  // Menu item updated
  if (log.action === "menu.item.updated") {
    const rows: { label: string; from: string; to: string }[] = [];
    if (meta.price_changed) {
      rows.push({ label: "Price", from: `₹${fmt(meta.previous_price)}`, to: `₹${fmt(meta.new_price)}` });
    }
    if (meta.archive_state_change) {
      rows.push({
        label: "Archived",
        from: meta.previous_archived ? "Archived" : "Active",
        to: meta.is_archived ? "Archived" : "Active",
      });
    }
    // detect any other boolean/value changes
    const boolPairs: [string, string, string][] = [
      ["is_out_of_stock", "Out of Stock", "In Stock"],
      ["is_todays_special", "Today's Special ON", "Today's Special OFF"],
      ["is_chef_special", "Chef Special ON", "Chef Special OFF"],
    ];
    for (const [key, onLabel, offLabel] of boolPairs) {
      if (key in meta) {
        rows.push({ label: formatLabel(key), from: "—", to: meta[key] ? onLabel : offLabel });
      }
    }
    if (meta.special_note !== undefined) {
      rows.push({ label: "Special Note", from: "—", to: fmt(meta.special_note) });
    }
    if (!rows.length) {
      rows.push({ label: "Item", from: "—", to: fmt(meta.name) });
    }
    return (
      <div className="space-y-1">
        {!!meta.name && <p className="text-xs font-semibold text-slate-700 mb-1">{fmt(meta.name)}</p>}
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-1 text-xs">
            <span className="w-28 text-slate-500">{r.label}:</span>
            <span className="text-rose-500 line-through">{r.from}</span>
            <span className="mx-1 text-slate-400">→</span>
            <span className="font-medium text-emerald-700">{r.to}</span>
          </div>
        ))}
      </div>
    );
  }

  // Menu item deleted
  if (log.action === "menu.item.deleted") {
    return (
      <div className="text-xs text-slate-700">
        <span className="font-semibold">{fmt(meta.name)}</span>
        {meta.price !== undefined && (
          <span className="ml-2 text-slate-500">@ ₹{fmt(meta.price)}</span>
        )}
      </div>
    );
  }

  // Generic fallback: show all meta key-value pairs
  const entries = Object.entries(meta).filter(([, v]) => v !== null && v !== undefined && v !== "");
  if (!entries.length) return <span className="text-slate-400 text-xs">—</span>;
  return (
    <div className="space-y-1">
      {entries.map(([k, v]) => (
        <div key={k} className="flex items-start gap-1 text-xs">
          <span className="w-32 shrink-0 text-slate-500">{formatLabel(k)}:</span>
          <span className="font-medium text-slate-700 break-all">{fmt(v)}</span>
        </div>
      ))}
    </div>
  );
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await api<{ logs: AuditLog[] }>("/api/admin/audit/logs");
        setLogs(data?.logs || []);
      } catch {
        toast.error("Failed to load audit logs");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return logs;
    const q = query.toLowerCase();
    return logs.filter(
      (l) =>
        l.action.toLowerCase().includes(q) ||
        l.entity_type.toLowerCase().includes(q) ||
        (l.user_role || "").toLowerCase().includes(q) ||
        JSON.stringify(l.new_value || {}).toLowerCase().includes(q) ||
        JSON.stringify(l.old_value || {}).toLowerCase().includes(q)
    );
  }, [logs, query]);

  return (
    <SettingsPageLayout title="Audit Log" description="Every critical action is tracked: price changes, archiving, order status updates, and cancellations." maxWidth="max-w-[1400px]">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-slate-500" />
            <h2 className="text-lg font-bold">Recent Events</h2>
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full max-w-sm rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Filter by action, role, metadata..."
          />
        </div>
        {isLoading ? (
          <div className="py-14 text-center text-sm text-slate-500">Loading logs...</div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center text-sm text-slate-500">No logs found.</div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Time</th>
                  <th className="px-4 py-3 text-left">Action</th>
                  <th className="px-4 py-3 text-left">Entity</th>
                  <th className="px-4 py-3 text-left">By</th>
                  <th className="px-4 py-3 text-left">Details</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => (
                  <tr key={log.id} className="border-t border-slate-100 align-top hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{formatLabel(log.action)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatLabel(log.entity_type)}</td>
                    <td className="px-4 py-3">
                      {log.user_name ? (
                        <div>
                          <p className="text-xs font-medium text-slate-800">{log.user_name}</p>
                          <p className="text-xs text-slate-400 capitalize">{log.user_role || "unknown"}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 capitalize">{log.user_role || "unknown"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-[500px]">
                      <FormatAuditDetails log={log} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </SettingsPageLayout>
  );
}
