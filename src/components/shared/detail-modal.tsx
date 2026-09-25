"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface DetailModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  meta?: React.ReactNode;
  children: React.ReactNode;
}

export function DetailModal({ open, onClose, title, meta, children }: DetailModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    // biome-ignore lint/a11y/useSemanticElements: overlay backdrop can't be a <button> since it wraps other interactive content
    <div
      ref={overlayRef}
      role="button"
      tabIndex={0}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(4,0,11,0.65)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          width: "100%",
          maxWidth: 640,
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          position: "relative",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "none",
            background: "rgba(0,0,0,0.06)",
            color: "#555",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 1,
          }}
        >
          <X className="h-4 w-4" />
        </button>

        {/* Fixed header — title never scrolls */}
        <div style={{ padding: "24px 28px 0", display: "flex", flexDirection: "column", gap: 10 }}>
          {meta}
          <h3
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#1a1a1a",
              lineHeight: 1.4,
              margin: 0,
              wordBreak: "break-word",
              paddingRight: 32,
            }}
          >
            {title}
          </h3>
        </div>

        {/* Scrollable body — capped to roughly 8 lines, then scrolls */}
        <div style={{ padding: "14px 28px 24px", overflowY: "auto", maxHeight: "220px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}