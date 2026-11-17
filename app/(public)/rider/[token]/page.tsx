import type { Metadata } from "next";

// Where a delivery bill's QR lands when it is scanned with the phone camera
// instead of the Qrave app. Order details stay behind the rider's sign-in:
// this page only hands the code over to the app.

export const metadata: Metadata = {
  title: "Qrave delivery order",
  robots: { index: false, follow: false },
};

const APP_SCHEME = "adminorderapp";

export default async function RiderLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token: raw } = await params;
  const token = String(raw || "").replace(/-/g, "").toLowerCase();
  const valid = /^[0-9a-f]{32}$/.test(token);
  const code = valid ? token.slice(0, 8).toUpperCase() : "";

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-12 text-slate-900">
      <div className="mx-auto max-w-sm rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-[#fe5c13]">Qrave delivery</p>
        {valid ? (
          <>
            <h1 className="mt-3 text-2xl font-black tracking-tight">Order {code}</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              This code is for the restaurant&apos;s delivery rider. Open it in the Qrave app to confirm pickup and delivery.
            </p>
            <a
              href={`${APP_SCHEME}://rider/${token}`}
              className="mt-6 flex h-14 items-center justify-center rounded-2xl bg-[#fe5c13] text-base font-black text-white"
            >
              Open in the Qrave app
            </a>
            <p className="mt-5 text-xs leading-5 text-slate-500">
              Nothing happened? Open the Qrave app, sign in as a rider, tap Scan and scan the bill again, or type the order code{" "}
              <span className="font-mono font-bold text-slate-900">{code}</span>.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-3 text-2xl font-black tracking-tight">This code isn&apos;t valid</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Scan the QR on the delivery bill again, or type the 8-character order code printed beside it into the Qrave app.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
