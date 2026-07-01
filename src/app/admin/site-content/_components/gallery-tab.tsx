"use client";

import { useEffect, useRef, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, Eye, EyeOff, ImageIcon, MoreHorizontal, Pencil, Plus, RefreshCw, Trash2, X, ZoomIn } from "lucide-react";
import { toast } from "sonner";

import { galleryApi } from "@/app/admin/_api/gallery";
import { api } from "@/lib/api/client";
import { useConfirmStore } from "@/stores/confirm-store";
import type { AdminGalleryPhoto } from "@/types/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PublicLanguage {
  code: string;
  name: string;
  native_name: string;
  is_default: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseCaption(raw: Record<string, string> | string | null): Record<string, string> {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) return parsed as Record<string, string>;
    return {};
  } catch {
    return {};
  }
}

function getCaptionDisplay(caption: Record<string, string> | string | null): string {
  if (!caption) return "";
  if (typeof caption === "string") return caption;
  return Object.values(caption).find((v) => v?.trim()) ?? "";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Gallery Dialog ───────────────────────────────────────────────────────────

function GalleryDialog({
  open,
  onOpenChange,
  editing,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: AdminGalleryPhoto | null;
  onSuccess: () => void;
}) {
  const { data: languages = [], isLoading: langsLoading } = useQuery<PublicLanguage[]>({
    queryKey: ["public-languages"],
    queryFn: () => api.get("/public/languages/").then((r) => (r.data as { data: PublicLanguage[] }).data),
    staleTime: 10 * 60 * 1000,
  });

  const [captionValues, setCaptionValues] = useState<Record<string, string>>({});
  const [activeLang, setActiveLang] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultLang = languages.find((l) => l.is_default);

  useEffect(() => {
    if (!open) return;
    setActiveLang(defaultLang?.code ?? "");
    setPhoto(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (editing) {
      setCaptionValues(parseCaption(editing.caption));
    } else {
      setCaptionValues({});
    }
  }, [open, editing, defaultLang?.code]);

  useEffect(() => {
    if (open && !activeLang && defaultLang?.code) {
      setActiveLang(defaultLang.code);
    }
  }, [open, activeLang, defaultLang?.code]);

  const mutation = useMutation({
    mutationFn: () => {
      const formData = new FormData();
      const captionJson = JSON.stringify(captionValues);
      formData.append("caption", captionJson);
      if (photo) formData.append("photo", photo);
      formData.append("is_active", "true");
      return editing ? galleryApi.update(editing.id, formData) : galleryApi.create(formData);
    },
    onSuccess: () => {
      toast.success(editing ? "Photo updated." : "Photo uploaded.");
      onSuccess();
      onOpenChange(false);
    },
    onError: () => toast.error("Failed to save photo."),
  });

  const canSubmit = editing ? true : !!photo;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Photo" : "Upload Photo"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Photo upload */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">
              Photo {!editing && <span className="text-destructive">*</span>}
            </label>

            {/* Existing photo (edit mode, no new file) */}
            {editing && !photo && (
              <div className="flex items-center gap-3 rounded-md border bg-muted/40 p-2">
                <img
                  src={editing.photo_url}
                  alt="current"
                  className="h-14 w-20 rounded object-cover shrink-0"
                />
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <span className="text-xs text-muted-foreground">Current photo</span>
                  <label className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer w-fit">
                    Replace
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
                    className="h-14 w-20 rounded object-cover shrink-0"
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
                    {editing ? (
                      <span className="text-xs">Cancel</span>
                    ) : (
                      <X className="h-4 w-4" />
                    )}
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
            <p className="text-xs text-muted-foreground">JPG, PNG or WebP — max 5 MB</p>
          </div>

          {/* Caption (optional, multi-language) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Caption <span className="text-muted-foreground text-xs">(optional)</span></label>
              {!langsLoading && languages.length > 1 && (
                <Select value={activeLang} onValueChange={setActiveLang}>
                  <SelectTrigger className="h-8 w-36 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => {
                      const filled = !!captionValues[lang.code]?.trim();
                      return (
                        <SelectItem key={lang.code} value={lang.code}>
                          <span className="flex items-center gap-2">
                            {filled ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                            ) : (
                              <Circle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                            )}
                            {lang.native_name}
                            {lang.is_default && (
                              <span className="text-muted-foreground text-xs">(default)</span>
                            )}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
              {langsLoading && <Skeleton className="h-8 w-36" />}
            </div>
            {langsLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Input
                value={captionValues[activeLang] ?? ""}
                onChange={(e) =>
                  setCaptionValues((prev) => ({ ...prev, [activeLang]: e.target.value }))
                }
                placeholder={`Caption in ${languages.find((l) => l.code === activeLang)?.name ?? activeLang} (optional)`}
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!canSubmit || mutation.isPending}>
            {mutation.isPending ? "Saving…" : editing ? "Save Changes" : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Gallery Tab ──────────────────────────────────────────────────────────────

export function GalleryTab() {
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminGalleryPhoto | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<AdminGalleryPhoto | null>(null);

  const { data: photos = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin-gallery"],
    queryFn: galleryApi.getAll,
    staleTime: 30_000,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      active ? galleryApi.activate(id) : galleryApi.deactivate(id),
    onSuccess: () => {
      toast.success("Photo updated.");
      queryClient.invalidateQueries({ queryKey: ["admin-gallery"] });
    },
    onError: () => toast.error("Failed to update photo."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => galleryApi.remove(id),
    onSuccess: () => {
      toast.success("Photo deleted.");
      queryClient.invalidateQueries({ queryKey: ["admin-gallery"] });
    },
    onError: () => toast.error("Failed to delete photo."),
  });

  function handleDelete(photo: AdminGalleryPhoto) {
    confirm({
      title: "Delete Photo",
      description: "Are you sure you want to delete this photo? This cannot be undone.",
      onConfirm: () => deleteMutation.mutateAsync(photo.id),
    });
  }

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(photo: AdminGalleryPhoto) {
    setEditing(photo);
    setDialogOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Gallery</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={openAdd}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Photo
          </Button>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-video w-full rounded-lg" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border py-16 text-muted-foreground">
          <ImageIcon className="h-8 w-8 opacity-40" />
          <p className="text-sm">No photos uploaded yet.</p>
        </div>
      ) : (
        <div className={`grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 transition-opacity ${isFetching ? "opacity-60" : ""}`}>
          {photos.map((photo) => (
            <div
              key={photo.id}
              className={`group relative rounded-lg border overflow-hidden transition-shadow hover:shadow-md ${!photo.is_active ? "opacity-60 grayscale" : ""}`}
            >
              <div className="relative aspect-video w-full bg-muted">
                <img
                  src={photo.photo_url}
                  alt={getCaptionDisplay(photo.caption) || "Gallery photo"}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>

              {/* Status badge */}
              <div className="absolute top-2 left-2">
                <Badge
                  variant="secondary"
                  className={
                    photo.is_active
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs"
                      : "bg-muted text-muted-foreground text-xs"
                  }
                >
                  {photo.is_active ? "Active" : "Inactive"}
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
                    <DropdownMenuItem onClick={() => setPreviewPhoto(photo)}>
                      <ZoomIn className="mr-2 h-4 w-4" />
                      View
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openEdit(photo)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => toggleMutation.mutate({ id: photo.id, active: !photo.is_active })}
                    >
                      {photo.is_active ? (
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
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => handleDelete(photo)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Caption */}
              {getCaptionDisplay(photo.caption) && (
                <div className="px-2.5 py-1.5 text-xs text-muted-foreground truncate bg-background/95">
                  {getCaptionDisplay(photo.caption)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <GalleryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["admin-gallery"] })}
      />

      {/* Photo Preview Dialog */}
      <Dialog open={!!previewPhoto} onOpenChange={(v) => { if (!v) setPreviewPhoto(null); }}>
        <DialogContent className="max-w-3xl p-0">
          <DialogHeader className="px-6 pt-5 pb-3 border-b">
            <DialogTitle className="text-base">
              {getCaptionDisplay(previewPhoto?.caption ?? null) || "Photo Preview"}
            </DialogTitle>
          </DialogHeader>
          <div className="bg-muted/30">
            {previewPhoto && (
              <img
                src={previewPhoto.photo_url}
                alt={getCaptionDisplay(previewPhoto.caption) || "Gallery photo"}
                className="w-full max-h-[70vh] object-contain"
              />
            )}
          </div>
          {previewPhoto && getCaptionDisplay(previewPhoto.caption) && (
            <div className="px-6 py-3 border-t text-sm text-muted-foreground">
              {getCaptionDisplay(previewPhoto.caption)}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
