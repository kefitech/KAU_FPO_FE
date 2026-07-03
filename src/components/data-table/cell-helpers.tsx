/**
 * Reusable cell renderers for DataTable columns.
 * Change the rendering pattern here to update all tables at once.
 */

import { Badge } from "@/components/ui/badge";

export function TextCell({
  value,
  muted,
  maxWidth = "max-w-[200px]",
  mono,
}: {
  value?: string | null;
  muted?: boolean;
  maxWidth?: string;
  mono?: boolean;
}) {
  return (
    <span
      className={`block truncate ${maxWidth} ${muted ? "text-muted-foreground text-sm" : ""} ${mono ? "font-mono text-xs" : ""}`}
      title={value ?? undefined}
    >
      {value || "—"}
    </span>
  );
}

export function CodeCell({ value }: { value: string }) {
  return (
    <code className="block truncate rounded bg-muted px-1.5 py-0.5 font-mono text-xs" title={value}>
      {value}
    </code>
  );
}

export function StatusBadge({
  active,
  labelActive,
  labelInactive,
}: {
  active: boolean;
  labelActive: string;
  labelInactive: string;
}) {
  return active ? (
    <Badge variant="outline" className="border-border text-[11px] text-foreground">
      {labelActive}
    </Badge>
  ) : (
    <Badge variant="outline" className="border-muted text-[11px] text-muted-foreground">
      {labelInactive}
    </Badge>
  );
}
