"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  UtensilsCrossed,
  MapPin,
  Clock,
  Phone,
  User,
  Users,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  BellRing,
  ArrowRight,
  Store
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

// --- API Helper ---
function getBackendBase() {
  if (typeof window !== "undefined") {
    if (window.location.hostname === "localhost") return "http://localhost:9090";
    return process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") || "";
  }
  return "";
}

// --- OTP Component ---
const OTPInput = ({ value, onChange, onComplete }: { value: string, onChange: (v: string) => void, onComplete?: () => void }) => {
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (value.length <= 6) {
      const newDigits = value.split("").concat(Array(6).fill("")).slice(0, 6);
      setDigits(newDigits);
    }
  }, [value]);

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!/^\d*$/.test(val)) return;
    const newDigits = [...digits];
    newDigits[index] = val.substring(val.length - 1);
    const newValue = newDigits.join("");
    onChange(newValue);
    if (val && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
    if (newValue.length === 6 && onComplete) onComplete();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted) {
      onChange(pasted);
      const focusIndex = Math.min(pasted.length, 5);
      inputsRef.current[focusIndex]?.focus();
      if (pasted.length === 6 && onComplete) onComplete();
    }
  };

  return (
    <div className="flex justify-between gap-1.5 sm:gap-3" onPaste={handlePaste}>
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { inputsRef.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="w-11 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold bg-slate-50/50 border-2 border-slate-200 rounded-xl focus:border-[#fe5c13] focus:ring-4 focus:ring-[#fe5c13]/20 focus:bg-white outline-none transition-all"
        />
      ))}
    </div>
  );
};

