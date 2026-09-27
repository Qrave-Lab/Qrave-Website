"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ManagerPinInput from "./ManagerPinInput";
import { submitManagerPin } from "@/app/lib/api";

interface ManagerPinModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onConfirm?: (pin: string) => void | Promise<void>;
  title?: string;
  description?: string;
}

export default function ManagerPinModal({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  onConfirm: controlledOnConfirm,
  title = "Manager Authorization",
  description = "Enter your 4-digit manager PIN to authorize this action",
}: ManagerPinModalProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isControlled = typeof controlledIsOpen === "boolean";
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  // Listen for global custom event dispatched from requestManagerPin()
  useEffect(() => {
    if (isControlled) return;

    const handleShowPinModal = () => {
      setPin("");
      setError("");
      setIsSubmitting(false);
      setInternalIsOpen(true);
    };

    window.addEventListener("show-manager-pin-modal", handleShowPinModal);
    return () => {
      window.removeEventListener("show-manager-pin-modal", handleShowPinModal);
    };
  }, [isControlled]);

  const handleClose = () => {
    if (isSubmitting) return;
    setPin("");
    setError("");
    if (isControlled && controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalIsOpen(false);
      submitManagerPin(null);
    }
  };

  const handleAuthorize = async (overridePin?: string) => {
    const pinToSubmit = overridePin || pin;
    if (pinToSubmit.length < 4) {
      setError("Please enter all 4 digits of the PIN");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      if (isControlled && controlledOnConfirm) {
        await controlledOnConfirm(pinToSubmit);
      } else {
        submitManagerPin(pinToSubmit);
        setInternalIsOpen(false);
      }
    } catch (err: any) {
      setError(err?.message || "Invalid manager PIN");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
          onClick={handleClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 flex flex-col items-center text-center z-10"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="absolute right-4 top-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Shield Icon Badge */}
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/10 to-amber-500/10 text-[#fe5c13] ring-1 ring-[#fe5c13]/20 flex items-center justify-center shadow-xs mb-3">
            <ShieldCheck className="w-7 h-7" />
          </div>

          <h3 className="text-lg font-black text-slate-900 tracking-tight">{title}</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-[260px] leading-relaxed">
            {description}
          </p>

          {/* Pin Cells */}
          <div className="my-5 w-full flex flex-col items-center">
            <ManagerPinInput
              value={pin}
              onChange={(newPin) => {
                setPin(newPin);
                if (error) setError("");
              }}
              length={4}
              error={Boolean(error)}
              disabled={isSubmitting}
              onComplete={(completedPin) => {
                handleAuthorize(completedPin);
              }}
              showKeypad={true}
            />

            {error && (
              <p className="text-xs font-bold text-rose-500 mt-3 animate-shake">
                {error}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 w-full pt-1">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all active:scale-98 disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleAuthorize()}
              disabled={isSubmitting || pin.length < 4}
              className="flex-1 py-3 rounded-xl bg-[#fe5c13] hover:bg-orange-600 text-white text-xs font-bold transition-all shadow-xs active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <span>Authorize</span>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
