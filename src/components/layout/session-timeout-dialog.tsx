"use client";

import { LogOut, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SessionTimeoutDialogProps {
  open: boolean;
  secondsLeft: number;
  onStay: () => void;
  onLogout: () => void;
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) return `${m}m ${s.toString().padStart(2, "0")}s`;
  return `${s}s`;
}

export function SessionTimeoutDialog({ open, secondsLeft, onStay, onLogout }: SessionTimeoutDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onStay();
      }}
    >
      <DialogContent className="sm:max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="mb-1 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
            </div>
            <DialogTitle>Session expiring soon</DialogTitle>
          </div>
          <DialogDescription>
            Your session will expire in{" "}
            <span className="font-semibold text-foreground tabular-nums">{formatCountdown(secondsLeft)}</span> due to
            inactivity. Do you want to stay logged in?
          </DialogDescription>
        </DialogHeader>

        {/* Countdown progress bar */}
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-amber-500 transition-all duration-1000 ease-linear"
            style={{ width: `${Math.min(100, (secondsLeft / 120) * 100)}%` }}
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={onLogout}>
            <LogOut className="mr-1.5 h-4 w-4" />
            Log out
          </Button>
          <Button size="sm" onClick={onStay}>
            Stay logged in
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
