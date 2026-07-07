"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ─── Actions ─────────────────────────────────────────────────────────────────

export interface ViewSheetAction {
  label: string;
  icon?: React.ElementType;
  onClick: () => void;
  variant?: "default" | "outline" | "ghost" | "secondary" | "destructive";
  disabled?: boolean;
}

// ─── Field types ──────────────────────────────────────────────────────────────

export type SheetFieldType = "text" | "code" | "status" | "date" | "tags" | "node" | "section";

export interface SheetField {
  label: string;
  type?: SheetFieldType;
  value?: string | number | null;
  active?: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
  tags?: string[];
  node?: React.ReactNode;
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="pt-5 pb-2 first:pt-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
        {label}
      </p>
    </div>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-3 border-b border-border/60 last:border-0">
      <p className="text-[11px] font-medium text-muted-foreground/80 mb-1.5 uppercase tracking-wide">
        {label}
      </p>
      <div className="text-sm text-foreground leading-relaxed break-words">{children}</div>
    </div>
  );
}

// ─── Field renderer ───────────────────────────────────────────────────────────

function renderField(field: SheetField) {
  switch (field.type) {
    case "code":
      return (
        <code className="rounded-md bg-muted px-2 py-1 text-xs font-mono text-foreground/90 break-all">
          {field.value ?? "—"}
        </code>
      );

    case "status":
      return field.active ? (
        <Badge
          variant="outline"
          className="border-emerald-500/30 bg-emerald-500/8 text-emerald-700 dark:text-emerald-400 text-[11px] font-medium px-2.5"
        >
          <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
          {field.activeLabel ?? "Active"}
        </Badge>
      ) : (
        <Badge
          variant="outline"
          className="border-border text-muted-foreground text-[11px] font-medium px-2.5"
        >
          <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground/40 inline-block" />
          {field.inactiveLabel ?? "Inactive"}
        </Badge>
      );

    case "date":
      return field.value ? (
        <span className="tabular-nums">
          {new Date(String(field.value)).toLocaleDateString("en-IN", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      );

    case "tags":
      return field.tags?.length ? (
        <div className="flex flex-wrap gap-1.5 mt-0.5">
          {field.tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="text-[11px] font-mono px-2 py-0.5 rounded-md"
            >
              {tag}
            </Badge>
          ))}
        </div>
      ) : (
        <span className="text-muted-foreground text-sm">—</span>
      );

    case "node":
      return field.node ?? <span className="text-muted-foreground">—</span>;

    default:
      return String(field.value ?? "") || (
        <span className="text-muted-foreground">—</span>
      );
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

const MIN_WIDTH = 320;
const MAX_WIDTH = 800;
const DEFAULT_WIDTH = 480;

interface ViewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fields: SheetField[];
  actions?: ViewSheetAction[];
}

export function ViewSheet({ open, onOpenChange, title, fields, actions }: ViewSheetProps) {
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
      // sheet opens from the right, so dragging left = bigger width
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

  // reset width when sheet closes
  useEffect(() => {
    if (!open) setWidth(DEFAULT_WIDTH);
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        style={{ width, maxWidth: MAX_WIDTH }}
        className="flex flex-col gap-0 p-0 overflow-hidden"
      >
        {/* Drag handle on the left edge */}
        <div
          onMouseDown={onMouseDown}
          style={{ cursor: "col-resize", position: "absolute", left: 0, top: 0, bottom: 0, width: 6, zIndex: 50 }}
          className="hover:bg-primary/20 active:bg-primary/30 transition-colors"
        />

        {/* Header */}
        <SheetHeader className="px-6 py-5 border-b bg-muted/20">
          <SheetTitle
            className="text-base font-semibold tracking-tight"
            dangerouslySetInnerHTML={{ __html: title }}
          />
        </SheetHeader>

        {/* Scrollable body */}
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Action bar */}
          {actions && actions.length > 0 && (
            <div className="px-6 py-3.5 border-b bg-background flex flex-wrap gap-2">
              {actions.map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.label}
                    size="sm"
                    variant={action.variant ?? "outline"}
                    onClick={action.onClick}
                    disabled={action.disabled}
                    className="h-8 text-sm"
                  >
                    {Icon && <Icon className="mr-1.5 h-3.5 w-3.5" />}
                    {action.label}
                  </Button>
                );
              })}
            </div>
          )}

          {/* Fields */}
          <div className="px-6 pb-8">
            {fields.map((field, i) =>
              field.type === "section" ? (
                <SectionDivider key={i} label={field.label} />
              ) : (
                <DetailRow key={i} label={field.label}>
                  {renderField(field)}
                </DetailRow>
              )
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
