"use client";

import React, { useEffect, useState, useCallback } from "react";
import { ArrowLeft, RefreshCw, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";
import { getOfflineQueueStatus, OfflineEvent } from "@/app/lib/offlineStore";

export default function SyncQueueMonitorPage() {
  const [queue, setQueue] = useState<OfflineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const loadQueue = useCallback(async () => {
    try {
      const status = await getOfflineQueueStatus();
      setQueue(status.queue || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
    const handleUpdate = () => loadQueue();
    window.addEventListener("sync-queue-updated", handleUpdate);
    return () => window.removeEventListener("sync-queue-updated", handleUpdate);
  }, [loadQueue]);

  return (
    <div className="flex h-screen flex-col bg-[#f8fafc] text-slate-900 overflow-hidden font-sans">
      <header className="flex items-center gap-4 bg-white border-b border-slate-200 px-8 py-4 shrink-0">
        <Link href="/staff/settings" className="p-2 -ml-2 rounded-xl hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Sync Queue Monitor</h1>
          <p className="text-xs text-slate-500 mt-0.5">View offline queues and sync statuses</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto pb-10">
          {loading ? (
            <div className="text-center py-12 text-slate-500 animate-pulse">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-slate-400" />
              Loading queue...
            </div>
          ) : queue.length === 0 ? (
            <div className="text-center py-20 bg-white border border-slate-200 rounded-3xl shadow-sm">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900">All Synced</h3>
              <p className="text-slate-500 mt-1">There are no offline events waiting to sync.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {queue.map((item) => (
                <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-start gap-4 transition-all hover:border-slate-300">
                  <div className={`mt-1 p-2 rounded-xl ${
                    item.status === 'failed' || item.status === 'manual_review' ? 'bg-red-50 text-red-600' :
                    item.status === 'syncing' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    {item.status === 'failed' || item.status === 'manual_review' ? <AlertCircle className="w-5 h-5" /> :
                     item.status === 'syncing' ? <RefreshCw className="w-5 h-5 animate-spin" /> :
                     <Clock className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4">
                      <h4 className="text-base font-bold text-slate-900 truncate">
                        {item.type}
                      </h4>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap uppercase tracking-wider ${
                        item.status === 'failed' || item.status === 'manual_review' ? 'bg-red-100 text-red-700' :
                        item.status === 'syncing' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div>
                        <p><span className="font-semibold text-slate-800">Local ID:</span> {item.local_id}</p>
                        <p className="mt-1.5"><span className="font-semibold text-slate-800">Created:</span> {new Date(item.created_at).toLocaleString()}</p>
                      </div>
                      <div>
                        <p><span className="font-semibold text-slate-800">Retry Count:</span> {item.retry_count}</p>
                        {item.last_attempt_at && (
                          <p className="mt-1.5"><span className="font-semibold text-slate-800">Last Attempt:</span> {new Date(item.last_attempt_at).toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                    {item.last_error && (
                      <div className="mt-3 p-3 bg-red-50/50 border border-red-100 rounded-xl text-sm text-red-700 font-mono break-words">
                        <span className="font-bold">Error:</span> {item.last_error}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
