"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  MessageSquare,
  Send,
  Zap,
  Bug,
  Sparkles,
  Gauge,
  Paintbrush2,
} from "lucide-react";
import toast from "react-hot-toast";
import SettingsPageLayout from "@/app/components/settings/SettingsPageLayout";
import { api } from "@/app/lib/api";

type FeedbackType = "bug" | "feature_request" | "general" | "performance" | "ux";
type Priority = "low" | "medium" | "high" | "critical";
type FeedbackStatus = "open" | "acknowledged" | "resolved" | "wont_fix";

interface FeedbackEntry {
  id: string; user_role: string; type: FeedbackType; priority: Priority;
  title: string; description: string; status: FeedbackStatus; created_at: string;
}

const TYPE_OPTIONS: { value: FeedbackType; label: string; icon: React.ReactNode; color: string }[] = [
  { value: "bug",             label: "Bug Report",        icon: <Bug className="w-3.5 h-3.5" />,        color: "bg-rose-50 border-rose-200 text-rose-700" },
  { value: "feature_request", label: "Feature Request",   icon: <Sparkles className="w-3.5 h-3.5" />,   color: "bg-indigo-50 border-indigo-200 text-indigo-700" },
  { value: "general",         label: "General",           icon: <MessageSquare className="w-3.5 h-3.5" />, color: "bg-slate-100 border-slate-200 text-slate-600" },
  { value: "performance",     label: "Performance",       icon: <Gauge className="w-3.5 h-3.5" />,      color: "bg-amber-50 border-amber-200 text-amber-700" },
  { value: "ux",              label: "UX / Design",       icon: <Paintbrush2 className="w-3.5 h-3.5" />, color: "bg-purple-50 border-purple-200 text-purple-700" },
];

const PRIORITY_OPTIONS: { value: Priority; label: string; dot: string }[] = [
  { value: "low",      label: "Low",      dot: "bg-slate-400" },
  { value: "medium",   label: "Medium",   dot: "bg-blue-500" },
  { value: "high",     label: "High",     dot: "bg-orange-500" },
  { value: "critical", label: "Critical", dot: "bg-red-500" },
];

const TYPE_COLORS: Record<FeedbackType, string> = {
  bug: "bg-rose-100 text-rose-700 border-rose-200",
  feature_request: "bg-indigo-100 text-indigo-700 border-indigo-200",
  general: "bg-slate-100 text-slate-600 border-slate-200",
  performance: "bg-amber-100 text-amber-700 border-amber-200",
  ux: "bg-purple-100 text-purple-700 border-purple-200",
};

const TYPE_LABELS: Record<FeedbackType, string> = {
  bug: "Bug Report", feature_request: "Feature Request", general: "General",
  performance: "Performance", ux: "UX / Design",
};

const PRIORITY_COLORS: Record<Priority, string> = {
  low: "bg-slate-100 text-slate-500 border-slate-200",
  medium: "bg-blue-100 text-blue-700 border-blue-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  critical: "bg-red-100 text-red-700 border-red-200",
};

const STATUS_COLORS: Record<FeedbackStatus, string> = {
  open: "bg-yellow-100 text-yellow-700 border-yellow-200",
  acknowledged: "bg-blue-100 text-blue-700 border-blue-200",
  resolved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  wont_fix: "bg-slate-100 text-slate-500 border-slate-200",
};

