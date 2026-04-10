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
import toast from "react-hot-toast";
import { api } from "@/app/lib/api";
import AuthSplitLayout from "@/app/components/auth/AuthSplitLayout";

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
  const [isSelectingBranch, setIsSelectingBranch] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBranchPicker, setShowBranchPicker] = useState(false);
  const [pendingRoute, setPendingRoute] = useState("");
  const [branchOptions, setBranchOptions] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleClientId = (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "").trim();
  const hasValidGoogleClientId = /^[0-9]+-[a-z0-9-]+\.apps\.googleusercontent\.com$/i.test(googleClientId);

  const resolvePostLoginRoute = useCallback(async (): Promise<{ route: string; role: string }> => {
    try {
      const me = await api<{ role?: string }>("/api/admin/me", { method: "GET" });
      const role = (me?.role || "").toLowerCase();
      if (role === "kitchen") return { route: "/staff/kitchen", role };
      if (role === "cashier") return { route: "/staff/cashier", role };
      return { route: "/staff", role };
    } catch {
      return { route: "/staff", role: "" };
    }
  }, []);

  const routeAfterLogin = useCallback(async () => {
    const { route: nextRoute, role } = await resolvePostLoginRoute();
    // Non-owners go directly to their route — no branch picker
    if (nextRoute !== "/staff" || role !== "owner") {
      router.push(nextRoute);
      return;
    }

    try {
      const [locRes, branchRes] = await Promise.all([
        api<{ active_restaurant_id?: string; locations?: Array<{ restaurant_id: string; restaurant: string }> }>("/api/admin/locations", { method: "GET" }),
        api<{ branches?: Array<{ restaurant_id: string; address?: string | null }> }>("/api/admin/branches?include_archived=0", { method: "GET" }),
      ]);
      const locations = Array.isArray(locRes?.locations) ? locRes.locations : [];
      if (locations.length <= 1) {
        router.push(nextRoute);
        return;
      }
      const locationLabels: Record<string, string> = {};
      for (const b of branchRes?.branches || []) {
        const addr = String(b.address || "").trim();
        if (addr) locationLabels[b.restaurant_id] = addr;
      }
      const options = locations.map((loc) => ({
        id: loc.restaurant_id,
        label: locationLabels[loc.restaurant_id]
          ? `${loc.restaurant} - ${locationLabels[loc.restaurant_id]}`
          : loc.restaurant,
      }));
      setBranchOptions(options);
      setSelectedBranchId(locRes?.active_restaurant_id || options[0]?.id || "");
      setPendingRoute(nextRoute);
      setShowBranchPicker(true);
    } catch {
      router.push(nextRoute);
    }
  }, [resolvePostLoginRoute, router]);

  const handleConfirmBranchSelection = useCallback(async () => {
    if (!selectedBranchId || isSelectingBranch) return;
    setIsSelectingBranch(true);
    try {
      await api("/api/admin/locations/switch", {
        method: "POST",
        body: JSON.stringify({ restaurant_id: selectedBranchId }),
      });
      setShowBranchPicker(false);
      router.push(pendingRoute || "/staff");
    } catch {
      setError("Failed to switch branch. Try again.");
    } finally {
      setIsSelectingBranch(false);
    }
  }, [selectedBranchId, isSelectingBranch, pendingRoute, router]);

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
        toast.dismiss("welcome-back");
        toast.success("Welcome back", { id: "welcome-back", duration: 1800 });
        await routeAfterLogin();
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
    [isGoogleLoading, routeAfterLogin]
  );

  useEffect(() => {
    if (!hasValidGoogleClientId) return;

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
  }, [googleClientId, handleGoogleCredential, hasValidGoogleClientId]);

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
        toast.dismiss("welcome-back");
        toast.success("Welcome back", { id: "welcome-back", duration: 1800 });
        await routeAfterLogin();
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
    <>
      <AuthSplitLayout
        headingLine1="Your restaurant,"
        headingHighlight="digitized."
        description="Manage orders, staff, and customer experiences from one single dashboard."
        stats={[
          { value: "1.2k+", label: "Orders Syncing" },
          { value: "99.9%", label: "Uptime" },
        ]}
        left={
          <div className="w-full max-w-md mx-auto space-y-10">
          <header className="space-y-3">
            <button 
              onClick={() => router.push("/")}
              className="flex items-center gap-2 text-slate-400 hover:text-[#ECA918] transition-all group mb-10"
            >
              <div className="p-2 rounded-full group-hover:bg-[#FFC529]/20 transition-colors">
                <ArrowLeft size={18} />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-widest">Home</span>
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#FFC529] flex items-center justify-center shadow-lg shadow-[#FFC529]/40 border border-[#ECA918]/20">
                <Sparkles className="w-5 h-5 text-black fill-current" />
              </div>
              <span className="text-xl font-bold tracking-tighter uppercase">Qrave</span>
            </div>
            <h2 className="text-4xl font-bold tracking-tight">Welcome back</h2>
            <p className="text-slate-500 font-medium">Log in to manage your restaurant.</p>
          </header>

          <form onSubmit={handleLogin} className="space-y-6">
            {hasValidGoogleClientId && (
              <div className="space-y-3">
                <div ref={googleButtonRef} className="min-h-[44px] flex justify-center" />
                {!googleReady && (
                  <div className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
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
            {!hasValidGoogleClientId && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-amber-700 text-[11px] font-bold uppercase tracking-wider text-center">
                Google login hidden: set <code className="font-black">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code>.
              </div>
            )}

            <div className="space-y-5">
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

              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Password</label>
                  <button
                    type="button"
                    onClick={() => router.push("/forgot-password")}
                    className="text-[11px] font-bold text-[#ECA918] hover:text-[#C58B0E] hover:underline uppercase tracking-widest"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#ECA918] transition-colors" />
                  <input 
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if(error) setError(null);
                    }}
                    placeholder="••••••••"
                    className="w-full pl-14 pr-14 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-[#FFC529] focus:ring-4 focus:ring-[#FFC529]/10 outline-none transition-all font-bold placeholder:text-slate-300"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-[#ECA918]"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
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
                  className="p-4 rounded-xl bg-red-50 border border-red-100 flex items-center gap-3 text-red-600 overflow-hidden"
                >
                  <AlertCircle size={18} className="shrink-0" />
                  <span className="text-[12px] font-bold uppercase tracking-tight">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              type="submit" 
              disabled={isLoading || isGoogleLoading}
              className="w-full py-5 rounded-2xl bg-[#FFC529] font-bold text-sm uppercase tracking-widest shadow-[0_4px_20px_rgba(255,197,41,0.3)] hover:shadow-[0_8px_25px_rgba(255,197,41,0.45)] hover:bg-[#ECA918] transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed border border-[#FFC529]/10"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Login"}
            </button>
          </form>

          <footer className="pt-2 text-center">
            <span className="text-slate-400 font-bold text-[11px] uppercase tracking-[0.2em]">New here?</span>
            <button 
              onClick={() => router.push("/onboarding")} 
              className="ml-2 text-[#ECA918] font-bold text-[11px] uppercase tracking-[0.2em] hover:text-[#C58B0E] hover:underline transition-colors"
            >
              Create Account
            </button>
          </footer>
          </div>
        }
      />

      <AnimatePresence>
        {showBranchPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] bg-slate-900/45 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
            >
              <h3 className="text-2xl font-bold text-slate-900">Choose Branch</h3>
              <p className="mt-1 text-sm text-slate-500">
                Select which location dashboard to open.
              </p>
              <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
                {branchOptions.map((branch) => (
                  <button
                    key={branch.id}
                    onClick={() => setSelectedBranchId(branch.id)}
                    className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-all ${
                      selectedBranchId === branch.id
                        ? "border-[#FFC529] bg-[#FFC529]/10 text-[#1F2127]"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {branch.label}
                  </button>
                ))}
              </div>
              <div className="mt-5 flex justify-end">
                <button
                  onClick={handleConfirmBranchSelection}
                  disabled={!selectedBranchId || isSelectingBranch}
                  className="rounded-xl bg-[#FFC529] px-6 py-3 text-sm font-bold text-[#1F2127] shadow-[0_4px_15px_rgba(255,197,41,0.2)] hover:bg-[#ECA918] disabled:opacity-60"
                >
                  {isSelectingBranch ? "Opening..." : "Open Dashboard"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap");
        body { 
          font-family: "Plus Jakarta Sans", sans-serif; 
          -webkit-font-smoothing: antialiased;
        }
      `}</style>
    </>
  );
}
