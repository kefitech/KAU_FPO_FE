"use client";

import { useState } from "react";

import { Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

/**
 * Reusable card wrapping a table of nested items + add/edit modal.
 * Used by every DPR section that has repeatable-row lists (civil, site, hr,
 * implementation, machinery, utilities, ess, raw-material, market, technology).
 *
 * Callers supply:
 *   - items / onChange — the array of rows, controlled by parent form state
 *   - emptyRow — starting values when "Add" is clicked
 *   - columns — how rows render as table cells (with optional custom render)
 *   - renderModal — inline JSX for the row-editing form
 *   - isValid — enable/disable Save button in modal
 */
export interface NestedColumn<T> {
  key: keyof T;
  label: string;
  render?: (value: unknown, row: T) => React.ReactNode;
}

export function NestedListCard<T extends { id?: number }>({
  title,
  items,
  onChange,
  emptyRow,
  columns,
  renderModal,
  isValid,
  addLabel,
  editLabel,
  emptyHint,
  error,
  warning,
}: {
  title: string;
  items: T[];
  onChange: (next: T[]) => void;
  emptyRow: T;
  columns: NestedColumn<T>[];
  renderModal: (row: T, set: <K extends keyof T>(k: K, v: T[K]) => void) => React.ReactNode;
  isValid: (row: T) => boolean;
  addLabel: string;
  editLabel: string;
  emptyHint?: string;
  /** Backend list-level error (e.g. "At least one X must be added"). Renders red under the title. */
  error?: string;
  /** Backend list-level warning (e.g. "Consider adding at least one for a complete DPR"). Renders amber. */
  warning?: string;
}) {
  const [editing, setEditing] = useState<{ index: number; row: T } | null>(null);

  function openAdd() {
    setEditing({ index: items.length, row: { ...emptyRow } });
  }
  function openEdit(idx: number) {
    setEditing({ index: idx, row: { ...items[idx] } });
  }
  function commit(row: T) {
    if (!editing) return;
    const next = [...items];
    if (editing.index >= items.length) next.push(row);
    else next[editing.index] = row;
    onChange(next);
    setEditing(null);
  }
  function deleteAt(idx: number) {
    onChange(items.filter((_, i) => i !== idx));
  }

  return (
    <>
      <Card>
        <CardContent className="p-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className={`text-sm font-semibold ${error ? "text-destructive" : ""}`}>{title}</h3>
            <Button size="sm" onClick={openAdd}>
              <Plus className="mr-1 h-4 w-4" /> {addLabel}
            </Button>
          </div>
          {error && <p className="mb-3 text-xs text-destructive">{error}</p>}
          {!error && warning && <p className="mb-3 text-xs text-amber-600 dark:text-amber-500">{warning}</p>}
          {items.length === 0 ? (
            <div className="rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground">
              {emptyHint ?? "No items yet."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  {columns.map((c) => (
                    <TableHead key={String(c.key)}>{c.label}</TableHead>
                  ))}
                  <TableHead className="w-20 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row, idx) => (
                  <TableRow key={row.id ?? `new-${idx}`}>
                    <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                    {columns.map((c) => {
                      const val = row[c.key];
                      const rendered = c.render ? c.render(val, row) : (val ?? "—");
                      return (
                        <TableCell key={String(c.key)} className="text-sm">
                          {rendered as React.ReactNode}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(idx)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => deleteAt(idx)}
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
          title={editing.index >= items.length ? addLabel : editLabel}
          initial={editing.row}
          isValid={isValid}
          renderFields={renderModal}
          onCancel={() => setEditing(null)}
          onSave={commit}
        />
      )}
    </>
  );
}

function RowModal<T>({
  title,
  initial,
  isValid,
  renderFields,
  onCancel,
  onSave,
}: {
  title: string;
  initial: T;
  isValid: (row: T) => boolean;
  renderFields: (row: T, set: <K extends keyof T>(k: K, v: T[K]) => void) => React.ReactNode;
  onCancel: () => void;
  onSave: (row: T) => void;
}) {
  const [row, setRow] = useState<T>(initial);
  function set<K extends keyof T>(key: K, value: T[K]) {
    setRow((prev) => ({ ...prev, [key]: value }));
  }
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onCancel(); }}>
      {/*
        Widened to max-w-3xl (was max-w-2xl) so two-column rows do not squeeze
        Select dropdowns. Added vertical scroll so tall modals (Machinery, Raw
        Material, etc.) do not exceed viewport. All DPR nested-list modals
        share this width — change once, apply everywhere.
      */}
      <DialogContent className="!max-w-5xl w-[92vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">{renderFields(row, set)}</div>
        <DialogFooter className="mt-2 gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button disabled={!isValid(row)} onClick={() => onSave(row)}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Small layout helpers reused across sections ────────────────────────────

export function ModalRow({ children }: { children: React.ReactNode }) {
  // Bumped gap from 3 to 5 to reduce cramping between paired dropdowns.
  return <div className="grid gap-5 sm:grid-cols-2">{children}</div>;
}

export function ModalField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

export function ChoiceSelect({
  value,
  options,
  onChange,
  placeholder = "Select",
}: {
  value: string | undefined;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <Select value={value ?? ""} onValueChange={onChange}>
      <SelectTrigger className="h-9">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function MasterSelect({
  value,
  options,
  onChange,
  placeholder = "Select",
}: {
  value: number | null | undefined;
  options: { id: number; label: string }[];
  onChange: (v: number | null) => void;
  placeholder?: string;
}) {
  return (
    <Select
      value={value !== null && value !== undefined ? String(value) : ""}
      onValueChange={(v) => onChange(v === "" ? null : Number(v))}
    >
      <SelectTrigger className="h-9">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.id} value={String(o.id)}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
