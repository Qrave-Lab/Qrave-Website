"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Copy, Download, KeyRound, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import toast from "react-hot-toast";
import SettingsPageLayout from "@/app/components/settings/SettingsPageLayout";
import { api } from "@/app/lib/api";

type Status = { enabled: boolean; required: boolean; available: boolean; recovery_codes_left: number };

const errMsg = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);
const input =
  "w-full rounded-xl border border-slate-200 px-4 py-2.5 text-center text-lg font-semibold tracking-[0.3em] text-slate-900 outline-none focus:border-[#fe5c13] focus:ring-2 focus:ring-yellow-500/20";
const primary =
  "inline-flex items-center gap-2 rounded-lg bg-[#fe5c13] px-5 py-2.5 text-sm font-bold text-white disabled:bg-slate-100 disabled:text-slate-400";

export default function SecurityPage() {
  const forced = useSearchParams().get("setup") === "required";
  const [status, setStatus] = useState<Status | null>(null);
  const [setup, setSetup] = useState<{ secret: string; otpauth_url: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [saved, setSaved] = useState(false);
  const [action, setAction] = useState<"" | "regen" | "disable">("");

  const load = useCallback(async () => {
    try {
      setStatus(await api<Status>("/api/admin/2fa/status", { method: "GET", noCache: true }));
    } catch (e) {
      toast.error(errMsg(e, "Failed to load security settings"));
    }
  }, []);
  useEffect(() => {
    api<Status>("/api/admin/2fa/status", { method: "GET", noCache: true })
      .then(setStatus)
      .catch((e) => toast.error(errMsg(e, "Failed to load security settings")));
  }, []);

  const post = async <T,>(path: string, body?: object) =>
    api<T>(`/api/admin/2fa/${path}`, { method: "POST", body: body ? JSON.stringify(body) : undefined });

  const begin = async () => {
    setBusy(true);
    try {
      setSetup(await post<{ secret: string; otpauth_url: string }>("setup"));
      setCode("");
    } catch (e) {
      toast.error(errMsg(e, "Could not start setup"));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    try {
      const res = await post<{ recovery_codes: string[] }>("confirm", { code });
      setCodes(res.recovery_codes);
      setSaved(false);
      setSetup(null);
      setCode("");
      await load();
      toast.success("Two-factor authentication is on");
    } catch (e) {
      toast.error(errMsg(e, "That code didn't work"));
    } finally {
      setBusy(false);
    }
  };

  const regenerate = async () => {
    setBusy(true);
    try {
      const res = await post<{ recovery_codes: string[] }>("recovery-codes", { code });
      setCodes(res.recovery_codes);
      setSaved(false);
      setAction("");
      setCode("");
      await load();
    } catch (e) {
      toast.error(errMsg(e, "That code didn't work"));
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      await post("disable", { code });
      setAction("");
      setCode("");
      await load();
      toast.success("Two-factor authentication turned off");
    } catch (e) {
      toast.error(errMsg(e, "That code didn't work"));
    } finally {
      setBusy(false);
    }
  };

  const copyCodes = async () => {
    try {
      await navigator.clipboard.writeText((codes || []).join("\n"));
      toast.success("Copied");
    } catch {
      toast.error("Copy failed, download instead");
    }
  };
  const downloadCodes = () => {
    const blob = new Blob([`Qrave recovery codes\nEach code works once.\n\n${(codes || []).join("\n")}\n`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "qrave-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const card = "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm";

  return (
    <SettingsPageLayout title="Security" description="Protect your account with an authenticator app." fullBleed>
      <div className="flex-1 min-h-0 overflow-y-auto bg-[#f8fafc] p-8">
        <div className="mx-auto max-w-2xl space-y-6">
          {(forced || status?.required) && !status?.enabled && (
            <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-medium leading-relaxed text-amber-900">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Owner accounts must use two-factor authentication. Set it up now to continue to your dashboard.</p>
            </div>
          )}

          {!status ? (
            <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-[#fe5c13]" /></div>
          ) : codes ? (
            <section className={card}>
              <div className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-[#fe5c13]" /><h2 className="text-sm font-black text-slate-900">Save your recovery codes</h2></div>
              <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
                If you lose your phone, each of these codes lets you sign in once. They are shown only now. Store them somewhere safe, such as a password manager.
              </p>
              <ul className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-4 font-mono text-sm text-slate-800">
                {codes.map((c) => <li key={c}>{c}</li>)}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={copyCodes} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700"><Copy className="h-4 w-4" />Copy</button>
                <button onClick={downloadCodes} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700"><Download className="h-4 w-4" />Download</button>
              </div>
              <label className="mt-5 flex items-center gap-2 text-xs font-semibold text-slate-700">
                <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} /> I have saved these codes
              </label>
              <button onClick={() => { setCodes(null); if (forced) window.location.href = "/staff"; }} disabled={!saved} className={`${primary} mt-4`}>Done</button>
            </section>
          ) : status.enabled ? (
            <section className={card}>
              <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" /><h2 className="text-sm font-black text-slate-900">Two-factor authentication is on</h2></div>
              <p className="mt-1 text-xs font-medium text-slate-500">
                {status.recovery_codes_left} recovery code{status.recovery_codes_left === 1 ? "" : "s"} left.
                {status.recovery_codes_left <= 2 && " Generate new ones soon."}
              </p>

              {action ? (
                <div className="mt-5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Enter a code from your app (or a recovery code) to {action === "regen" ? "get new recovery codes" : "turn 2FA off"}
                  </label>
                  <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" className={`${input} mt-1.5`} autoComplete="one-time-code" />
                  <div className="mt-3 flex gap-2">
                    <button onClick={action === "regen" ? regenerate : disable} disabled={busy || !code.trim()} className={primary}>
                      {busy && <Loader2 className="h-4 w-4 animate-spin" />}{action === "regen" ? "Generate new codes" : "Turn off"}
                    </button>
                    <button onClick={() => { setAction(""); setCode(""); }} className="rounded-lg px-4 py-2 text-sm font-bold text-slate-500">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="mt-5 flex flex-wrap gap-2">
                  <button onClick={() => setAction("regen")} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700">New recovery codes</button>
                  {!status.required && (
                    <button onClick={() => setAction("disable")} className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-bold text-rose-600">Turn off</button>
                  )}
                </div>
              )}
              {status.required && <p className="mt-4 text-[11px] font-medium text-slate-400">Owner accounts can&apos;t turn two-factor authentication off.</p>}
            </section>
          ) : setup ? (
            <section className={card}>
              <h2 className="text-sm font-black text-slate-900">Scan with your authenticator app</h2>
              <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
                Use Google Authenticator, Microsoft Authenticator, Authy or 1Password. Scan the code, then type the 6-digit number the app shows.
              </p>
              <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                <div className="rounded-xl border border-slate-200 bg-white p-3"><QRCodeSVG value={setup.otpauth_url} size={168} level="M" /></div>
                <div className="min-w-0 text-xs text-slate-500">
                  <p className="font-semibold text-slate-700">Can&apos;t scan? Enter this key manually:</p>
                  <p className="mt-1 break-all rounded-lg bg-slate-50 p-2 font-mono text-slate-800">{setup.secret}</p>
                </div>
              </div>
              <label className="mt-5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">6-digit code</label>
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" inputMode="numeric" maxLength={7} className={`${input} mt-1.5`} autoComplete="one-time-code" />
              <button onClick={confirm} disabled={busy || code.replace(/\s/g, "").length !== 6} className={`${primary} mt-3`}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}Verify and turn on
              </button>
            </section>
          ) : (
            <section className={card}>
              <h2 className="text-sm font-black text-slate-900">Two-factor authentication is off</h2>
              <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
                After your password you&apos;ll also enter a 6-digit code from an app on your phone. Even if someone learns your password, they can&apos;t sign in.
              </p>
              {!status.available ? (
                <p className="mt-4 text-xs font-semibold text-rose-600">Setup isn&apos;t available on this server yet. Ask your administrator to configure QRAVE_SECRETS_KEY.</p>
              ) : (
                <button onClick={begin} disabled={busy} className={`${primary} mt-4`}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Set up</button>
              )}
            </section>
          )}
        </div>
      </div>
    </SettingsPageLayout>
  );
}
