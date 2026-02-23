"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ClipboardList } from "lucide-react";
import Link from "next/link";
import StaffSidebar from "@/app/components/StaffSidebar";
import { api } from "@/app/lib/api";
import toast from "react-hot-toast";

type AuditLog = {
  id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  user_id?: string;
  user_role?: string;
  meta?: Record<string, any>;
  created_at: string;
};

export default function AuditLogPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await api<{ logs?: AuditLog[] }>("/api/admin/audit/logs?limit=200", { method: "GET" });
        setLogs(res?.logs || []);
      } catch {
        toast.error("Failed to load audit logs");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter((l) => {
      const txt = `${l.action} ${l.entity_type} ${l.user_role || ""} ${JSON.stringify(l.meta || {})}`.toLowerCase();
      return txt.includes(q);
    });
  }, [logs, query]);

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] text-slate-900 overflow-hidden">
      <StaffSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Audit Logs</h1>
            <p className="text-sm text-slate-500">Every critical action is tracked: price changes, archiving, order status updates, and cancellations.</p>
          </div>
          <Link
            href="/staff/settings"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-[1400px] space-y-4">
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
                        <th className="px-4 py-3 text-left">Role</th>
                        <th className="px-4 py-3 text-left">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((log) => (
                        <tr key={log.id} className="border-t border-slate-100 align-top">
                          <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-800">{log.action}</td>
                          <td className="px-4 py-3 text-slate-600">{log.entity_type}</td>
                          <td className="px-4 py-3 text-slate-600">{log.user_role || "unknown"}</td>
                          <td className="px-4 py-3 text-xs text-slate-500 max-w-[520px]">
                            <pre className="whitespace-pre-wrap break-words">{JSON.stringify(log.meta || {}, null, 0)}</pre>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
