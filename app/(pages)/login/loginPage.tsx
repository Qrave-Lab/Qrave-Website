"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ArrowLeft
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
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
          <Link
            href="/"
            className="flex items-center gap-2 group"
          >
            <img
              src="/landing/image.png"
              alt="Qrave Logo"
              className="h-7 w-auto object-contain transition-transform group-hover:scale-105"
            />
          </Link>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span>New to Qrave?</span>
            <Link
              href="/onboarding"
              className="font-bold text-[#fe5c13] hover:text-[#d94806] transition-colors"
            >
              Create Account
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
                Welcome back
              </h1>
              <p className="mt-2 text-sm text-slate-500 font-medium">
                Log in to manage your floor, kitchen, and analytics.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {hasValidGoogleClientId && (
                <div className="space-y-4">
                  <div ref={googleButtonRef} className="min-h-[46px] flex justify-center [&>iframe]:!rounded-xl" />
                  {!googleReady && (
                    <div className="text-center text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Loading Google sign-in...
                    </div>
                  )}
                  <div className="relative flex items-center justify-center my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-100" />
                    </div>
                    <span className="relative bg-white px-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                      or with email
                    </span>
                  </div>
                </div>
              )}

              {!hasValidGoogleClientId && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium text-center">
                  Google login disabled: set <code className="font-mono">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                    <input
                      type="email"
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

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Password
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-xs font-semibold text-[#fe5c13] hover:text-[#d94806] transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="••••••••"
                      className="w-full h-12 pl-11 pr-11 bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 text-sm font-medium outline-none focus:border-[#fe5c13] focus:ring-2 focus:ring-[#fe5c13]/10 transition-all [color-scheme:light]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-red-600 text-xs font-medium"
                  >
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={isLoading || isGoogleLoading}
                className="w-full h-12 mt-2 rounded-xl bg-[#fe5c13] hover:bg-[#e64e08] text-white font-bold text-sm tracking-wide transition-all shadow-sm active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Logging in...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-500">
              <Link
                href="/"
                className="hover:text-slate-800 transition-colors inline-flex items-center gap-1.5 font-medium"
              >
                <ArrowLeft size={13} />
                <span>Return to homepage</span>
              </Link>
            </div>
          </motion.div>
        </main>

        {/* Minimal clean footer */}
        <footer className="relative z-20 w-full py-4 text-center text-slate-400 text-[11px]">
          © {new Date().getFullYear()} Qrave. All rights reserved.
        </footer>
      </div>
 
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
                        ? "border-amber-500 bg-amber-500/10 text-[#1F2127]"
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
                  className="rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-[#1F2127] shadow-[0_4px_15px_rgba(232,144,10,0.2)] hover:bg-amber-600 disabled:opacity-60"
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
