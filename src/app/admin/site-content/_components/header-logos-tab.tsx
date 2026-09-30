"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, ImageIcon, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { type AdminHeaderLogo, headerLogosApi } from "@/app/admin/_api/header-logos";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useConfirmStore } from "@/stores/confirm-store";

type T = Record<string, string>;

const QUERY_KEY = ["admin-header-logos"];

// The 3 header positions (order 0, 1, 2) and the size each one is saved at.
const POSITIONS = [
  { order: 0, label: "Position 1", size: "2048 × 285", note: "Main logo (first in the header)" },
  { order: 1, label: "Position 2", size: "1594 × 1038", note: "Second logo" },
  { order: 2, label: "Position 3", size: "1594 × 1038", note: "Third logo" },
  { order: 3, label: "Mobile menu logo", size: "960 × 160", note: "Shown at the top of the mobile (☰) menu" },
  { order: 4, label: "Footer logo", size: "960 × 160", note: "Shown in the website footer" },
] as const;
const MOBILE_ORDER = 3;
// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Pull the first validation message out of a StandardResponse error. */
function apiErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: { message?: string; errors?: Record<string, string[] | string> } } })
    ?.response?.data;
  if (data?.errors && typeof data.errors === "object") {
    const first = Object.values(data.errors)[0];
    if (first) return Array.isArray(first) ? first[0] : String(first);
  }
  return data?.message || fallback;
}

// ─── Header preview (mimics the landing-page header) ─────────────────────────

