"use client";

import React, { useRef, useState, useEffect } from "react";
import { Eye, EyeOff, Delete, XCircle } from "lucide-react";

interface ManagerPinInputProps {
  value: string;
  onChange: (pin: string) => void;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  error?: boolean;
  onComplete?: (pin: string) => void;
  showKeypad?: boolean;
  className?: string;
}

export default function ManagerPinInput({
  value = "",
  onChange,
  length = 4,
  disabled = false,
  autoFocus = true,
  error = false,
  onComplete,
  showKeypad = false,
  className = "",
}: ManagerPinInputProps) {
  const [showPin, setShowPin] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Split value into array of length
  const digits = Array.from({ length }, (_, i) => value[i] || "");

  // Initial focus
  useEffect(() => {
    if (autoFocus && inputRefs.current[0] && !disabled) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus, disabled]);

  const handleCellChange = (index: number, char: string) => {
    if (disabled) return;
    // Allow only numeric
    const cleanChar = char.replace(/\D/g, "");
    if (!cleanChar) return;

    // In case of multiple characters (e.g. typing fast or browser autofill)
    const newDigits = [...digits];
    const incomingChars = cleanChar.split("");
    
    let nextIndex = index;
    for (let i = 0; i < incomingChars.length && index + i < length; i++) {
      newDigits[index + i] = incomingChars[i];
      nextIndex = index + i + 1;
    }

    const newPin = newDigits.join("").slice(0, length);
    onChange(newPin);

    if (newPin.length === length && onComplete) {
      onComplete(newPin);
    }

    // Move to next cell
    if (nextIndex < length && inputRefs.current[nextIndex]) {
      inputRefs.current[nextIndex]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === "Backspace") {
      e.preventDefault();
      const newDigits = [...digits];
      if (newDigits[index]) {
        // Clear current
        newDigits[index] = "";
        onChange(newDigits.join(""));
      } else if (index > 0) {
        // Move to prev and clear prev
        newDigits[index - 1] = "";
        onChange(newDigits.join(""));
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (disabled) return;
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasteData) return;
    onChange(pasteData);
    if (pasteData.length === length && onComplete) {
      onComplete(pasteData);
    }
    const targetIdx = Math.min(pasteData.length, length - 1);
    inputRefs.current[targetIdx]?.focus();
  };

  // Touch keypad handlers
  const handleKeypadPress = (num: string) => {
    if (disabled) return;
    if (value.length < length) {
      const nextPin = value + num;
      onChange(nextPin);
      if (nextPin.length === length && onComplete) {
        onComplete(nextPin);
      }
      const nextIdx = Math.min(nextPin.length, length - 1);
      inputRefs.current[nextIdx]?.focus();
    }
  };

  const handleKeypadBackspace = () => {
    if (disabled) return;
    if (value.length > 0) {
      const nextPin = value.slice(0, -1);
      onChange(nextPin);
      const targetIdx = Math.max(0, nextPin.length);
      inputRefs.current[targetIdx]?.focus();
    }
  };

  const handleKeypadClear = () => {
    if (disabled) return;
    onChange("");
    inputRefs.current[0]?.focus();
  };

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      {/* Cells row */}
      <div className="flex items-center gap-2.5 sm:gap-3.5" onPaste={handlePaste}>
        {Array.from({ length }).map((_, idx) => {
          const char = digits[idx] || "";
          const isFilled = Boolean(char);
          const isCurrent = value.length === idx || (value.length === length && idx === length - 1);

          return (
            <div key={idx} className="relative">
              <input
                ref={(el) => {
                  inputRefs.current[idx] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={showPin ? char : char ? "•" : ""}
                onChange={(e) => handleCellChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onFocus={(e) => e.target.select()}
                disabled={disabled}
                className={`w-12 h-14 sm:w-14 sm:h-16 text-center text-xl sm:text-2xl font-black font-mono rounded-2xl border-2 transition-all outline-none select-none ${
                  error
                    ? "border-rose-400 bg-rose-50/50 text-rose-600 ring-4 ring-rose-500/10 animate-shake"
                    : isCurrent
                    ? "border-[#fe5c13] bg-white text-slate-900 shadow-md ring-4 ring-[#fe5c13]/15 scale-[1.03]"
                    : isFilled
                    ? "border-slate-300 bg-slate-50/80 text-slate-900 font-bold"
                    : "border-slate-200 bg-slate-50/50 text-slate-400 hover:border-slate-300"
                } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              />

              {/* Indicator dot when masked */}
              {!showPin && isFilled && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="w-3.5 h-3.5 rounded-full bg-slate-900" />
                </div>
              )}
            </div>
          );
        })}

        {/* Peek toggle button */}
        <button
          type="button"
          onClick={() => setShowPin(!showPin)}
          title={showPin ? "Hide PIN" : "Show PIN"}
          className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors ml-1"
        >
          {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      {/* Optional Touch POS Numeric Keypad */}
      {showKeypad && (
        <div className="w-full max-w-[280px] grid grid-cols-3 gap-2 pt-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => handleKeypadPress(n)}
              disabled={disabled}
              className="h-12 rounded-xl bg-slate-50 hover:bg-slate-100 active:scale-95 border border-slate-200/80 text-lg font-bold text-slate-800 transition-all shadow-2xs flex items-center justify-center disabled:opacity-40"
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            onClick={handleKeypadClear}
            disabled={disabled || value.length === 0}
            title="Clear all"
            className="h-12 rounded-xl bg-slate-50 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 active:scale-95 border border-slate-200/80 text-xs font-bold text-slate-500 transition-all shadow-2xs flex items-center justify-center disabled:opacity-40"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => handleKeypadPress("0")}
            disabled={disabled}
            className="h-12 rounded-xl bg-slate-50 hover:bg-slate-100 active:scale-95 border border-slate-200/80 text-lg font-bold text-slate-800 transition-all shadow-2xs flex items-center justify-center disabled:opacity-40"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleKeypadBackspace}
            disabled={disabled || value.length === 0}
            title="Backspace"
            className="h-12 rounded-xl bg-slate-50 hover:bg-slate-100 active:scale-95 border border-slate-200/80 text-slate-700 transition-all shadow-2xs flex items-center justify-center disabled:opacity-40"
          >
            <Delete className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      )}
    </div>
  );
}
