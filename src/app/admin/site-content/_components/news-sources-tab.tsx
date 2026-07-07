"use client";

import { useEffect, useRef, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ExternalLink,
  Eye,
  EyeOff,
  ImageIcon,
  MoreHorizontal,
  Newspaper,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { newsSourcesApi } from "@/app/admin/_api/news-sources";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useConfirmStore } from "@/stores/confirm-store";
import type { AdminNewsSource } from "@/types/admin";

type T = Record<string, string>;

// ─── Constants ────────────────────────────────────────────────────────────────

export const urlSchema = z
  .string()
  .trim()
  .min(1, "URL is required")
  .refine(
    (value) => {
      try {
        const parsed = new URL(value);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    },
    {
      message: "URL must start with http:// or https://",
    },
  );

const CATEGORIES = [
  { value: "newspaper", label: "Newspaper" },
  { value: "magazine", label: "Magazine" },
  { value: "website", label: "Website" },
  { value: "agriculture", label: "Agriculture" },
  { value: "government", label: "Government" },
  { value: "other", label: "Other" },
] as const;

type CategoryValue = (typeof CATEGORIES)[number]["value"];

function getCategoryLabel(value: string): string {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function LogoThumb({ logo_url, name }: { logo_url: string | null; name: string }) {
  if (logo_url) {
    return <img src={logo_url} alt={name} className="h-8 w-8 rounded bg-muted object-contain" />;
  }
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-muted">
      <Newspaper className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}

// ─── News Source Dialog ───────────────────────────────────────────────────────

function NewsSourceDialog({
  open,
  onOpenChange,
  editing,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: AdminNewsSource | null;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [category, setCategory] = useState<CategoryValue>("newspaper");
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
      setCategory((editing.category as CategoryValue) ?? "newspaper");
    } else {
      setName("");
      setUrl("");
      setCategory("newspaper");
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
      formData.append("category", category);
      formData.append("is_active", "true");
      if (logo) formData.append("logo", logo);
      return editing ? newsSourcesApi.update(editing.id, formData) : newsSourcesApi.create(formData);
    },
    onSuccess: () => {
      toast.success(editing ? "News source updated." : "News source added.");
      onSuccess();
      onOpenChange(false);
    },
    onError: () => toast.error("Failed to save news source."),
  });

  const handleSubmit = () => {
    const error = validateUrl(url);
    if (error) {
      setUrlError(error);
      return;
    }
    mutation.mutate();
  };

  const canSubmit = !!name.trim() && !!url.trim() && !urlError;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit News Source" : "Add News Source"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="news-source-name" className="font-medium text-sm">
              Name <span className="text-destructive">*</span>
            </label>
            <Input
              id="news-source-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mathrubhumi"
            />
          </div>

          {/* URL */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="news-source-url" className="font-medium text-sm">
              URL <span className="text-destructive">*</span>
            </label>
            <Input
              id="news-source-url"
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
            {urlError && <p className="text-destructive text-xs">{urlError}</p>}
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="news-source-category" className="font-medium text-sm">
              Category
            </label>
            <Select value={category} onValueChange={(v) => setCategory(v as CategoryValue)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Logo */}
          <div className="flex flex-col gap-1.5">
            <p className="font-medium text-sm">
              Logo <span className="text-muted-foreground text-xs">(optional)</span>
            </p>

            {/* Existing logo (edit mode, no new file yet) */}
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
                      id="news-source-logo"
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
                id="news-source-logo"
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
            {mutation.isPending ? "Saving…" : editing ? "Save Changes" : "Add Source"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── News Sources Tab ─────────────────────────────────────────────────────────

export function NewsSourcesTab({ t = {} }: { t?: T }) {
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminNewsSource | null>(null);

  const {
    data: sources = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["admin-news-sources"],
    queryFn: newsSourcesApi.getAll,
    staleTime: 30_000,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      active ? newsSourcesApi.activate(id) : newsSourcesApi.deactivate(id),
    onSuccess: () => {
      toast.success(t.toast_source_updated ?? "News source updated.");
      queryClient.invalidateQueries({ queryKey: ["admin-news-sources"] });
    },
    onError: () => toast.error(t.toast_source_update_failed ?? "Failed to update news source."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => newsSourcesApi.remove(id),
    onSuccess: () => {
      toast.success(t.toast_source_deleted ?? "News source deleted.");
      queryClient.invalidateQueries({ queryKey: ["admin-news-sources"] });
    },
    onError: () => toast.error(t.toast_source_delete_failed ?? "Failed to delete news source."),
  });

  function handleDelete(source: AdminNewsSource) {
    confirm({
      title: t.source_delete_title ?? "Delete News Source",
      description: (
        t.source_delete_description ?? 'Are you sure you want to delete "{name}"? This cannot be undone.'
      ).replace("{name}", source.name),
      onConfirm: () => deleteMutation.mutateAsync(source.id),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{t.sources_section_title ?? "News Sources"}</h2>
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
            {t.btn_add_source ?? "Add Source"}
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
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : sources.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground text-sm">
                  No news sources added yet.
                </TableCell>
              </TableRow>
            ) : (
              sources.map((source) => (
                <TableRow key={source.id} className={!source.is_active ? "opacity-50" : ""}>
                  <TableCell>
                    <LogoThumb logo_url={source.logo_url} name={source.name} />
                  </TableCell>
                  <TableCell className="font-medium text-sm">{source.name}</TableCell>
                  <TableCell>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors max-w-xs truncate"
                    >
                      {source.url}
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {getCategoryLabel(source.category)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        source.is_active
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {source.is_active ? "Active" : "Inactive"}
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
                            setEditing(source);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => toggleMutation.mutate({ id: source.id, active: !source.is_active })}
                        >
                          {source.is_active ? (
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
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(source)}>
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

      <NewsSourceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["admin-news-sources"] })}
      />
    </div>
  );
}
