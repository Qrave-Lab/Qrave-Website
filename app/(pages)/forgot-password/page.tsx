"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Lock,
  Loader2,
  AlertCircle,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Eye,
  EyeOff,
  Check
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { api } from "@/app/lib/api";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState<"request" | "reset">("request");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

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
      setError("Please enter your email");
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await api("/auth/forgot-password/request", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      toast.dismiss();
      toast.success("6-digit verification code sent to your email!", {
        duration: 4000,
        icon: "✉️",
      });
      setStep("reset");
      setResendTimer(60);
      setOtpDigits(["", "", "", "", "", ""]);
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 150);
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

  const handleOtpChange = (index: number, value: string) => {
    if (error) setError(null);
    const cleaned = value.replace(/\D/g, "");

    // If pasted full code (e.g. 6 digits)
    if (cleaned.length > 1) {
      const nextDigits = [...otpDigits];
      const chars = cleaned.slice(0, 6).split("");
      chars.forEach((char, i) => {
        if (i < 6) nextDigits[i] = char;
      });
      setOtpDigits(nextDigits);
      const nextFocus = Math.min(chars.length, 5);
      otpInputRefs.current[nextFocus]?.focus();
      return;
    }

    const nextDigits = [...otpDigits];
    nextDigits[index] = cleaned.slice(-1);
    setOtpDigits(nextDigits);

    if (cleaned && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;
    const nextDigits = [...otpDigits];
    const chars = pasted.slice(0, 6).split("");
    chars.forEach((char, i) => {
      if (i < 6) nextDigits[i] = char;
    });
    setOtpDigits(nextDigits);
    const focusIdx = Math.min(chars.length, 5);
    otpInputRefs.current[focusIdx]?.focus();
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = otpDigits.join("");

    if (!email || fullCode.length !== 6 || !newPassword || !confirmPassword) {
      setError("Please fill in the 6-digit code and both password fields");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      await api("/auth/forgot-password/reset", {
        method: "POST",
        body: JSON.stringify({
          email,
          code: fullCode,
          new_password: newPassword,
        }),
      });
      toast.dismiss();
      toast.success("Password reset successful! You can now log in.", {
        duration: 3500,
      });
      router.push("/login");
    } catch (err: any) {
      setError("Invalid or expired OTP code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-[#FAF9F6] text-slate-900 selection:bg-[#fe5c13]/20">
      {/* Subtle grid backdrop */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: "radial-gradient(#000000 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      {/* Minimal Navigation Bar */}
      <header className="relative z-20 w-full px-6 sm:px-12 py-6 flex items-center justify-between border-b border-slate-200/60 bg-white/60 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2 group">
          <img
            src="/landing/image.png"
            alt="Qrave Logo"
            className="h-7 w-auto object-contain transition-transform group-hover:scale-105"
          />
        </Link>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <span>Remember your password?</span>
          <Link
            href="/login"
            className="font-bold text-[#fe5c13] hover:text-[#d94806] transition-colors"
          >
            Log In
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-20 flex-1 flex items-center justify-center px-4 py-12 sm:py-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="w-full max-w-[480px] bg-white rounded-3xl border border-slate-200/90 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-8 sm:p-11"
        >
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">
              {step === "request" ? "Forgot password?" : "Reset password"}
            </h1>
            <p className="mt-2 text-sm text-slate-500 font-medium">
              {step === "request"
                ? "Enter your account email to receive a 6-digit recovery code."
                : `Enter the 6-digit code sent to ${email} and your new password.`}
            </p>

            {/* Animated Step Progress Indicators */}
            <div className="relative mt-6 pt-2">
              <div className="flex items-center justify-between relative">
                {/* Connecting Track Line */}
                <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-[2px] bg-slate-100 -z-0" />
                <motion.div
                  className="absolute left-6 top-1/2 -translate-y-1/2 h-[2px] bg-[#fe5c13] -z-0"
                  initial={false}
                  animate={{
                    width: step === "reset" ? "calc(100% - 48px)" : "0%",
                  }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                />

                {/* Step 1 Node */}
                <div className="relative z-10 flex items-center gap-2.5 bg-white pr-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                      step === "request"
                        ? "bg-[#fe5c13] text-white shadow-md shadow-[#fe5c13]/30 scale-105"
                        : "bg-emerald-500 text-white"
                    }`}
                  >
                    {step === "reset" ? <Check size={14} strokeWidth={2.5} /> : "1"}
                  </div>
                  <span
                    className={`text-xs font-bold tracking-wider uppercase transition-colors ${
                      step === "request" ? "text-slate-900" : "text-slate-400"
                    }`}
                  >
                    Request OTP
                  </span>
                </div>

                {/* Step 2 Node */}
                <div className="relative z-10 flex items-center gap-2.5 bg-white pl-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                      step === "reset"
                        ? "bg-[#fe5c13] text-white shadow-md shadow-[#fe5c13]/30 scale-105 ring-4 ring-[#fe5c13]/10"
                        : "bg-slate-100 text-slate-400 border border-slate-200"
                    }`}
                  >
                    2
                  </div>
                  <span
                    className={`text-xs font-bold tracking-wider uppercase transition-colors ${
                      step === "reset" ? "text-slate-900" : "text-slate-400"
                    }`}
                  >
                    Set Password
                  </span>
                </div>
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {step === "request" ? (
              <motion.form
                key="request-form"
                initial={{ opacity: 0, x: -16, filter: "blur(4px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, x: 16, filter: "blur(4px)" }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                onSubmit={sendOtp}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                    <input
                      type="email"
                      name="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="name@restaurant.com"
                      className="w-full h-12 pl-11 pr-4 bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 text-sm font-medium outline-none focus:border-[#fe5c13] focus:ring-2 focus:ring-[#fe5c13]/10 transition-all [color-scheme:light]"
                    />
                  </div>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-red-600 text-xs font-medium"
                  >
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 mt-2 rounded-xl bg-[#fe5c13] hover:bg-[#e64e08] text-white font-bold text-sm tracking-wide transition-all shadow-sm active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending OTP...</span>
                    </>
                  ) : (
                    <span>Send Verification Code</span>
                  )}
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="reset-form"
                initial={{ opacity: 0, x: 16, filter: "blur(4px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, x: -16, filter: "blur(4px)" }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                onSubmit={resetPassword}
                autoComplete="off"
                className="space-y-4"
              >
                {/* 6-Digit Individual OTP Cells */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      6-Digit Security Code
                    </label>
                    <button
                      type="button"
                      onClick={() => setStep("request")}
                      className="text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors"
                    >
                      Change email
                    </button>
                  </div>

                  <div className="grid grid-cols-6 gap-2 sm:gap-2.5">
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => {
                          otpInputRefs.current[idx] = el;
                        }}
                        type="text"
                        name={`otp-cell-${idx}`}
                        autoComplete="one-time-code"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        onPaste={handleOtpPaste}
                        className={`h-12 text-center text-lg font-bold rounded-xl border transition-all outline-none [color-scheme:light] ${
                          digit
                            ? "border-[#fe5c13] bg-[#fe5c13]/5 text-[#fe5c13]"
                            : "border-slate-200 bg-slate-50/60 text-slate-900 focus:bg-white focus:border-[#fe5c13] focus:ring-2 focus:ring-[#fe5c13]/10"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                    <input
                      type={showNewPassword ? "text" : "password"}
                      name="new-password"
                      autoComplete="new-password"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                      required
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="At least 8 characters"
                      className="w-full h-12 pl-11 pr-11 bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 text-sm font-medium outline-none focus:border-[#fe5c13] focus:ring-2 focus:ring-[#fe5c13]/10 transition-all [color-scheme:light]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirm-password"
                      autoComplete="new-password"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                      required
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="Repeat your password"
                      className="w-full h-12 pl-11 pr-11 bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 text-sm font-medium outline-none focus:border-[#fe5c13] focus:ring-2 focus:ring-[#fe5c13]/10 transition-all [color-scheme:light]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-red-600 text-xs font-medium"
                  >
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 mt-2 rounded-xl bg-[#fe5c13] hover:bg-[#e64e08] text-white font-bold text-sm tracking-wide transition-all shadow-sm active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating password...</span>
                    </>
                  ) : (
                    <span>Reset Password</span>
                  )}
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendTimer > 0 || isLoading}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#fe5c13] hover:text-[#d94806] disabled:text-slate-400 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${resendTimer > 0 ? "animate-spin opacity-40" : ""}`} />
                    <span>{resendTimer > 0 ? `Resend code in ${resendTimer}s` : "Resend code"}</span>
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-500">
            <Link
              href="/login"
              className="hover:text-slate-800 transition-colors inline-flex items-center gap-1.5 font-medium"
            >
              <ArrowLeft size={13} />
              <span>Back to login</span>
            </Link>
          </div>
        </motion.div>
      </main>

      {/* Minimal clean footer */}
      <footer className="relative z-20 w-full py-4 text-center text-slate-400 text-[11px]">
        © {new Date().getFullYear()} Qrave. All rights reserved.
      </footer>
    </div>
  );
}
