"use client";

import { useEffect, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { adminApplicationsApi } from "@/app/admin/_api/applications";
import { subAdminsApi } from "@/app/admin/_api/sub-admins";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/get-error-message";

type T = Record<string, string>;

export interface AssignSubAdminTarget {
  id: number;
  name: string;
  assignedSubAdminId: number | null;
  assignedSubAdminName: string | null;
}

/** Super admin: assign / reassign / unassign the one sub-admin responsible for an FPO. */
export function AssignSubAdminDialog({
  fpo,
  open,
  onOpenChange,
  t = {},
}: {
  fpo: AssignSubAdminTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  t?: T;
}) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState("");

  const currentId = fpo?.assignedSubAdminId ?? null;
  // callers build `fpo` inline, so depend on its value rather than its identity
  useEffect(() => {
    if (open) setSelected(currentId ? String(currentId) : "");
  }, [open, currentId]);

  // sub-admin accounts are few; one page of 100 covers them
  const { data, isLoading } = useQuery({
    queryKey: ["sub-admins", "assign-options"],
    queryFn: () => subAdminsApi.getAll({ page: 1, page_size: 100 }),
    enabled: open,
  });
  const options = (data?.data ?? [])
    .filter((s) => s.is_active)
    .map((s) => ({
      value: String(s.id),
      label: `${`${s.first_name} ${s.last_name}`.trim() || s.email} (${s.email})`,
    }));

  function onChanged() {
    if (!fpo) return;
    queryClient.invalidateQueries({ queryKey: ["applications"] });
    queryClient.invalidateQueries({ queryKey: ["application", fpo.id] });
    queryClient.invalidateQueries({ queryKey: ["sub-admins"] });
    queryClient.invalidateQueries({ queryKey: ["sub-admin-fpos"] });
    onOpenChange(false);
  }

  const assignMutation = useMutation({
    mutationFn: () => adminApplicationsApi.assignSubAdmin(fpo?.id ?? 0, Number(selected)),
    onSuccess: () => {
      toast.success(t.toast_subadmin_assigned ?? "Sub-admin assigned");
      onChanged();
    },
    onError: (err) => toast.error(getErrorMessage(err, t.toast_subadmin_assign_failed ?? "Failed to assign sub-admin")),
  });

  const unassignMutation = useMutation({
    mutationFn: () => adminApplicationsApi.unassignSubAdmin(fpo?.id ?? 0),
    onSuccess: () => {
      toast.success(t.toast_subadmin_unassigned ?? "Sub-admin unassigned");
      onChanged();
    },
    onError: (err) =>
      toast.error(getErrorMessage(err, t.toast_subadmin_unassign_failed ?? "Failed to unassign sub-admin")),
  });

  const busy = assignMutation.isPending || unassignMutation.isPending;
  const current = fpo?.assignedSubAdminId ? String(fpo.assignedSubAdminId) : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t.assign_subadmin_title ?? "Assign Sub-Admin"}</DialogTitle>
          <DialogDescription>
            {fpo?.name ? `${fpo.name} — ` : ""}
            {t.assign_subadmin_description ??
              "Only the assigned sub-admin (and super admins) can see and manage this FPO. Assigning replaces any existing sub-admin."}
          </DialogDescription>
        </DialogHeader>

        <Field>
          <FieldLabel>{t.subadmin_label ?? "Sub-Admin"}</FieldLabel>
          {isLoading ? (
            <Skeleton className="h-9 w-full" />
          ) : (
            // keyed so the input shows the current assignee's label once options have loaded
            <SearchableSelect
              key={`${fpo?.id}-${options.length}`}
              value={selected}
              onChange={setSelected}
              options={options}
              placeholder={t.subadmin_placeholder ?? "Select a sub-admin…"}
              disabled={busy}
            />
          )}
          {fpo?.assignedSubAdminName && (
            <p className="text-muted-foreground text-xs">
              {t.currently_assigned ?? "Currently assigned to"}{" "}
              <span className="font-medium text-foreground">{fpo.assignedSubAdminName}</span>
            </p>
          )}
          {!isLoading && options.length === 0 && (
            <p className="text-muted-foreground text-xs">
              {t.no_active_subadmins ?? "No active sub-admins. Create or activate one first."}
            </p>
          )}
        </Field>

        <DialogFooter className="gap-2 sm:justify-between">
          {current ? (
            <Button
              type="button"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => unassignMutation.mutate()}
              disabled={busy}
            >
              {unassignMutation.isPending ? (t.unassigning ?? "Removing…") : (t.unassign_btn ?? "Unassign")}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              {t.cancel_btn ?? "Cancel"}
            </Button>
            <Button
              type="button"
              onClick={() => assignMutation.mutate()}
              disabled={!selected || selected === current || busy}
            >
              {assignMutation.isPending ? (t.assigning ?? "Assigning…") : (t.assign_btn ?? "Assign")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
