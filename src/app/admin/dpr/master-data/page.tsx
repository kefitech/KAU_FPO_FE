"use client";

import { useMemo, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { DprMasterCategory } from "@/lib/api/dpr-master";
import {
  DPR_MASTER_GROUPS,
  dprAdminMasterApi,
  type DprAdminMasterRow,
} from "@/app/admin/_api/dpr-master";

// ── Field metadata for extra fields per category ──────────────────────────
//
// Base fields on every row: id, code, label_en, label_ml, order, is_active.
// Some categories have extra fields — we render them dynamically below.

const BASE_FIELDS = new Set([
  "id",
  "code",
  "label_en",
  "label_ml",
  "order",
  "is_active",
  "created_at",
  "updated_at",
  "created_by",
  "updated_by",
]);

// Human labels for the known extra fields (falls back to key.replace(_, ' ') for unknowns)
const EXTRA_FIELD_LABELS: Record<string, string> = {
  group: "Group",
  category: "Category",
  default_mandatory: "Default Mandatory",
  issuing_authority_default: "Default Issuing Authority",
  default_depreciation_rate_pct: "Default Depreciation Rate (%)",
  default_useful_life_years: "Default Useful Life (years)",
  requires_justification: "Requires Justification",
  is_digital: "Is Digital",
};

function labelFor(key: string): string {
  return EXTRA_FIELD_LABELS[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isNumberLike(value: unknown): boolean {
  return typeof value === "number" || (typeof value === "string" && value !== "" && !Number.isNaN(Number(value)));
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function AdminMasterDataPage() {
  const [activeCategory, setActiveCategory] = useState<DprMasterCategory>("fuel-types");

  const activeInfo = useMemo(() => {
    for (const g of DPR_MASTER_GROUPS) {
      const found = g.categories.find((c) => c.slug === activeCategory);
      if (found) return { group: g.label, ...found };
    }
    return null;
  }, [activeCategory]);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] min-h-0 flex-col">
      {/* Header */}
      <div className="border-b bg-background px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/dpr">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-sm font-semibold">DPR Master Data</h1>
            <p className="text-xs text-muted-foreground">
              Edit the dropdown lists shown in the FPO DPR wizard. Changes propagate immediately.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1">
        {/* Left: category sidebar */}
        <aside className="w-64 shrink-0 overflow-y-auto border-r bg-muted/30 p-3">
          {DPR_MASTER_GROUPS.map((g) => (
            <div key={g.label} className="mb-4">
              <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                {g.label}
              </div>
              <nav className="space-y-0.5">
                {g.categories.map((c) => {
                  const active = activeCategory === c.slug;
                  return (
                    <button
                      key={c.slug}
                      type="button"
                      onClick={() => setActiveCategory(c.slug)}
                      className={cn(
                        "flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                        active
                          ? "bg-accent text-accent-foreground font-medium"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                      )}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          ))}
        </aside>

        {/* Right: table for selected category */}
        <main className="flex-1 overflow-y-auto">
          <CategoryPane category={activeCategory} title={activeInfo?.label ?? ""} />
        </main>
      </div>
    </div>
  );
}

// ── Category pane (fetch + table + modal) ─────────────────────────────────

function CategoryPane({ category, title }: { category: DprMasterCategory; title: string }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<{ mode: "add" | "edit"; row: DprAdminMasterRow } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<DprAdminMasterRow | null>(null);

  const query = useQuery({
    queryKey: ["admin-dpr-master", category],
    queryFn: () => dprAdminMasterApi.list(category),
    staleTime: 30_000,
  });

  const createMut = useMutation({
    mutationFn: (payload: DprAdminMasterRow) => dprAdminMasterApi.create(category, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-dpr-master", category] });
      // Also invalidate the FPO-side cached list so any open FPO screens refetch
      queryClient.invalidateQueries({ queryKey: ["dpr-master", category] });
      setEditing(null);
      toast.success("Row created");
    },
    onError: () => toast.error("Failed to create row"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<DprAdminMasterRow> }) =>
      dprAdminMasterApi.update(category, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-dpr-master", category] });
      queryClient.invalidateQueries({ queryKey: ["dpr-master", category] });
      setEditing(null);
      toast.success("Row updated");
    },
    onError: () => toast.error("Failed to update row"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => dprAdminMasterApi.delete(category, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-dpr-master", category] });
      queryClient.invalidateQueries({ queryKey: ["dpr-master", category] });
      setConfirmDelete(null);
      toast.success("Row deleted");
    },
    onError: () => toast.error("Failed to delete row"),
  });

  const rows = query.data ?? [];

  // Build the empty row shape from the first existing row's keys (or fall back to base fields)
  const emptyRow: DprAdminMasterRow = useMemo(() => {
    const template = rows[0] ?? { id: 0, code: "", label_en: "", label_ml: "", order: 0, is_active: true };
    const empty: Record<string, unknown> = {};
    for (const key of Object.keys(template)) {
      if (BASE_FIELDS.has(key)) continue;
      const v = (template as Record<string, unknown>)[key];
      // sensible defaults for extras
      if (isBoolean(v)) empty[key] = false;
      else if (typeof v === "number") empty[key] = 0;
      else empty[key] = "";
    }
    return {
      id: 0,
      code: "",
      label_en: "",
      label_ml: "",
      order: rows.length,
      is_active: true,
      ...empty,
    };
  }, [rows]);

  const extraKeys = useMemo(() => {
    const template = rows[0];
    if (!template) return [] as string[];
    return Object.keys(template).filter((k) => !BASE_FIELDS.has(k));
  }, [rows]);

  return (
    <div className="p-4">
      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="text-xs text-muted-foreground">
                {query.isLoading ? "Loading…" : `${rows.length} row${rows.length === 1 ? "" : "s"}`}
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setEditing({ mode: "add", row: { ...emptyRow } })}
              disabled={query.isLoading}
            >
              <Plus className="mr-1 h-4 w-4" /> Add row
            </Button>
          </div>

          {query.isLoading ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
              No rows yet. Click <span className="font-medium">Add row</span> to create one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Label (EN)</TableHead>
                  <TableHead>Label (ML)</TableHead>
                  {extraKeys.map((k) => (
                    <TableHead key={k}>{labelFor(k)}</TableHead>
                  ))}
                  <TableHead className="w-20">Active</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-mono text-xs">{row.code}</TableCell>
                    <TableCell>{row.label_en}</TableCell>
                    <TableCell className="text-muted-foreground">{row.label_ml || "—"}</TableCell>
                    {extraKeys.map((k) => {
                      const v = row[k];
                      let display: string;
                      if (isBoolean(v)) display = v ? "Yes" : "No";
                      else if (v === null || v === undefined || v === "") display = "—";
                      else display = String(v);
                      return (
                        <TableCell key={k} className="text-xs">
                          {display}
                        </TableCell>
                      );
                    })}
                    <TableCell>
                      <Badge variant={row.is_active ? "default" : "secondary"} className="text-[10px]">
                        {row.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setEditing({ mode: "edit", row: { ...row } })}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setConfirmDelete(row)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {editing && (
        <RowModal
          mode={editing.mode}
          initial={editing.row}
          extraKeys={extraKeys}
          categoryLabel={title}
          saving={createMut.isPending || updateMut.isPending}
          onCancel={() => setEditing(null)}
          onSave={(row) => {
            if (editing.mode === "add") createMut.mutate(row);
            else updateMut.mutate({ id: editing.row.id, payload: row });
          }}
        />
      )}

      {confirmDelete && (
        <Dialog open onOpenChange={(v) => { if (!v) setConfirmDelete(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete this row?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Deleting <code className="font-mono">{confirmDelete.code}</code> ({confirmDelete.label_en}) is permanent.
              Any DPR project that referenced this row via FK will fail on save until the FK is corrected.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <Button
                variant="destructive"
                disabled={deleteMut.isPending}
                onClick={() => deleteMut.mutate(confirmDelete.id)}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ── Row modal (add/edit) ──────────────────────────────────────────────────

function RowModal({
  mode,
  initial,
  extraKeys,
  categoryLabel,
  saving,
  onCancel,
  onSave,
}: {
  mode: "add" | "edit";
  initial: DprAdminMasterRow;
  extraKeys: string[];
  categoryLabel: string;
  saving: boolean;
  onCancel: () => void;
  onSave: (row: DprAdminMasterRow) => void;
}) {
  const [row, setRow] = useState<DprAdminMasterRow>(initial);
  function set(key: string, value: unknown) {
    setRow((prev) => ({ ...prev, [key]: value }));
  }

  const valid = row.code.trim().length > 0 && row.label_en.trim().length > 0;

  return (
    <Dialog open onOpenChange={(v) => { if (!v && !saving) onCancel(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "add" ? "Add row" : "Edit row"} — {categoryLabel}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Code *</Label>
              <Input
                value={row.code}
                onChange={(e) => set("code", e.target.value)}
                placeholder="snake_case_identifier"
                disabled={mode === "edit"}
                className="font-mono text-sm"
              />
              {mode === "edit" && (
                <p className="text-[10px] text-muted-foreground">Code is immutable after creation.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Order</Label>
              <Input
                type="number"
                min="0"
                value={row.order}
                onChange={(e) => set("order", Number(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Label (English) *</Label>
            <Input
              value={row.label_en}
              onChange={(e) => set("label_en", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Label (Malayalam)</Label>
            <Input
              value={row.label_ml}
              onChange={(e) => set("label_ml", e.target.value)}
              placeholder="Optional"
            />
          </div>

          {/* Extra fields (varies per category) */}
          {extraKeys.map((key) => {
            const value = row[key];
            const isBool = isBoolean(value) || isBoolean(initial[key]);
            const isNum = !isBool && (typeof initial[key] === "number" || (typeof initial[key] === "string" && isNumberLike(initial[key])));
            return (
              <div key={key} className="space-y-1.5">
                <Label>{labelFor(key)}</Label>
                {isBool ? (
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox
                      checked={!!value}
                      onCheckedChange={(c) => set(key, !!c)}
                    />
                    <span>Enabled</span>
                  </label>
                ) : (
                  <Input
                    type={isNum ? "number" : "text"}
                    step={isNum ? "0.01" : undefined}
                    value={value === null || value === undefined ? "" : String(value)}
                    onChange={(e) => set(key, isNum ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value)}
                  />
                )}
              </div>
            );
          })}

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={row.is_active}
              onCheckedChange={(c) => set("is_active", !!c)}
            />
            <span>Active (shown in FPO dropdowns)</span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button disabled={!valid || saving} onClick={() => onSave(row)}>
            {saving ? "Saving…" : mode === "add" ? "Create" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
