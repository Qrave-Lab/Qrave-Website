import StaffSidebar from "@/app/components/StaffSidebar";
import { Loader2 } from "lucide-react";

export default function StaffLoading() {
  return (
    <div className="flex h-screen w-full bg-[#f8fafc]">
      <StaffSidebar />
      <main className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-500">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/landing/image.png"
            alt="Qrave Logo"
            className="h-10 w-auto object-contain animate-pulse"
          />
          <Loader2 className="w-8 h-8 animate-spin text-[#fe5c13]" />
          <p className="text-xs font-bold text-slate-400 tracking-wider uppercase">Loading...</p>
        </div>
      </main>
    </div>
  );
}
