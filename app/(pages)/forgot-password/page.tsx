"use client";

import { useState } from "react";
import { ArrowLeft, Loader2, Mail, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { api } from "@/app/lib/api";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [sending, setSending] = useState(false);
  const [resetting, setResetting] = useState(false);

  const sendOtp = async () => {
    if (!email) {
      toast.error("Enter your email");
      return;
    }
    setSending(true);
    try {
      await api("/auth/forgot-password/request", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      toast.success("OTP sent to your email");
    } catch {
      toast.error("Failed to send OTP");
    } finally {
      setSending(false);
    }
  };

  const resetPassword = async () => {
    if (!email || !code || !newPassword) {
      toast.error("Enter email, OTP and new password");
      return;
    }
    setResetting(true);
    try {
      await api("/auth/forgot-password/reset", {
        method: "POST",
        body: JSON.stringify({
          email,
          code,
          new_password: newPassword,
        }),
      });
      toast.success("Password reset successful");
      router.push("/login");
    } catch {
      toast.error("Invalid OTP or reset failed");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4">
      <Toaster position="top-center" />
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <button
          onClick={() => router.push("/login")}
          className="mb-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back To Login
        </button>

        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Forgot Password</h1>
        <p className="mt-2 text-sm text-slate-500">Reset your password using OTP verification.</p>

        <div className="mt-6 space-y-3">
          <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Email</label>
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3">
            <Mail className="h-4 w-4 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@restaurant.com"
              className="w-full bg-transparent px-3 py-3 text-sm outline-none"
            />
          </div>
          <button
            onClick={sendOtp}
            disabled={sending}
            className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-bold uppercase tracking-widest text-white disabled:opacity-60"
          >
            {sending ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Send OTP"}
          </button>
        </div>

        <div className="mt-6 space-y-3">
          <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">OTP</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter OTP"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
          />
          <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">New Password</label>
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3">
            <ShieldCheck className="h-4 w-4 text-slate-400" />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
              className="w-full bg-transparent px-3 py-3 text-sm outline-none"
            />
          </div>
          <button
            onClick={resetPassword}
            disabled={resetting}
            className="w-full rounded-xl bg-slate-900 py-3 text-xs font-bold uppercase tracking-widest text-white disabled:opacity-60"
          >
            {resetting ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Reset Password"}
          </button>
        </div>
      </div>
    </div>
  );
}
