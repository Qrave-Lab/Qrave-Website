"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Loader2,
  AlertCircle,
  ArrowLeft
} from "lucide-react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { api } from "@/app/lib/api";

declare global {
  interface Window {
    google?: any;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const handleGoogleCredential = useCallback(
    async (credential: string) => {
      if (!credential || isGoogleLoading) return;
      setError(null);
      setIsGoogleLoading(true);
      try {
        await api<any>("/auth/google/login", {
          method: "POST",
          body: JSON.stringify({ id_token: credential }),
        });
        toast.success("Welcome back");
        router.push("/staff");
      } catch (err: any) {
        if (err?.status === 404) {
          setError("No account found for this Google email. Use Create Account first.");
        } else if (err?.status === 503) {
          setError("Google login is not configured yet.");
        } else {
          setError("Google login failed. Try again.");
        }
      } finally {
        setIsGoogleLoading(false);
      }
    },
    [isGoogleLoading, router]
  );

  useEffect(() => {
    if (!googleClientId) return;

    let cancelled = false;
    const scriptId = "google-identity-services";

    const initGoogle = () => {
      if (cancelled || !window.google || !googleButtonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (resp: any) => {
          void handleGoogleCredential(resp?.credential || "");
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
  }, [googleClientId, handleGoogleCredential]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    
    setError(null);

    if (!email || !password) {
      setError("Enter email and password");
      return;
    }
    
    setIsLoading(true);

    try {
      const res = await api<any>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (res) {
        toast.success("Welcome back");
        router.push("/staff");
      }
    } catch (err: any) {
      const status = err.status;

      if (status === 401 || status === 403) {
        setError("Invalid email or password");
      } else if (status === 404) {
        setError("Account not found");
      } else {
        setError("Connection error. Try again.");
      }
      setPassword(""); 
      e.preventDefault();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden relative selection:bg-indigo-100">
      <Toaster position="top-center" />
      
      <motion.div 
        className="pointer-events-none fixed inset-0 z-0"
        animate={{
          background: `radial-gradient(1000px at ${mousePos.x}px ${mousePos.y}px, rgba(79, 70, 229, 0.08), transparent 80%)`
        }}
      />

      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-100/50 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-100/50 rounded-full blur-[120px]" />

      <div className="hidden lg:flex flex-1 items-center justify-center relative z-10">
        <div className="max-w-xl w-full p-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-12"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-2xl shadow-indigo-200">
                <Sparkles className="w-7 h-7 text-white fill-current" />
              </div>
              <span className="text-3xl font-bold text-slate-900 tracking-tighter uppercase">Qrave</span>
            </div>
            
            <div className="space-y-6">
              <h1 className="text-7xl font-bold text-slate-900 leading-[1] tracking-tight">
                Your restaurant, <br />
                <span className="text-indigo-600">digitized.</span>
              </h1>
              <p className="text-slate-500 text-xl font-medium leading-relaxed max-w-md">
                Manage orders, staff, and customer experiences from one dashboard.
              </p>
            </div>

            <div className="flex gap-6 pt-4">
              {[
                { label: "Orders Syncing", val: "1.2k+" },
                { label: "Uptime", val: "99.9%" }
              ].map((stat, i) => (
                <div key={i} className="px-8 py-6 rounded-[32px] bg-white/60 backdrop-blur-md border border-white shadow-sm">
                  <div className="text-3xl font-bold text-slate-900">{stat.val}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="w-full lg:w-[700px] relative z-20 flex items-center justify-center p-6 md:p-16">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white rounded-[48px] p-8 md:p-14 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] border border-slate-100 relative"
        >
          <div className="space-y-10">
            <header className="space-y-2">
              <button 
                onClick={() => router.push("/")}
                className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-all group mb-8"
              >
                <div className="p-2 rounded-full group-hover:bg-indigo-50 transition-colors">
                  <ArrowLeft size={18} />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-widest">Home</span>
              </button>
              <h2 className="text-5xl font-bold text-slate-900 tracking-tight">Login</h2>
              <p className="text-slate-500 font-medium text-lg">Enter your details below.</p>
            </header>

            <form onSubmit={handleLogin} className="space-y-6">
              {googleClientId && (
                <div className="space-y-3">
                  <div ref={googleButtonRef} className="min-h-[44px] flex justify-center" />
                  {!googleReady && (
                    <div className="text-center text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Loading Google sign-in...
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-slate-100" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">or</span>
                    <div className="h-px flex-1 bg-slate-100" />
                  </div>
                </div>
              )}
              {!googleClientId && (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-100 text-amber-700 text-[11px] font-bold uppercase tracking-wider text-center">
                  Google login hidden: set <code className="font-black">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> and restart frontend.
                </div>
              )}

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 ml-1">Email</label>
                  <div className="relative group">
                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                    <input 
                      type="email" 
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if(error) setError(null);
                      }}
                      placeholder="name@restaurant.com"
                      className="w-full pl-16 pr-6 py-5 bg-slate-50 border-2 border-transparent rounded-[24px] focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Password</label>
                    <button
                      type="button"
                      onClick={() => router.push("/forgot-password")}
                      className="text-[11px] font-bold text-indigo-600 hover:underline uppercase tracking-widest"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                    <input 
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if(error) setError(null);
                      }}
                      placeholder="••••••••"
                      className="w-full pl-16 pr-16 py-5 bg-slate-50 border-2 border-transparent rounded-[24px] focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-600"
                    >
                      {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                    </button>
                  </div>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }} 
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 rounded-2xl bg-red-50 border border-red-100 flex items-center gap-3 text-red-600 overflow-hidden"
                  >
                    <AlertCircle size={18} className="shrink-0" />
                    <span className="text-[12px] font-bold uppercase tracking-tight">{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <button 
                type="submit" 
                disabled={isLoading || isGoogleLoading}
                className="w-full py-6 rounded-[24px] bg-indigo-600 text-white font-bold text-xs uppercase tracking-[0.3em] shadow-lg hover:bg-indigo-700 transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Login"}
              </button>
            </form>

            <footer className="pt-4 text-center">
              <span className="text-slate-400 font-bold text-[11px] uppercase tracking-[0.2em]">New here?</span>
              <button 
                onClick={() => router.push("/onboarding")} 
                className="ml-2 text-indigo-600 font-bold text-[11px] uppercase tracking-[0.2em] hover:underline"
              >
                Create Account
              </button>
            </footer>
          </div>
        </motion.div>
      </div>

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap");
        body { 
          font-family: "Plus Jakarta Sans", sans-serif; 
          -webkit-font-smoothing: antialiased;
        }
      `}</style>
    </div>
  );
}
