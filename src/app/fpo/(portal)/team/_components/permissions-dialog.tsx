"use client";

import { useEffect, useState } from "react";

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

interface PermissionsDialogProps {
  member: FpoTeamMember | null;
  onOpenChange: (open: boolean) => void;
  t: T;
}

/** Primary user edits what one team member may do (saved as a full replace). */
export function PermissionsDialog({ member, onOpenChange, t }: PermissionsDialogProps) {
  const queryClient = useQueryClient();
  const locale = useLocaleStore((s) => s.locale);
  const [codes, setCodes] = useState<string[]>([]);

  const { data: options = NO_PERMISSIONS, isLoading } = useQuery({
    queryKey: ["fpo-team-permissions", member?.id, locale],
    queryFn: () => fpoTeamApi.getPermissions(member?.id ?? 0), // only runs when `member` is set
    enabled: !!member,
  });

  useEffect(() => {
    setCodes(options.filter((o) => o.is_allowed).map((o) => o.code));
  }, [options]);

  const mutation = useMutation({
    mutationFn: () => fpoTeamApi.setPermissions(member?.id ?? 0, codes),
    onSuccess: (data) => {
      queryClient.setQueryData(["fpo-team-permissions", member?.id, locale], data);
      queryClient.invalidateQueries({ queryKey: ["fpo-team"] });
      toast.success(t.toast_permissions_saved ?? "Permissions updated");
      onOpenChange(false);
    },
    onError: (error: unknown) =>
      toast.error(getErrorMessage(error, t.toast_permissions_failed ?? "Failed to update permissions")),
  });

  const name = member ? `${member.first_name} ${member.last_name}`.trim() || member.email : "";

  return (
    <Dialog open={!!member} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.permissions_dialog_title ?? "Member Permissions"}</DialogTitle>
          <DialogDescription>
            {(
              t.permissions_dialog_description ??
              "Choose what {name} can do. Without a permission they can still view the page but cannot make changes."
            ).replace("{name}", name)}
          </DialogDescription>
        </DialogHeader>

        <PermissionChecklist
          options={options}
          value={codes}
          onChange={setCodes}
          isLoading={isLoading}
          disabled={mutation.isPending}
          t={t}
        />

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t.invite_btn_cancel ?? "Cancel"}
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={isLoading || mutation.isPending}>
            {mutation.isPending ? (t.btn_saving ?? "Saving…") : (t.btn_save ?? "Save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
