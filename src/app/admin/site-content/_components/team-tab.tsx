"use client";

import { useEffect, useRef, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, MoreHorizontal, Pencil, Plus, RefreshCw, Trash2, UserRound, X } from "lucide-react";
import { toast } from "sonner";

import { teamApi } from "@/app/admin/_api/team";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useConfirmStore } from "@/stores/confirm-store";
import type { AdminTeamMember } from "@/types/admin";

type T = Record<string, string>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function MemberAvatar({
  photo_url,
  name,
  size = "lg",
}: {
  photo_url: string | null;
  name: string;
  size?: "sm" | "lg";
}) {
  const dim = size === "lg" ? "h-20 w-20" : "h-14 w-14";
  const text = size === "lg" ? "text-xl" : "text-base";
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  if (photo_url) {
    return <img src={photo_url} alt={name} className={`${dim} rounded-full object-cover ring-2 ring-border`} />;
  }
  return (
    <div className={`${dim} rounded-full bg-muted flex items-center justify-center ring-2 ring-border`}>
      <span className={`${text} font-semibold text-muted-foreground`}>{initials || "?"}</span>
    </div>
  );
}

// ─── Team Dialog ──────────────────────────────────────────────────────────────

function TeamDialog({
  open,
  onOpenChange,
  editing,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: AdminTeamMember | null;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [designation, setDesignation] = useState("");
  const [order, setOrder] = useState(1);
  const [photo, setPhoto] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setPhoto(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (editing) {
      setName(editing.name);
      setDesignation(editing.designation ?? "");
      setOrder(editing.order);
    } else {
      setName("");
      setDesignation("");
      setOrder(1);
    }
  }, [open, editing]);

  const mutation = useMutation({
    mutationFn: () => {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("designation", designation.trim());
      formData.append("order", String(order));
      formData.append("is_active", "true");
      if (photo) formData.append("photo", photo);
      return editing ? teamApi.update(editing.id, formData) : teamApi.create(formData);
    },
    onSuccess: () => {
      toast.success(editing ? "Member updated." : "Member added.");
      onSuccess();
      onOpenChange(false);
    },
    onError: () => toast.error("Failed to save member."),
  });

  const canSubmit = !!name.trim() && !!designation.trim() && (editing ? true : !!photo);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Member" : "Add Team Member"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Photo */}
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium">Photo {!editing && <span className="text-destructive">*</span>}</p>

            {/* Existing photo (edit, no replacement yet) */}
            {editing && !photo && (
              <div className="flex items-center gap-3 rounded-md border bg-muted/40 p-2">
                <MemberAvatar photo_url={editing.photo_url} name={editing.name} size="sm" />
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <span className="text-xs text-muted-foreground">
                    {editing.photo_url ? "Current photo" : "No photo set"}
                  </span>
                  <label className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer w-fit">
                    {editing.photo_url ? "Replace" : "Upload photo"}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Newly selected photo */}
            {photo && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-3 rounded-md border bg-muted/40 p-2">
                  <img
                    src={URL.createObjectURL(photo)}
                    alt="preview"
                    className="h-14 w-14 rounded-full object-cover shrink-0"
                  />
                  <div className="flex flex-col gap-1 w-0 flex-1">
                    <span className="text-sm text-foreground truncate">{photo.name}</span>
                    <span className="text-xs text-muted-foreground">{formatFileSize(photo.size)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPhoto(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  >
                    {editing ? <span className="text-xs">Cancel</span> : <X className="h-4 w-4" />}
                  </button>
                </div>
                {editing && (
                  <p className="text-xs text-muted-foreground">
                    This will replace the existing photo. Click Cancel to keep the original.
                  </p>
                )}
              </div>
            )}

            {/* File picker (add mode only) */}
            {!editing && !photo && (
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              />
            )}
            <p className="text-xs text-muted-foreground">JPG, PNG or WebP — square crop recommended</p>
          </div>

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="member-name" className="text-sm font-medium">
              Name <span className="text-destructive">*</span>
            </label>
            <Input
              id="member-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              maxLength={20}
            />
          </div>

          {/* Designation */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="member-designation" className="text-sm font-medium">
              Designation <span className="text-destructive">*</span>
            </label>
            <Input
              id="member-designation"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="e.g. Vice Chancellor, KAU"
              maxLength={50}
            />
          </div>

          {/* Order */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="member-order" className="text-sm font-medium">
              Display Order
            </label>
            <Input
              id="member-order"
              type="number-order"
              min={1}
              value={order}
              onChange={(e) => setOrder(Number(e.target.value))}
              className="w-28"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!canSubmit || mutation.isPending}>
            {mutation.isPending ? "Saving…" : editing ? "Save Changes" : "Add Member"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Team Tab ─────────────────────────────────────────────────────────────────

export function TeamTab({ t = {} }: { t?: T }) {
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminTeamMember | null>(null);

  const {
    data: members = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["admin-team"],
    queryFn: teamApi.getAll,
    staleTime: 30_000,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      active ? teamApi.activate(id) : teamApi.deactivate(id),
    onSuccess: () => {
      toast.success(t.toast_member_updated ?? "Member updated.");
      queryClient.invalidateQueries({ queryKey: ["admin-team"] });
    },
    onError: () => toast.error(t.toast_member_update_failed ?? "Failed to update member."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => teamApi.remove(id),
    onSuccess: () => {
      toast.success(t.toast_member_deleted ?? "Member deleted.");
      queryClient.invalidateQueries({ queryKey: ["admin-team"] });
    },
    onError: () => toast.error(t.toast_member_delete_failed ?? "Failed to delete member."),
  });

  function handleDelete(member: AdminTeamMember) {
    confirm({
      title: t.member_delete_title ?? "Delete Team Member",
      description: (
        t.member_delete_description ?? 'Are you sure you want to delete "{name}"? This cannot be undone.'
      ).replace("{name}", member.name),
      onConfirm: () => deleteMutation.mutateAsync(member.id),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{t.team_section_title ?? "Team"}</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            {t.btn_add_member ?? "Add Member"}
          </Button>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
            <div key={i} className="flex flex-col items-center gap-2 rounded-lg border p-4">
              <Skeleton className="h-20 w-20 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border py-16 text-muted-foreground">
          <UserRound className="h-8 w-8 opacity-40" />
          <p className="text-sm">No team members added yet.</p>
        </div>
      ) : (
        <div
          className={`grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 transition-opacity ${isFetching ? "opacity-60" : ""}`}
        >
          {members.map((member) => (
            <div
              key={member.id}
              className={`group relative flex flex-col items-center gap-3 rounded-lg border p-4 transition-shadow hover:shadow-md ${!member.is_active ? "opacity-60 grayscale" : ""}`}
            >
              {/* Photo / initials avatar */}
              <div className="relative">
                <MemberAvatar photo_url={member.photo_url} name={member.name} size="lg" />
                <span
                  className={`absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full ring-2 ring-background ${
                    member.is_active ? "bg-green-500" : "bg-muted-foreground"
                  }`}
                />
              </div>

              {/* Info */}
              <div className="flex flex-col items-center gap-0.5 text-center w-full min-w-0">
                <p className="text-sm font-medium leading-snug truncate w-full text-center">{member.name}</p>
                {member.designation && (
                  <p className="text-xs text-muted-foreground truncate w-full text-center">{member.designation}</p>
                )}
                <Badge
                  variant="secondary"
                  className={`mt-1 text-xs ${
                    member.is_active
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {member.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>

              {/* Actions */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="sm" className="h-7 w-7 p-0 shadow">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setEditing(member);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => toggleMutation.mutate({ id: member.id, active: !member.is_active })}
                    >
                      {member.is_active ? (
                        <>
                          <EyeOff className="mr-2 h-4 w-4" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <Eye className="mr-2 h-4 w-4" />
                          Activate
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(member)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      <TeamDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["admin-team"] })}
      />
    </div>
  );
}
