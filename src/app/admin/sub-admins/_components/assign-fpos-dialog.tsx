"use client";

import { useEffect, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

import type { ApplicationListItem } from "@/app/admin/_api/applications";
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
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/get-error-message";
import type { AssignedFpo, SubAdmin } from "@/types/admin";

import { FpoSearchSelect } from "./fpo-search-select";

type T = Record<string, string>;

export function AssignFposDialog({
  subAdmin,
  open,
  onOpenChange,
  t = {},
}: {
  subAdmin: SubAdmin | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  t?: T;
}) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<ApplicationListItem | null>(null);
  const subAdminId = subAdmin?.id ?? 0;
  const queryKey = ["sub-admin-fpos", subAdminId];

  useEffect(() => {
    if (!open) setSelected(null);
  }, [open]);

  const { data: assigned = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => subAdminsApi.getAssignedFpos(subAdminId),
    enabled: open && !!subAdmin,
  });

  function onChanged(list: AssignedFpo[]) {
    queryClient.setQueryData(queryKey, list);
    // counts on the sub-admin table and assignee columns on applications
    queryClient.invalidateQueries({ queryKey: ["sub-admins"] });
    queryClient.invalidateQueries({ queryKey: ["applications"] });
    queryClient.invalidateQueries({ queryKey: ["fpo-search-select"] });
  }

  const addMutation = useMutation({
    mutationFn: (fpoId: number) => subAdminsApi.setAssignedFpos(subAdminId, "add", [fpoId]),
    onSuccess: (list) => {
      onChanged(list);
      toast.success(t.toast_fpo_assigned ?? "FPO assigned");
      setSelected(null);
    },
    onError: (err) => toast.error(getErrorMessage(err, t.toast_fpo_assign_failed ?? "Failed to assign FPO")),
  });

  const removeMutation = useMutation({
    mutationFn: (fpoId: number) => subAdminsApi.setAssignedFpos(subAdminId, "remove", [fpoId]),
    onSuccess: (list) => {
      onChanged(list);
      toast.success(t.toast_fpo_unassigned ?? "FPO unassigned");
    },
    onError: (err) => toast.error(getErrorMessage(err, t.toast_fpo_unassign_failed ?? "Failed to unassign FPO")),
  });

  const name = subAdmin ? `${subAdmin.first_name} ${subAdmin.last_name}`.trim() || subAdmin.email : "";
  const isInactive = !!subAdmin && !subAdmin.is_active;
  const movingFrom =
    selected?.assigned_subadmin_name && selected.assigned_subadmin_id !== subAdminId
      ? selected.assigned_subadmin_name
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* sm: prefix needed to override the base sm:max-w-md */}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t.assign_fpos_title ?? "Assign FPOs"}
            {name ? ` — ${name}` : ""}
          </DialogTitle>
          <DialogDescription>
            {t.assign_fpos_description ?? "This sub-admin can only see and manage the FPOs assigned here."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <FpoSearchSelect
                value={selected}
                onChange={setSelected}
                excludeIds={new Set(assigned.map((f) => f.id))}
                currentSubAdminId={subAdminId}
                disabled={isInactive}
                t={t}
              />
            </div>
            <Button
              type="button"
              onClick={() => selected && addMutation.mutate(selected.id)}
              disabled={!selected || isInactive || addMutation.isPending}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              {addMutation.isPending ? (t.assigning ?? "Assigning…") : (t.assign_btn ?? "Assign")}
            </Button>
          </div>
          {isInactive && (
            <p className="text-muted-foreground text-xs">
              {t.assign_fpos_inactive ?? "Activate this sub-admin before assigning FPOs."}
            </p>
          )}
          {movingFrom && (
            <p className="text-amber-600 text-xs dark:text-amber-400">
              {(
                t.assign_fpos_move_warning ?? "Currently assigned to {name}. Assigning will move it to this sub-admin."
              ).replace("{name}", movingFrom)}
            </p>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <p className="font-medium text-sm">
            {t.assigned_fpos_heading ?? "Assigned FPOs"} ({assigned.length})
          </p>
          {isLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : assigned.length === 0 ? (
            <p className="rounded-md border border-dashed py-6 text-center text-muted-foreground text-sm">
              {t.no_assigned_fpos ?? "No FPOs assigned yet."}
            </p>
          ) : (
            <div className="max-h-72 overflow-y-auto rounded-md border">
              <ul className="divide-y">
                {assigned.map((fpo) => (
                  <li key={fpo.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="flex min-w-0 flex-col">
                      <span className="break-words font-medium text-sm">{fpo.name}</span>
                      {fpo.application_id && (
                        <span className="break-all font-mono text-muted-foreground text-xs">{fpo.application_id}</span>
                      )}
                      <span className="text-muted-foreground text-xs">
                        {fpo.district} · {fpo.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label={t.unassign_btn ?? "Unassign"}
                      title={t.unassign_btn ?? "Unassign"}
                      onClick={() => removeMutation.mutate(fpo.id)}
                      disabled={removeMutation.isPending}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t.close_btn ?? "Close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
