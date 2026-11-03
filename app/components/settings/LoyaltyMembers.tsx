"use client";

import { useState } from "react";
import { Download, Loader2, Upload } from "lucide-react";
import { api } from "@/app/lib/api";

type ImportResult = {
  rows: number;
  created: number;
  updated: number;
  skipped: number;
  balances: number;
  dry_run: boolean;
  problems: { line: number; message: string }[];
};

/** Export all members to CSV, or bring members in from another system. */
export default function LoyaltyMembers({ canImport }: { canImport: boolean }) {
  const [busy, setBusy] = useState<"" | "export" | "check" | "import">("");
  const [error, setError] = useState("");
  const [fileText, setFileText] = useState("");
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [done, setDone] = useState<ImportResult | null>(null);

  const exportCsv = async () => {
    setBusy("export");
    setError("");
    try {
      const res = await fetch("/api/proxy/api/admin/crm/loyalty/members/export", { credentials: "include" });
      if (!res.ok) {
        let msg = `Download failed (${res.status})`;
        try {
          msg = JSON.parse(await res.text()).message || msg;
        } catch {}
        throw new Error(msg);
      }
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `loyalty-members-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message || "Couldn't download.");
    } finally {
      setBusy("");
    }
  };

  const send = async (dry: boolean) => {
    setBusy(dry ? "check" : "import");
    setError("");
    try {
      const res = await api<ImportResult>(`/api/admin/crm/loyalty/members/import${dry ? "?dry_run=1" : ""}`, {
        method: "POST",
        headers: { "Content-Type": "text/csv" },
        body: fileText,
      });
      if (dry) setPreview(res);
      else {
        setDone(res);
        setPreview(null);
        setFileText("");
        setFileName("");
      }
    } catch (e) {
      setError((e as Error).message || "Couldn't read the file.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="space-y-5" data-testid="loyalty-members">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-800">Download members</p>
        <p className="text-xs text-slate-500">A spreadsheet (CSV) of every member: contact details, balance, tier, visits and spend. Keep it safe; it has personal details.</p>
        <button
          onClick={exportCsv}
          disabled={busy !== ""}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {busy === "export" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download CSV
        </button>
      </div>

      {canImport && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-800">Bring in members</p>
          <p className="text-xs text-slate-500">
            Upload a CSV with a <b>phone</b> column. Optional columns: name, email, birthday, points (or stamps), messages_opt_in (yes/no). New members get the balance as an opening balance; existing members keep theirs. You&apos;ll see a check before anything is saved.
          </p>
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
            <Upload className="h-4 w-4" />
            {fileName || "Choose a CSV file"}
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                setPreview(null);
                setDone(null);
                setError("");
                if (!f) return;
                if (f.size > 2 * 1024 * 1024) {
                  setError("That file is over 2 MB. Split it into smaller files.");
                  return;
                }
                setFileName(f.name);
                setFileText(await f.text());
              }}
            />
          </label>
          {fileText && !preview && (
            <button
              onClick={() => send(true)}
              disabled={busy !== ""}
              className="ml-2 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {busy === "check" && <Loader2 className="h-4 w-4 animate-spin" />} Check file
            </button>
          )}
          {preview && (
            <div className="space-y-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
              <p>
                {preview.rows} rows: <b>{preview.created}</b> new members ({preview.balances} with an opening balance), <b>{preview.updated}</b> already members,{" "}
                <b>{preview.skipped}</b> skipped.
              </p>
              {preview.problems.length > 0 && (
                <ul className="max-h-32 list-disc overflow-y-auto pl-4 text-amber-800">
                  {preview.problems.slice(0, 50).map((p, i) => (
                    <li key={i}>
                      Line {p.line}: {p.message}
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => send(false)}
                  disabled={busy !== "" || preview.created + preview.updated === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {busy === "import" && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Import {preview.created + preview.updated} members
                </button>
                <button onClick={() => setPreview(null)} className="rounded-lg px-3 py-1.5 text-slate-600 hover:bg-white">
                  Cancel
                </button>
              </div>
            </div>
          )}
          {done && (
            <p className="text-xs font-medium text-emerald-700">
              Imported: {done.created} new, {done.updated} updated{done.skipped ? `, ${done.skipped} skipped` : ""}.
            </p>
          )}
        </div>
      )}
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
    </div>
  );
}
