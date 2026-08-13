"use client";

import { useEffect, useRef, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, CheckCircle2, Circle, Eye, EyeOff, FolderOpen, ImageIcon,
  MoreHorizontal, Pencil, Plus, RefreshCw, Trash2, X, ZoomIn,
} from "lucide-react";
import { toast } from "sonner";

import { galleryAlbumApi, galleryApi } from "@/app/admin/_api/gallery";
import { api } from "@/lib/api/client";
import { useConfirmStore } from "@/stores/confirm-store";
import type { AdminGalleryAlbum, AdminGalleryPhoto } from "@/types/admin";
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

type T = Record<string, string>;

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
  } catch { return {}; }
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

// ─── Album Dialog (create / edit album) ──────────────────────────────────────

function AlbumDialog({
  open,
  onOpenChange,
  editing,
  onSuccess,
  t,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing?: AdminGalleryAlbum | null;
  onSuccess: () => void;
  t: T;
}) {
  const [title, setTitle] = useState("");
  const [order, setOrder] = useState("0");

  useEffect(() => {
    if (!open) return;
    setTitle(editing?.title ?? "");
    setOrder(String(editing?.order ?? 0));
  }, [open, editing]);

  const mutation = useMutation({
    mutationFn: () =>
      editing
        ? galleryAlbumApi.update(editing.id, { title, order: Number(order) })
        : galleryAlbumApi.create({ title, order: Number(order) }),
    onSuccess: () => {
      toast.success(editing ? "Album updated." : "Album created.");
      onSuccess();
      onOpenChange(false);
    },
    onError: () => toast.error("Failed to save album."),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? (t.dialog_edit_album ?? "Edit Album") : (t.dialog_create_album ?? "New Album")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t.field_album_title ?? "Album Title"}</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Opening Ceremony 2024" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t.field_order ?? "Order"}</label>
            <Input type="number" value={order} onChange={(e) => setOrder(e.target.value)} min={0} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            {t.action_cancel ?? "Cancel"}
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!title.trim() || mutation.isPending}>
            {mutation.isPending ? (t.action_saving ?? "Saving…") : (t.action_save ?? "Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Upload Dialog (multi-select, scoped to album) ────────────────────────────

function UploadDialog({
  open,
  onOpenChange,
  albumId,
  onSuccess,
  t,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  albumId: number;
  onSuccess: () => void;
  t: T;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [captionValues, setCaptionValues] = useState<Record<string, string>>({});
  const [activeLang, setActiveLang] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: languages = [], isLoading: langsLoading } = useQuery<PublicLanguage[]>({
    queryKey: ["public-languages"],
    queryFn: () => api.get("/public/languages/").then((r) => (r.data as { data: PublicLanguage[] }).data),
    staleTime: 10 * 60 * 1000,
  });

  const defaultLang = languages.find((l) => l.is_default);

  useEffect(() => {
    if (!open) {
      setFiles([]);
      setCaptionValues({});
      setActiveLang("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [open]);

  useEffect(() => {
    if (open && !activeLang && defaultLang?.code) setActiveLang(defaultLang.code);
  }, [open, activeLang, defaultLang?.code]);

  const MAX_SIZE = 5 * 1024 * 1024;
  const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

  function addFiles(incoming: FileList | null) {
    if (!incoming) return;
    const valid = Array.from(incoming).filter((f) => ALLOWED.includes(f.type) && f.size <= MAX_SIZE);
    const invalid = Array.from(incoming).filter((f) => !ALLOWED.includes(f.type) || f.size > MAX_SIZE);
    if (invalid.length) toast.error(`${invalid.length} file(s) skipped — must be JPG/PNG/WebP under 5 MB.`);
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name + f.size));
      return [...prev, ...valid.filter((f) => !existing.has(f.name + f.size))];
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  const mutation = useMutation({
    mutationFn: () => {
      const formData = new FormData();
      for (const f of files) formData.append("photos", f);
      formData.append("is_active", "true");
      formData.append("album_id", String(albumId));
      const hasCaption = Object.values(captionValues).some((v) => v.trim());
      if (hasCaption) formData.append("caption", JSON.stringify(captionValues));
      return galleryApi.bulkCreate(formData);
    },
    onSuccess: (result) => {
      const count = result.uploaded.length;
      const errCount = result.errors.length;
      if (count > 0) toast.success(`${count} photo${count > 1 ? "s" : ""} uploaded.`);
      if (errCount > 0) toast.error(`${errCount} file(s) failed to upload.`);
      onSuccess();
      onOpenChange(false);
    },
    onError: () => toast.error(t.toast_save_failed ?? "Failed to upload photos."),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t.dialog_upload_title ?? "Upload Photos"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div
            className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 py-8 cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
          >
            <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-medium">Click to select or drag & drop</p>
            <p className="text-xs text-muted-foreground">JPG, PNG, WebP — max 5 MB each</p>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden"
              onChange={(e) => addFiles(e.target.files)} />
          </div>

          {files.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 max-h-56 overflow-y-auto pr-1">
              {files.map((file, i) => (
                <div key={`${file.name}-${file.size}`} className="relative group rounded-md overflow-hidden border aspect-video bg-muted">
                  <img src={URL.createObjectURL(file)} alt={file.name} className="absolute inset-0 h-full w-full object-cover" />
                  <button type="button" onClick={() => removeFile(i)}
                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive">
                    <X className="h-3 w-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {files.length > 0 && (
            <p className="text-xs text-muted-foreground">{files.length} photo{files.length > 1 ? "s" : ""} selected</p>
          )}

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                {t.field_caption ?? "Caption"} <span className="text-muted-foreground text-xs">{t.label_optional ?? "(optional)"}</span>
              </label>
              {!langsLoading && languages.length > 1 && (
                <Select value={activeLang} onValueChange={setActiveLang}>
                  <SelectTrigger className="h-8 w-44 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => {
                      const filled = !!captionValues[lang.code]?.trim();
                      return (
                        <SelectItem key={lang.code} value={lang.code}>
                          <span className="flex items-center gap-2">
                            {filled ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" /> : <Circle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />}
                            {lang.native_name}
                            {lang.is_default && <span className="text-muted-foreground text-xs">{t.label_default ?? "(default)"}</span>}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
              {langsLoading && <Skeleton className="h-8 w-36" />}
            </div>
            {langsLoading ? <Skeleton className="h-10 w-full" /> : (
              <Input
                value={captionValues[activeLang] ?? ""}
                onChange={(e) => setCaptionValues((prev) => ({ ...prev, [activeLang]: e.target.value }))}
                placeholder={`Caption in ${languages.find((l) => l.code === activeLang)?.name ?? activeLang} (optional)`}
              />
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            {t.action_cancel ?? "Cancel"}
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={files.length === 0 || mutation.isPending}>
            {mutation.isPending ? `Uploading ${files.length} photo${files.length > 1 ? "s" : ""}…` : `Upload ${files.length > 0 ? files.length : ""} Photo${files.length !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Photo Dialog ────────────────────────────────────────────────────────

function EditPhotoDialog({
  open,
  onOpenChange,
  editing,
  onSuccess,
  t,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: AdminGalleryPhoto;
  onSuccess: () => void;
  t: T;
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
    setCaptionValues(parseCaption(editing.caption));
  }, [open, editing, defaultLang?.code]);

  useEffect(() => {
    if (open && !activeLang && defaultLang?.code) setActiveLang(defaultLang.code);
  }, [open, activeLang, defaultLang?.code]);

  const mutation = useMutation({
    mutationFn: () => {
      const formData = new FormData();
      formData.append("caption", JSON.stringify(captionValues));
      if (photo) formData.append("photo", photo);
      return galleryApi.update(editing.id, formData);
    },
    onSuccess: () => {
      toast.success(t.toast_updated ?? "Photo updated.");
      onSuccess();
      onOpenChange(false);
    },
    onError: () => toast.error(t.toast_save_failed ?? "Failed to save photo."),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.dialog_edit_title ?? "Edit Photo"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t.field_photo ?? "Photo"}</label>
            {!photo && (
              <div className="flex items-center gap-3 rounded-md border bg-muted/40 p-2">
                <img src={editing.photo_url} alt="current" className="h-14 w-20 rounded object-cover shrink-0" />
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <span className="text-xs text-muted-foreground">{t.field_current_photo ?? "Current photo"}</span>
                  <label className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer w-fit">
                    {t.action_replace ?? "Replace"}
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                      onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
                  </label>
                </div>
              </div>
            )}
            {photo && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-3 rounded-md border bg-muted/40 p-2">
                  <img src={URL.createObjectURL(photo)} alt="preview" className="h-14 w-20 rounded object-cover shrink-0" />
                  <div className="flex flex-col gap-1 w-0 flex-1">
                    <span className="text-sm text-foreground truncate">{photo.name}</span>
                    <span className="text-xs text-muted-foreground">{formatFileSize(photo.size)}</span>
                  </div>
                  <button type="button" onClick={() => { setPhoto(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                    <span className="text-xs">{t.action_cancel ?? "Cancel"}</span>
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">{t.photo_replace_hint ?? "This will replace the existing photo."}</p>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                {t.field_caption ?? "Caption"} <span className="text-muted-foreground text-xs">{t.label_optional ?? "(optional)"}</span>
              </label>
              {!langsLoading && languages.length > 1 && (
                <Select value={activeLang} onValueChange={setActiveLang}>
                  <SelectTrigger className="h-8 w-44 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => {
                      const filled = !!captionValues[lang.code]?.trim();
                      return (
                        <SelectItem key={lang.code} value={lang.code}>
                          <span className="flex items-center gap-2">
                            {filled ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" /> : <Circle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />}
                            {lang.native_name}
                            {lang.is_default && <span className="text-muted-foreground text-xs">{t.label_default ?? "(default)"}</span>}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
              {langsLoading && <Skeleton className="h-8 w-36" />}
            </div>
            {langsLoading ? <Skeleton className="h-10 w-full" /> : (
              <Input
                value={captionValues[activeLang] ?? ""}
                onChange={(e) => setCaptionValues((prev) => ({ ...prev, [activeLang]: e.target.value }))}
                placeholder={`Caption in ${languages.find((l) => l.code === activeLang)?.name ?? activeLang} (optional)`}
              />
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            {t.action_cancel ?? "Cancel"}
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? (t.action_saving ?? "Saving…") : (t.action_save_changes ?? "Save Changes")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Album Detail View (photos inside one album) ──────────────────────────────

function AlbumDetailView({
  album,
  onBack,
  t,
}: {
  album: AdminGalleryAlbum;
  onBack: () => void;
  t: T;
}) {
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<AdminGalleryPhoto | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<AdminGalleryPhoto | null>(null);

  const { data: photos = [], isLoading, isFetching, refetch } = useQuery<AdminGalleryPhoto[]>({
    queryKey: ["admin-gallery", album.id],
    queryFn: () => galleryApi.getAll(album.id),
    staleTime: 30_000,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      active ? galleryApi.activate(id) : galleryApi.deactivate(id),
    onSuccess: () => {
      toast.success("Photo updated.");
      queryClient.invalidateQueries({ queryKey: ["admin-gallery", album.id] });
      queryClient.invalidateQueries({ queryKey: ["admin-gallery-albums"] });
    },
    onError: () => toast.error("Failed to update photo."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => galleryApi.remove(id),
    onSuccess: () => {
      toast.success("Photo deleted.");
      queryClient.invalidateQueries({ queryKey: ["admin-gallery", album.id] });
      queryClient.invalidateQueries({ queryKey: ["admin-gallery-albums"] });
    },
    onError: () => toast.error("Failed to delete photo."),
  });

  function handleDelete(photo: AdminGalleryPhoto) {
    confirm({
      title: t.photo_delete_title ?? "Delete Photo",
      description: t.photo_delete_description ?? "Are you sure you want to delete this photo? This cannot be undone.",
      onConfirm: () => deleteMutation.mutateAsync(photo.id),
    });
  }

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-gallery", album.id] });
    queryClient.invalidateQueries({ queryKey: ["admin-gallery-albums"] });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 px-2">
            <ArrowLeft className="h-4 w-4" />
            {t.btn_back ?? "Back"}
          </Button>
          <span className="text-muted-foreground">/</span>
          <h2 className="text-base font-semibold">{album.title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t.btn_add_photo ?? "Add Photos"}
          </Button>
        </div>
      </div>

      {/* Photos grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="aspect-video w-full rounded-lg" />)}
        </div>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border py-16 text-muted-foreground">
          <ImageIcon className="h-8 w-8 opacity-40" />
          <p className="text-sm">{t.empty_state_photos ?? "No photos in this album yet."}</p>
          <Button size="sm" variant="outline" onClick={() => setUploadOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t.btn_add_photo ?? "Add Photos"}
          </Button>
        </div>
      ) : (
        <div className={`grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 transition-opacity ${isFetching ? "opacity-60" : ""}`}>
          {photos.map((photo) => (
            <div key={photo.id}
              className={`group relative rounded-lg border overflow-hidden transition-shadow hover:shadow-md ${!photo.is_active ? "opacity-60 grayscale" : ""}`}>
              <div className="relative aspect-video w-full bg-muted">
                <img src={photo.photo_url} alt={getCaptionDisplay(photo.caption) || "Photo"}
                  className="absolute inset-0 h-full w-full object-cover" />
              </div>
              <div className="absolute top-2 left-2">
                <Badge variant="secondary" className={photo.is_active
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs"
                  : "bg-muted text-muted-foreground text-xs"}>
                  {photo.is_active ? (t.badge_active ?? "Active") : (t.badge_inactive ?? "Inactive")}
                </Badge>
              </div>
              <div className="absolute top-2 right-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="sm" className="h-7 w-7 p-0 shadow">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[190px]">
                    <DropdownMenuItem onClick={() => setPreviewPhoto(photo)}>
                      <ZoomIn className="mr-2 h-4 w-4" />{t.action_view_img ?? "View"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setEditingPhoto(photo)}>
                      <Pencil className="mr-2 h-4 w-4" />{t.action_edit ?? "Edit"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleMutation.mutate({ id: photo.id, active: !photo.is_active })}>
                      {photo.is_active ? <><EyeOff className="mr-2 h-4 w-4" />{t.action_deactivate ?? "Deactivate"}</>
                        : <><Eye className="mr-2 h-4 w-4" />{t.action_activate ?? "Activate"}</>}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(photo)}>
                      <Trash2 className="mr-2 h-4 w-4" />{t.action_delete ?? "Delete"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {getCaptionDisplay(photo.caption) && (
                <div className="px-2.5 py-1.5 text-xs text-muted-foreground truncate bg-background/95">
                  {getCaptionDisplay(photo.caption)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} albumId={album.id} onSuccess={invalidate} t={t} />
      {editingPhoto && (
        <EditPhotoDialog open={!!editingPhoto} onOpenChange={(v) => { if (!v) setEditingPhoto(null); }}
          editing={editingPhoto} onSuccess={invalidate} t={t} />
      )}
      <Dialog open={!!previewPhoto} onOpenChange={(v) => { if (!v) setPreviewPhoto(null); }}>
        <DialogContent className="max-w-3xl p-0">
          <DialogHeader className="px-6 pt-5 pb-3 border-b">
            <DialogTitle className="text-base">
              {getCaptionDisplay(previewPhoto?.caption ?? null) || (t.dialog_preview_title ?? "Photo Preview")}
            </DialogTitle>
          </DialogHeader>
          <div className="bg-muted/30">
            {previewPhoto && (
              <img src={previewPhoto.photo_url} alt={getCaptionDisplay(previewPhoto.caption) || "Photo"}
                className="w-full max-h-[70vh] object-contain" />
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

// ─── Gallery Tab (album list view) ────────────────────────────────────────────

export function GalleryTab({ t = {} }: { t?: T }) {
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);
  const [selectedAlbum, setSelectedAlbum] = useState<AdminGalleryAlbum | null>(null);
  const [albumDialogOpen, setAlbumDialogOpen] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<AdminGalleryAlbum | null>(null);

  const { data: albums = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin-gallery-albums"],
    queryFn: galleryAlbumApi.getAll,
    staleTime: 30_000,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      active ? galleryAlbumApi.activate(id) : galleryAlbumApi.deactivate(id),
    onSuccess: (_data, { id }) => {
      toast.success("Album updated.");
      queryClient.invalidateQueries({ queryKey: ["admin-gallery-albums"] });
      queryClient.invalidateQueries({ queryKey: ["admin-gallery", id] });
    },
    onError: () => toast.error("Failed to update album."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => galleryAlbumApi.remove(id),
    onSuccess: () => {
      toast.success("Album deleted.");
      queryClient.invalidateQueries({ queryKey: ["admin-gallery-albums"] });
    },
    onError: () => toast.error("Failed to delete album."),
  });

  function handleDeleteAlbum(album: AdminGalleryAlbum) {
    confirm({
      title: t.album_delete_title ?? "Delete Album",
      description: t.album_delete_description ?? `Delete "${album.title}" and all its photos? This cannot be undone.`,
      onConfirm: () => deleteMutation.mutateAsync(album.id),
    });
  }

  if (selectedAlbum) {
    return (
      <AlbumDetailView
        album={selectedAlbum}
        onBack={() => {
          setSelectedAlbum(null);
          queryClient.invalidateQueries({ queryKey: ["admin-gallery-albums"] });
        }}
        t={t}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{t.gallery_section_title ?? "Gallery"}</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={() => { setEditingAlbum(null); setAlbumDialogOpen(true); }}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t.btn_new_album ?? "New Album"}
          </Button>
        </div>
      </div>

      {/* Album grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="aspect-video w-full rounded-lg" />)}
        </div>
      ) : albums.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border py-16 text-muted-foreground">
          <FolderOpen className="h-8 w-8 opacity-40" />
          <p className="text-sm">{t.empty_state ?? "No albums yet."}</p>
          <Button size="sm" variant="outline" onClick={() => { setEditingAlbum(null); setAlbumDialogOpen(true); }}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t.btn_new_album ?? "Create First Album"}
          </Button>
        </div>
      ) : (
        <div className={`grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 transition-opacity ${isFetching ? "opacity-60" : ""}`}>
          {albums.map((album) => (
            <div key={album.id}
              className={`group relative rounded-lg border overflow-hidden transition-shadow hover:shadow-md cursor-pointer ${!album.is_active ? "opacity-60 grayscale" : ""}`}
              onClick={() => setSelectedAlbum(album)}>
              {/* Cover */}
              <div className="relative aspect-video w-full bg-muted">
                {album.cover_photo_url ? (
                  <img src={album.cover_photo_url} alt={album.title} className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FolderOpen className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                )}
              </div>

              {/* Status badge */}
              <div className="absolute top-2 left-2">
                <Badge variant="secondary" className={album.is_active
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs"
                  : "bg-muted text-muted-foreground text-xs"}>
                  {album.is_active ? (t.badge_active ?? "Active") : (t.badge_inactive ?? "Inactive")}
                </Badge>
              </div>

              {/* Actions — stop propagation so click doesn't open album */}
              <div className="absolute top-2 right-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="sm" className="h-7 w-7 p-0 shadow">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[190px]">
                    <DropdownMenuItem onClick={() => setSelectedAlbum(album)}>
                      <FolderOpen className="mr-2 h-4 w-4" />{t.action_open ?? "Open"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setEditingAlbum(album); setAlbumDialogOpen(true); }}>
                      <Pencil className="mr-2 h-4 w-4" />{t.action_edit ?? "Edit"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleMutation.mutate({ id: album.id, active: !album.is_active })}>
                      {album.is_active ? <><EyeOff className="mr-2 h-4 w-4" />{t.action_deactivate ?? "Deactivate"}</>
                        : <><Eye className="mr-2 h-4 w-4" />{t.action_activate ?? "Activate"}</>}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteAlbum(album)}>
                      <Trash2 className="mr-2 h-4 w-4" />{t.action_delete ?? "Delete"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Title + count */}
              <div className="px-2.5 py-2 bg-background/95">
                <p className="text-sm font-medium truncate">{album.title}</p>
                <p className="text-xs text-muted-foreground">{album.photo_count} photo{album.photo_count !== 1 ? "s" : ""}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <AlbumDialog
        open={albumDialogOpen}
        onOpenChange={setAlbumDialogOpen}
        editing={editingAlbum}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["admin-gallery-albums"] })}
        t={t}
      />
    </div>
  );
}
