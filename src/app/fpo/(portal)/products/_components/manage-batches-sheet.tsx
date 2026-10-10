"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { productStocksApi } from "@/app/fpo/_api/product-stocks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getErrorMessage } from "@/lib/get-error-message";
import { useConfirmStore } from "@/stores/confirm-store";
import type { Product, ProductStatus, ProductStock } from "@/types/fpo";

import { BatchForm, type BatchFormValues, batchFromStock, toCreatePayload } from "./batch-form";

type T = Record<string, string>;

/** Field-level validation errors from the API, or null when the failure wasn't about a field. */
function fieldErrorsOf(err: unknown): Record<string, string[]> | null {
  const errors = (err as { data?: { errors?: Record<string, string[]> } } | undefined)?.data?.errors;
  return errors && Object.keys(errors).length > 0 ? errors : null;
}

function statusClasses(status: ProductStatus): string {
  switch (status) {
    case "draft":
      return "border-slate-200 bg-slate-50 text-slate-700";
    case "active":
      return "border-green-200 bg-green-50 text-green-700";
    case "sold":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "expired":
      return "border-red-200 bg-red-50 text-red-700";
  }
}

interface ManageBatchesSheetProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  t?: T;
  tCommon?: T;
}

type FormState =
  | { mode: "list" }
  | { mode: "add" }
  | { mode: "edit"; stock: ProductStock };

/**
 * Right-hand sheet that lists every stock batch on a product and lets the
 * FPO add new batches, edit a draft/active batch, publish a draft (singly
 * or in bulk), mark an active batch as sold, or delete a draft.
 *
 * Backed by productStocksApi — nested under /products/{id}/stocks/ on the
 * backend (apps/marketplace/api/stocks.py). Bulk publish fires the single
 * publish endpoint once per selected draft and refreshes the list after
 * all requests settle.
 */
// Sheet width persisted across opens (sessionStorage keeps it for the
// current tab only — resets on refresh is fine, we don't need durability).
const WIDTH_STORAGE_KEY = "manage-batches-sheet-width";
const MIN_SHEET_WIDTH = 480;
const DEFAULT_SHEET_WIDTH = 672; // matches the old sm:max-w-2xl constant

