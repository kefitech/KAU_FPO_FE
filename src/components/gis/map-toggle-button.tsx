"use client";

import type { ReactNode } from "react";

interface MapToggleButtonProps {
  /** True when the layer this button controls is currently visible; drawn highlighted. */
  active: boolean;
  onClick: () => void;
  title: string;
  /** Vertical position inside the map wrapper, e.g. "top-12". */
  className?: string;
  children: ReactNode;
}

/** Small square on/off button that sits in the map's right-hand control column. */
export function MapToggleButton({ active, onClick, title, className = "", children }: MapToggleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={`absolute right-2 z-[400] flex h-8 w-8 items-center justify-center rounded-md border shadow-sm backdrop-blur-sm ${
        active
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "bg-background/90 text-foreground hover:bg-background"
      } ${className}`}
    >
      {children}
    </button>
  );
}
