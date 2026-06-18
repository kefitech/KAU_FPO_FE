"use client";

import { useEffect, useState } from "react";

import { Wifi, WifiOff } from "lucide-react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function NetworkStatus() {
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    setOnline(navigator.onLine);
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Don't render until we know the actual state (avoids SSR mismatch)
  if (online === null) return null;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex cursor-default select-none items-center gap-1.5">
            {online ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 animate-pulse text-destructive" />
            )}
            {!online && <span className="hidden font-medium text-destructive text-xs sm:inline">Offline</span>}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {online ? "Connected" : "No internet connection — changes may not be saved"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
