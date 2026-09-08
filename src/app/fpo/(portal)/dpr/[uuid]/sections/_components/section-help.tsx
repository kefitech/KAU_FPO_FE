"use client";

/**
 * SectionHelp — reusable per-section help drawer.
 *
 * Renders a small book icon in the section header. Click slides in a
 * right-side sheet explaining what the section is for + what the user
 * needs to fill in. Doesn't block the form the way a centered dialog
 * would — user can glance at the guidance and keep the form context
 * visible on the left.
 *
 * Content lives in the calling section file today (hardcoded strings).
 * If KAU later wants editability during UAT, swap the content prop
 * for a DB-backed hook without changing the component API.
 *
 * Design goals:
 *   - Feels like documentation, not a marketing modal
 *   - Consistent typography + visual hierarchy across all 22 sections
 *   - Lucide icons only (no emoji)
 *   - Numbered checklist for "What to fill" so the user has a clear order
 *   - Tips + downstream visually deprioritised so the essential content leads
 *
 * Usage:
 *   <SectionShell
 *     …
 *     help={
 *       <SectionHelp
 *         title="Project Identification"
 *         purpose="…"
 *         whatToFill={["…", "…"]}
 *         tips={["…"]}
 *         downstream={["…"]}
 *       />
 *     }
 *   >
 *
 * Author: Athul Gopan (Kefi Tech Solutions)
 */

import { useCallback, useEffect, useRef, useState } from "react";

import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Lightbulb,
  Target,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// Resizable-drawer bounds — matched to `ViewSheet` (the /fpo/products
// row-detail drawer) so both drawers feel the same when the user drags
// them wider. Extract to a shared hook if we hit a 3rd occurrence.
const MIN_WIDTH = 320;
const MAX_WIDTH = 800;
const DEFAULT_WIDTH = 480;

export interface SectionHelpProps {
  /** Section name — shown as sheet title */
  title: string;
  /** 1–2 sentence explanation of what this section is for + why it matters */
  purpose: string;
  /** Ordered checklist — the fields the user must fill in + any validation rules */
  whatToFill: string[];
  /** Optional — gotchas, examples, or advice */
  tips?: string[];
  /** Optional — where this section's data ends up (PDF chapters, calc engine, AI narrative etc.) */
  downstream?: string[];
}

export function SectionHelp({
  title,
  purpose,
  whatToFill,
  tips,
  downstream,
}: SectionHelpProps) {
  // Drag-to-resize width — same interaction as ViewSheet. Left-edge handle
  // controls width; dragging left widens the sheet.
  const [open, setOpen] = useState(false);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(DEFAULT_WIDTH);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      startX.current = e.clientX;
      startWidth.current = width;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [width],
  );

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragging.current) return;
      // Sheet opens from the right → dragging left = larger width.
      const delta = startX.current - e.clientX;
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta)));
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

  // Reset width when the drawer closes — so the next open starts at
  // DEFAULT_WIDTH rather than whatever the user last dragged it to.
  useEffect(() => {
    if (!open) setWidth(DEFAULT_WIDTH);
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-muted-foreground hover:bg-primary/5 hover:text-primary"
          title="Section help — what this page is for and what to fill in"
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">Help</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        style={{ width, maxWidth: `min(${MAX_WIDTH}px, 100vw)` }}
        className="flex flex-col gap-0 p-0 overflow-hidden"
      >
        {/* Drag handle on the left edge (desktop only) — matches ViewSheet's
            resize affordance so the two drawers feel consistent. */}
        <div
          onMouseDown={onMouseDown}
          style={{ cursor: "col-resize", position: "absolute", left: 0, top: 0, bottom: 0, width: 6, zIndex: 50 }}
          className="hidden sm:block hover:bg-primary/20 active:bg-primary/30 transition-colors"
        />
        {/* Header band */}
        <SheetHeader className="border-b bg-muted/40 p-5 space-y-1">
          <div className="flex items-center gap-2 pr-8">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <BookOpen className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="truncate text-base font-semibold">
                {title}
              </SheetTitle>
              <SheetDescription className="text-xs">
                Guidance for completing this section
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Scrolling content area */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="space-y-6 text-sm">
            {/* Purpose */}
            <HelpSection icon={Target} label="Purpose">
              <p className="leading-relaxed text-foreground">{purpose}</p>
            </HelpSection>

            {/* Ordered checklist — the primary how-to */}
            <HelpSection icon={CheckCircle2} label="What to fill in" count={whatToFill.length}>
              <ol className="space-y-2.5">
                {whatToFill.map((item, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary tabular-nums">
                      {i + 1}
                    </span>
                    <span className="flex-1 leading-relaxed text-foreground">{item}</span>
                  </li>
                ))}
              </ol>
            </HelpSection>

            {/* Tips — deprioritised */}
            {tips && tips.length > 0 && (
              <HelpSection icon={Lightbulb} label="Tips">
                <ul className="space-y-2">
                  {tips.map((tip, i) => (
                    <li
                      key={i}
                      className="rounded-md border-l-2 border-amber-300 bg-amber-50/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground dark:border-amber-800 dark:bg-amber-950/20"
                    >
                      {tip}
                    </li>
                  ))}
                </ul>
              </HelpSection>
            )}

            {/* Downstream — most deprioritised */}
            {downstream && downstream.length > 0 && (
              <HelpSection icon={ArrowRight} label="Where this data is used">
                <ul className="space-y-1">
                  {downstream.map((d, i) => (
                    <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                      <span className="mt-0.5 text-muted-foreground/60">•</span>
                      <span className="leading-relaxed">{d}</span>
                    </li>
                  ))}
                </ul>
              </HelpSection>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Sub-section wrapper — consistent label + icon treatment ────────────────

function HelpSection({
  icon: Icon,
  label,
  count,
  children,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count?: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-2.5", className)}>
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </h3>
        {typeof count === "number" && (
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground tabular-nums">
            {count}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}
