"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import type { FpoMemberPermission } from "@/types/fpo";

type T = Record<string, string>;

/** Stable fallback for query data, so effects that depend on it don't re-run every render. */
export const NO_PERMISSIONS: FpoMemberPermission[] = [];

interface PermissionChecklistProps {
  /** Grantable actions (labels come translated from the API). */
  options: FpoMemberPermission[];
  value: string[];
  /** `toggled` is the code the user just clicked. */
  onChange: (codes: string[], toggled: string) => void;
  /** Codes shown half-ticked (bulk edit: only some selected members have them). */
  mixed?: string[];
  isLoading?: boolean;
  disabled?: boolean;
  t: T;
}

/** Checkbox list of the actions a primary user can grant a team member. */
export function PermissionChecklist({
  options,
  value,
  onChange,
  mixed = [],
  isLoading,
  disabled,
  t,
}: PermissionChecklistProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        {t.permissions_none ?? "No permissions can be granted to team members right now."}
      </p>
    );
  }

  const selected = new Set(value);

  function toggle(code: string, checked: boolean) {
    const next = new Set(selected);
    if (checked) next.add(code);
    else next.delete(code);
    onChange(
      options.map((o) => o.code).filter((c) => next.has(c)),
      code,
    );
  }

  return (
    <div className="flex flex-col divide-y rounded-md border">
      {options.map((option) => (
        <label
          key={option.code}
          htmlFor={`perm-${option.code}`}
          className="flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-muted/40"
        >
          <Checkbox
            id={`perm-${option.code}`}
            checked={mixed.includes(option.code) ? "indeterminate" : selected.has(option.code)}
            onCheckedChange={(checked) => toggle(option.code, checked === true)}
            disabled={disabled}
            className="mt-0.5"
          />
          <span className="flex flex-col gap-0.5">
            <span className="font-medium text-sm">{option.label}</span>
            {option.description && <span className="text-muted-foreground text-xs">{option.description}</span>}
          </span>
        </label>
      ))}
    </div>
  );
}
