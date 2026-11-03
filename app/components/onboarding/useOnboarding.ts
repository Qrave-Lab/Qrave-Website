"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "@/app/lib/api";

export type OnboardingStep = {
  key: string;
  title: string;
  description: string;
  href: string;
  done: boolean;
  skipped: boolean;
  skippable: boolean;
  skip_label?: string;
};

export type Onboarding = {
  steps: OnboardingStep[];
  completed: number;
  total: number;
  finished: boolean;
  dismissed: boolean;
  has_sample_data: boolean;
  next_step?: string;
};

const message = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

/** Loads setup progress and exposes the actions that change it. `data` stays null for roles that can't see setup. */
export function useOnboarding() {
  const [data, setData] = useState<Onboarding | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      setData(await api<Onboarding>("/api/admin/onboarding", { method: "GET", noCache: true, suppressErrorLog: true }));
    } catch {
      setData(null);
    }
  }, []);

  useEffect(() => {
    let live = true;
    api<Onboarding>("/api/admin/onboarding", { method: "GET", noCache: true, suppressErrorLog: true })
      .then((d) => live && setData(d))
      .catch(() => live && setData(null));
    return () => {
      live = false;
    };
  }, []);

  const run = useCallback(
    async (fn: () => Promise<unknown>, ok?: string) => {
      setBusy(true);
      try {
        await fn();
        if (ok) toast.success(ok);
        await reload();
        return true;
      } catch (e) {
        toast.error(message(e, "Something went wrong"));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [reload],
  );

  return {
    data,
    busy,
    reload,
    skip: (step: string, skipped: boolean) =>
      run(() => api("/api/admin/onboarding/skip", { method: "POST", body: JSON.stringify({ step, skipped }) })),
    dismiss: (dismissed: boolean) =>
      run(() => api("/api/admin/onboarding/dismiss", { method: "POST", body: JSON.stringify({ dismissed }) })),
    loadSample: () =>
      run(() => api("/api/admin/onboarding/sample-data", { method: "POST" }), "Sample menu added"),
    removeSample: () =>
      run(() => api("/api/admin/onboarding/sample-data", { method: "DELETE" }), "Sample menu removed"),
  };
}
