"use client";

import { useEffect, useMemo, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckSquare, Columns3, Search, UploadCloud, UserPlus, X } from "lucide-react";
import { toast } from "sonner";

import { fpoTeamApi } from "@/app/fpo/_api/team";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { RowActions } from "@/components/data-table/row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { translationsApi } from "@/lib/api/translations";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAuthStore } from "@/stores/auth-store";
import { useConfirmStore } from "@/stores/confirm-store";
import { useLocaleStore } from "@/stores/locale-store";
import type { FpoTeamMember } from "@/types/fpo";

type T = Record<string, string>;

// Same table look as the admin data tables (components/data-table/data-table.tsx)
const HEAD_CLASS = "text-xs font-semibold uppercase tracking-wider text-slate-300";
const stripe = (i: number) => (i % 2 === 1 ? "bg-slate-50 dark:bg-slate-900/40" : "bg-white dark:bg-background");

import { BulkInviteDialog } from "./_components/bulk-invite-dialog";
import { BulkPermissionsDialog } from "./_components/bulk-permissions-dialog";
import { InviteDialog } from "./_components/invite-dialog";
import { PermissionsDialog } from "./_components/permissions-dialog";

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

// ── Optional/toggleable columns ───────────────────────────────────────────
// "name" and "status" are always shown, so they're not part of this list.
// Visibility is controlled entirely by the dropdown now (no responsive
// hidden/table-cell classes) — on small screens the table scrolls
// horizontally instead of auto-hiding columns.
const TOGGLEABLE_COLUMNS = [
  { key: "email", label: "Email", tKey: "col_email" },
  { key: "phone", label: "Phone", tKey: "col_phone" },
  { key: "role", label: "Role", tKey: "col_role" },
  { key: "joined", label: "Joined", tKey: "col_joined" },
  ] as const;

type ColumnKey = (typeof TOGGLEABLE_COLUMNS)[number]["key"];

const DEFAULT_VISIBLE_COLUMNS: Record<ColumnKey, boolean> = {
  email: true,
  phone: true,
  role: true,
  joined: true,
};

