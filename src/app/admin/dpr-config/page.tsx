"use client";

/**
 * DPR Config — KAU Central Admin-controlled parameters for the DPR module.
 *
 * Built per KAU RCD reply B.6 (2026-09-02): "Financial assumption defaults
 * shall be set and controlled by the KAU Central Administrator."
 *
 * Layout: one card per category, one row per parameter. Inline edit uses a
 * modal so we can enforce type/bounds before saving. Reset-to-default button
 * next to every row. Every mutation writes an AuditLog row on the backend.
 *
 * Author: Athul Gopan Kefi Tech Solutions
 */

import { useEffect, useMemo, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, RotateCcw, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import {
  dprConfigApi,
  type DPRConfigCategory,
  type DPRConfigRow,
} from "@/app/admin/_api/dpr-config";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useConfirmStore } from "@/stores/confirm-store";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

type T = Record<string, string>;

// Category card headings + display order (drives sidebar-like layout).
const CATEGORY_ORDER: Array<{ key: DPRConfigCategory; label: string; hint: string }> = [
  { key: "financial", label: "Financial Assumptions", hint: "Rates that drive P&L, IRR, NPV and depreciation." },
  { key: "projection", label: "Projection Settings", hint: "Number of years the balance sheet and cash flow project forward." },
  { key: "variance", label: "Variance Thresholds", hint: "How large a mismatch between user-entered vs computed totals is tolerated before a warning fires." },
  { key: "retention", label: "Retention & Archival", hint: "How many historical PDF versions to keep per project." },
  { key: "risk", label: "Risk Matrix", hint: "Configuration for the probability × impact matrix used to score project risk." },
  { key: "other", label: "Other", hint: "Miscellaneous parameters." },
];

function formatValue(row: DPRConfigRow): string {
  const v = row.value;
  if (row.value_type === "bool") return v ? "Yes" : "No";
  const unit = row.unit ? ` ${row.unit}` : "";
  return `${v}${unit}`;
}

function isAtDefault(row: DPRConfigRow): boolean {
  return String(row.value) === String(row.default_value);
}

