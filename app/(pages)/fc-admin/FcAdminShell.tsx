"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { BarChart3, Loader2, LogOut, Megaphone, QrCode, Store } from "lucide-react";
import { fcAdmin, isUnauthorized, type Me } from "@/app/lib/foodCourtAdmin";

const MeContext = createContext<Me | null>(null);

/** The signed-in operator and their court. Only valid inside FcAdminShell. */
export function useOperator(): Me {
  const me = useContext(MeContext);
  if (!me) throw new Error("useOperator outside FcAdminShell");
  return me;
}

const NAV = [
  { href: "/fc-admin", label: "Overview", icon: BarChart3 },
  { href: "/fc-admin/stalls", label: "Stalls", icon: Store },
  { href: "/fc-admin/ads", label: "Ads", icon: Megaphone },
  { href: "/fc-admin/qr", label: "QR codes", icon: QrCode },
];

export default function FcAdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname.startsWith("/fc-admin/login");
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    if (isLogin) return;
    fcAdmin
      .me()
      .then(setMe)
      .catch((e) => {
        if (isUnauthorized(e)) router.replace(`/fc-admin/login?next=${encodeURIComponent(pathname)}`);
      });
  }, [isLogin, pathname, router]);

  if (isLogin) return <>{children}</>;
  if (!me) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-400">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  const logout = async () => {
    await fcAdmin.logout().catch(() => {});
    router.replace("/fc-admin/login");
  };

  return (
    <MeContext.Provider value={me}>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-orange-600">Food court</p>
              <h1 className="truncate text-lg font-extrabold leading-tight">{me.court.name}</h1>
            </div>
            <a
              href={`/fc/${me.court.slug}`}
              target="_blank"
              rel="noreferrer"
              className="hidden rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:inline-block"
            >
              View diner page
            </a>
            <button onClick={logout} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Sign out">
              <LogOut size={18} />
            </button>
          </div>
          <nav className="no-scrollbar mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 pb-2">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = href === "/fc-admin" ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${
                    active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Icon size={15} /> {label}
                </Link>
              );
            })}
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </div>
    </MeContext.Provider>
  );
}

export function Card({ title, children, right }: { title?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {(title || right) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-[15px] font-extrabold">{title}</h2>}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}
