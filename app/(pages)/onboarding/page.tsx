"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Mail,
  Sparkles,
  ChefHat,
  RefreshCw,
  Store,
  Wallet,
  UtensilsCrossed,
  Pizza,
  Coffee,
  IceCream,
  Smartphone,
  Wifi,
  Printer,
  Box,
  Layers,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { api } from "@/app/lib/api";

type Step = 1 | 2 | 3 | 4 | 5 | 6;

declare global {
  interface Window {
    google?: any;
  }
}

const slideVariants = {
  initial: { opacity: 0, y: 10, filter: "blur(10px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -10, filter: "blur(10px)" },
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpError, setOtpError] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleIdToken, setGoogleIdToken] = useState("");
  const [googleEmail, setGoogleEmail] = useState("");
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  
  const [emailStatus, setEmailStatus] = useState<'idle' | 'taken'>('idle');
  
  const otpRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const [data, setData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    currency: "INR",
    tableCount: 8,
  });

  const decodeJwtPayload = (token: string): Record<string, any> | null => {
    try {
      const parts = token.split(".");
      if (parts.length < 2) return null;
      const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const padded = b64.padEnd(Math.ceil(b64.length / 4) * 4, "=");
      const decoded = atob(padded);
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  };

  const validateEmail = (email: string) => {
    return String(email)
      .toLowerCase()
      .match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
  };

  const nextStep = async () => {
    if (step === 1) {
      if (data.name.length < 2) return toast.error("Your restaurant needs a name");
      setStep(2);
    } else if (step === 2) {
      if (!validateEmail(data.email)) return toast.error("Please enter a valid email address");
      
      setIsLoading(true);
      try {
        const res = await api<{ available: boolean }>("/auth/email_available", {
          method: "POST",
          body: JSON.stringify({ email: data.email }),
        });

        if (!res.available) {
          setEmailStatus('taken');
          setIsLoading(false);
          return toast.error("This email is already registered");
        }

        setEmailStatus('idle');
        await api("/public/otp/request", {
          method: "POST",
          body: JSON.stringify({ email: data.email }),
        });
        startResendTimer();
        toast.success("Verification code sent");
        setStep(3);
      } catch (e: any) {
        toast.error("An error occurred. Please try again.");
      } finally {
        setIsLoading(false);
      }
    } else if (step === 4) {
      if (data.password.length < 8) return toast.error("Password must be at least 8 characters");
      if (data.password !== data.confirmPassword) return toast.error("Passwords do not match");
      setStep(5);
    } else if (step === 5) {
      setIsLoading(true);
      try {
        if (googleIdToken) {
          await api<{
            user_id: string;
            restaurant_id: string;
            access_token: string;
            refresh_token: string;
          }>("/auth/google/signup", {
            method: "POST",
            body: JSON.stringify({
              id_token: googleIdToken,
              restaurant_name: data.name,
              currency: data.currency,
            }),
          });
        } else {
          await api<{
            user_id: string;
            restaurant_id: string;
            access_token: string;
            refresh_token: string;
          }>("/auth/signup", {
            method: "POST",
            body: JSON.stringify({
              email: data.email,
              password: data.password,
              restaurant_name: data.name,
              currency: data.currency,
            }),
          });
        }

        // Tokens are now stored in secure cookies by the backend.
        setStep(6);

      } catch (e: any) {
        if (e?.status === 409) {
          toast.error("An account already exists with this Google email. Please login.");
        } else if (e?.status === 503) {
          toast.error("Google signup is not configured yet.");
        } else {
          toast.error(e.message || "Signup failed");
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  const startResendTimer = () => setResendTimer(60);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    try {
      await api("/public/otp/resend", {
        method: "POST",
        body: JSON.stringify({ email: data.email }),
      });
      setOtp(["", "", "", ""]);
      setOtpError(false);
      startResendTimer();
      toast.success("New code sent");
      otpRefs[0].current?.focus();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleOtpChange = (i: number, v: string) => {
    if (isVerifying) return;
    setOtpError(false);
    const n = [...otp];
    n[i] = v.slice(-1);
    setOtp(n);
    if (v && i < 3) otpRefs[i + 1].current?.focus();
    else if (v && i === 3) verifyCode(n.join(""));
  };

  const verifyCode = async (code: string) => {
    if (code.length !== 4) return;
    setIsVerifying(true);
    setOtpError(false);
    const loading = toast.loading("Confirming code...");
    try {
      await api("/public/otp/verify", {
        method: "POST",
        body: JSON.stringify({ email: data.email, code }),
      });
      toast.success("Email verified");
      setStep(4);
    } catch (e: any) {
      setOtpError(true);
      setOtp(["", "", "", ""]);
      otpRefs[0].current?.focus();
      toast.error("Incorrect code");
    } finally {
      toast.dismiss(loading);
      setIsVerifying(false);
    }
  };

  const handleGoogleCredential = useCallback((credential: string) => {
    if (!credential || isGoogleLoading) return;
    setIsGoogleLoading(true);
    try {
      const payload = decodeJwtPayload(credential);
      const email = String(payload?.email || "").trim().toLowerCase();
      if (!email) throw new Error("Invalid Google credential");

      setGoogleIdToken(credential);
      setGoogleEmail(email);
      setData((prev) => ({ ...prev, email }));
      toast.success("Google verified. Complete your setup.");
      setStep(5);
    } catch {
      toast.error("Google sign up failed. Try again.");
    } finally {
      setIsGoogleLoading(false);
    }
  }, [isGoogleLoading]);

  useEffect(() => {
    if (!googleClientId || step !== 2) return;

    let cancelled = false;
    const scriptId = "google-identity-services";

    const initGoogle = () => {
      if (cancelled || !window.google || !googleButtonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (resp: any) => {
          handleGoogleCredential(resp?.credential || "");
        },
      });
      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        shape: "pill",
        width: "360",
        text: "continue_with",
      });
      setGoogleReady(true);
    };

    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existing) {
      if (window.google) initGoogle();
      else existing.addEventListener("load", initGoogle, { once: true });
      return () => {
        cancelled = true;
      };
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initGoogle;
    document.head.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, [googleClientId, step, handleGoogleCredential]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && step !== 3 && step < 6 && !isLoading) nextStep();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [step, data, emailStatus, isLoading]);

  return (
    <div className="flex h-screen w-full bg-[#FCFCFD] font-sans text-slate-900 overflow-hidden select-none">
      <Toaster position="top-center" toastOptions={{ style: { borderRadius: "12px", background: "#1e293b", color: "#fff", fontSize: "14px" } }} />

      <div className="relative z-30 w-full lg:w-[520px] bg-white flex flex-col border-r border-slate-100 shadow-[20px_0_40px_rgba(0,0,0,0.01)]">
        <div className="p-10 md:p-14">
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-100">
                <Sparkles className="w-5 h-5 text-white fill-current" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900 uppercase">Qrave</span>
            </div>
            <div className="px-3 py-1 rounded-full bg-slate-50 border border-slate-100">
              <span className="text-[11px] font-bold text-slate-500 tracking-wider">STEP 0{step} / 06</span>
            </div>
          </div>

          <div className="flex gap-2 h-1.5 overflow-hidden">
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <div key={s} className="flex-1 h-full bg-slate-100 rounded-full relative">
                <motion.div initial={false} animate={{ width: s <= step ? "100%" : "0%" }} className="absolute inset-0 bg-indigo-600 rounded-full" transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 px-10 md:px-14 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            <motion.div key={step} variants={slideVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="w-full">
              {step === 1 && (
                <div className="space-y-8">
                  <div className="space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight text-slate-900">What's your brand?</h1>
                    <p className="text-slate-500 font-medium">Enter your restaurant's legal or trade name.</p>
                  </div>
                  <div className="relative group">
                    <Store className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                    <input autoFocus placeholder="e.g. The Golden Truffle" value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} className="w-full pl-10 text-2xl font-semibold border-b-2 border-slate-100 focus:border-indigo-600 outline-none py-4 transition-all placeholder:text-slate-200" />
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 w-fit">
                    <Wallet className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Base Currency: INR (₹)</span>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-8">
                  <div className="space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight text-slate-900">Admin contact</h1>
                    <p className="text-slate-500 font-medium">We'll use this for your secure dashboard login.</p>
                  </div>
                  {googleClientId && (
                    <div className="space-y-3">
                      <div ref={googleButtonRef} className="min-h-[44px] flex justify-center" />
                      {!googleReady && (
                        <div className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
                          Loading Google sign-up...
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-slate-100" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">or email + otp</span>
                        <div className="h-px flex-1 bg-slate-100" />
                      </div>
                    </div>
                  )}
                  <div className="space-y-4">
                    <div className="relative group">
                      <Mail className={`absolute left-0 top-1/2 -translate-y-1/2 w-6 h-6 transition-colors ${emailStatus === 'taken' ? 'text-red-400' : 'text-slate-300 group-focus-within:text-indigo-600'}`} />
                      <input autoFocus type="email" placeholder="manager@restaurant.com" value={data.email} onChange={(e) => { setData({ ...data, email: e.target.value }); setEmailStatus('idle'); }} className={`w-full pl-10 text-2xl font-semibold border-b-2 outline-none py-4 transition-all placeholder:text-slate-200 ${emailStatus === 'taken' ? 'border-red-100 focus:border-red-500' : 'border-slate-100 focus:border-indigo-600'}`} />
                    </div>
                    
                    <AnimatePresence>
                      {emailStatus === 'taken' && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-red-500">
                          <AlertCircle size={14} />
                          <span className="text-xs font-bold uppercase tracking-wider">Account already exists with this email</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-8">
                  <div className="space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight text-slate-900">Verify email</h1>
                    <p className="text-slate-500 font-medium">Enter the 4-digit code sent to <span className="text-indigo-600 font-bold">{data.email}</span></p>
                  </div>
                  <motion.div animate={otpError ? { x: [-10, 10, -10, 10, 0] } : {}} transition={{ duration: 0.4 }} className="flex gap-4">
                    {otp.map((d, i) => (
                      <input key={i} ref={otpRefs[i]} disabled={isVerifying} maxLength={1} value={d} onChange={(e) => handleOtpChange(i, e.target.value)} onKeyDown={(e) => e.key === "Backspace" && !otp[i] && i > 0 && otpRefs[i - 1].current?.focus()} className={`w-full h-20 rounded-2xl border-2 text-center text-3xl font-bold outline-none transition-all disabled:opacity-50 ${otpError ? "border-red-200 bg-red-50/50 text-red-600" : "border-slate-100 bg-slate-50/50 focus:border-indigo-600 focus:bg-white focus:shadow-xl focus:shadow-indigo-50"}`} />
                    ))}
                  </motion.div>
                  <div className="pt-2">
                    <button onClick={handleResendOtp} disabled={resendTimer > 0 || isVerifying} className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest transition-colors disabled:text-slate-300 text-indigo-600 hover:text-indigo-700">
                      <RefreshCw className={`w-3.5 h-3.5 ${resendTimer > 0 ? "animate-spin opacity-40" : ""}`} />
                      {resendTimer > 0 ? `Resend available in ${resendTimer}s` : "Resend Security Code"}
                    </button>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-8">
                  <div className="space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight text-slate-900">Set Password</h1>
                    <p className="text-slate-500 font-medium">Secure your management dashboard.</p>
                  </div>
                  <div className="space-y-6">
                    <div className="relative group">
                      <Lock className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                      <input autoFocus type={showPassword ? "text" : "password"} placeholder="New Password" value={data.password} onChange={(e) => setData({ ...data, password: e.target.value })} className="w-full pl-8 text-xl font-semibold border-b border-slate-100 focus:border-indigo-600 outline-none py-3 transition-all placeholder:text-slate-200" />
                      <button onClick={() => setShowPassword(!showPassword)} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <div className="relative group">
                      <CheckCircle2 className={`absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${data.confirmPassword && data.password === data.confirmPassword ? "text-emerald-500" : "text-slate-300"}`} />
                      <input type={showPassword ? "text" : "password"} placeholder="Confirm Password" value={data.confirmPassword} onChange={(e) => setData({ ...data, confirmPassword: e.target.value })} className="w-full pl-8 text-xl font-semibold border-b border-slate-100 focus:border-indigo-600 outline-none py-3 transition-all placeholder:text-slate-200" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider ${data.password.length >= 8 ? "text-emerald-500" : "text-slate-400"}`}>
                      <div className={`w-1 h-1 rounded-full ${data.password.length >= 8 ? "bg-emerald-500" : "bg-slate-300"}`} />
                      At least 8 characters
                    </div>
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-8">
                  <div className="space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight text-slate-900">Seating layout</h1>
                    <p className="text-slate-500 font-medium">How many tables should we generate QR codes for?</p>
                  </div>
                  {googleEmail && (
                    <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Google account</div>
                      <div className="text-sm font-bold text-indigo-700 mt-1">{googleEmail}</div>
                    </div>
                  )}
                  <div className="bg-slate-50 p-10 rounded-[32px] border border-slate-100 text-center space-y-8">
                    <div className="relative inline-block">
                      <div className="text-8xl font-black text-slate-900 tabular-nums">{data.tableCount}</div>
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 absolute -bottom-2 left-1/2 -translate-x-1/2">Tables</div>
                    </div>
                    <input type="range" min={1} max={40} value={data.tableCount} onChange={(e) => setData({ ...data, tableCount: +e.target.value })} className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-600" />
                  </div>
                </div>
              )}

              {step === 6 && (
                <div className="text-center space-y-8">
                  <div className="mx-auto w-24 h-24 rounded-[30%] bg-emerald-50 flex items-center justify-center border border-emerald-100 relative">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-4 border-white" />
                  </div>
                  <div className="space-y-2">
                    <h1 className="text-4xl font-bold text-slate-900">You're all set!</h1>
                    <p className="text-slate-500 font-medium px-8">Your digital menu and table management dashboard is ready.</p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <button onClick={() => router.push("/staff")} className="w-full py-5 rounded-2xl bg-slate-900 text-white font-bold text-lg hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 active:scale-[0.98]">Launch Dashboard</button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="p-10 md:p-14 flex justify-between items-center bg-white">
          {step > 1 && step < 6 && !isVerifying ? (
            <button onClick={() => setStep((s) => (s - 1) as Step)} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-bold text-[11px] uppercase tracking-[0.15em] transition-colors group">
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back
            </button>
          ) : <div />}
          {step < 6 && step !== 3 && (
            <button onClick={nextStep} disabled={isLoading || isGoogleLoading} className={`flex items-center gap-3 px-10 py-4 rounded-2xl text-white font-bold text-[11px] uppercase tracking-[0.15em] shadow-lg transition-all active:scale-95 group ${(isLoading || isGoogleLoading) ? 'bg-slate-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100 hover:shadow-indigo-200'}`}>
              {(isLoading || isGoogleLoading) ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>}
            </button>
          )}
        </div>
      </div>

      <div className="hidden lg:flex flex-1 items-center justify-center relative bg-[#F8FAFC] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1.5px,transparent_1.5px)] [background-size:32px_32px] opacity-40" />
        <motion.div animate={{ y: [0, -40, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="absolute top-20 right-20 w-32 h-32 bg-indigo-100/20 rounded-full blur-2xl" />
        <motion.div initial={{ top: "0%" }} animate={{ top: "100%" }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} className="absolute left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-400/20 to-transparent z-50 pointer-events-none" />
        <motion.div animate={{ x: [0, 10, 0], y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="absolute right-[15%] top-1/4 z-40 bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-indigo-100 shadow-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white"><Box size={20} /></div>
          <div>
            <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">AR Enabled</div>
            <div className="text-xs font-bold text-slate-700">3D Interactive Menu</div>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {step < 6 ? (
            <motion.div key="phone-mockup" initial={{ opacity: 0, scale: 0.9, y: 20, rotateX: 10, rotateY: -10 }} animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0, rotateY: 0 }} exit={{ opacity: 0, scale: 1.1, y: -20 }} className="relative bg-white rounded-[3rem] p-4 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.12)] border-[8px] border-slate-900 w-[300px] h-[600px] z-10 overflow-hidden flex flex-col">
              <div className="absolute inset-0 bg-gradient-to-br from-white via-transparent to-indigo-50/20 pointer-events-none" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-2xl z-20" />
              <div className="flex-1 flex flex-col pt-8">
                <div className="px-6 py-6 space-y-4">
                  <motion.div layoutId="logo-box" className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white"><ChefHat size={20} /></motion.div>
                  <div className="space-y-1">
                    <h2 className="text-xl font-black text-slate-900 truncate">{data.name || "Your Restaurant"}</h2>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Open Now</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">• Digital Menu</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 px-6 mb-8 overflow-hidden">
                  {["Starters", "Mains", "Drinks"].map((cat, i) => (<div key={i} className={`px-4 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest ${i === 0 ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-400"}`}>{cat}</div>))}
                </div>
                <div className="flex-1 px-6 space-y-6">
                  {[1, 2, 3].map((_, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="flex gap-4 items-center">
                      <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center text-slate-200 relative group/item overflow-hidden">
                        {i === 0 ? <Pizza size={24} /> : i === 1 ? <IceCream size={24} /> : <Coffee size={24} />}
                        <div className="absolute inset-0 bg-indigo-600/10 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="h-2.5 w-3/4 bg-slate-100 rounded-full overflow-hidden relative"><motion.div animate={{ x: ["-100%", "100%"] }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent" /></div>
                        <div className="h-2 w-1/2 bg-slate-50 rounded-full" /><div className="h-2 w-1/4 bg-indigo-50 rounded-full" />
                      </div>
                    </motion.div>
                  ))}
                </div>
                <div className="p-6"><div className="w-full h-12 rounded-xl bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center"><span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">Table {data.tableCount} Selected</span></div></div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="flyer-mockup" initial={{ opacity: 0, rotateY: -30, scale: 0.8, rotateX: 5 }} animate={{ opacity: 1, rotateY: 0, scale: 1, rotateX: 0 }} transition={{ type: "spring", damping: 15 }} className="relative z-20">
              <div className="w-[380px] aspect-[1/1.41] bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] rounded-sm flex flex-col items-center p-10 relative overflow-hidden border border-slate-100">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-indigo-600" />
                <div className="mb-10 text-center"><div className="text-xs font-black tracking-[0.3em] text-slate-400 uppercase mb-4">{data.name || "Qrave"}</div><h2 className="text-3xl font-black text-slate-900 leading-tight">Scan to Order</h2><p className="text-slate-400 text-sm mt-2">View menu & pay from your phone</p></div>
                <div className="relative p-6 bg-white rounded-3xl shadow-[0_20px_40px_rgba(79,70,229,0.1)] border border-indigo-50 mb-10 group">
                  <div className="absolute inset-0 bg-indigo-600/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
                  <QRCodeSVG value={`https://qrave.ai/${data.name.toLowerCase().replace(/\s+/g, "-")}`} size={200} level="H" fgColor="#0f172a" />
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest whitespace-nowrap shadow-lg">Table {data.tableCount}</div>
                </div>
                <div className="mt-auto w-full space-y-6">
                  <div className="flex items-center justify-center gap-6 py-4 border-y border-slate-50"><div className="flex items-center gap-2"><Smartphone className="w-4 h-4 text-slate-300" /><span className="text-[10px] font-bold text-slate-500 uppercase">Contactless</span></div><div className="flex items-center gap-2"><Wifi className="w-4 h-4 text-slate-300" /><span className="text-[10px] font-bold text-slate-500 uppercase">Free WiFi</span></div></div>
                  <div className="text-[10px] text-center font-bold text-slate-300 uppercase tracking-widest">Powered by Qrave.ai</div>
                </div>
              </div>
              <div className="absolute -bottom-8 -right-8 w-full h-full bg-slate-200/20 -z-10 rounded-sm" />
            </motion.div>
          )}
        </AnimatePresence>
        <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-indigo-100 rounded-full blur-3xl opacity-30 animate-pulse" /><div className="absolute -top-10 -left-10 w-64 h-64 bg-purple-100 rounded-full blur-3xl opacity-30" />
      </div>

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap");
        body { font-family: "Plus Jakarta Sans", sans-serif; -webkit-font-smoothing: antialiased; }
        input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; height: 24px; width: 24px; border-radius: 50%; background: #4f46e5; cursor: pointer; border: 4px solid white; box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.4); transition: all 0.2s ease; }
        .perspective-1000 { perspective: 1000px; }
      `}</style>
    </div>
  );
}
