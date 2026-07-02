"use client";

import { useEffect, useRef, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, ExternalLink, Eye, EyeOff, FileText, MoreHorizontal, Pencil, Plus, RefreshCw, Trash2, X, ZoomIn } from "lucide-react";
import { toast } from "sonner";

import { documentsApi } from "@/app/admin/_api/documents";
import { api } from "@/lib/api/client";
import { useConfirmStore } from "@/stores/confirm-store";
import type { AdminDocument } from "@/types/admin";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type T = Record<string, string>;

// ─── Types ────────────────────────────────────────────────────────────────────

interface PublicLanguage {
  code: string;
  name: string;
  native_name: string;
  is_default: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function parseTitle(raw: string | Record<string, string>): Record<string, string> {
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

// ─── Document Dialog ──────────────────────────────────────────────────────────

function DocumentDialog({
  open,
  onOpenChange,
  editing,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: AdminDocument | null;
  onSuccess: () => void;
}) {
  const { data: languages = [], isLoading: langsLoading } = useQuery<PublicLanguage[]>({
    queryKey: ["public-languages"],
    queryFn: () => api.get("/public/languages/").then((r) => (r.data as { data: PublicLanguage[] }).data),
    staleTime: 10 * 60 * 1000,
  });

  const [titleValues, setTitleValues] = useState<Record<string, string>>({});
  const [activeLang, setActiveLang] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isViewOnly, setIsViewOnly] = useState(false);

  const defaultLang = languages.find((l) => l.is_default);

  useEffect(() => {
    if (!open) return;
    const defaultCode = defaultLang?.code ?? "";
    setActiveLang(defaultCode);
    if (editing) {
      setTitleValues(parseTitle(editing.title));
      setIsViewOnly(editing.is_view_only);
      setFile(null);
    } else {
      setTitleValues({});
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setIsViewOnly(false);
    }
  }, [open, editing, defaultLang?.code]);

  // If languages load after the dialog opens, activeLang may still be "". Fix it.
  useEffect(() => {
    if (open && !activeLang && defaultLang?.code) {
      setActiveLang(defaultLang.code);
    }
  }, [open, activeLang, defaultLang?.code]);

  const mutation = useMutation({
    mutationFn: () => {
      const formData = new FormData();
      formData.append("title", JSON.stringify(titleValues));
      if (file) formData.append("file", file);
      formData.append("is_view_only", String(isViewOnly));
      formData.append("is_active", "true");
      return editing ? documentsApi.update(editing.id, formData) : documentsApi.create(formData);
    },
    onSuccess: () => {
      toast.success(editing ? "Document updated." : "Document uploaded.");
      onSuccess();
      onOpenChange(false);
    },
    onError: () => toast.error("Failed to save document."),
  });

  const canSubmit =
    !!titleValues[defaultLang?.code ?? "en"]?.trim() &&
    (editing ? true : !!file);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Document" : "Upload Document"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Title with language switcher */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                Title <span className="text-destructive">*</span>
              </label>
              {langsLoading && <Skeleton className="h-8 w-36" />}
              {!langsLoading && languages.length > 1 && (
                <Select value={activeLang} onValueChange={setActiveLang}>
                  <SelectTrigger className="h-8 w-36 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => {
                      const filled = !!titleValues[lang.code]?.trim();
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
            </div>
            {!langsLoading && activeLang && activeLang !== defaultLang?.code && (
              <p className="text-xs text-muted-foreground">
                Optional — leave blank to show {defaultLang?.name} as fallback.
              </p>
            )}
            {langsLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Input
                value={titleValues[activeLang] ?? ""}
                onChange={(e) =>
                  setTitleValues((prev) => ({ ...prev, [activeLang]: e.target.value }))
                }
                placeholder={`Document title in ${languages.find((l) => l.code === activeLang)?.name ?? activeLang}`}
              />
            )}
          </div>

          {/* File upload */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">
              PDF File {!editing && <span className="text-destructive">*</span>}
            </label>

            {/* Existing file row (edit mode, no new file chosen yet) */}
            {editing && !file && (
              <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm text-foreground truncate">{editing.title_display}</span>
                  <span className="text-xs text-muted-foreground shrink-0">({formatFileSize(editing.file_size)})</span>
                </div>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  <a
                    href={editing.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    View
                  </a>
                  <label className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                    Replace
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Newly selected file */}
            {file && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
                  <div className="flex flex-col w-0 flex-1">
                    <span className="text-sm text-foreground truncate">{file.name}</span>
                    <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const url = URL.createObjectURL(file);
                        window.open(url, "_blank");
                        setTimeout(() => URL.revokeObjectURL(url), 10_000);
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                    >
                      {editing ? "Cancel" : <X className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {editing && (
                  <p className="text-xs text-muted-foreground">
                    This will replace the existing file. Click Cancel to keep the original.
                  </p>
                )}
              </div>
            )}

            {/* File picker (add mode only) */}
            {!editing && !file && (
              <Input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            )}
          </div>

          {/* Options */}
          <div className="flex items-center gap-4 border-t pt-3">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={isViewOnly}
                onChange={(e) => setIsViewOnly(e.target.checked)}
                className="h-4 w-4 rounded border-input accent-green-600"
              />
              <span className="text-sm">View only (no download)</span>
            </label>
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

// ─── Documents Tab ────────────────────────────────────────────────────────────

export function DocumentsTab({ t = {} }: { t?: T }) {
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminDocument | null>(null);
  const [previewDoc, setPreviewDoc] = useState<AdminDocument | null>(null);

  const { data: documents = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin-documents"],
    queryFn: documentsApi.getAll,
    staleTime: 30_000,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      active ? documentsApi.activate(id) : documentsApi.deactivate(id),
    onSuccess: () => {
      toast.success(t.toast_doc_updated ?? "Document updated.");
      queryClient.invalidateQueries({ queryKey: ["admin-documents"] });
    },
    onError: () => toast.error(t.toast_doc_update_failed ?? "Failed to update document."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => documentsApi.remove(id),
    onSuccess: () => {
      toast.success(t.toast_doc_deleted ?? "Document deleted.");
      queryClient.invalidateQueries({ queryKey: ["admin-documents"] });
    },
    onError: () => toast.error(t.toast_doc_delete_failed ?? "Failed to delete document."),
  });

  function handleDelete(doc: AdminDocument) {
    confirm({
      title: t.doc_delete_title ?? "Delete Document",
      description: (t.doc_delete_description ?? 'Are you sure you want to delete "{name}"? This cannot be undone.').replace("{name}", doc.title_display),
      onConfirm: () => deleteMutation.mutateAsync(doc.id),
    });
  }

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(doc: AdminDocument) {
    setEditing(doc);
    setDialogOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{t.doc_section_title ?? "Documents"}</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={openAdd}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t.btn_add_document ?? "Add Document"}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className={`rounded-lg border transition-opacity ${isFetching && !isLoading ? "opacity-60" : ""}`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : documents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground text-sm">
                  No documents uploaded yet.
                </TableCell>
              </TableRow>
            ) : (
              documents.map((doc) => (
                <TableRow key={doc.id} className={!doc.is_active ? "opacity-50" : ""}>
                  <TableCell>
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 font-medium hover:underline text-sm"
                    >
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      {doc.title_display}
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </a>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatFileSize(doc.file_size)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        doc.is_view_only
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      }
                    >
                      {doc.is_view_only ? "View only" : "Downloadable"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        doc.is_active
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {doc.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(doc.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setPreviewDoc(doc)}>
                          <ZoomIn className="mr-2 h-4 w-4" />
                          View PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(doc)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => toggleMutation.mutate({ id: doc.id, active: !doc.is_active })}
                        >
                          {doc.is_active ? (
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
                          onClick={() => handleDelete(doc)}
                        >
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

      <DocumentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["admin-documents"] })}
      />

      {/* PDF Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={(v) => { if (!v) setPreviewDoc(null); }}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              {previewDoc?.title_display}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            {previewDoc && (
              <iframe
                src={previewDoc.file_url}
                className="w-full h-full"
                title={previewDoc.title_display}
              />
            )}
          </div>
          <div className="px-6 py-3 border-t shrink-0 flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              {previewDoc && formatFileSize(previewDoc.file_size)}
            </span>
            <div className="flex items-center gap-2">
              {previewDoc && !previewDoc.is_view_only && (
                <a
                  href={`${previewDoc.file_url}?download=1`}
                  download
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Download
                </a>
              )}
              <a
                href={previewDoc?.file_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open in tab
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
