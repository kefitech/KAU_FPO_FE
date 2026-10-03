"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

/**
 * Lets the chat panel be dragged by its header. Position is clamped to the
 * viewport (never let the panel escape off-screen) and persisted in
 * localStorage so a user who parks the widget on one side keeps it there
 * across navigations and reloads.
 *
 * Attach `panelRef` to the panel container, spread `dragHandleProps` on the
 * header (not the whole panel — otherwise text in the body isn't
 * selectable), and merge `positionStyle` into the panel's inline style.
 */

interface Position {
  x: number;
  y: number;
}

interface Options {
  defaultRight?: number;
  defaultBottom?: number;
  panelWidth?: number;
  panelHeight?: number;
}

export function useDraggablePanel(storageKey: string, opts: Options = {}) {
  const { defaultRight = 16, defaultBottom = 16, panelWidth = 400, panelHeight = 600 } = opts;

  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ offsetX: number; offsetY: number; moved: boolean } | null>(null);
  // Flag read by a capturing click handler so the SYNTHETIC click that
  // fires right after a drag-and-release doesn't navigate the page the
  // panel happens to overlap (retest round 2 reported one occurrence of
  // this on CBBO reports).
  const suppressNextClick = useRef(false);
  const [pos, setPos] = useState<Position | null>(null);

  const clamp = useCallback(
    (p: Position): Position => {
      if (typeof window === "undefined") return p;
      const w = panelRef.current?.offsetWidth ?? panelWidth;
      const h = panelRef.current?.offsetHeight ?? panelHeight;
      const maxX = Math.max(0, window.innerWidth - w);
      const maxY = Math.max(0, window.innerHeight - h);
      return {
        x: Math.min(Math.max(0, p.x), maxX),
        y: Math.min(Math.max(0, p.y), maxY),
      };
    },
    [panelWidth, panelHeight],
  );

  // Load persisted position once per mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Position;
      if (typeof parsed?.x === "number" && typeof parsed?.y === "number") {
        setPos(clamp(parsed));
      }
    } catch {
      /* corrupted entry — ignore and fall back to default position */
    }
  }, [storageKey, clamp]);

  // Re-clamp if the window shrinks below the panel's parked position.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setPos((current) => (current ? clamp(current) : current));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clamp]);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    const panel = panelRef.current;
    if (!panel) return;
    // Don't start drags from inner buttons (close / reset).
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, textarea")) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;

    const rect = panel.getBoundingClientRect();
    dragRef.current = {
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      moved: false,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    // Freeze text selection on the whole document for the duration of the
    // drag — otherwise sweeping across the header selects any copy that
    // happens to be behind the panel on the page (retest round 2 noted).
    if (typeof document !== "undefined") {
      document.body.style.userSelect = "none";
    }
    e.preventDefault();
  }, []);

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (!dragRef.current) return;
      dragRef.current.moved = true;
      setPos(
        clamp({
          x: e.clientX - dragRef.current.offsetX,
          y: e.clientY - dragRef.current.offsetY,
        }),
      );
    },
    [clamp],
  );

  const onPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      const target = e.currentTarget as HTMLElement;
      if (target.hasPointerCapture(e.pointerId)) target.releasePointerCapture(e.pointerId);
      const state = dragRef.current;
      dragRef.current = null;
      if (typeof document !== "undefined") {
        document.body.style.userSelect = "";
      }
      if (!state) return;
      // If the user actually dragged (not just a click), swallow the next
      // click that would otherwise fire on whatever element happens to
      // be under the release point.
      if (state.moved) {
        suppressNextClick.current = true;
      }
      setPos((current) => {
        if (current && typeof window !== "undefined") {
          try {
            window.localStorage.setItem(storageKey, JSON.stringify(current));
          } catch {
            /* storage full or disabled — persistence is best-effort */
          }
        }
        return current;
      });
    },
    [storageKey],
  );

  // Global capture-phase click handler — kills the first click after a
  // drag end so the browser's synthetic click doesn't trigger a link under
  // the release point. Resets itself after one event.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onClick = (e: MouseEvent) => {
      if (!suppressNextClick.current) return;
      suppressNextClick.current = false;
      e.stopPropagation();
      e.preventDefault();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  const positionStyle: CSSProperties = pos
    ? { left: pos.x, top: pos.y, right: "auto", bottom: "auto" }
    : { right: defaultRight, bottom: defaultBottom };

  const dragHandleStyle: CSSProperties = {
    cursor: dragRef.current ? "grabbing" : "grab",
    touchAction: "none",
    userSelect: "none",
  };

  return {
    panelRef,
    positionStyle,
    dragHandleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      style: dragHandleStyle,
    },
  };
}
