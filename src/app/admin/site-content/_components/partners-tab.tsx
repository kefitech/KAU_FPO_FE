"use client";

import { useEffect, useRef, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, ImageIcon, MoreHorizontal, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { partnersApi } from "@/app/admin/_api/partners";
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
import type { AdminPartner } from "@/types/admin";

type T = Record<string, string>;

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
      <ImageIcon className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}

function PartnerDialog({
  open,
  onOpenChange,
  editing,
  onSuccess,
  t,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: AdminPartner | null;
  onSuccess: () => void;
  t: T;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [order, setOrder] = useState("0");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const urlSchema = z
    .string()
    .trim()
    .refine(
      (value) => {
        if (!value) return true;
        try {
          const parsed = new URL(value);
          return ["http:", "https:"].includes(parsed.protocol);
        } catch {
          return false;
        }
      },
      { message: t.field_url_error ?? "URL must start with http:// or https://" },
    );

  useEffect(() => {
    if (!open) return;
    setLogo(null);
    setLogoError(null);
    setUrlError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (editing) {
      setName(editing.name);
      setUrl(editing.url ?? "");
      setOrder(String(editing.order ?? 0));
    } else {
      setName("");
      setUrl("");
      setOrder("0");
    }
  }, [open, editing]);

  const validateUrl = (value: string) => {
    if (!value) return null;
    const result = urlSchema.safeParse(value);
    if (result.success) return null;
    return t.field_url_error ?? "URL must start with http:// or https://";
  };

  const ALLOWED_LOGO_TYPES = ["image/jpeg", "image/png", "image/webp"];
  const MAX_LOGO_SIZE = 5 * 1024 * 1024;
  const validateLogo = (file: File): string | null => {
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) return "Only JPG, PNG or WebP files are allowed.";
    if (file.size > MAX_LOGO_SIZE) return "Logo must not exceed 5 MB.";
    return null;
  };

  const mutation = useMutation({
    mutationFn: () => {
      const formData = new FormData();
      formData.append("name", name.trim());
      if (url.trim()) formData.append("url", url.trim());
      formData.append("order", order);
      formData.append("is_active", "true");
      if (logo) formData.append("logo", logo);
      return editing ? partnersApi.update(editing.id, formData) : partnersApi.create(formData);
    },
    onSuccess: () => {
      toast.success(editing ? (t.toast_updated ?? "Partner updated.") : (t.toast_created ?? "Partner added."));
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: any) => {
      const backendMessage = error?.message;
      const firstError =
        backendMessage && typeof backendMessage === "object" ? Object.values(backendMessage).flat()[0] : null;
      toast.error((firstError as string) || (t.toast_save_failed ?? "Failed to save partner."));
    },
  });

  const handleSubmit = () => {
    if (url) {
      const err = validateUrl(url);
      if (err) {
        setUrlError(err);
        return;
      }
    }
    if (logo) {
      const logoErr = validateLogo(logo);
      if (logoErr) {
        setLogoError(logoErr);
        return;
      }
    }
    mutation.mutate();
  };

  const canSubmit = !!name.trim() && !urlError;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? (t.dialog_edit_partner ?? "Edit Partner") : (t.dialog_add_partner ?? "Add Partner")}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium">
              {t.field_name ?? "Name"} <span className="text-destructive">*</span>
            </p>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.placeholder_name ?? "e.g. Kerala Agricultural University"}
              maxLength={100}
            />
          </div>

          {/* URL */}
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium">{t.field_url ?? "Website URL"}</p>
            <Input
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (urlError) setUrlError(null);
              }}
              onBlur={() => setUrlError(validateUrl(url))}
              placeholder={t.placeholder_url ?? "https://example.com"}
              type="url"
              aria-invalid={!!urlError}
              className={urlError ? "border-destructive focus-visible:ring-destructive/20" : ""}
            />
            {urlError && <p className="text-xs text-destructive">{urlError}</p>}
          </div>

          {/* Order */}
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium">{t.field_order ?? "Display Order"}</p>
            <Input value={order} onChange={(e) => setOrder(e.target.value)} type="number" min="0" placeholder="0" />
          </div>

          {/* Logo */}
          <div className="flex flex-col gap-1.5">
            <p className="font-medium text-sm">{t.field_logo ?? "Logo"}</p>

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
                    {editing.logo_url ? (t.logo_current ?? "Current logo") : (t.logo_none ?? "No logo set")}
                  </span>
                  <label className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer w-fit">
                    {editing.logo_url ? (t.logo_replace ?? "Replace") : (t.logo_upload ?? "Upload logo")}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        if (file) {
                          const err = validateLogo(file);
                          setLogoError(err);
                          setLogo(err ? null : file);
                        } else {
                          setLogo(null);
                          setLogoError(null);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            )}

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
                    {editing ? <span className="text-xs">{t.btn_cancel ?? "Cancel"}</span> : <X className="h-4 w-4" />}
                  </button>
                </div>
                {editing && (
                  <p className="text-xs text-muted-foreground">
                    {t.logo_replace_notice ?? "This will replace the existing logo."}
                  </p>
                )}
              </div>
            )}

            {!editing && !logo && (
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  if (file) {
                    const err = validateLogo(file);
                    setLogoError(err);
                    setLogo(err ? null : file);
                  } else {
                    setLogo(null);
                    setLogoError(null);
                  }
                }}
              />
            )}
            <p className="text-xs text-muted-foreground">{t.logo_hint ?? "JPG, PNG, or WebP — max 5 MB"}</p>
            {logoError && <p className="text-xs text-destructive">{logoError}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            {t.btn_cancel ?? "Cancel"}
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || mutation.isPending}>
            {mutation.isPending
              ? (t.btn_saving ?? "Saving…")
              : editing
                ? (t.btn_save_changes ?? "Save Changes")
                : (t.btn_add_partner ?? "Add Partner")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PartnersTab({ t = {} }: { t?: T }) {
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminPartner | null>(null);

  const {
    data: partners = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["admin-partners"],
    queryFn: partnersApi.getAll,
    staleTime: 30_000,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      active ? partnersApi.activate(id) : partnersApi.deactivate(id),
    onSuccess: (_data, variables) => {
      toast.success(
        variables.active ? (t.toast_activated ?? "Partner activated.") : (t.toast_deactivated ?? "Partner deactivated."),
      );
      queryClient.invalidateQueries({ queryKey: ["admin-partners"] });
    },
    onError: () => toast.error(t.toast_update_failed ?? "Failed to update partner."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => partnersApi.remove(id),
    onSuccess: () => {
      toast.success(t.toast_deleted ?? "Partner deleted.");
      queryClient.invalidateQueries({ queryKey: ["admin-partners"] });
    },
    onError: () => toast.error(t.toast_delete_failed ?? "Failed to delete partner."),
  });

  function handleDelete(partner: AdminPartner) {
    const descTemplate = t.delete_description ?? 'Are you sure you want to delete "{name}"? This cannot be undone.';
    confirm({
      title: t.delete_title ?? "Delete Partner",
      description: descTemplate.replace("{name}", partner.name),
      onConfirm: () => deleteMutation.mutateAsync(partner.id),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{t.partner_title ?? "Partners"}</h2>
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
            {t.btn_add_partner ?? "Add Partner"}
          </Button>
        </div>
      </div>

      <div className={`rounded-lg border transition-opacity ${isFetching && !isLoading ? "opacity-60" : ""}`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>{t.col_name ?? "Name"}</TableHead>
              <TableHead>{t.col_url ?? "URL"}</TableHead>
              <TableHead className="w-16">{t.col_order ?? "Order"}</TableHead>
              <TableHead>{t.col_status ?? "Status"}</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
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
            ) : partners.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground text-sm">
                  {t.empty_state ?? "No partners added yet."}
                </TableCell>
              </TableRow>
            ) : (
              partners.map((partner) => (
                <TableRow key={partner.id} className={!partner.is_active ? "opacity-50" : ""}>
                  <TableCell>
                    <LogoThumb logo_url={partner.logo_url} name={partner.name} />
                  </TableCell>
                  <TableCell className="font-medium text-sm max-w-[200px] truncate" title={partner.name}>
                    {partner.name}
                  </TableCell>
                  <TableCell>
                    {partner.url ? (
                      <a
                        href={partner.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors max-w-xs truncate block"
                      >
                        {partner.url}
                      </a>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{partner.order}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        partner.is_active
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {partner.is_active ? (t.badge_active ?? "Active") : (t.badge_inactive ?? "Inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-[190]">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditing(partner);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          {t.action_edit ?? "Edit"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => toggleMutation.mutate({ id: partner.id, active: !partner.is_active })}
                        >
                          {partner.is_active ? (
                            <>
                              <EyeOff className="mr-2 h-4 w-4" />
                              {t.action_deactivate ?? "Deactivate"}
                            </>
                          ) : (
                            <>
                              <Eye className="mr-2 h-4 w-4" />
                              {t.action_activate ?? "Activate"}
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(partner)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t.action_delete ?? "Delete"}
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

      <PartnerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["admin-partners"] })}
        t={t}
      />
    </div>
  );
}