"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2 } from "lucide-react";
import SettingsPageLayout from "@/app/components/settings/SettingsPageLayout";
import { api } from "@/app/lib/api";
import toast from "react-hot-toast";

type AdminMeResponse = { role?: string; email?: string };

const getErrorMessage = (err: unknown, fallback: string) => {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
};

export default function DeleteAccountPage() {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = await api<AdminMeResponse>("/api/admin/me", { method: "GET" });
        setRole(me.role || ""); setEmail(me.email || "");
      } catch { toast.error("Failed to load account"); } finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((v) => Math.max(0, v - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const requestOtp = async () => {
    if (cooldown > 0) return;
    setRequestingOtp(true);
    try {
      await api("/api/admin/account/delete/request-otp", { method: "POST" });
      setOtpRequested(true); setCooldown(60); toast.success("OTP sent");
    } catch (err) { toast.error(getErrorMessage(err, "Failed to send OTP")); } finally { setRequestingOtp(false); }
  };

  const deleteAccount = async () => {
    if (confirmText.trim().toUpperCase() !== "DELETE") { toast.error("Type DELETE to confirm"); return; }
    if (otp.trim().length < 4) { toast.error("Enter valid OTP"); return; }
    setDeleting(true);
    try {
      await api("/api/admin/account/delete", { method: "POST", body: JSON.stringify({ otp: otp.trim(), confirm_text: confirmText.trim() }) });
      localStorage.clear(); toast.success("Account deleted"); window.location.href = "/login";
    } catch (err) { toast.error(getErrorMessage(err, "Failed to delete account")); } finally { setDeleting(false); }
  };

  if (loading) {
    return <div className="flex h-screen w-full items-center justify-center bg-white"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  }

  if (role !== "owner") {
    return (
      <SettingsPageLayout title="Delete Account" description="Permanently remove your restaurant and all data.">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center max-w-md mx-auto">
          <h2 className="text-lg font-bold text-slate-900">Access Restricted</h2>
          <p className="mt-2 text-sm text-slate-600">Only the restaurant owner can delete the account.</p>
        </div>
      </SettingsPageLayout>
    );
  }

  return (
    <SettingsPageLayout title="Delete Account" description="Permanently remove your restaurant and all associated data." maxWidth="max-w-2xl">
      <section className="bg-white rounded-2xl border border-rose-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-rose-100 bg-rose-50/50">
          <h2 className="font-bold text-rose-700 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> Delete Account
          </h2>
          <p className="text-[11px] text-rose-600 mt-1">This action is permanent. It will remove your restaurant, staff, menu, tables and history.</p>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-600">OTP will be sent to <span className="font-bold">{email || "your email"}</span></p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter OTP" className="h-10 rounded-lg border border-slate-200 px-3 text-sm" />
            <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="Type DELETE" className="h-10 rounded-lg border border-slate-200 px-3 text-sm" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={requestOtp} disabled={requestingOtp || cooldown > 0} className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 disabled:opacity-60">
              {requestingOtp ? "Sending..." : cooldown > 0 ? `Resend in ${cooldown}s` : otpRequested ? "Resend OTP" : "Send OTP"}
            </button>
            <button type="button" onClick={deleteAccount} disabled={deleting} className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-60">
              {deleting ? "Deleting..." : "Delete Account"}
            </button>
          </div>
        </div>
      </section>
    </SettingsPageLayout>
  );
}
