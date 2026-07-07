"use client";

import { useEffect, useRef, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ExternalLink,
  Eye,
  EyeOff,
  ImageIcon,
  Link2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { quickLinksApi } from "@/app/admin/_api/quick-links";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useConfirmStore } from "@/stores/confirm-store";
import type { AdminQuickLink } from "@/types/admin";

type T = Record<string, string>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function LogoThumb({ logo_url, name }: { logo_url: string | null; name: string }) {
  if (logo_url) {
    return <img src={logo_url} alt={name} className="h-8 w-8 rounded object-contain bg-muted" />;
  }
  return (
    <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
      <Link2 className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}

// ─── Link Validation ────────────────────────────────────────────────────────

const urlSchema = z
  .string()
  .trim()
  .min(1, "URL is required")
  .refine(
    (value) => {
      try {
        const parsed = new URL(value);
        return ["http:", "https:"].includes(parsed.protocol);
      } catch {
        return false;
      }
    },
    { message: "URL must start with http:// or https://" },
  );

// ─── Quick Link Dialog ────────────────────────────────────────────────────────

function QuickLinkDialog({
  open,
  onOpenChange,
  editing,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: AdminQuickLink | null;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setLogo(null);
    setUrlError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (editing) {
      setName(editing.name);
      setUrl(editing.url);
    } else {
      setName("");
      setUrl("");
    }
  }, [open, editing]);

  const validateUrl = (value: string) => {
    const result = urlSchema.safeParse(value);
    return result.success ? null : result.error.issues[0].message;
  };

  const mutation = useMutation({
    mutationFn: () => {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("url", url.trim());
      formData.append("is_active", "true");
      if (logo) formData.append("logo", logo);
      return editing ? quickLinksApi.update(editing.id, formData) : quickLinksApi.create(formData);
    },
    onSuccess: () => {
      toast.success(editing ? "Quick link updated." : "Quick link added.");
      onSuccess();
      onOpenChange(false);
    },
    onError: () => toast.error("Failed to save quick link."),
  });

  const handleSubmit = () => {
    const error = validateUrl(url);
    if (error) {
      setUrlError(error);
      return;
    }
    mutation.mutate();
  };

  const hasLogo = !!logo || !!(editing && editing.logo_url);
  const canSubmit = !!name.trim() && !!url.trim() && !urlError && hasLogo;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Quick Link" : "Add Quick Link"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium">
              Name <span className="text-destructive">*</span>
            </p>
            <Input
              id="quick-link-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kerala Agricultural University"
            />
          </div>

          {/* URL */}
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium">
              URL <span className="text-destructive">*</span>
            </p>
            <Input
              id="quick-link-url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (urlError) setUrlError(null);
              }}
              onBlur={() => setUrlError(validateUrl(url))}
              placeholder="https://example.com"
              type="url"
              aria-invalid={!!urlError}
              className={urlError ? "border-destructive focus-visible:ring-destructive/20" : ""}
            />
            {urlError && <p className="text-xs text-destructive">{urlError}</p>}
          </div>

          {/* Logo */}
          <div className="flex flex-col gap-1.5">
            <p className="font-medium text-sm">
              Logo <span className="text-destructive">*</span>
            </p>

            {/* Existing logo (edit, no replacement yet) */}
            {editing && !logo && (
              <div className="flex items-center gap-3 rounded-md border bg-muted/40 p-2">
                {editing.logo_url ? (
                  <img
                    src={editing.logo_url}
                    alt="logo"
                    className="h-10 w-10 rounded object-contain bg-muted shrink-0"
                  />
                ) : (
                  <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <span className="text-xs text-muted-foreground">
                    {editing.logo_url ? "Current logo" : "No logo set"}
                  </span>
                  <label className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer w-fit">
                    {editing.logo_url ? "Replace" : "Upload logo"}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={(e) => setLogo(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Newly selected logo */}
            {logo && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-3 rounded-md border bg-muted/40 p-2">
                  <img
                    src={URL.createObjectURL(logo)}
                    alt="preview"
                    className="h-10 w-10 rounded object-contain bg-muted shrink-0"
                  />
                  <div className="flex flex-col gap-1 w-0 flex-1">
                    <span className="text-sm text-foreground truncate">{logo.name}</span>
                    <span className="text-xs text-muted-foreground">{formatFileSize(logo.size)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setLogo(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  >
                    {editing ? <span className="text-xs">Cancel</span> : <X className="h-4 w-4" />}
                  </button>
                </div>
                {editing && (
                  <p className="text-xs text-muted-foreground">
                    This will replace the existing logo. Click Cancel to keep the original.
                  </p>
                )}
              </div>
            )}

            {/* File picker (add mode only) */}
            {!editing && !logo && (
              <Input
                id="quick-link-logo"
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                onChange={(e) => setLogo(e.target.files?.[0] ?? null)}
              />
            )}
            <p className="text-xs text-muted-foreground">JPG, PNG, WebP or SVG</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || mutation.isPending}>
            {mutation.isPending ? "Saving…" : editing ? "Save Changes" : "Add Link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Quick Links Tab ──────────────────────────────────────────────────────────

export function QuickLinksTab({ t = {} }: { t?: T }) {
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminQuickLink | null>(null);

  const {
    data: links = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["admin-quick-links"],
    queryFn: quickLinksApi.getAll,
    staleTime: 30_000,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      active ? quickLinksApi.activate(id) : quickLinksApi.deactivate(id),
    onSuccess: () => {
      toast.success(t.toast_link_updated ?? "Quick link updated.");
      queryClient.invalidateQueries({ queryKey: ["admin-quick-links"] });
    },
    onError: () => toast.error(t.toast_link_update_failed ?? "Failed to update quick link."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => quickLinksApi.remove(id),
    onSuccess: () => {
      toast.success(t.toast_link_deleted ?? "Quick link deleted.");
      queryClient.invalidateQueries({ queryKey: ["admin-quick-links"] });
    },
    onError: () => toast.error(t.toast_link_delete_failed ?? "Failed to delete quick link."),
  });

  function handleDelete(link: AdminQuickLink) {
    confirm({
      title: t.link_delete_title ?? "Delete Quick Link",
      description: (
        t.link_delete_description ?? 'Are you sure you want to delete "{name}"? This cannot be undone.'
      ).replace("{name}", link.name),
      onConfirm: () => deleteMutation.mutateAsync(link.id),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{t.links_section_title ?? "Quick Links"}</h2>
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
            {t.btn_add_link ?? "Add Link"}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className={`rounded-lg border transition-opacity ${isFetching && !isLoading ? "opacity-60" : ""}`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Name</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : links.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-muted-foreground text-sm">
                  No quick links added yet.
                </TableCell>
              </TableRow>
            ) : (
              links.map((link) => (
                <TableRow key={link.id} className={!link.is_active ? "opacity-50" : ""}>
                  <TableCell>
                    <LogoThumb logo_url={link.logo_url} name={link.name} />
                  </TableCell>
                  <TableCell className="font-medium text-sm">{link.name}</TableCell>
                  <TableCell>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors max-w-xs truncate"
                    >
                      {link.url}
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        link.is_active
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {link.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditing(link);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => toggleMutation.mutate({ id: link.id, active: !link.is_active })}
                        >
                          {link.is_active ? (
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
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(link)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <QuickLinkDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["admin-quick-links"] })}
      />
    </div>
  );
}