export default function WaitlistJoinPage() {
  const params = useParams();
  const slug = params.slug as string;

  // Data
  const [restaurant, setRestaurant] = useState<any>(null);
  
  // State machine
  type Step = "loading" | "phone" | "otp" | "form" | "queued" | "seated" | "error" | "removed";
  const [step, setStep] = useState<Step>("loading");

  // Form states
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [partySize, setPartySize] = useState(2);

  const [waitlistId, setWaitlistId] = useState<string | null>(null);
  const [positionInfo, setPositionInfo] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Initial Load
  useEffect(() => {
    if (!slug) return;
    const fetchInfo = async () => {
      try {
        const res = await fetch(`${getBackendBase()}/public/waitlist/${slug}`);
        if (!res.ok) throw new Error("Restaurant not found");
        const data = await res.json();
        setRestaurant(data);
        
        // Restore session if exists
        const savedSession = localStorage.getItem(`qrave_waitlist_${slug}`);
        if (savedSession) {
          const parsed = JSON.parse(savedSession);
          setWaitlistId(parsed.waitlistId);
          setPhone(parsed.phone);
          setStep("queued");
        } else {
          setStep("phone");
        }
      } catch (err) {
        setStep("error");
        setErrorMsg("This waitlist link is invalid or has expired.");
      }
    };
    fetchInfo();
  }, [slug]);

  // 2. Polling when queued
  useEffect(() => {
    if (step !== "queued" || !waitlistId) return;

    const checkStatus = async () => {
      try {
        const res = await fetch(`${getBackendBase()}/public/waitlist/${slug}/status/${waitlistId}`);
        if (!res.ok) {
          if (res.status === 404) {
             setStep("removed");
             localStorage.removeItem(`qrave_waitlist_${slug}`);
          }
          return;
        }
        const data = await res.json();
        setPositionInfo(data);
        if (data.status === "seated") {
          localStorage.removeItem(`qrave_waitlist_${slug}`);
          if (data.qr_token) {
            window.location.href = `/menu/qr/${data.qr_token}`;
            return;
          }
          setStep("seated");
        } else if (data.status === "cancelled" || data.status === "no_show") {
          setStep("removed");
          localStorage.removeItem(`qrave_waitlist_${slug}`);
        }
      } catch (err) {
        console.error("Status check failed", err);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 10000); // Check every 10s for better responsiveness
    return () => clearInterval(interval);
  }, [step, waitlistId, slug]);

  // Actions
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length !== 10) return toast.error("Please enter a valid 10-digit mobile number");
    setIsSubmitting(true);
    try {
      const res = await fetch(`${getBackendBase()}/public/waitlist/${slug}/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("OTP Sent! (Test code: 696969)");
      setStep("otp");
    } catch (err: any) {
      toast.error(err.message || "Failed to send OTP");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOTP = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (otp.length !== 6) return toast.error("Enter 6 digit OTP");
    setIsSubmitting(true);
    try {
      const res = await fetch(`${getBackendBase()}/public/waitlist/${slug}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: otp }),
      });
      if (!res.ok) throw new Error(await res.text());
      setStep("form");
    } catch (err: any) {
      toast.error(err.message || "Invalid OTP");
      setOtp(""); // clear on fail
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Please enter your name");
    setIsSubmitting(true);
    try {
      const res = await fetch(`${getBackendBase()}/public/waitlist/${slug}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, guest_name: name, party_size: partySize }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setWaitlistId(data.waitlist_id);
      setPositionInfo({
        position: data.position,
        quoted_minutes: data.quoted_minutes,
        status: "waiting"
      });
      localStorage.setItem(`qrave_waitlist_${slug}`, JSON.stringify({ waitlistId: data.waitlist_id, phone }));
      setStep("queued");
    } catch (err: any) {
      toast.error(err.message || "Failed to join waitlist");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name: string) => name ? name.charAt(0).toUpperCase() : "Q";

  // --- Render Steps ---
  const renderStep = () => {
    switch (step) {
      case "loading":
        return (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-12">
            <Loader2 className="w-10 h-10 animate-spin text-[#fe5c13] mx-auto mb-4" />
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading...</h2>
          </motion.div>
        );

      case "error":
        return (
          <motion.div key="error" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Oops!</h2>
            <p className="text-slate-500 font-medium">{errorMsg}</p>
          </motion.div>
        );

      case "phone":
        return (
          <motion.div key="phone" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <form onSubmit={handleSendOTP} className="flex flex-col gap-6">
              <div className="text-center mb-2">
                <h2 className="text-2xl font-black text-slate-900 mb-2">Join the Waitlist</h2>
                <p className="text-slate-500 text-sm font-medium">Enter your mobile number to hold your spot.</p>
              </div>
              <div>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold flex items-center gap-2">
                    <Phone className="w-4 h-4" /> +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    className="w-full bg-slate-50/50 border-2 border-slate-200 rounded-2xl py-4 pl-20 pr-4 text-lg font-bold text-slate-900 placeholder-slate-400 focus:border-[#fe5c13] focus:bg-white focus:ring-4 focus:ring-[#fe5c13]/10 outline-none transition-all"
                    placeholder="Mobile number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    autoFocus
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-[#fe5c13] to-[#e04f0f] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-[#fe5c13]/30 active:scale-[0.98] disabled:opacity-70"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Continue <ArrowRight className="w-5 h-5" /></>}
              </button>
            </form>
          </motion.div>
        );

      case "otp":
        return (
          <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <form onSubmit={handleVerifyOTP} className="flex flex-col gap-6">
              <div className="text-center mb-2">
                <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BellRing className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">Verify Number</h2>
                <p className="text-slate-500 text-sm font-medium">We sent a 6-digit code to <br/><span className="text-slate-900 font-bold">+91 {phone}</span></p>
              </div>
              <div className="py-2">
                <OTPInput 
                  value={otp} 
                  onChange={setOtp} 
                  onComplete={() => {
                    if (otp.length === 5) {
                      setTimeout(() => document.getElementById("verify-btn")?.click(), 100);
                    }
                  }}
                />
              </div>
              <button
                id="verify-btn"
                type="submit"
                disabled={isSubmitting || otp.length !== 6}
                className="w-full bg-gradient-to-r from-[#fe5c13] to-[#e04f0f] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-[#fe5c13]/30 active:scale-[0.98] disabled:opacity-70"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Continue"}
              </button>
              <button 
                type="button" 
                onClick={() => setStep("phone")} 
                className="text-sm font-bold text-slate-400 hover:text-slate-700 transition-colors py-2"
              >
                Change Phone Number
              </button>
            </form>
          </motion.div>
        );

      case "form":
        return (
          <motion.div key="form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <form onSubmit={handleJoin} className="flex flex-col gap-6">
              <div className="text-center mb-2">
                <h2 className="text-2xl font-black text-slate-900 mb-2">Almost there!</h2>
                <p className="text-slate-500 text-sm font-medium">Just a few details to get you seated.</p>
              </div>
              
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5 ml-1">
                    <User className="w-3.5 h-3.5" /> Guest Name
                  </label>
                  <input
                    type="text"
                    className="w-full bg-slate-50/50 border-2 border-slate-200 rounded-2xl py-3.5 px-5 text-lg font-bold text-slate-900 placeholder-slate-400 focus:border-[#fe5c13] focus:bg-white focus:ring-4 focus:ring-[#fe5c13]/10 outline-none transition-all"
                    placeholder="E.g. John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5 ml-1">
                    <Users className="w-3.5 h-3.5" /> Party Size
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5, 6].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setPartySize(num)}
                        className={`flex-1 min-w-[3rem] h-12 rounded-xl text-lg font-bold border-2 transition-all ${
                          partySize === num
                            ? "border-[#fe5c13] bg-[#fe5c13] text-white shadow-md shadow-[#fe5c13]/20"
                            : "border-slate-200 bg-slate-50/50 text-slate-600 hover:border-slate-300 hover:bg-slate-100"
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                  {partySize > 6 && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3">
                      <input
                        type="number"
                        min="7"
                        max="50"
                        className="w-full bg-white border-2 border-[#fe5c13] rounded-xl py-3 px-4 text-lg font-bold text-slate-900 focus:ring-4 focus:ring-[#fe5c13]/20 outline-none transition-all"
                        value={partySize}
                        onChange={(e) => setPartySize(parseInt(e.target.value) || 7)}
                      />
                    </motion.div>
                  )}
                  {partySize <= 6 && (
                    <button
                      type="button"
                      onClick={() => setPartySize(7)}
                      className="w-full mt-3 py-2 text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors"
                    >
                      Need a larger table? (7+)
                    </button>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-[#fe5c13] to-[#e04f0f] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-[#fe5c13]/30 active:scale-[0.98] disabled:opacity-70 mt-4"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Join Waitlist"}
              </button>
            </form>
          </motion.div>
        );

      case "queued":
        const pos = positionInfo?.position || 0;
        const estWait = positionInfo?.quoted_minutes || 0;
        const isNext = pos === 1;

        return (
          <motion.div key="queued" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
            <div className="relative inline-block mb-6">
              <div className="w-24 h-24 bg-gradient-to-tr from-orange-100 to-orange-50 rounded-full flex items-center justify-center shadow-inner border border-orange-200">
                <Clock className="w-10 h-10 text-[#fe5c13]" />
              </div>
              <span className="absolute bottom-1 right-1 w-6 h-6 bg-green-500 border-4 border-white rounded-full"></span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">You're in the queue!</h2>
            <p className="text-slate-500 font-medium mb-8">We'll let you know when your table is ready.</p>
            
            <div className="bg-slate-50/80 border border-slate-200 rounded-3xl p-6 mb-8 relative overflow-hidden shadow-sm">
              {isNext && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: [0.5, 1, 0.5] }} 
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute inset-0 border-4 border-green-500 rounded-3xl"
                />
              )}
              <div className="grid grid-cols-2 gap-4 divide-x divide-slate-200">
                <div className="px-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Position</p>
                  <p className={`text-5xl font-black ${isNext ? 'text-green-500' : 'text-slate-900'} tracking-tighter`}>
                    {pos > 0 ? `#${pos}` : "--"}
                  </p>
                </div>
                <div className="px-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Est. Wait</p>
                  <p className="text-4xl font-black text-slate-900 mt-2 tracking-tighter">
                    {estWait > 0 ? `${estWait}m` : "--"}
                  </p>
                </div>
              </div>
              {isNext && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-5 pt-4 border-t border-slate-200">
                  <p className="text-green-600 font-bold flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-5 h-5" /> You are up next!
                  </p>
                </motion.div>
              )}
            </div>
            
            <div className="inline-flex items-center justify-center gap-2 bg-slate-100 px-4 py-2 rounded-full">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#fe5c13]" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Live Updates</span>
            </div>
          </motion.div>
        );

      case "seated":
        return (
          <motion.div key="seated" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border-2 border-green-200">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Table Ready! 🎉</h2>
            <p className="text-lg text-slate-600 font-medium">Please head to the host stand. We are ready to seat you.</p>
          </motion.div>
        );

      case "removed":
        return (
          <motion.div key="removed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10 text-slate-400" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">No longer in queue</h2>
            <p className="text-slate-500 font-medium">You have been removed from the waitlist.</p>
            <button 
              onClick={() => { localStorage.removeItem(`qrave_waitlist_${slug}`); setStep("phone"); }}
              className="mt-8 px-8 py-3.5 bg-slate-100 text-slate-700 font-bold rounded-2xl hover:bg-slate-200 transition-colors w-full"
            >
              Rejoin Waitlist
            </button>
          </motion.div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#FAFAF7] flex flex-col relative selection:bg-[#fe5c13]/20 font-sans">
      <Toaster position="top-center" />
      
      {/* Decorative Background Patterns */}
      <div className="absolute top-0 left-0 right-0 h-[40vh] bg-gradient-to-b from-[#fe5c13]/15 to-transparent z-0 pointer-events-none" />
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 mix-blend-multiply z-0 pointer-events-none" />
      
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 z-10 w-full max-w-[480px] mx-auto">
        
        {/* The Glassy App Card */}
        <div className="w-full bg-white/95 backdrop-blur-3xl shadow-2xl shadow-slate-200/50 ring-1 ring-slate-900/5 rounded-[2rem] p-6 sm:p-8 pt-10 relative">
          
          {/* Overlapping Logo */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex justify-center">
            <div className="w-24 h-24 rounded-[1.5rem] bg-white shadow-xl shadow-slate-200/50 ring-1 ring-slate-900/5 flex items-center justify-center text-4xl font-black text-[#fe5c13] overflow-hidden">
              {restaurant?.logo_url ? (
                <img src={restaurant.logo_url} alt={restaurant.name} className="w-full h-full object-cover" />
              ) : restaurant?.name ? (
                getInitials(restaurant.name)
              ) : (
                <Store className="w-10 h-10 text-slate-300" />
              )}
            </div>
          </div>

          {/* Restaurant Header */}
          {step !== "loading" && step !== "error" && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mt-6 mb-8">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">{restaurant?.name || "Restaurant"}</h1>
              
              <div className="flex items-center justify-center gap-2 mt-3">
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 text-green-700 text-[11px] font-bold tracking-widest uppercase border border-green-100 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                  Accepting Walk-ins
                </span>
              </div>
              
              <div className="flex items-center justify-center gap-3 text-sm text-slate-500 mt-4 font-semibold">
                <span className="flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-lg">
                  <MapPin className="w-4 h-4 text-slate-400" /> Waitlist
                </span>
                <span className="flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-lg">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-700">{restaurant?.queue_info?.waiting_count || 0}</span> waiting
                </span>
              </div>
            </motion.div>
          )}

          {/* Dynamic Step Content */}
          <div className="relative">
            <AnimatePresence mode="wait">
              {renderStep()}
            </AnimatePresence>
          </div>

        </div>
      </main>

      {/* Subtle Footer */}
      <footer className="py-8 text-center z-10 mt-auto">
        <p className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">
          Powered by <span className="text-slate-900">Qrave</span>
        </p>
      </footer>
    </div>
  );
}
