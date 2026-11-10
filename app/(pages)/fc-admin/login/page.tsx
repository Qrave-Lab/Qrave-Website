"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Store } from "lucide-react";
import { fcAdmin } from "@/app/lib/foodCourtAdmin";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await fcAdmin.login(email, password);
      const next = params.get("next");
      router.replace(next && next.startsWith("/fc-admin") ? next : "/fc-admin");
    } catch (err) {
      setError((err as Error).message || "Couldn't sign in");
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500 text-white">
            <Store size={20} />
          </div>
          <div>
            <h1 className="text-lg font-extrabold leading-tight">Food court sign in</h1>
            <p className="text-sm text-slate-500">For food court management</p>
          </div>
        </div>
        <label className="block text-sm font-semibold text-slate-700">
          Email
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-orange-400"
          />
        </label>
        <label className="mt-3 block text-sm font-semibold text-slate-700">
          Password
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-orange-400"
          />
        </label>
        {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
        <button
          disabled={busy}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 font-bold text-white disabled:opacity-60"
        >
          {busy && <Loader2 size={16} className="animate-spin" />} Sign in
        </button>
        <p className="mt-4 text-center text-xs text-slate-400">Restaurant staff? Sign in at /login instead.</p>
      </form>
    </div>
  );
}

export default function FoodCourtLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
