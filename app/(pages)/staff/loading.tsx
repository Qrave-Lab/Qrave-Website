import StaffSidebar from "@/app/components/StaffSidebar";
import ReloadButton from "@/app/components/ReloadButton";

/*
 * Placeholder shapes instead of a spinner: the layout is already in place
 * when the data arrives. Nothing shows for the first 300ms, so quick loads
 * never flash a loader, and a plain notice appears if it takes too long.
 */
export default function StaffLoading() {
  return (
    <div className="flex h-screen w-full bg-[#f8fafc]">
      <StaffSidebar />
      <main className="flex-1 overflow-hidden">
        <div role="status" aria-live="polite" className="load-delay p-8 lg:p-10">
          <span className="sr-only">Loading</span>

          {/* Page title + action */}
          <div className="flex items-center justify-between">
            <div className="space-y-3">
              <div className="skeleton h-7 w-56 rounded-md" />
              <div className="skeleton h-4 w-80 max-w-full rounded-md" />
            </div>
            <div className="skeleton h-10 w-32 rounded-lg" />
          </div>

          {/* Summary tiles */}
          <div className="mt-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="skeleton h-3.5 w-24 rounded" />
                <div className="skeleton mt-4 h-8 w-32 rounded-md" />
              </div>
            ))}
          </div>

          {/* List rows */}
          <div className="mt-8 rounded-xl border border-slate-200 bg-white">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0"
              >
                <div className="skeleton h-9 w-9 shrink-0 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-2/5 rounded" />
                  <div className="skeleton h-3.5 w-3/5 rounded" />
                </div>
                <div className="skeleton h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>

          {/* Only appears if loading is slow */}
          <div className="load-slow mt-8 flex items-center gap-4">
            <p className="text-sm text-slate-600">
              This is taking longer than usual. Check your connection and try again.
            </p>
            <ReloadButton />
          </div>
        </div>
      </main>
    </div>
  );
}