export function ManageBatchesSheet({ product, open, onOpenChange, t = {}, tCommon = {} }: ManageBatchesSheetProps) {
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);
  const [formState, setFormState] = useState<FormState>({ mode: "list" });
  const [serverErrors, setServerErrors] = useState<Record<string, string[]> | null>(null);
  const openForm = (state: FormState) => {
    setServerErrors(null);
    setFormState(state);
  };
  const [selectedDraftIds, setSelectedDraftIds] = useState<Set<number>>(new Set());

  // Draggable sheet width — the FPO can grab the left edge and widen the
  // sheet when they need more room for the batch form. Persists for the
  // tab's lifetime so the preference survives closing/reopening.
  const [sheetWidth, setSheetWidth] = useState<number>(() => {
    if (typeof window === "undefined") return DEFAULT_SHEET_WIDTH;
    const stored = window.sessionStorage.getItem(WIDTH_STORAGE_KEY);
    const parsed = stored ? Number.parseInt(stored, 10) : NaN;
    return Number.isFinite(parsed) && parsed >= MIN_SHEET_WIDTH ? parsed : DEFAULT_SHEET_WIDTH;
  });
  const isDraggingRef = useRef(false);

  const handleResizePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    // Suppress text selection while dragging for a cleaner feel.
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  }, []);

  const handleResizePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    // Sheet is anchored to the right; width = viewport width - cursor X.
    const next = Math.round(window.innerWidth - e.clientX);
    const clamped = Math.min(
      Math.max(next, MIN_SHEET_WIDTH),
      Math.round(window.innerWidth * 0.95),
    );
    setSheetWidth(clamped);
  }, []);

  const handleResizePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
    try {
      window.sessionStorage.setItem(WIDTH_STORAGE_KEY, String(sheetWidth));
    } catch {
      // sessionStorage may be unavailable in private browsing — resize
      // still works, just doesn't persist. Safe to swallow.
    }
  }, [sheetWidth]);

  // Pull a fresh list from the server when the sheet opens — the product
  // row's embedded `stocks` snapshot can be stale after an action here.
  const { data: stocks = [], isLoading } = useQuery({
    queryKey: ["product-stocks", product.id],
    queryFn: () => productStocksApi.list(product.id),
    enabled: open,
  });

  const draftIds = useMemo(
    () => stocks.filter((s) => s.status === "draft").map((s) => s.id),
    [stocks],
  );

  // Prune selections if any selected drafts disappeared (e.g. after a bulk
  // publish, deletion, or server-side status change).
  useEffect(() => {
    setSelectedDraftIds((prev) => {
      const next = new Set<number>();
      for (const id of prev) if (draftIds.includes(id)) next.add(id);
      return next.size === prev.size ? prev : next;
    });
  }, [draftIds]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["product-stocks", product.id] });
    // Also refresh the parent product list — latest_stock / has_stock
    // badges reflect the batch changes.
    queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  const createMutation = useMutation({
    mutationFn: (values: BatchFormValues) => productStocksApi.create(product.id, toCreatePayload(values)),
    onSuccess: () => {
      toast.success(t.toast_batch_created ?? "Batch added");
      setFormState({ mode: "list" });
      invalidate();
    },
    onError: (err) => {
      const fieldErrors = fieldErrorsOf(err);
      setServerErrors(fieldErrors);
      if (!fieldErrors) toast.error(getErrorMessage(err, t.err_batch_create_failed ?? "Failed to add batch"));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ stockId, values }: { stockId: number; values: BatchFormValues }) =>
      productStocksApi.update(product.id, stockId, toCreatePayload(values)),
    onSuccess: () => {
      toast.success(t.toast_batch_updated ?? "Batch updated");
      setFormState({ mode: "list" });
      invalidate();
    },
    onError: (err) => {
      const fieldErrors = fieldErrorsOf(err);
      setServerErrors(fieldErrors);
      if (!fieldErrors) {
        toast.error(getErrorMessage(err, t.err_batch_update_failed ?? "Only draft or active batches can be edited"));
      }
    },
  });

  const publishMutation = useMutation({
    mutationFn: (stockId: number) => productStocksApi.publish(product.id, stockId),
    onSuccess: () => {
      toast.success(t.toast_batch_published ?? "Batch published");
      invalidate();
    },
    onError: () => toast.error(t.err_batch_publish_failed ?? "Only draft batches can be published"),
  });

  const bulkPublishMutation = useMutation({
    mutationFn: async (stockIds: number[]) => {
      // Fire sequentially so one failure's error surfaces instead of being
      // swallowed by Promise.all. For typical batch counts (<10) the extra
      // round-trip cost is negligible.
      const results: { stockId: number; ok: boolean }[] = [];
      for (const id of stockIds) {
        try {
          await productStocksApi.publish(product.id, id);
          results.push({ stockId: id, ok: true });
        } catch {
          results.push({ stockId: id, ok: false });
        }
      }
      return results;
    },
    onSuccess: (results) => {
      const ok = results.filter((r) => r.ok).length;
      const fail = results.length - ok;
      if (fail === 0) {
        toast.success(
          t.toast_bulk_published?.replace("{count}", String(ok)) ?? `${ok} batch(es) published`,
        );
      } else if (ok === 0) {
        toast.error(t.err_bulk_publish_all_failed ?? "No batches could be published");
      } else {
        toast.warning(
          t.toast_bulk_published_partial
            ?.replace("{ok}", String(ok))
            .replace("{fail}", String(fail)) ??
            `${ok} published, ${fail} failed`,
        );
      }
      setSelectedDraftIds(new Set());
      invalidate();
    },
  });

  const markSoldMutation = useMutation({
    mutationFn: (stockId: number) => productStocksApi.markSold(product.id, stockId),
    onSuccess: () => {
      toast.success(t.toast_batch_sold ?? "Batch marked as sold");
      invalidate();
    },
    onError: () => toast.error(t.err_batch_mark_sold_failed ?? "Only active batches can be marked sold"),
  });

  const deleteMutation = useMutation({
    mutationFn: (stockId: number) => productStocksApi.delete(product.id, stockId),
    onSuccess: () => {
      toast.success(t.toast_batch_deleted ?? "Batch deleted");
      invalidate();
    },
    onError: () => toast.error(t.err_batch_delete_failed ?? "Only draft batches can be deleted"),
  });

  const handleDelete = (stockId: number) => {
    confirm({
      title: t.confirm_batch_delete_title ?? "Delete Batch",
      description:
        t.confirm_batch_delete_description ??
        "Are you sure you want to delete this batch? This action cannot be undone.",
      onConfirm: () => deleteMutation.mutateAsync(stockId),
    });
  };

  const toggleDraftSelected = (stockId: number, checked: boolean) => {
    setSelectedDraftIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(stockId);
      else next.delete(stockId);
      return next;
    });
  };

  const toggleSelectAllDrafts = (checked: boolean) => {
    setSelectedDraftIds(checked ? new Set(draftIds) : new Set());
  };

  const allDraftsSelected = draftIds.length > 0 && draftIds.every((id) => selectedDraftIds.has(id));
  const selectedCount = selectedDraftIds.size;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0"
        // Inline style wins against the Tailwind `sm:max-w-...` default so the
        // dragged width persists through re-renders. We clamp in the pointer
        // handler, so this is already safe to assign directly.
        style={{ width: `${sheetWidth}px`, maxWidth: "95vw" }}
      >
        {/* Draggable resize handle on the left edge. 6px wide hit zone,
            invisible by default; shows a subtle vertical bar on hover so
            the FPO can discover it. */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={t.resize_handle_label ?? "Resize panel"}
          className="group absolute inset-y-0 left-0 z-10 w-1.5 cursor-col-resize touch-none select-none"
          onPointerDown={handleResizePointerDown}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerUp}
          onPointerCancel={handleResizePointerUp}
        >
          <div className="pointer-events-none absolute inset-y-0 left-0 w-full bg-transparent transition-colors group-hover:bg-primary/40" />
        </div>

        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle>{t.manage_batches_title ?? "Manage Batches"}</SheetTitle>
          <SheetDescription>
            {product.name.en} —{" "}
            {t.manage_batches_description ?? "Each batch has its own quantity, price, and validity window."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {formState.mode === "list" && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-muted-foreground text-sm">
                  {isLoading
                    ? (tCommon.loading ?? "Loading...")
                    : stocks.length === 0
                      ? (t.no_batches ?? "No batches yet. Add one to start selling.")
                      : `${stocks.length} ${stocks.length === 1 ? (t.batch_singular ?? "batch") : (t.batch_plural ?? "batches")}`}
                </p>
                <Button size="sm" onClick={() => openForm({ mode: "add" })}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  {t.add_batch_btn ?? "Add Batch"}
                </Button>
              </div>

              {/* Bulk-select toolbar — only appears when there's at least
                  one draft to act on. */}
              {draftIds.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="select-all-drafts"
                      checked={allDraftsSelected}
                      onCheckedChange={(v) => toggleSelectAllDrafts(Boolean(v))}
                    />
                    <label htmlFor="select-all-drafts" className="cursor-pointer text-sm">
                      {t.select_all_drafts ?? "Select all draft batches"}
                      {selectedCount > 0 && (
                        <span className="ml-1 text-muted-foreground text-xs">
                          ({selectedCount} {t.selected ?? "selected"})
                        </span>
                      )}
                    </label>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={selectedCount === 0 || bulkPublishMutation.isPending}
                    onClick={() => bulkPublishMutation.mutate(Array.from(selectedDraftIds))}
                  >
                    <Upload className="mr-1.5 h-4 w-4" />
                    {bulkPublishMutation.isPending
                      ? (t.publishing ?? "Publishing...")
                      : (t.publish_selected ?? "Publish Selected")}
                  </Button>
                </div>
              )}

              <div className="flex flex-col gap-3">
                {stocks.map((s) => {
                  const isEditable = s.status === "draft" || s.status === "active";
                  const isDraft = s.status === "draft";
                  const isActive = s.status === "active";
                  return (
                    <div key={s.id} className="rounded-lg border p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          {isDraft && (
                            <Checkbox
                              className="mt-1"
                              checked={selectedDraftIds.has(s.id)}
                              onCheckedChange={(v) => toggleDraftSelected(s.id, Boolean(v))}
                              aria-label={t.select_batch ?? "Select batch"}
                            />
                          )}
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">
                                {s.quantity} {s.unit}
                              </span>
                              <span className="text-muted-foreground">·</span>
                              <span className="text-sm">
                                ₹{s.price_per_unit}/{s.unit}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className={statusClasses(s.status)}>
                                {t[`status_${s.status}`] ?? s.status}
                              </Badge>
                              {s.is_public && (
                                <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-700">
                                  {t.public_badge ?? "Public"}
                                </Badge>
                              )}
                            </div>
                            <p className="text-muted-foreground text-xs">
                              {s.available_from}
                              {s.available_until ? ` – ${s.available_until}` : ` – ${t.open_ended ?? "open"}`}
                            </p>
                            {s.quality_certification && (
                              <p className="text-muted-foreground text-xs">{s.quality_certification}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1">
                          {isDraft && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => publishMutation.mutate(s.id)}
                              disabled={publishMutation.isPending}
                            >
                              <Upload className="mr-1 h-3.5 w-3.5" />
                              {t.action_publish ?? "Publish"}
                            </Button>
                          )}
                          {isActive && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => markSoldMutation.mutate(s.id)}
                              disabled={markSoldMutation.isPending}
                            >
                              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                              {t.action_mark_sold ?? "Mark Sold"}
                            </Button>
                          )}
                          {isEditable && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openForm({ mode: "edit", stock: s })}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              <span className="sr-only">{tCommon.edit ?? "Edit"}</span>
                            </Button>
                          )}
                          {isDraft && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => handleDelete(s.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span className="sr-only">{tCommon.delete ?? "Delete"}</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {formState.mode === "add" && (
            <div className="flex flex-col gap-4">
              <h3 className="font-semibold text-base">{t.add_batch_title ?? "Add New Batch"}</h3>
              <BatchForm
                onSubmit={(values) => createMutation.mutate(values)}
                onCancel={() => setFormState({ mode: "list" })}
                isSubmitting={createMutation.isPending}
                serverErrors={serverErrors ?? undefined}
                submitLabel={t.add_batch_submit ?? "Add Batch"}
                t={t}
                tCommon={tCommon}
              />
            </div>
          )}

          {formState.mode === "edit" && (
            <div className="flex flex-col gap-4">
              <h3 className="font-semibold text-base">{t.edit_batch_title ?? "Edit Batch"}</h3>
              <BatchForm
                defaultValues={batchFromStock(formState.stock)}
                onSubmit={(values) =>
                  updateMutation.mutate({ stockId: formState.stock.id, values })
                }
                onCancel={() => setFormState({ mode: "list" })}
                isSubmitting={updateMutation.isPending}
                serverErrors={serverErrors ?? undefined}
                submitLabel={tCommon.save_btn ?? "Save"}
                t={t}
                tCommon={tCommon}
              />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
