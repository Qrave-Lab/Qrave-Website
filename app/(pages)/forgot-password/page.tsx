"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Lock,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  RefreshCw
} from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { api } from "@/app/lib/api";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState<"request" | "reset">("request");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const sendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email) {
      setError("Enter your email");
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await api("/auth/forgot-password/request", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      toast.success("OTP sent to your email");
      setStep("reset");
      setResendTimer(60);
    } catch (err: any) {
      setError("Failed to send OTP. Please check your email and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0 || isLoading) return;
    await sendOtp();
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !code || !newPassword) {
      setError("Please fill in all fields");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    
    setError(null);
    setIsLoading(true);
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
    } catch (err: any) {
      setError("Invalid OTP or reset failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full font-sans text-[#1F2127] overflow-hidden bg-white selection:bg-[#FFC529]/30">

      <div className="w-full lg:w-[45%] xl:w-[40%] flex flex-col justify-center px-8 sm:px-14 lg:px-16 xl:px-24 relative z-20">
        <div className="w-full max-w-md mx-auto space-y-8">
          <header className="space-y-3">
            <button
              onClick={() => router.push("/login")}
              className="flex items-center gap-2 text-slate-400 hover:text-[#ECA918] transition-all group mb-10"
            >
              <div className="p-2 rounded-full group-hover:bg-[#FFC529]/20 transition-colors">
                <ArrowLeft size={18} />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-widest">Back to Login</span>
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#FFC529] flex items-center justify-center shadow-lg shadow-[#FFC529]/40 border border-[#ECA918]/20">
                <Sparkles className="w-5 h-5 text-black fill-current" />
              </div>
              <span className="text-xl font-bold tracking-tighter uppercase">Qrave</span>
            </div>
            <h2 className="text-4xl font-bold tracking-tight leading-tight">
              {step === "request" ? "Forgot password?" : "Reset password"}
            </h2>
            <p className="text-slate-500 font-medium">
              {step === "request" 
                ? "No worries, we'll send you reset instructions." 
                : `Enter the 4-digit code sent to ${email}`}
            </p>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-widest ${step === "request" ? "bg-[#FFF8DF] border-[#FFD769] text-[#A06D00]" : "bg-slate-50 border-slate-200 text-slate-400"}`}>
                1. Send OTP
              </div>
              <div className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-widest ${step === "reset" ? "bg-[#FFF8DF] border-[#FFD769] text-[#A06D00]" : "bg-slate-50 border-slate-200 text-slate-400"}`}>
                2. Set Password
              </div>
            </div>
          </header>

          <AnimatePresence mode="wait">
            {step === "request" ? (
              <motion.form
                key="request-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={sendOtp}
                className="space-y-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 ml-1">Email</label>
                  <div className="relative group">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#ECA918] transition-colors" />
                    <input 
                      type="email" 
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if(error) setError(null);
                      }}
                      placeholder="name@restaurant.com"
                      className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-[#FFC529] focus:ring-4 focus:ring-[#FFC529]/10 outline-none transition-all font-bold placeholder:text-slate-300"
                    />
                  </div>
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }} 
                    animate={{ opacity: 1, height: "auto" }}
                    className="p-4 rounded-xl bg-red-50 border border-red-100 flex items-center gap-3 text-red-600 overflow-hidden"
                  >
                    <AlertCircle size={18} className="shrink-0" />
                    <span className="text-[12px] font-bold uppercase tracking-tight">{error}</span>
                  </motion.div>
                )}

                <button
                  type="submit" 
                  disabled={isLoading}
                  className="w-full py-5 rounded-2xl bg-[#FFC529] font-bold text-sm uppercase tracking-widest shadow-[0_4px_20px_rgba(255,197,41,0.3)] hover:shadow-[0_8px_25px_rgba(255,197,41,0.45)] hover:bg-[#ECA918] transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-70 border border-[#FFC529]/10"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Instructions"}
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="reset-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={resetPassword}
                className="space-y-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 ml-1">OTP Code</label>
                    <div className="relative group">
                      <ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#ECA918] transition-colors" />
                      <input 
                        type="text" 
                        required
                        value={code}
                        onChange={(e) => {
                          setCode(e.target.value);
                          if(error) setError(null);
                        }}
                        placeholder="Enter 4-digit code"
                        className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-[#FFC529] focus:ring-4 focus:ring-[#FFC529]/10 outline-none transition-all font-bold placeholder:text-slate-300 tracking-[0.2em]"
                        maxLength={4}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 ml-1">New Password</label>
                    <div className="relative group">
                      <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#ECA918] transition-colors" />
                      <input 
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          if(error) setError(null);
                        }}
                        placeholder="••••••••"
                        className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-[#FFC529] focus:ring-4 focus:ring-[#FFC529]/10 outline-none transition-all font-bold placeholder:text-slate-300"
                      />
                    </div>
                  </div>
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }} 
                    animate={{ opacity: 1, height: "auto" }}
                    className="p-4 rounded-xl bg-red-50 border border-red-100 flex items-center gap-3 text-red-600 overflow-hidden"
                  >
                    <AlertCircle size={18} className="shrink-0" />
                    <span className="text-[12px] font-bold uppercase tracking-tight">{error}</span>
                  </motion.div>
                )}

                <button
                  type="submit" 
                  disabled={isLoading}
                  className="w-full py-5 rounded-2xl bg-[#FFC529] font-bold text-sm uppercase tracking-widest shadow-[0_4px_20px_rgba(255,197,41,0.3)] hover:shadow-[0_8px_25px_rgba(255,197,41,0.45)] hover:bg-[#ECA918] transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-70 border border-[#FFC529]/10"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Reset Password"}
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendTimer > 0 || isLoading}
                    className="flex items-center justify-center gap-2 mx-auto text-[11px] font-black uppercase tracking-widest transition-colors disabled:text-slate-300 text-[#ECA918] hover:text-[#D99A00]"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${resendTimer > 0 ? "animate-spin opacity-40" : ""}`} />
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend Code"}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <footer className="pt-2 text-center">
            <span className="text-slate-400 font-bold text-[11px] uppercase tracking-[0.2em]">Remembered?</span>
            <button
              onClick={() => router.push("/login")} 
              className="ml-2 text-[#ECA918] font-bold text-[11px] uppercase tracking-[0.2em] hover:text-[#C58B0E] hover:underline transition-colors"
            >
              Go to Login
            </button>
          </footer>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 relative bg-[#FAFAFA] items-center justify-center border-l border-slate-100 overflow-hidden">
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: `radial-gradient(#1c1d20 1px, transparent 1px)`, backgroundSize: '32px 32px' }}
          />
          <svg viewBox="0 0 1440 800" preserveAspectRatio="none" className="absolute bottom-0 left-0 w-full h-[60%] pointer-events-none">
            <path d="M0,800 L0,600 C 400,600 800,100 1440,100 L1440,800 Z" fill="#FFC529" fillOpacity="0.10" />
            <path d="M0,800 L0,700 C 400,700 800,400 1440,400 L1440,800 Z" fill="#FFC529" fillOpacity="0.20" />
            <path d="M0,800 L0,760 C 400,780 1000,740 1440,760 L1440,800 Z" fill="#FFC529" fillOpacity="0.05" />
          </svg>
        </div>

        <div className="relative z-10 w-full max-w-2xl px-12 text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-10"
          >
            <div className="space-y-6">
              <h1 className="text-6xl xl:text-7xl font-bold leading-[1.05] tracking-tight">
                Protect your <br />
                <span className="relative inline-block text-[#FFC529]">
                  account.
                  <svg className="absolute -bottom-3 left-0 w-full h-4 text-[#FFC529]" viewBox="0 0 100 15" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2.38883 12.8715C22.0833 7.8288 65.625 2.15833 97.5 10.375" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                </span>
              </h1>
              <p className="text-slate-500 text-xl font-medium leading-relaxed max-w-md mx-auto lg:mx-0">
                Keep restaurant operations secure with fast, OTP-based recovery built for busy teams.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 xl:gap-6 pt-4">
              <div className="px-6 py-5 rounded-3xl bg-white/60 backdrop-blur-md border border-white shadow-sm flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 className="text-emerald-500 w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="text-xl font-bold">OTP</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Verified Reset</div>
                </div>
              </div>

              <div className="px-6 py-5 rounded-3xl bg-white/60 backdrop-blur-md border border-white shadow-sm flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center">
                  <ShieldCheck className="text-[#C58B0E] w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="text-xl font-bold">24/7</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Access Recovery</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
