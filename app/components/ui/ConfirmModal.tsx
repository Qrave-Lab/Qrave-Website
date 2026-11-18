"use client";

import React from "react";

type ConfirmModalProps = {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  hideCancel?: boolean;
};

export default function ConfirmModal({
  open,
  title,
  message,
  onConfirm,
  onClose,
  confirmText = "Confirm",
  cancelText = "Cancel",
  destructive = false,
  hideCancel = false,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0F1117]/40 p-4 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-sm rounded-2xl border border-[#E8E8E3] bg-white p-6 shadow-[0_24px_60px_-20px_rgba(15,17,23,0.35)]">
        <h3 className="text-[17px] font-bold text-[#0F1117]">{title}</h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[#6B7280]">{message}</p>
        <div className="mt-6 flex gap-2">
          {!hideCancel && (
            <button
              type="button"
              onClick={onClose}
              className="h-10 flex-1 rounded-xl border border-[#E8E8E3] bg-white text-[13px] font-semibold text-[#374151] transition-colors hover:border-[#D6D6CF] hover:text-[#0F1117]"
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            className={`h-10 flex-1 rounded-xl text-[13px] font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
              destructive
                ? "bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-500/40"
                : "bg-[#fe5c13] hover:bg-[#e44e0b] focus-visible:ring-[#fe5c13]/40"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
