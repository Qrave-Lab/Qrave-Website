"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  MessageSquare,
  Send,
  Zap,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import StaffSidebar from "@/app/components/StaffSidebar";
import { api } from "@/app/lib/api";

/* ------------------------------------------------------------------ types */
type FeedbackType = "bug" | "feature_request" | "general" | "performance" | "ux";
type Priority = "low" | "medium" | "high" | "critical";
type FeedbackStatus = "open" | "acknowledged" | "resolved" | "wont_fix";

interface FeedbackEntry {
  id: string;
  user_role: string;
  type: FeedbackType;
  priority: Priority;
  title: string;
  description: string;
  status: FeedbackStatus;
  created_at: string;
}

/* ---------------------------------------------------------------- helpers */
const TYPE_LABELS: Record<FeedbackType, string> = {
  bug: "Bug Report",
  feature_request: "Feature Request",
  general: "General Feedback",
  performance: "Performance Issue",
  ux: "UX / Design",
};

const TYPE_COLORS: Record<FeedbackType, string> = {
  bug: "bg-rose-100 text-rose-700",
  feature_request: "bg-indigo-100 text-indigo-700",
  general: "bg-slate-100 text-slate-600",
  performance: "bg-amber-100 text-amber-700",
  ux: "bg-purple-100 text-purple-700",
};

const PRIORITY_COLORS: Record<Priority, string> = {
  low: "bg-slate-100 text-slate-500",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

const STATUS_COLORS: Record<FeedbackStatus, string> = {
  open: "bg-yellow-100 text-yellow-700",
  acknowledged: "bg-blue-100 text-blue-700",
  resolved: "bg-emerald-100 text-emerald-700",
  wont_fix: "bg-slate-100 text-slate-500",
};

const STATUS_LABELS: Record<FeedbackStatus, string> = {
  open: "Open",
  acknowledged: "Acknowledged",
  resolved: "Resolved",
  wont_fix: "Won't Fix",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* --------------------------------------------------------- FeedbackCard */
function FeedbackCard({ item }: { item: FeedbackEntry }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TYPE_COLORS[item.type]}`}>
            {TYPE_LABELS[item.type]}
          </span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PRIORITY_COLORS[item.priority]}`}>
            {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)} priority
          </span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[item.status]}`}>
            {STATUS_LABELS[item.status]}
          </span>
        </div>
        <span className="text-xs text-slate-400 whitespace-nowrap">{formatDate(item.created_at)}</span>
      </div>

      <h3 className="mt-3 text-sm font-bold text-slate-800">{item.title}</h3>

      <button
        onClick={() => setExpanded((v) => !v)}
        className="mt-2 flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
      >
        {expanded ? "Hide details" : "Show details"}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <p className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm text-slate-600 leading-relaxed border border-slate-100">
          {item.description}
        </p>
      )}
    </div>
  );
}

/* ============================================================ main page */
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

  // Auto-resize textarea
  useEffect(() => {
    if (descRef.current) {
      descRef.current.style.height = "auto";
      descRef.current.style.height = `${descRef.current.scrollHeight}px`;
    }
  }, [description]);

  // Load previous feedback
  useEffect(() => {
    (async () => {
      try {
        const res = await api<{ feedback: FeedbackEntry[] }>("/api/admin/feedback", { method: "GET" });
        setHistory(res.feedback ?? []);
      } catch {
        // non-blocking
      } finally {
        setLoadingHistory(false);
      }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error("Please fill in both title and description");
      return;
    }

    setSubmitting(true);
    try {
      const newEntry = await api<FeedbackEntry>("/api/admin/feedback", {
        method: "POST",
        body: JSON.stringify({ type, priority, title: title.trim(), description: description.trim() }),
      });

      toast.success("Feedback submitted — thank you!");
      setHistory((prev) => [newEntry, ...prev]);
      setTitle("");
      setDescription("");
      setType("general");
      setPriority("medium");
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    } catch {
      toast.error("Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] text-slate-900 overflow-hidden font-sans">
      <StaffSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* header */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center gap-4 shrink-0 z-10">
          <Link href="/staff/settings" className="text-slate-400 hover:text-slate-700 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-indigo-500" />
              Feedback &amp; Issues
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Report bugs, request features, or share thoughts about Qrave</p>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 scroll-smooth">
          <div className="mx-auto max-w-3xl pb-10 space-y-8">

            {/* ---- submission form ---- */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-base font-bold text-slate-900 flex items-center gap-2">
                <Send className="h-4 w-4 text-indigo-500" />
                Submit New Feedback
              </h2>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Type + Priority row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Type
                    </label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as FeedbackType)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="bug">🐛 Bug Report</option>
                      <option value="feature_request">✨ Feature Request</option>
                      <option value="general">💬 General Feedback</option>
                      <option value="performance">⚡ Performance Issue</option>
                      <option value="ux">🎨 UX / Design</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Priority
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as Priority)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    maxLength={200}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Brief summary of the issue or request"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <p className="mt-1 text-right text-xs text-slate-400">{title.length}/200</p>
                </div>

                {/* Description */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Description <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    ref={descRef}
                    value={description}
                    maxLength={5000}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder={
                      type === "bug"
                        ? "Steps to reproduce, expected vs actual behaviour, screenshots if any…"
                        : type === "feature_request"
                        ? "Describe the feature you'd like and how it would help your workflow…"
                        : "Tell us what's on your mind…"
                    }
                    className="w-full resize-none overflow-hidden rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <p className="mt-1 text-right text-xs text-slate-400">{description.length}/5000</p>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !title.trim() || !description.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitted ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Submitted!
                    </>
                  ) : submitting ? (
                    "Submitting…"
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Submit Feedback
                    </>
                  )}
                </button>
              </form>
            </section>

            {/* ---- previous submissions ---- */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-base font-bold text-slate-900 flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-slate-500" />
                Your Previous Submissions
              </h2>

              {loadingHistory ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
                  ))}
                </div>
              ) : history.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 py-12 text-center">
                  <Zap className="h-8 w-8 text-slate-300" />
                  <p className="text-sm font-medium text-slate-500">No feedback submitted yet from this branch.</p>
                  <p className="text-xs text-slate-400">Your submissions will appear here once sent.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((item) => (
                    <FeedbackCard key={item.id} item={item} />
                  ))}
                </div>
              )}
            </section>

            {/* info banner */}
            <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
              <p className="text-xs text-blue-700 leading-relaxed">
                Feedback is reviewed by the Qrave team and tied to your restaurant account. Critical issues are triaged within 24 hours on business days.
              </p>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