const STATUS_LABELS: Record<FeedbackStatus, string> = {
  open: "Open", acknowledged: "Acknowledged", resolved: "Resolved", wont_fix: "Won't Fix",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function FeedbackCard({ item }: { item: FeedbackEntry }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <div className="px-8 py-4 hover:bg-slate-50/60 transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${TYPE_COLORS[item.type]}`}>
              {TYPE_LABELS[item.type]}
            </span>
            <span className={`rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${PRIORITY_COLORS[item.priority]}`}>
              {item.priority}
            </span>
            <span className={`rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${STATUS_COLORS[item.status]}`}>
              {STATUS_LABELS[item.status]}
            </span>
          </div>
          <span className="text-xs text-slate-400 whitespace-nowrap">{formatDate(item.created_at)}</span>
        </div>

        <h3 className="mt-2 text-sm font-bold text-slate-800">{item.title}</h3>

        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-[#fe5c13] hover:opacity-80 transition-opacity"
        >
          {expanded ? "Hide details" : "Show details"}
          <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>

        {expanded && (
          <p className="mt-2 whitespace-pre-wrap rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 text-xs text-slate-600 leading-relaxed font-medium">
            {item.description}
          </p>
        )}
      </div>
    </div>
  );
}

export default function FeedbackPage() {
  const [type, setType] = useState<FeedbackType>("general");
  const [priority, setPriority] = useState<Priority>("medium");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [history, setHistory] = useState<FeedbackEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const descRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (descRef.current) {
      descRef.current.style.height = "auto";
      descRef.current.style.height = `${descRef.current.scrollHeight}px`;
    }
  }, [description]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api<{ feedback: FeedbackEntry[] }>("/api/admin/feedback", { method: "GET" });
        setHistory(res.feedback ?? []);
      } catch {} finally { setLoadingHistory(false); }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) { toast.error("Please fill in both title and description"); return; }
    setSubmitting(true);
    try {
      const newEntry = await api<FeedbackEntry>("/api/admin/feedback", {
        method: "POST",
        body: JSON.stringify({ type, priority, title: title.trim(), description: description.trim() }),
      });
      toast.success("Feedback submitted — thank you!");
      setHistory((prev) => [newEntry, ...prev]);
      setTitle(""); setDescription(""); setType("general"); setPriority("medium");
      setSubmitted(true); setTimeout(() => setSubmitted(false), 3000);
    } catch { toast.error("Failed to submit feedback"); } finally { setSubmitting(false); }
  };

  return (
    <SettingsPageLayout title="Feedback & Issues" description="Report bugs, request features, or share thoughts about Qrave." fullBleed>
      <div className="flex flex-1 min-h-0">
        {/* Two-panel flex layout */}
        <div className="flex flex-col xl:flex-row flex-1 min-h-0">

          {/* ── Left: Submit form ──────────────────────────────────────── */}
          <div className="xl:w-[40%] border-r border-slate-200 bg-white px-8 py-8 flex flex-col gap-6 overflow-y-auto">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">New Report</p>
              <h2 className="text-lg font-black text-slate-900 mt-0.5 flex items-center gap-2">
                <Send className="w-4 h-4 text-[#fe5c13]" /> Submit Feedback
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5 flex-1">

              {/* Type pills */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Type</label>
                <div className="flex flex-wrap gap-2">
                  {TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setType(opt.value)}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
                        type === opt.value ? opt.color + " shadow-sm scale-[1.02]" : "border-slate-200 text-slate-500 hover:border-slate-300 bg-white"
                      }`}
                    >
                      {opt.icon} {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Priority</label>
                <div className="flex gap-2">
                  {PRIORITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPriority(opt.value)}
                      className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-bold transition-all ${
                        priority === opt.value
                          ? PRIORITY_COLORS[opt.value] + " shadow-sm scale-[1.02]"
                          : "border-slate-200 text-slate-500 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${opt.dot}`} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                  Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  maxLength={200}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Brief summary of the issue or request"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-[#fe5c13] focus:ring-2 focus:ring-orange-100 transition-all"
                />
                <p className="mt-1 text-right text-[10px] text-slate-400">{title.length}/200</p>
              </div>

              {/* Description */}
              <div className="flex-1">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                  Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  ref={descRef}
                  value={description}
                  maxLength={5000}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  placeholder={
                    type === "bug" ? "Steps to reproduce, expected vs actual behaviour…"
                    : type === "feature_request" ? "Describe the feature you'd like…"
                    : "Tell us what's on your mind…"
                  }
                  className="w-full resize-none overflow-hidden rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-[#fe5c13] focus:ring-2 focus:ring-orange-100 transition-all"
                />
                <p className="mt-1 text-right text-[10px] text-slate-400">{description.length}/5000</p>
              </div>

              <button
                type="submit"
                disabled={submitting || !title.trim() || !description.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#fe5c13] px-4 py-3 text-sm font-black text-white shadow-md shadow-orange-100 transition-all hover:brightness-95 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                {submitted ? (
                  <><CheckCircle2 className="h-4 w-4" /> Submitted!</>
                ) : submitting ? (
                  "Submitting…"
                ) : (
                  <><Send className="h-4 w-4" /> Submit Feedback</>
                )}
              </button>

              {/* Disclaimer */}
              <div className="flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
                <p className="text-[11px] text-blue-700 leading-relaxed font-medium">
                  Feedback is reviewed by the Qrave team. Critical issues are triaged within 24 hours on business days.
                </p>
              </div>
            </form>
          </div>

          {/* ── Right: History ─────────────────────────────────────────── */}
          <div className="flex flex-col flex-1 min-h-0 bg-[#f8fafc]">
            {/* Section header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-slate-500" />
                <h2 className="text-sm font-black text-slate-900">Previous Submissions</h2>
              </div>
              {!loadingHistory && (
                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                  {history.length} report{history.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingHistory ? (
                <div className="space-y-0">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="animate-pulse px-8 py-4 border-b border-slate-100">
                      <div className="flex gap-2 mb-2">
                        <div className="h-5 w-20 rounded-md bg-slate-100" />
                        <div className="h-5 w-16 rounded-md bg-slate-100" />
                      </div>
                      <div className="h-4 w-48 rounded bg-slate-100" />
                    </div>
                  ))}
                </div>
              ) : history.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-20 text-center px-8">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <Zap className="h-6 w-6 text-slate-300" />
                  </div>
                  <p className="text-sm font-semibold text-slate-500">No feedback submitted yet from this branch.</p>
                  <p className="text-xs text-slate-400">Use the form on the left to submit your first report.</p>
                </div>
              ) : (
                <div>
                  {history.map((item) => <FeedbackCard key={item.id} item={item} />)}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </SettingsPageLayout>
  );
}
