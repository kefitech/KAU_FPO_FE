"use client";

import { useEffect, useMemo, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { fpoTeamApi } from "@/app/fpo/_api/team";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getErrorMessage } from "@/lib/get-error-message";
import { useLocaleStore } from "@/stores/locale-store";
import type { FpoTeamMember } from "@/types/fpo";

import { NO_PERMISSIONS, PermissionChecklist } from "./permission-checklist";

type T = Record<string, string>;

interface BulkPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The selected team members, with their current `permissions`. */
  members: FpoTeamMember[];
  onDone: () => void;
  t: T;
}

/**
 * Bulk edit, starting from what the selected members have now:
 * ticked = all have it, half-ticked = some have it, empty = none have it.
 * Saving grants every ticked permission and revokes every empty one; half-ticked
 * ones the user didn't touch stay as they are for each member.
 */
export function BulkPermissionsDialog({ open, onOpenChange, members, onDone, t }: BulkPermissionsDialogProps) {
  const queryClient = useQueryClient();
  const locale = useLocaleStore((s) => s.locale);

  const { data: options = NO_PERMISSIONS, isLoading } = useQuery({
    queryKey: ["fpo-team-available-permissions", locale],
    queryFn: fpoTeamApi.availablePermissions,
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  // Starting state from the members' current permissions
  const initial = useMemo(() => {
    const all: string[] = [];
    const some: string[] = [];
    for (const { code } of options) {
      const count = members.filter((m) => m.permissions?.includes(code)).length;
      if (count === members.length && count > 0) all.push(code);
      else if (count > 0) some.push(code);
    }
    return { all, some };
  }, [options, members]);

  const [codes, setCodes] = useState<string[]>([]);
  const [mixed, setMixed] = useState<string[]>([]);

  // Reset whenever the dialog opens (or the permission list arrives)
  useEffect(() => {
    if (!open) return;
    setCodes(initial.all);
    setMixed(initial.some);
  }, [open, initial]);

  function handleChange(next: string[], toggled: string) {
    setCodes(next);
    setMixed((prev) => prev.filter((c) => c !== toggled));
  }

  // Only send what actually changes
  const grant = codes.filter((c) => !initial.all.includes(c));
  const revoke = options
    .map((o) => o.code)
    .filter((c) => !codes.includes(c) && !mixed.includes(c) && (initial.all.includes(c) || initial.some.includes(c)));
  const hasChanges = grant.length > 0 || revoke.length > 0;

  const mutation = useMutation({
    mutationFn: () =>
      fpoTeamApi.bulkPermissions(
        members.map((m) => m.id),
        grant,
        revoke,
      ),
    onSuccess: ({ success, failed, errors }) => {
      if (success > 0) {
        toast.success(
          (t.toast_bulk_permissions_saved ?? "Permissions updated for {count} member(s)").replace(
            "{count}",
            String(success),
          ),
        );
      }
      if (failed > 0) {
        for (const e of errors) {
          const who = e.name ?? (t.member_fallback ?? "User {id}").replace("{id}", String(e.user_id));
          toast.error(`${who}: ${e.reason}`);
        }
      }
      queryClient.invalidateQueries({ queryKey: ["fpo-team"] });
      queryClient.invalidateQueries({ queryKey: ["fpo-team-permissions"] });
      onDone();
      onOpenChange(false);
    },
    onError: (error: unknown) =>
      toast.error(getErrorMessage(error, t.toast_permissions_failed ?? "Failed to update permissions")),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.bulk_permissions_title ?? "Change Permissions"}</DialogTitle>
          <DialogDescription>
            {(
              t.bulk_permissions_description ??
              "Permissions for the {count} selected member(s). A half-ticked box means only some of them have it — leave it to keep it as it is. Untick everything to remove all permissions."
            ).replace("{count}", String(members.length))}
          </DialogDescription>
        </DialogHeader>

        <PermissionChecklist
          options={options}
          value={codes}
          mixed={mixed}
          onChange={handleChange}
          isLoading={isLoading}
          disabled={mutation.isPending}
          t={t}
        />

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t.invite_btn_cancel ?? "Cancel"}
          </Button>
          <Button
            type="button"
            disabled={isLoading || mutation.isPending || !hasChanges}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? (t.btn_saving ?? "Saving…") : (t.btn_save ?? "Save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
