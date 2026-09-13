import StaffSidebar from "@/app/components/StaffSidebar";
import { Loader2 } from "lucide-react";

export default function StaffLoading() {
  return (
    <div className="flex h-screen w-full bg-[#f8fafc]">
      <StaffSidebar />
      <main className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-500">
          <Loader2 className="w-10 h-10 animate-spin text-[#fe5c13]" />
          <p className="text-sm font-bold text-slate-500 tracking-wide">Loading module...</p>
        </div>
      </main>
    </div>
  );
}
