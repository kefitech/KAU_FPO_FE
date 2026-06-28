"use client";

import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckSquare, UploadCloud, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { fpoTeamApi } from "@/app/fpo/_api/team";
import { RowActions } from "@/components/data-table/row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuthStore } from "@/stores/auth-store";
import { useConfirmStore } from "@/stores/confirm-store";
import type { FpoTeamMember } from "@/types/fpo";

import { BulkInviteDialog } from "./_components/bulk-invite-dialog";
import { InviteDialog } from "./_components/invite-dialog";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fullName(m: FpoTeamMember) {
  return `${m.first_name} ${m.last_name}`.trim();
}

export default function FpoTeamPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isPrimary = user?.role !== "secondary";
  const confirm = useConfirmStore((s) => s.confirm);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [bulkInviteOpen, setBulkInviteOpen] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["fpo-team"],
    queryFn: fpoTeamApi.list,
    staleTime: 30_000,
  });

  // ── Selection helpers ──────────────────────────────────────────────────────
  const allIds = members.map((m) => m.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(allIds));
  }

  function toggleOne(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // ── Mutations ──────────────────────────────────────────────────────────────
  const deactivateMutation = useMutation({
    mutationFn: (id: number) => fpoTeamApi.deactivate(id),
    onSuccess: () => {
      toast.success("Member deactivated");
      queryClient.invalidateQueries({ queryKey: ["fpo-team"] });
    },
    onError: () => toast.error("Failed to deactivate member"),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (id: number) => fpoTeamApi.resetPassword(id),
    onSuccess: () => toast.success("Temporary password sent to member's email"),
    onError: () => toast.error("Failed to reset password"),
  });

  const bulkActivateMutation = useMutation({
    mutationFn: () => fpoTeamApi.bulkActivate([...selected]),
    onSuccess: () => {
      toast.success(`${selected.size} member(s) activated`);
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ["fpo-team"] });
    },
    onError: () => toast.error("Bulk activate failed"),
  });

  const bulkDeactivateMutation = useMutation({
    mutationFn: () => fpoTeamApi.bulkDeactivate([...selected]),
    onSuccess: () => {
      toast.success(`${selected.size} member(s) deactivated`);
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ["fpo-team"] });
    },
    onError: () => toast.error("Bulk deactivate failed"),
  });

  const isBulkPending = bulkActivateMutation.isPending || bulkDeactivateMutation.isPending;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-bold text-2xl">Team Members</h1>
          <p className="mt-0.5 text-muted-foreground text-sm">
            {isLoading ? "Loading…" : `${members.length} member${members.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        {isPrimary && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setBulkInviteOpen(true)}>
              <UploadCloud className="mr-1.5 h-4 w-4" />
              Bulk Invite
            </Button>
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus className="mr-1.5 h-4 w-4" />
              Invite Member
            </Button>
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {isPrimary && someSelected && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-2.5">
          <CheckSquare className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" disabled={isBulkPending} onClick={() => bulkActivateMutation.mutate()}>
              {bulkActivateMutation.isPending ? "Activating…" : "Activate"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isBulkPending}
              className="text-destructive hover:text-destructive"
              onClick={() => bulkDeactivateMutation.mutate()}
            >
              {bulkDeactivateMutation.isPending ? "Deactivating…" : "Deactivate"}
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {isPrimary && (
                <TableHead className="w-10">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" />
                </TableHead>
              )}
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="hidden sm:table-cell">Phone</TableHead>
              <TableHead className="hidden md:table-cell">Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Joined</TableHead>
              {isPrimary && <TableHead className="w-28 text-right">Action</TableHead>}
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {isPrimary && (
                    <TableCell>
                      <Skeleton className="h-4 w-4" />
                    </TableCell>
                  )}
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  {isPrimary && <TableCell />}
                </TableRow>
              ))
            ) : members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isPrimary ? 8 : 6} className="py-12 text-center text-muted-foreground text-sm">
                  No team members yet.{isPrimary && ' Use "Invite Member" to add someone.'}
                </TableCell>
              </TableRow>
            ) : (
              members.map((member) => (
                <TableRow key={member.id} className={selected.has(member.id) ? "bg-muted/40" : ""}>
                  {isPrimary && (
                    <TableCell>
                      <Checkbox
                        checked={selected.has(member.id)}
                        onCheckedChange={() => toggleOne(member.id)}
                        aria-label={`Select ${fullName(member)}`}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-medium">{fullName(member)}</TableCell>
                  <TableCell className="text-muted-foreground">{member.email}</TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">{member.phone || "—"}</TableCell>
                  <TableCell className="hidden capitalize text-muted-foreground md:table-cell">
                    {member.role.replace(/_/g, " ")}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        member.is_active
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {member.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {formatDate(member.joined_at)}
                  </TableCell>
                  {isPrimary && (
                    <TableCell className="text-right">
                      <RowActions
                        actions={[
                          {
                            label: member.is_active ? "Deactivate" : "Activate",
                            onClick: () => {
                              if (member.is_active) {
                                deactivateMutation.mutate(member.id);
                              } else {
                                fpoTeamApi
                                  .bulkActivate([member.id])
                                  .then(() => {
                                    toast.success("Member reactivated");
                                    queryClient.invalidateQueries({ queryKey: ["fpo-team"] });
                                  })
                                  .catch(() => toast.error("Failed to reactivate"));
                              }
                            },
                            disabled: deactivateMutation.isPending,
                            destructive: member.is_active,
                          },
                          {
                            label: "Reset Password",
                            separator: true,
                            onClick: () =>
                              confirm({
                                title: "Reset Password",
                                description: `A temporary password will be sent to ${member.email}. They will be required to change it on next login.`,
                                onConfirm: () => resetPasswordMutation.mutateAsync(member.id),
                                confirmLabel: "Reset Password",
                                variant: "default",
                              }),
                            disabled: resetPasswordMutation.isPending,
                          },
                        ]}
                      />
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
      <BulkInviteDialog open={bulkInviteOpen} onOpenChange={setBulkInviteOpen} />
    </div>
  );
}