function HeaderPreview({ logos, t }: { logos: AdminHeaderLogo[]; t: T }) {
  const live = logos.filter((l) => l.is_active && l.logo_url && l.order < MOBILE_ORDER); // header logos only
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t.header_logos_preview ?? "Header preview"}
      </p>
      <div className="flex min-h-[88px] items-center gap-3 overflow-x-auto rounded-lg border bg-white px-4 py-3">
        {live.length === 0 ? (
          <span className="text-sm text-muted-foreground">
            {t.header_logos_preview_empty ?? "No active logos — the website shows its default logos."}
          </span>
        ) : (
          live.map((l) => (
            <img key={l.id} src={l.logo_url as string} alt={l.name} className="h-16 w-auto shrink-0 object-contain" />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Add / Replace dialog (position comes from the page dropdown) ────────────

const ALLOWED_LOGO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
const MAX_LOGO_SIZE = 5 * 1024 * 1024; // 5 MB, matches backend limit

function HeaderLogoDialog({
  open,
  onOpenChange,
  editing,
  position,
  onSuccess,
  t,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: AdminHeaderLogo | null;
  position: number;
  onSuccess: () => void;
  t: T;
}) {
  const [name, setName] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoInfo, setLogoInfo] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pos = POSITIONS[position];

  useEffect(() => {
    if (!open) return;
    setLogo(null);
    setLogoError(null);
    setLogoInfo(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setName(editing?.name ?? "");
  }, [open, editing]);

  useEffect(() => {
    if (!logo) {
      setLogoPreview(null);
      return;
    }
    const url = URL.createObjectURL(logo);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logo]);

  const validateLogo = (file: File): string | null => {
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      return t.err_header_logo_type ?? "Only JPG, PNG, WebP or SVG files are allowed.";
    }
    if (file.size > MAX_LOGO_SIZE) {
      return t.err_logo_size ?? "Logo must not exceed 5 MB.";
    }
    return null;
  };

  const handleFile = (file: File | null) => {
    setLogoInfo(null);
    if (!file) {
      setLogo(null);
      setLogoError(null);
      return;
    }
    const err = validateLogo(file);
    setLogoError(err);
    setLogo(err ? null : file);
    if (err || file.type === "image/svg+xml") return;

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setLogoInfo(`${img.naturalWidth} × ${img.naturalHeight}px`);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const mutation = useMutation({
    mutationFn: () => {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("order", String(position));
      if (!editing) formData.append("is_active", "true");
      if (logo) formData.append("logo", logo);
      return editing ? headerLogosApi.update(editing.id, formData) : headerLogosApi.create(formData);
    },
    onSuccess: () => {
      toast.success(
        editing ? (t.toast_header_logo_updated ?? "Logo updated.") : (t.toast_header_logo_added ?? "Logo added."),
      );
      onSuccess();
      onOpenChange(false);
    },
    onError: (err) => toast.error(apiErrorMessage(err, t.toast_header_logo_save_failed ?? "Failed to save logo.")),
  });

  const hasLogo = !!logo || !!editing?.logo_url;
  const canSubmit = !!name.trim() && hasLogo && !logoError;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing
              ? `${t.dialog_edit_header_logo ?? "Edit"} — ${pos?.label ?? ""}`
              : `${t.dialog_add_header_logo ?? "Add logo to"} ${pos?.label ?? ""}`}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {pos?.note} · {t.header_logo_saved_at ?? "saved at up to"} <b>{pos?.size}</b>.{" "}
            {t.header_logo_shape_kept ?? "Shape is kept — no stretching or cropping."}
          </div>

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium">
              {t.field_name ?? "Name"} <span className="text-destructive">*</span>
            </p>
            <Input
              id="header-logo-name"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              placeholder={t.field_header_logo_name_placeholder ?? "e.g. Government of Kerala"}
            />
            <p className="text-xs text-muted-foreground">{t.header_logo_name_hint ?? "Used as the image alt text."}</p>
          </div>

          {/* Logo */}
          <div className="flex flex-col gap-1.5">
            <p className="font-medium text-sm">
              {t.field_logo ?? "Logo image"} {!editing && <span className="text-destructive">*</span>}
            </p>

            {editing?.logo_url && !logo && (
              <div className="flex items-center gap-3 rounded-md border bg-muted/40 p-2">
                <img
                  src={editing.logo_url}
                  alt="logo"
                  className="h-10 max-w-[160px] rounded object-contain bg-white shrink-0"
                />
                <span className="text-xs text-muted-foreground">
                  {t.field_current_logo ?? "Current logo — choose a file below to replace it."}
                </span>
              </div>
            )}

            {logo && logoPreview ? (
              <div className="flex items-center gap-3 rounded-md border bg-muted/40 p-2">
                <img
                  src={logoPreview}
                  alt="preview"
                  className="h-10 max-w-[160px] rounded object-contain bg-white shrink-0"
                />
                <div className="flex flex-col gap-1 w-0 flex-1">
                  <span className="text-sm text-foreground truncate">{logo.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(logo.size)}
                    {logoInfo ? ` · ${logoInfo}` : ""}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLogo(null);
                    setLogoInfo(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  aria-label={t.action_cancel ?? "Cancel"}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Input
                id="header-logo-file"
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_LOGO_TYPES.join(",")}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFile(e.target.files?.[0] ?? null)}
              />
            )}
            <p className="text-xs text-muted-foreground">
              {t.header_logo_size_hint ??
                "JPG, PNG, WebP or SVG, max 5 MB. Any size is fine — it is fitted to this position automatically. Transparent PNG works best."}
            </p>
            {logoError && <p className="text-xs text-destructive">{logoError}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            {t.action_cancel ?? "Cancel"}
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!canSubmit || mutation.isPending}>
            {mutation.isPending
              ? (t.action_saving ?? "Saving…")
              : editing
                ? (t.action_save_changes ?? "Save Changes")
                : (t.action_add_logo ?? "Add Logo")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Header Logos Tab ─────────────────────────────────────────────────────────

export function HeaderLogosTab({ t = {} }: { t?: T }) {
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);
  const [selected, setSelected] = useState("0");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminHeaderLogo | null>(null);

  const {
    data = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: headerLogosApi.getAll,
    staleTime: 30_000,
  });
  const logos = useMemo(() => [...data].sort((a, b) => a.order - b.order), [data]);

  const position = Number(selected);
  const pos = POSITIONS[position];
  const current = logos.find((l) => l.order === position) ?? null;
  const usedCount = POSITIONS.filter((p) => logos.some((l) => l.order === p.order)).length;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      active ? headerLogosApi.activate(id) : headerLogosApi.deactivate(id),
    onSuccess: () => {
      toast.success(t.toast_header_logo_updated ?? "Logo updated.");
      invalidate();
    },
    onError: () => toast.error(t.toast_header_logo_update_failed ?? "Failed to update logo."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => headerLogosApi.remove(id),
    onSuccess: () => {
      toast.success(t.toast_header_logo_deleted ?? "Logo deleted.");
      invalidate();
    },
    onError: () => toast.error(t.toast_header_logo_delete_failed ?? "Failed to delete logo."),
  });

  function handleDelete(logo: AdminHeaderLogo) {
    confirm({
      title: t.header_logo_delete_title ?? "Delete Header Logo",
      description: (
        t.header_logo_delete_description ?? 'Are you sure you want to delete "{name}"? This cannot be undone.'
      ).replace("{name}", logo.name),
      onConfirm: () => deleteMutation.mutateAsync(logo.id),
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Title */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{t.header_logos_section_title ?? "Header Logos"}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t.header_logos_section_description ??
              "Choose a position to view, add or change its logo. The header shows up to 3 logos."}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {usedCount} / {POSITIONS.length} {t.header_logos_used ?? "positions used"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Position dropdown */}
      <div className="flex flex-col gap-1.5 max-w-sm">
        <p className="text-sm font-medium">{t.field_position ?? "Position"}</p>
        {isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger className="h-auto min-h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POSITIONS.map((p) => {
                const l = logos.find((x) => x.order === p.order);
                return (
                  <SelectItem key={p.order} value={String(p.order)}>
                    <span className="flex items-center gap-3 py-0.5">
                      <span className="flex h-8 w-16 shrink-0 items-center justify-center rounded border bg-white">
                        {l?.logo_url ? (
                          <img src={l.logo_url} alt="" className="max-h-7 max-w-[60px] object-contain" />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-muted-foreground/50" />
                        )}
                      </span>
                      <span className="flex flex-col text-left">
                        <span className="text-sm">{p.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {l ? l.name : (t.header_logo_position_empty ?? "Empty")}
                        </span>
                      </span>
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Selected position */}
      <div className={`rounded-lg border p-4 transition-opacity ${isFetching && !isLoading ? "opacity-60" : ""}`}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-medium">{pos?.label}</p>
            <p className="text-xs text-muted-foreground">
              {pos?.note} · {t.header_logo_size ?? "size"} {pos?.size}
            </p>
          </div>
          {current && (
            <Badge
              variant="secondary"
              className={
                current.is_active
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-muted text-muted-foreground"
              }
            >
              {current.is_active ? (t.badge_active ?? "Active") : (t.badge_inactive ?? "Inactive")}
            </Badge>
          )}
        </div>

        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : current ? (
          <>
            <div
              className={`flex min-h-[160px] items-center justify-center rounded-md border bg-white p-4 ${
                current.is_active ? "" : "opacity-50"
              }`}
            >
              {current.logo_url ? (
                <img src={current.logo_url} alt={current.name} className="max-h-40 max-w-full object-contain" />
              ) : (
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <p className="mt-2 text-sm font-medium">{current.name}</p>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setEditing(current);
                  setDialogOpen(true);
                }}
              >
                <Pencil className="mr-1.5 h-4 w-4" />
                {t.action_replace_edit ?? "Replace / Edit"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={toggleMutation.isPending}
                onClick={() => toggleMutation.mutate({ id: current.id, active: !current.is_active })}
              >
                {current.is_active ? (
                  <>
                    <EyeOff className="mr-1.5 h-4 w-4" />
                    {t.action_deactivate ?? "Deactivate"}
                  </>
                ) : (
                  <>
                    <Eye className="mr-1.5 h-4 w-4" />
                    {t.action_activate ?? "Activate"}
                  </>
                )}
              </Button>
              <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleDelete(current)}>
                <Trash2 className="mr-1.5 h-4 w-4" />
                {t.action_delete ?? "Delete"}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex min-h-[160px] flex-col items-center justify-center gap-3 rounded-md border border-dashed text-center">
            <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {(t.header_logo_position_empty_long ?? "{label} is empty.").replace("{label}", pos?.label ?? "")}
            </p>
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              {(t.btn_add_logo_to ?? "Add logo to {label}").replace("{label}", pos?.label ?? "")}
            </Button>
          </div>
        )}
      </div>

      {/* Preview */}
      {!isLoading && <HeaderPreview logos={logos} t={t} />}

      <HeaderLogoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        position={position}
        onSuccess={invalidate}
        t={t}
      />
    </div>
  );
}
