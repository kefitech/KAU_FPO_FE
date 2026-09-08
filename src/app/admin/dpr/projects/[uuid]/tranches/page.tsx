"use client";

/**
 * Admin — DPR Capital Tranches editor (per project).
 *
 * Per KAU RCD A.3 / B.8: super_admins record dated inflows (promoter
 * contribution, loan drawdown, subsidy release) and outflows (capex per
 * category) for a project. The calc engine consumes these to build the
 * time-phased capital schedule; without any tranches it falls back to
 * uniform-monthly with `is_estimated=true`.
 *
 * FPO-facing UI ships later (3b-4). Until then this admin page is the
 * only place tranches can be entered.
 *
 * Author: Athul Gopan (Kefi Tech Solutions)
 */

import { use, useMemo, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import {
  dprTranchesApi,
  INFLOW_TYPES,
  OUTFLOW_TYPES,
  TRANCHE_TYPE_LABELS,
  type DPRCapitalTranche,
  type DPRCapitalTrancheInput,
  type TrancheType,
} from "@/app/admin/_api/dpr-tranches";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

function fmtInr(v: string | number): string {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return String(v);
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
}

export default function AdminDprTranchesPage({
  params,
}: {
  params: Promise<{ uuid: string }>;
}) {
  const { uuid } = use(params);
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-dpr-tranches", uuid],
    queryFn: () => dprTranchesApi.list(uuid),
  });

  const [dialog, setDialog] = useState<{ open: boolean; editing: DPRCapitalTranche | null }>({
    open: false,
    editing: null,
  });

  const createMutation = useMutation({
    mutationFn: (payload: DPRCapitalTrancheInput) => dprTranchesApi.create(uuid, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-dpr-tranches", uuid] });
      toast.success("Tranche added.");
      setDialog({ open: false, editing: null });
    },
    onError: () => toast.error("Failed to add tranche."),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: DPRCapitalTrancheInput & { id: number }) =>
      dprTranchesApi.update(uuid, payload.id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-dpr-tranches", uuid] });
      toast.success("Tranche updated.");
      setDialog({ open: false, editing: null });
    },
    onError: () => toast.error("Failed to update tranche."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => dprTranchesApi.remove(uuid, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-dpr-tranches", uuid] });
      toast.success("Tranche deleted.");
    },
    onError: () => toast.error("Failed to delete tranche."),
  });

  // Summary — split inflows vs outflows for the top strip
  const summary = useMemo(() => {
    const rows = data ?? [];
    const inflowTotal = rows
      .filter((t) => t.is_inflow)
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const outflowTotal = rows
      .filter((t) => t.is_outflow)
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    return { count: rows.length, inflowTotal, outflowTotal };
  }, [data]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/admin/dpr/projects/${uuid}`}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to project
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Capital Tranches</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Record actual timing of promoter contributions, loan disbursements, subsidies and
            capex. The DPR calculation engine uses these to build the 10-year balance sheet
            (per KAU RCD A.3). When empty, the calc falls back to a uniform-monthly estimate.
          </p>
        </div>
        <Button onClick={() => setDialog({ open: true, editing: null })}>
          <Plus className="mr-1 h-4 w-4" /> Add tranche
        </Button>
      </div>

      {/* Summary strip */}
      {data && data.length > 0 && (
        <Card>
          <CardContent className="grid grid-cols-3 divide-x p-0">
            <div className="p-4">
              <p className="text-xs text-muted-foreground">Total tranches</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{summary.count}</p>
            </div>
            <div className="p-4">
              <p className="text-xs text-muted-foreground">Inflow total</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                ₹ {fmtInr(summary.inflowTotal)}
              </p>
            </div>
            <div className="p-4">
              <p className="text-xs text-muted-foreground">Outflow total (capex)</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-orange-700 dark:text-orange-400">
                ₹ {fmtInr(summary.outflowTotal)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading tranches…
        </div>
      )}

      {isError && (
        <Card>
          <CardContent className="p-5 text-sm text-destructive">
            Failed to load tranches.
          </CardContent>
        </Card>
      )}

      {data && data.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              No tranches recorded yet.
            </p>
            <p className="max-w-md text-xs text-muted-foreground">
              The DPR calc engine will fall back to a uniform-monthly capital schedule
              (flagged as “estimated” in the PDF). Add tranches to reflect actual timing.
            </p>
          </CardContent>
        </Card>
      )}

      {data && data.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-16 text-center">Month</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount (₹)</TableHead>
                  <TableHead>Flow</TableHead>
                  <TableHead>Actual</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-center font-medium tabular-nums">
                      M{t.expected_month}
                    </TableCell>
                    <TableCell className="text-sm">{t.tranche_type_display}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {fmtInr(t.amount)}
                    </TableCell>
                    <TableCell>
                      {t.is_inflow ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          Inflow
                        </span>
                      ) : (
                        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-950 dark:text-orange-300">
                          Outflow
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {t.is_actual ? (
                        <span className="text-xs text-emerald-700 dark:text-emerald-400">✓ Actual</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Projected</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-muted-foreground" title={t.description}>
                      {t.description || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDialog({ open: true, editing: t })}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        disabled={deleteMutation.isPending}
                        onClick={() => {
                          if (window.confirm(`Delete tranche M${t.expected_month} · ${t.tranche_type_display}?`)) {
                            deleteMutation.mutate(t.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <TrancheDialog
        open={dialog.open}
        editing={dialog.editing}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onClose={() => setDialog({ open: false, editing: null })}
        onSubmit={(payload) => {
          if (dialog.editing) {
            updateMutation.mutate({ ...payload, id: dialog.editing.id });
          } else {
            createMutation.mutate(payload);
          }
        }}
      />
    </div>
  );
}

// ── Dialog ─────────────────────────────────────────────────────────────────

function TrancheDialog({
  open,
  editing,
  isSubmitting,
  onClose,
  onSubmit,
}: {
  open: boolean;
  editing: DPRCapitalTranche | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: DPRCapitalTrancheInput) => void;
}) {
  const [form, setForm] = useState<DPRCapitalTrancheInput>(() => ({
    tranche_type: "promoter_contribution",
    amount: "",
    expected_month: 1,
    is_actual: false,
    description: "",
    finance_field: "",
  }));

  // Reset form when opened / target changes
  useMemo(() => {
    if (open) {
      if (editing) {
        setForm({
          tranche_type: editing.tranche_type,
          amount: editing.amount,
          expected_month: editing.expected_month,
          is_actual: editing.is_actual,
          description: editing.description,
          finance_field: editing.finance_field,
        });
      } else {
        setForm({
          tranche_type: "promoter_contribution",
          amount: "",
          expected_month: 1,
          is_actual: false,
          description: "",
          finance_field: "",
        });
      }
    }
  }, [open, editing]);

  const canSubmit =
    !!form.tranche_type
    && String(form.amount).trim() !== ""
    && Number(form.amount) > 0
    && Number.isInteger(form.expected_month)
    && form.expected_month >= 1;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !isSubmitting) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit tranche" : "Add tranche"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Type *</Label>
              <Select
                value={form.tranche_type}
                onValueChange={(v) => setForm((f) => ({ ...f, tranche_type: v as TrancheType }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase text-muted-foreground">
                    Inflows
                  </div>
                  {INFLOW_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{TRANCHE_TYPE_LABELS[t]}</SelectItem>
                  ))}
                  <div className="mt-1 px-2 py-1 text-[10px] font-semibold uppercase text-muted-foreground">
                    Outflows (Capex)
                  </div>
                  {OUTFLOW_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{TRANCHE_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Month * (1-indexed within implementation period)</Label>
              <Input
                type="number"
                min={1}
                max={60}
                value={form.expected_month}
                onChange={(e) => setForm((f) => ({ ...f, expected_month: Number(e.target.value) }))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Amount (₹) *</Label>
            <Input
              type="number"
              step="0.01"
              min={0}
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="e.g. 250000"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Finance field (optional cross-reference)</Label>
            <Input
              value={form.finance_field}
              onChange={(e) => setForm((f) => ({ ...f, finance_field: e.target.value }))}
              placeholder="e.g. mof_promoters_contribution"
            />
            <p className="text-[11px] text-muted-foreground">
              Cross-references a field on the Finance section. Sum of tranches for this field is
              compared against the section total in the calc engine reconciliation.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="e.g. First loan drawdown from SBI"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_actual ?? false}
              onChange={(e) => setForm((f) => ({ ...f, is_actual: e.target.checked }))}
              className="h-4 w-4"
            />
            <span>Mark as <strong>actual</strong> (event has happened — timing confirmed)</span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button
            disabled={!canSubmit || isSubmitting}
            onClick={() => onSubmit(form)}
          >
            {isSubmitting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            {editing ? "Save" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
