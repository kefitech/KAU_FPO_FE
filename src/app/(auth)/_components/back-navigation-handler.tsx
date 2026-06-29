"use client";
import { useEffect } from "react";

export default function BackNavigationHandler() {
  useEffect(() => {
    const handlePopState = () => {
      // When user presses back from an auth page, force a hard navigation
      // instead of Next.js doing a client-side render — ensures the public
      // route group loads its own CSS/JS fresh.
      window.location.replace(window.location.href);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return null;
}
