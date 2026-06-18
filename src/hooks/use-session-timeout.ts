"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { AUTH_CONFIG } from "@/lib/constants/app";

const WARNING_BEFORE_MS = 2 * 60 * 1000; // show warning 2 min before expiry
const ACTIVITY_EVENTS = ["mousedown", "mousemove", "keydown", "touchstart", "scroll"] as const;

interface UseSessionTimeoutOptions {
  onExpire: () => void;
}

export function useSessionTimeout({ onExpire }: UseSessionTimeoutOptions) {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const expiresAt = useRef<number>(Date.now() + AUTH_CONFIG.SESSION_TIMEOUT);
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expireTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    if (warningTimer.current) clearTimeout(warningTimer.current);
    if (expireTimer.current) clearTimeout(expireTimer.current);
    if (countdownInterval.current) clearInterval(countdownInterval.current);
  }, []);

  const scheduleTimers = useCallback(() => {
    clearTimers();
    const now = Date.now();
    expiresAt.current = now + AUTH_CONFIG.SESSION_TIMEOUT;

    const timeUntilWarning = AUTH_CONFIG.SESSION_TIMEOUT - WARNING_BEFORE_MS;

    warningTimer.current = setTimeout(() => {
      setShowWarning(true);
      setSecondsLeft(Math.round(WARNING_BEFORE_MS / 1000));

      countdownInterval.current = setInterval(() => {
        const remaining = Math.max(0, Math.round((expiresAt.current - Date.now()) / 1000));
        setSecondsLeft(remaining);
        if (remaining === 0) {
          if (countdownInterval.current) clearInterval(countdownInterval.current);
        }
      }, 1000);
    }, timeUntilWarning);

    expireTimer.current = setTimeout(() => {
      setShowWarning(false);
      clearTimers();
      onExpire();
    }, AUTH_CONFIG.SESSION_TIMEOUT);
  }, [clearTimers, onExpire]);

  const extendSession = useCallback(() => {
    setShowWarning(false);
    scheduleTimers();
  }, [scheduleTimers]);

  // Reset timer on user activity (throttled — only resets if more than 1 min since last reset)
  useEffect(() => {
    let lastReset = Date.now();

    function handleActivity() {
      if (showWarning) return; // warning is shown — don't silently reset
      const now = Date.now();
      if (now - lastReset > 60_000) {
        lastReset = now;
        scheduleTimers();
      }
    }

    ACTIVITY_EVENTS.forEach((e) => {
      window.addEventListener(e, handleActivity, { passive: true });
    });
    return () => {
      ACTIVITY_EVENTS.forEach((e) => {
        window.removeEventListener(e, handleActivity);
      });
    };
  }, [showWarning, scheduleTimers]);

  // Start on mount
  useEffect(() => {
    scheduleTimers();
    return clearTimers;
  }, [scheduleTimers, clearTimers]);

  return { showWarning, secondsLeft, extendSession };
}
