"use client";

/**
 * FieldSourceBadge — visual indicator for the provenance of a DPR field value.
 *
 * Per KAU RCD replies C.6 + C.7 (2026-09-02):
 *   C.6 — "AI-derived and system-inferred values shall be clearly identifiable
 *          to the user."
 *   C.7 — "AI-derived and system-inferred values should be editable by the
 *          user. Where a user overrides ... the interface shall continue to
 *          indicate that the value has been user-overridden."
 *
 * Sources match `apps/fpo/services/dpr/field_sources.py`:
 *   user_entered      — user typed / picked. No badge shown (implicit default).
 *   ai_inferred       — populated by an AI pass. Blue badge.
 *   system_default    — populated by a system-computed default. Purple badge.
 *   user_overridden   — was inferred/default, user edited it. Orange badge.
 *
 * Backend supplies the source via `DPRProject.field_sources` — shape
 * `{ section_key: { field_name: source } }`. Consumers read via
 * `useFieldSource(section, field)` hook (or read the map manually if the
 * section already fetched it).
 */

import { Bot, PencilLine, Settings2 } from "lucide-react";

export type FieldSource =
  | "user_entered"
  | "ai_inferred"
  | "system_default"
  | "user_overridden";

interface FieldSourceBadgeProps {
  source: FieldSource | undefined;
  /**
   * When true, show the badge even for `user_entered` (for debugging /
   * exhaustive display). Default false — user_entered is invisible so the
   * UI stays clean.
   */
  showUserEntered?: boolean;
  className?: string;
}

const BADGE_CONFIG: Record<
  Exclude<FieldSource, "user_entered">,
  { label: string; tone: string; Icon: typeof Bot }
> = {
  ai_inferred: {
    label: "AI-inferred",
    tone: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
    Icon: Bot,
  },
  system_default: {
    label: "System default",
    tone: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400",
    Icon: Settings2,
  },
  user_overridden: {
    label: "User-overridden",
    tone: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
    Icon: PencilLine,
  },
};

export function FieldSourceBadge({
  source,
  showUserEntered = false,
  className,
}: FieldSourceBadgeProps) {
  if (!source || source === "user_entered") {
    if (!showUserEntered) return null;
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground ${className ?? ""}`}>
        User-entered
      </span>
    );
  }
  const cfg = BADGE_CONFIG[source];
  if (!cfg) return null;
  const { label, tone, Icon } = cfg;
  return (
    <span
      title={label}
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${tone} ${className ?? ""}`}
    >
      <Icon className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}
