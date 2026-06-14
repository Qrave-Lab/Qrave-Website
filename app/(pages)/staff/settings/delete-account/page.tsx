"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Mail } from "lucide-react";
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
        setRole(me.role || "");
        setEmail(me.email || "");
      } catch {
        toast.error("Failed to load account");
      } finally {
        setLoading(false);
      }
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
      setOtpRequested(true);
      setCooldown(60);
      toast.success("OTP sent to your email address");
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to send OTP"));
    } finally {
      setRequestingOtp(false);
    }
  };

  const deleteAccount = async () => {
    if (confirmText.trim().toUpperCase() !== "DELETE") {
      toast.error("Type DELETE to confirm");
      return;
    }
    if (otp.trim().length < 4) {
      toast.error("Enter valid OTP");
      return;
    }
    setDeleting(true);
    try {
      await api("/api/admin/account/delete", {
        method: "POST",
        body: JSON.stringify({ otp: otp.trim(), confirm_text: confirmText.trim() }),
      });
      localStorage.clear();
      toast.success("Account permanently deleted");
      window.location.href = "/login";
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to delete account"));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-[#fe5c13]" />
      </div>
    );
  }

  if (role !== "owner") {
    return (
      <SettingsPageLayout
        title="Delete Account"
        description="Permanently remove your restaurant and all data."
        fullBleed
      >
        <div className="flex flex-col flex-1 min-h-0 bg-[#f8fafc]">
          <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10 shrink-0">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Account Control</p>
              <h2 className="text-sm font-black text-slate-900 mt-0.5">Access Restricted</h2>
            </div>
          </div>
          <div className="flex-1 bg-white p-8 flex items-center justify-center">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-8 text-center max-w-md w-full shadow-sm">
              <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
              <h2 className="text-sm font-black text-slate-900">Owner Access Required</h2>
              <p className="mt-2 text-xs font-semibold text-slate-550 leading-relaxed">
                Only the restaurant owner can delete the account and permanently remove restaurant data.
              </p>
            </div>
          </div>
        </div>
      </SettingsPageLayout>
    );
  }

  return (
    <SettingsPageLayout
      title="Delete Account"
      description="Permanently remove your restaurant and all associated data."
      fullBleed
    >
      <div className="flex flex-col flex-1 min-h-0 bg-[#f8fafc]">
        {/* Sticky top sub-header */}
        <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10 shrink-0">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Danger Zone</p>
            <h2 className="text-sm font-black text-slate-900 mt-0.5">Permanently Remove Account</h2>
          </div>
        </div>

        {/* Form container */}
        <div className="flex-1 bg-white px-8 py-10 overflow-y-auto">
          <div className="max-w-xl mx-auto space-y-6">
            
            {/* Danger Warning Alert Banner */}
            <div className="flex items-start gap-3.5 rounded-2xl border border-rose-200 bg-rose-50/50 p-5">
              <AlertTriangle className="h-5.5 w-5.5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-black text-rose-800">Critical Action Required</h3>
                <p className="mt-1 text-xs text-rose-700 leading-relaxed font-semibold">
                  This action is permanent and cannot be undone. It will immediately remove your restaurant profile, staff permissions, menu data, table QR configurations, and historical transaction sales.
                </p>
              </div>
            </div>

            {/* Email OTP info */}
            <div className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500 font-semibold">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                OTP will be sent to the owner email: <span className="font-bold text-slate-800">{email || "your registered email"}</span>
              </span>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 pl-1">
                    One-Time Passcode (OTP)
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter OTP code"
                    className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs font-bold text-slate-700 outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-100 transition-all placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 pl-1">
                    Confirmation Phrase
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="Type DELETE"
                    className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs font-bold text-slate-700 outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-100 transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={requestOtp}
                  disabled={requestingOtp || cooldown > 0}
                  className="h-11 px-5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-sm transition-all disabled:opacity-50 select-none"
                >
                  {requestingOtp ? "Sending..." : cooldown > 0 ? `Resend in ${cooldown}s` : otpRequested ? "Resend OTP" : "Send OTP"}
                </button>
                <button
                  type="button"
                  onClick={deleteAccount}
                  disabled={deleting}
                  className="flex-1 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md shadow-rose-100 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
                >
                  {deleting ? "Deleting..." : "Delete Account & Data"}
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </SettingsPageLayout>
  );
}
