"use client";

import React, { useState } from "react";
import { Check, Eye, EyeOff, KeyRound } from "lucide-react";

/* Shared staff form pieces, used by Add team member, Edit team member and the
   edit window on the Team page, so all three look and behave the same. */

export const STAFF_ROLES: { id: string; label: string; hint: string }[] = [
  { id: "manager", label: "Manager", hint: "Runs the restaurant day to day" },
  { id: "kitchen", label: "Chef", hint: "Sees and updates kitchen orders" },
  { id: "waiter", label: "Waiter", hint: "Takes orders at tables" },
  { id: "cashier", label: "Cashier", hint: "Takes payments and closes bills" },
  { id: "delivery_rider", label: "Delivery rider", hint: "Picks up and delivers orders" },
];

export const roleLabel = (role?: string) =>
  STAFF_ROLES.find((r) => r.id === role)?.label ||
  (role ? role.charAt(0).toUpperCase() + role.slice(1).replace(/_/g, " ") : "Staff");

export const initialsOf = (name?: string | null, fallback = "") => {
  const src = (name || fallback || "").trim();
  if (!src) return "?";
  const parts = src.split(/[\s._@-]+/).filter(Boolean);
  return ((parts[0]?.[0] || "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
};

export const isPlaceholderEmail = (email?: string | null) =>
  !email || email.includes("@internal.nologin") || email.startsWith("staff.");

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-[#F3F3EF] font-semibold text-[#4B5563]"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      aria-hidden="true"
    >
      {initialsOf(name)}
    </span>
  );
}

export const STAFF_INPUT =
  "h-10 w-full rounded-xl border border-[#E8E8E3] bg-white px-3.5 text-[14px] text-[#0F1117] outline-none transition-colors placeholder:text-[#9CA3AF] hover:border-[#D6D6CF] focus:border-[#fe5c13]";
const LABEL = "mb-1.5 block text-[13px] font-medium text-[#4B5563]";

export type StaffFormValues = { name: string; email: string; phone: string; password: string; role: string };

export const passwordProblem = (pw: string): string | null => {
  if (pw.length < 8 || pw.length > 72) return "Use 8 to 72 characters";
  if (!/[a-zA-Z]/.test(pw)) return "Add at least one letter";
  if (!/[0-9]/.test(pw)) return "Add at least one number";
  return null;
};

export function StaffFields({
  value,
  onChange,
  mode,
  compact,
}: {
  value: StaffFormValues;
  onChange: (next: StaffFormValues) => void;
  mode: "add" | "edit";
  compact?: boolean;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const set = (k: keyof StaffFormValues, v: string) => onChange({ ...value, [k]: v });
  const pwIssue = value.password ? passwordProblem(value.password) : null;

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="sf-name" className={LABEL}>Full name</label>
        <input
          id="sf-name"
          required={mode === "add"}
          value={value.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Priya Nair"
          className={STAFF_INPUT}
        />
      </div>

      <div className={`grid gap-4 ${compact ? "" : "sm:grid-cols-2"}`}>
        <div>
          <label htmlFor="sf-email" className={LABEL}>
            Work email <span className="font-normal text-[#9CA3AF]">Needed to sign in</span>
          </label>
          <input
            id="sf-email"
            type="email"
            value={value.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder={mode === "edit" ? "Leave blank to keep current" : "priya@spiceroute.in"}
            className={STAFF_INPUT}
          />
        </div>
        <div>
          <label htmlFor="sf-phone" className={LABEL}>
            Phone <span className="font-normal text-[#9CA3AF]">Optional</span>
          </label>
          <div className="flex h-10 overflow-hidden rounded-xl border border-[#E8E8E3] bg-white transition-colors hover:border-[#D6D6CF] focus-within:border-[#fe5c13]">
            <span className="flex items-center border-r border-[#E8E8E3] bg-[#F3F3EF] px-3 text-[13px] font-medium text-[#6B7280]">+91</span>
            <input
              id="sf-phone"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={value.phone}
              onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="98765 43210"
              className="w-full min-w-0 bg-transparent px-3 text-[14px] tabular-nums text-[#0F1117] outline-none placeholder:text-[#9CA3AF]"
            />
          </div>
          {value.phone && value.phone.length !== 10 && (
            <p className="mt-1.5 text-[12px] tabular-nums text-amber-700">{value.phone.length} of 10 digits</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="sf-pw" className={LABEL}>
          {mode === "add" ? "Password" : "New password"}
          {mode === "edit" && <span className="ml-1.5 font-normal text-[#9CA3AF]">Leave blank to keep current</span>}
        </label>
        <div className="relative">
          <input
            id="sf-pw"
            required={mode === "add"}
            type={showPassword ? "text" : "password"}
            minLength={mode === "add" ? 8 : undefined}
            maxLength={72}
            autoComplete="new-password"
            value={value.password}
            onChange={(e) => set("password", e.target.value)}
            placeholder={mode === "add" ? "At least 8 characters" : "••••••••"}
            className={`${STAFF_INPUT} pr-10`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-[#9CA3AF] transition-colors hover:bg-[#F3F3EF] hover:text-[#0F1117]"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className={`mt-1.5 text-[12px] ${pwIssue ? "text-amber-700" : value.password ? "text-emerald-700" : "text-[#9CA3AF]"}`}>
          {pwIssue ? pwIssue : value.password ? "Strong enough" : "8 to 72 characters, with at least one letter and one number."}
        </p>
      </div>

      <div>
        <p className={LABEL}>Role</p>
        <div className={`grid gap-2 ${compact ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`} role="radiogroup" aria-label="Role">
          {STAFF_ROLES.map((r) => {
            const on = value.role === r.id;
            return (
              <button
                key={r.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => set("role", r.id)}
                className={`relative rounded-xl border px-3.5 py-2.5 text-left transition-colors ${on ? "border-[#fe5c13] bg-[#FFF4EC]" : "border-[#E8E8E3] bg-white hover:border-[#D6D6CF]"}`}
              >
                <span className="block text-[13px] font-semibold text-[#0F1117]">{r.label}</span>
                <span className="block text-[12px] leading-snug text-[#6B7280]">{r.hint}</span>
                {on && (
                  <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#fe5c13] text-white">
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Light "staff card" preview that mirrors what's being entered. */
export function StaffPreview({ value, branch }: { value: StaffFormValues; branch?: string }) {
  const canSignIn = !!value.email.trim();
  return (
    <div className="rounded-2xl border border-[#E8E8E3] bg-white">
      <div className="border-b border-[#F0F0EB] px-5 py-3.5">
        <p className="text-[14px] font-semibold text-[#0F1117]">Preview</p>
        <p className="mt-0.5 text-[12px] text-[#6B7280]">How they appear in your team list.</p>
      </div>
      <div className="flex items-center gap-3.5 px-5 py-5">
        <Avatar name={value.name || value.email} size={48} />
        <div className="min-w-0">
          <p className="truncate text-[16px] font-semibold text-[#0F1117]">{value.name.trim() || "Team member"}</p>
          <p className="mt-0.5 truncate text-[13px] tabular-nums text-[#6B7280]">
            {[value.email.trim(), value.phone ? `+91 ${value.phone}` : ""].filter(Boolean).join(", ") || "No contact details yet"}
          </p>
        </div>
      </div>
      <dl className="space-y-2.5 border-t border-[#F0F0EB] px-5 py-4 text-[13px]">
        <div className="flex justify-between gap-3">
          <dt className="text-[#6B7280]">Role</dt>
          <dd className="font-medium text-[#0F1117]">{roleLabel(value.role)}</dd>
        </div>
        {branch && (
          <div className="flex justify-between gap-3">
            <dt className="text-[#6B7280]">Branch</dt>
            <dd className="truncate font-medium text-[#0F1117]">{branch}</dd>
          </div>
        )}
        <div className="flex justify-between gap-3">
          <dt className="text-[#6B7280]">Sign in</dt>
          <dd className={`flex items-center gap-1.5 font-medium ${canSignIn ? "text-emerald-700" : "text-[#9CA3AF]"}`}>
            <KeyRound className="h-3.5 w-3.5" /> {canSignIn ? "With email and password" : "Can't sign in yet"}
          </dd>
        </div>
      </dl>
      {!canSignIn && (
        <p className="border-t border-[#F0F0EB] px-5 py-3 text-[12px] leading-relaxed text-[#6B7280]">
          Without an email they can&apos;t sign in on their own. Add one now or later.
        </p>
      )}
    </div>
  );
}