export default function FpoTeamPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isPrimary = user?.role !== "secondary";
  const confirm = useConfirmStore((s) => s.confirm);
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});

  useEffect(() => {
    translationsApi
      .getPublic(locale, "fpo_team,common")
      .then((data) => setT(data.fpo_team ?? {}))
      .catch(() => undefined);
  }, [locale]);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [bulkInviteOpen, setBulkInviteOpen] = useState(false);
  const [permissionsMember, setPermissionsMember] = useState<FpoTeamMember | null>(null);
  const [bulkPermissionsOpen, setBulkPermissionsOpen] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>(DEFAULT_VISIBLE_COLUMNS);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  function toggleColumn(key: ColumnKey) {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["fpo-team"],
    queryFn: fpoTeamApi.list,
    staleTime: 30_000,
  });

  // Labels for the Permissions column (primary only — they manage permissions)
  const { data: permissionOptions = [] } = useQuery({
    queryKey: ["fpo-team-available-permissions", locale],
    queryFn: fpoTeamApi.availablePermissions,
    enabled: isPrimary,
    staleTime: 5 * 60 * 1000,
  });
  const permissionLabel = (code: string) => permissionOptions.find((p) => p.code === code)?.label ?? code;

  // Memoised so the bulk dialog doesn't reset its state on every render
  const selectedMembers = useMemo(() => members.filter((m) => selected.has(m.id)), [members, selected]);

  // ── Search filtering ────────────────────────────────────────────────────
  // Matches against name, email, phone, and role only (status excluded).
  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      const haystack = [fullName(m), m.email, m.phone ?? "", formatDate(m.joined_at)]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [members, searchQuery]);

  // ── Pagination (client-side — the whole team is loaded at once) ─────────
  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / pageSize));
  const currentPage = Math.min(page, totalPages); // stay in range when the list shrinks
  const pagedMembers = filteredMembers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // ── Selection helpers ──────────────────────────────────────────────────────
  // "Select all" covers the rows on the current page; picks on other pages are kept.
  const pageIds = pagedMembers.map((m) => m.id);
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0;

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of pageIds) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
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
      toast.success(t.toast_deactivated ?? "Member deactivated");
      queryClient.invalidateQueries({ queryKey: ["fpo-team"] });
    },
    onError: () => toast.error(t.toast_deactivate_failed ?? "Failed to deactivate member"),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (id: number) => fpoTeamApi.resetPassword(id),
    onSuccess: () => toast.success(t.toast_password_reset ?? "Temporary password sent to member's email"),
    onError: (error: unknown) =>
      toast.error(getErrorMessage(error, t.toast_password_reset_failed ?? "Failed to reset password")),
  });

  const bulkActivateMutation = useMutation({
    mutationFn: () => fpoTeamApi.bulkActivate([...selected]),
    onSuccess: (data) => {
      const { success, failed, errors } = data;
 
      if (success > 0 && failed === 0) {
        toast.success(`${success} member(s) Activated`);
      } else if (success > 0 && failed > 0) {
        toast.warning(`${success} Activated, ${failed} failed`);
        errors.forEach((e) => toast.error(`${e.name ?? `User ${e.user_id}`}: ${e.reason}`));
      } else {
        errors.forEach((e) => toast.error(`${e.name ?? `User ${e.user_id}`}: ${e.reason}`));
      }
 
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

  const visibleColumnCount = TOGGLEABLE_COLUMNS.filter((c) => visibleColumns[c.key]).length;
  const isSearching = searchQuery.trim().length > 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 px-3 sm:px-6 py-4 sm:py-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-bold text-2xl">{t.page_title ?? "Team Members"}</h1>
          <p className="mt-0.5 text-muted-foreground text-sm">
            {isLoading
              ? "Loading…"
              : isSearching
                ? `${filteredMembers.length} / ${members.length} ${t.team_memebers ?? "members"}`
                : `${members.length} ${t.team_memebers ?? "members"}`}
          </p>
        </div>

        <div className="flex gap-2 self-start sm:self-auto">
          {isPrimary && (
            <>
              <Button variant="outline" size="sm" onClick={() => setBulkInviteOpen(true)}>
                <UploadCloud className="mr-1.5 h-4 w-4" />
                {t.btn_bulk_invite ?? "Bulk Invite"}
              </Button>
              <Button size="sm" onClick={() => setInviteOpen(true)}>
                <UserPlus className="mr-1.5 h-4 w-4" />
                {t.btn_invite ?? "Invite Member"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Search box + column visibility, pinned to the container's edges */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder={t.search_placehldr ?? "Search by name, email, phone, or role…"}
            className="pl-8 pr-8"
          />
          {isSearching && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Columns3 className="mr-1.5 h-4 w-4" />
              {t.col_header ?? "Columns"}
              {visibleColumnCount < TOGGLEABLE_COLUMNS.length && (
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5">
                  {visibleColumnCount}/{TOGGLEABLE_COLUMNS.length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel>{t.col_toggle_columns ?? "Toggle columns"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {TOGGLEABLE_COLUMNS.map((col) => (
              <DropdownMenuCheckboxItem
                key={col.key}
                checked={visibleColumns[col.key]}
                onCheckedChange={() => toggleColumn(col.key)}
                onSelect={(e) => e.preventDefault()}
              >
                {t[col.tKey] ?? col.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Bulk action bar */}
      {isPrimary && someSelected && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/50 px-4 py-2.5">
          <CheckSquare className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" disabled={isBulkPending} onClick={() => setBulkPermissionsOpen(true)}>
              {t.btn_bulk_permissions ?? "Permissions"}
            </Button>
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
      <div className="relative overflow-x-auto border border-border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-slate-700 bg-slate-800 hover:bg-slate-800 dark:border-slate-700 dark:bg-slate-900">
              {isPrimary && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Select all"
                    className="border-slate-400"
                  />
                </TableHead>
              )}
              <TableHead className={HEAD_CLASS}>{t.col_name ?? "Name"}</TableHead>
              {visibleColumns.email && <TableHead className={HEAD_CLASS}>{t.col_email ?? "Email"}</TableHead>}
              {visibleColumns.phone && <TableHead className={HEAD_CLASS}>{t.col_phone ?? "Phone"}</TableHead>}
              {visibleColumns.role && <TableHead className={HEAD_CLASS}>{t.col_role ?? "Role"}</TableHead>}
              <TableHead className={HEAD_CLASS}>{t.col_status ?? "Status"}</TableHead>
              {visibleColumns.joined && <TableHead className={HEAD_CLASS}>{t.col_joined ?? "Joined"}</TableHead>}
              {isPrimary && <TableHead className={HEAD_CLASS}>{t.col_permissions ?? "Permissions"}</TableHead>}
              {/* Empty header over the row actions, so the dark header spans the full width */}
              {isPrimary && <TableHead className="w-14" />}
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i} className={stripe(i)}>
                  {isPrimary && (
                    <TableCell>
                      <Skeleton className="h-4 w-4" />
                    </TableCell>
                  )}
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  {visibleColumns.email && (
                    <TableCell>
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                  )}
                  {visibleColumns.phone && (
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  )}
                  {visibleColumns.role && (
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  )}
                  <TableCell>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </TableCell>
                  {visibleColumns.joined && (
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  )}
                  {isPrimary && (
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                  )}
                  {isPrimary && <TableCell />}
                </TableRow>
              ))
            ) : filteredMembers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={2 + visibleColumnCount + (isPrimary ? 3 : 0)}
                  className="py-12 text-center text-muted-foreground text-sm"
                >
                  {isSearching ? (
                    "No members match your search."
                  ) : (
                    <>
                      {t.empty_state ?? "No team members yet."}
                      {isPrimary && ` ${t.empty_state_description ?? 'Use "Invite Member" to add someone.'}`}
                    </>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              pagedMembers.map((member, i) => (
                <TableRow
                  key={member.id}
                  className={[
                    "border-b border-border/50 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/40",
                    selected.has(member.id) ? "bg-violet-50 dark:bg-violet-950/20" : stripe(i),
                  ].join(" ")}
                >
                  {isPrimary && (
                    <TableCell>
                      <Checkbox
                        checked={selected.has(member.id)}
                        onCheckedChange={() => toggleOne(member.id)}
                        aria-label={`Select ${fullName(member)}`}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-medium">
                    <div>{fullName(member)}</div>
                    <div className="mt-0.5 capitalize text-muted-foreground text-xs md:hidden">
                      {member.role.replace(/_/g, " ")}
                    </div>
                  </TableCell>
                  {visibleColumns.email && (
                    <TableCell className="text-muted-foreground">{member.email}</TableCell>
                  )}
                  {visibleColumns.phone && (
                    <TableCell className="text-muted-foreground">{member.phone || "—"}</TableCell>
                  )}
                  {visibleColumns.role && (
                    <TableCell className="capitalize text-muted-foreground">
                      {member.role.replace(/_/g, " ")}
                    </TableCell>
                  )}
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        member.is_active
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {member.is_active ? (t.badge_active ?? "Active") : (t.badge_inactive ?? "Inactive")}
                    </Badge>
                  </TableCell>
                  {visibleColumns.joined && (
                    <TableCell className="text-muted-foreground">{formatDate(member.joined_at)}</TableCell>
                  )}
                  {isPrimary && (
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => setPermissionsMember(member)}
                        title={(member.permissions ?? []).map(permissionLabel).join("\n") || undefined}
                        className="text-left text-sm hover:underline"
                      >
                        {member.permissions?.length
                          ? (t.permissions_count ?? "{count} of {total}")
                              .replace("{count}", String(member.permissions.length))
                              .replace("{total}", String(permissionOptions.length || member.permissions.length))
                          : (t.permissions_none_short ?? "None")}
                      </button>
                    </TableCell>
                  )}
                  {isPrimary && (
                    <TableCell className="text-right">
                      <RowActions
                        actions={[
                          {
                            label: t.action_permissions ?? "Permissions",
                            onClick: () => setPermissionsMember(member),
                          },
                          {
                            separator: true,
                            label: member.is_active
                              ? (t.action_deactivate ?? "Deactivate")
                              : (t.action_reactivate ?? "Activate"),
                            onClick: () => {
                              if (member.is_active) {
                                deactivateMutation.mutate(member.id);
                              } else {
                                fpoTeamApi
                                  .bulkActivate([member.id])
                                  .then((data) => {
                                    if (data.success > 0) {
                                      toast.success(t.toast_activated ?? "Member reactivated");
                                    } else {
                                      const err = data.errors[0];
                                      toast.error(err ? `${err.name ?? "Member"}: ${err.reason}` : (t.toast_activate_failed ?? "Failed to reactivate"));
                                    }
                                    queryClient.invalidateQueries({ queryKey: ["fpo-team"] });
                                  })
                                  .catch(() => toast.error(t.toast_activate_failed ?? "Failed to reactivate"));
                              }
                            },
                            disabled: deactivateMutation.isPending,
                            destructive: member.is_active,
                          },
                          {
                            label: t.action_reset_password ?? "Reset Password",
                            separator: true,
                            onClick: () =>
                              confirm({
                                title: t.reset_password_title ?? "Reset Password",
                                description: (
                                  t.reset_password_description ??
                                  "A temporary password will be sent to {name}'s email. They must change it on next login."
                                ).replace("{name}", member.email),
                                onConfirm: () => resetPasswordMutation.mutateAsync(member.id),
                                confirmLabel: t.action_reset_password ?? "Reset Password",
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

      {filteredMembers.length > 0 && (
        <DataTablePagination
          page={currentPage}
          pageSize={pageSize}
          total={filteredMembers.length}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          isLoading={isLoading}
        />
      )}

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
      <BulkInviteDialog open={bulkInviteOpen} onOpenChange={setBulkInviteOpen} />
      <PermissionsDialog member={permissionsMember} onOpenChange={(open) => !open && setPermissionsMember(null)} t={t} />
      <BulkPermissionsDialog
        open={bulkPermissionsOpen}
        onOpenChange={setBulkPermissionsOpen}
        members={selectedMembers}
        onDone={() => setSelected(new Set())}
        t={t}
      />
    </div>
  );
}