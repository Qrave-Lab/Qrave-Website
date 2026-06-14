"use client";

import { useEffect, useState } from "react";
import { WifiOff, RefreshCcw, Wifi } from "lucide-react";

export default function NetworkStatusIndicator({ isCollapsed = false }: { isCollapsed?: boolean }) {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsOnline(navigator.onLine);

    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return (
    <div className="px-3 pb-3">
      <div 
        className={`flex items-center rounded-xl p-2.5 transition-all duration-300 shadow-sm
          ${!isOnline 
            ? 'bg-amber-100 border border-amber-200' 
            : 'bg-emerald-50 border border-emerald-100'
          }
          ${isCollapsed ? 'justify-center' : 'gap-3'}
        `}
      >
        <div className="relative flex items-center justify-center shrink-0">
          {!isOnline ? (
            <div className="relative">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
              <WifiOff className="relative w-4 h-4 text-amber-600" />
            </div>
          ) : (
            <Wifi className="w-4 h-4 text-emerald-600" />
          )}
        </div>
        
        {!isCollapsed && (
          <div className="flex-1 overflow-hidden flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider whitespace-nowrap
              ${!isOnline ? 'text-amber-800' : 'text-emerald-800'}
            `}>
              {!isOnline ? 'Offline' : 'Online'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