export default function AdminDprConfigPage() {
  const qc = useQueryClient();
  const locale = useLocaleStore((s) => s.locale);

  // i18n — Malayalam keys already seeded in scripts/seed_translations.py
  // under `admin_dpr_config`. Every t.<key> lookup below falls back to the
  // English literal so pre-i18n behaviour is preserved if a key is missing.
  const [t, setT] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});
  useEffect(() => {
    translationsApi
      .getPublic(locale, "admin_dpr_config,common")
      .then((data) => {
        setT((data.admin_dpr_config ?? {}) as T);
        setTCommon((data.common ?? {}) as T);
      })
      .catch(() => undefined);
  }, [locale]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-dpr-config"],
    queryFn: () => dprConfigApi.list(),
  });

  // Track which row is being edited — one modal at a time.
  const [editingRow, setEditingRow] = useState<DPRConfigRow | null>(null);

  const updateMutation = useMutation({
    mutationFn: ({ id, value }: { id: number; value: string | number | boolean }) =>
      dprConfigApi.update(id, value),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["admin-dpr-config"] });
      toast.success(t.toast_updated ?? `${row.label} updated.`);
      setEditingRow(null);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string; data?: unknown } } })?.response?.data
          ?.message ?? (t.toast_update_failed ?? "Failed to update. Please check the value and try again.");
      toast.error(msg);
    },
  });

  const openConfirm = useConfirmStore((s) => s.confirm);

  const resetMutation = useMutation({
    mutationFn: (id: number) => dprConfigApi.reset(id),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["admin-dpr-config"] });
      toast.success(`${row.label} ${t.toast_reset ?? "reset to default."}`);
    },
    onError: () => toast.error(t.toast_reset_failed ?? "Failed to reset value."),
  });

  const orderedCategories = useMemo(() => {
    if (!data) return [];
    return CATEGORY_ORDER
      .map((c) => ({ ...c, rows: data.categories[c.key] ?? [] }))
      .filter((c) => c.rows.length > 0);
  }, [data]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/dpr">
            <ArrowLeft className="mr-1 h-4 w-4" /> {tCommon.back ?? "Back to DPR"}
          </Link>
        </Button>
      </div>

      <div className="flex items-start gap-4">
        <div className="rounded-md bg-muted p-3">
          <SlidersHorizontal className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">{t.page_title ?? "DPR Configuration"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t.page_description
              ?? "KAU Central Admin-controlled parameters — inflation, depreciation, discount rate, variance tolerances and more. Every change is recorded in the audit log."}
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {t.loading ?? "Loading configuration…"}
        </div>
      )}

      {isError && (
        <Card>
          <CardContent className="p-5 text-sm text-destructive">
            {t.load_failed ?? "Failed to load configuration."} {(error as Error)?.message ?? (tCommon.please_refresh ?? "Please refresh.")}
          </CardContent>
        </Card>
      )}

      {orderedCategories.map((cat) => (
        <Card key={cat.key}>
          <CardContent className="space-y-3 p-5">
            <div>
              <h2 className="text-sm font-semibold">{cat.label}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{cat.hint}</p>
            </div>
            <div className="divide-y">
              {cat.rows.map((row) => (
                <div key={row.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{row.label}</span>
                      {!isAtDefault(row) && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                          Modified from default
                        </span>
                      )}
                      {!row.is_editable && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          Read-only
                        </span>
                      )}
                    </div>
                    {row.description && (
                      <p className="mt-1 text-xs text-muted-foreground">{row.description}</p>
                    )}
                    {row.updated_by_email && (
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        Last changed by {row.updated_by_email} · {new Date(row.updated_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-sm font-medium tabular-nums">{formatValue(row)}</div>
                      {row.min_value != null && row.max_value != null && (
                        <div className="text-[10px] text-muted-foreground">
                          Range: {row.min_value} – {row.max_value}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!row.is_editable}
                        onClick={() => setEditingRow(row)}
                      >
                        Edit
                      </Button>
                      {!isAtDefault(row) && row.is_editable && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={resetMutation.isPending}
                          onClick={() => {
                            openConfirm({
                              title: `Reset ${row.label}?`,
                              description: `This will reset ${row.label} to its default value (${row.default_value}). Any admin override will be lost.`,
                              confirmLabel: "Reset",
                              confirmingLabel: "Resetting...",
                              variant: "default",
                              onConfirm: () => resetMutation.mutateAsync(row.id),
                            });
                          }}
                        >
                          <RotateCcw className="mr-1 h-3 w-3" /> Reset
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <EditModal
        row={editingRow}
        isSubmitting={updateMutation.isPending}
        onClose={() => setEditingRow(null)}
        onSubmit={(value) => {
          if (editingRow) updateMutation.mutate({ id: editingRow.id, value });
        }}
      />
    </div>
  );
}

// ── Edit modal ──────────────────────────────────────────────────────────────

function EditModal({
  row,
  isSubmitting,
  onClose,
  onSubmit,
}: {
  row: DPRConfigRow | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (value: string | number | boolean) => void;
}) {
  const [text, setText] = useState("");
  const [boolValue, setBoolValue] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!row) return;
    if (row.value_type === "bool") setBoolValue(Boolean(row.value));
    else setText(String(row.value));
    setError(null);
  }, [row]);

  if (!row) return null;

  function handleSave() {
    if (!row) return;
    setError(null);
    if (row.value_type === "bool") {
      onSubmit(boolValue);
      return;
    }
    if (row.value_type === "int") {
      const n = Number(text);
      if (!Number.isInteger(n)) {
        setError("Please enter a whole number.");
        return;
      }
      onSubmit(n);
      return;
    }
    if (row.value_type === "decimal") {
      const n = Number(text);
      if (!Number.isFinite(n)) {
        setError("Please enter a valid number.");
        return;
      }
      // Send as string — backend Decimal-parses; preserves precision.
      onSubmit(text.trim());
      return;
    }
    // string
    onSubmit(text);
  }

  return (
    <Dialog
      open={!!row}
      onOpenChange={(v) => {
        if (!v && !isSubmitting) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{row.label}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {row.description && (
            <p className="text-xs text-muted-foreground">{row.description}</p>
          )}
          <div className="space-y-2">
            <Label className="text-xs">Value{row.unit ? ` (${row.unit})` : ""}</Label>
            {row.value_type === "bool" ? (
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={boolValue}
                  onChange={(e) => setBoolValue(e.target.checked)}
                  className="h-4 w-4"
                />
                {boolValue ? "Yes" : "No"}
              </label>
            ) : (
              <Input
                type={row.value_type === "string" ? "text" : "number"}
                step={row.value_type === "decimal" ? "0.01" : "1"}
                value={text}
                onChange={(e) => setText(e.target.value)}
                autoFocus
              />
            )}
            {row.min_value != null && row.max_value != null && (
              <p className="text-[10px] text-muted-foreground">
                Allowed range: {row.min_value} – {row.max_value}
              </p>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <div className="rounded-md border bg-muted/40 p-2 text-[11px] text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">Default:</span> {String(row.default_value)}
              {row.unit ? ` ${row.unit}` : ""}
            </div>
            <div>
              <span className="font-medium text-foreground">Key:</span>{" "}
              <span className="font-mono">{row.key}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
