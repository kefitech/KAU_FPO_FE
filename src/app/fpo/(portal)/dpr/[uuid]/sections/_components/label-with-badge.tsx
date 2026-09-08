"use client";

/**
 * LabelWithBadge — a Label + FieldSourceBadge combo for wizard fields whose
 * provenance the user should be able to see at a glance.
 *
 * Per KAU pre-UAT reply §7.3 (2026-09-08): badges must be enabled by default
 * beside technical assumptions, production/cost estimates, revenue projections,
 * scheme-related inputs, risk assessments, and AI-generated narrative content.
 *
 * The badge stays invisible for `user_entered` (the common case), so this
 * component is a safe drop-in replacement for `<Label>` — it only lights up
 * when the field was AI-inferred, system-defaulted, or user-overridden.
 */

import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";

import { FieldSourceBadge } from "./field-source-badge";
import { useFieldSource } from "@/hooks/use-field-source";

interface LabelWithBadgeProps {
  uuid: string;
  section: string;
  field: string;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}

export function LabelWithBadge({
  uuid,
  section,
  field,
  children,
  className,
  htmlFor,
}: LabelWithBadgeProps) {
  const source = useFieldSource(uuid, section, field);
  return (
    <div className="inline-flex items-center gap-1.5">
      <Label className={className} htmlFor={htmlFor}>
        {children}
      </Label>
      <FieldSourceBadge source={source} />
    </div>
  );
}
