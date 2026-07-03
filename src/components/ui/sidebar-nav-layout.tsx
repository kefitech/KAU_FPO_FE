"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface SidebarNavItem {
  key: string;
  label: string;
  icon: React.ElementType;
}

interface SidebarNavLayoutProps {
  items: SidebarNavItem[];
  activeKey: string;
  onNavigate: (key: string) => void;
  action?: React.ReactNode;
  children: React.ReactNode;
}

const MIN_WIDTH = 140;
const MAX_WIDTH = 320;
const DEFAULT_WIDTH = 208; // w-52

export function SidebarNavLayout({
  items,
  activeKey,
  onNavigate,
  action,
  children,
}: SidebarNavLayoutProps) {
  const activeLabel = items.find((i) => i.key === activeKey)?.label ?? "";
  const [navWidth, setNavWidth] = useState(DEFAULT_WIDTH);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(DEFAULT_WIDTH);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    startX.current = e.clientX;
    startWidth.current = navWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [navWidth]);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragging.current) return;
      const delta = e.clientX - startX.current;
      setNavWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta)));
    }
    function onMouseUp() {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  return (
    <div className="flex gap-0">
      {/* Left nav */}
      <nav style={{ width: navWidth }} className="shrink-0 sticky top-6 self-start">
        <ul className="flex flex-col gap-0.5">
          {items.map(({ key, label, icon: Icon }) => {
            const isActive = activeKey === key;
            return (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => onNavigate(key)}
                  className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    isActive
                      ? "bg-muted text-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground font-normal"
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-foreground" : "text-muted-foreground/70"}`} />
                  <span className="truncate">{label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Right content — drag handle sits in the left padding area */}
      <div className="flex-1 min-w-0 flex flex-col gap-4 relative" style={{ paddingLeft: "2rem" }}>
        {/* Drag handle: absolutely fills the left padding strip */}
        <div
          onMouseDown={onMouseDown}
          title="Drag to resize"
          style={{ cursor: "col-resize", position: "absolute", left: 0, top: 0, bottom: 0, width: 16 }}
          className="hover:bg-border/50 active:bg-primary/20 transition-colors z-10"
        />
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight">{activeLabel}</h2>
          {action}
        </div>
        {children}
      </div>
    </div>
  );
}
