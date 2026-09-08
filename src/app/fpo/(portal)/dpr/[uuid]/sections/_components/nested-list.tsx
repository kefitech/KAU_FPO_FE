"use client";

import { forwardRef, useImperativeHandle, useState } from "react";

import { Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { SearchableSelect } from "@/components/ui/searchable-select";
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

/**
 * Imperative handle exposed to parents via ref. Lets the caller open the
 * edit modal for a specific row from outside NestedListCard — used e.g. by
 * the products-section's ViewSheet Edit button to close the read-only view
 * and pop the edit modal for the same row.
 */
export interface NestedListHandle {
  openEdit: (idx: number) => void;
}

interface NestedListProps<T> {
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
  /**
   * When set, clicking anywhere on a row (not the pencil / delete icons) fires
   * this callback instead of doing nothing. Callers typically use it to open a
   * read-only `ViewSheet` — mirrors the `/fpo/products` pattern. The pencil
   * icon still opens the edit modal directly for users who want to skip the
   * intermediate view step.
   */
  onRowClick?: (row: T, idx: number) => void;
}

function NestedListCardInner<T extends { id?: number }>(
  {
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
    onRowClick,
  }: NestedListProps<T>,
  ref: React.Ref<NestedListHandle>,
) {
  const [editing, setEditing] = useState<{ index: number; row: T } | null>(null);

  function openAdd() {
    setEditing({ index: items.length, row: { ...emptyRow } });
  }
  function openEdit(idx: number) {
    setEditing({ index: idx, row: { ...items[idx] } });
  }

  // Expose openEdit to parents through the ref — callers use this to trigger
  // the edit modal from a ViewSheet's Edit button (or any other external
  // affordance).
  useImperativeHandle(ref, () => ({ openEdit }), [items]);
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
      {/* No outer Card — the table has its own border/shadow. Card would
          double-border and feel over-designed. Sections stacking multiple
          nested lists use space-y between them for visual separation. */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className={`text-sm font-semibold ${error ? "text-destructive" : ""}`}>{title}</h3>
          <Button size="sm" onClick={openAdd}>
            <Plus className="mr-1 h-4 w-4" /> {addLabel}
          </Button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        {!error && warning && <p className="text-xs text-amber-600 dark:text-amber-500">{warning}</p>}
        {items.length === 0 ? (
          <div className="rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground">
            {emptyHint ?? "No items yet."}
          </div>
        ) : (
          // Styled to match `components/data-table/data-table.tsx` — dark
          // slate header, zebra-striped rows, muted SL No column, subtle
          // row hover. No pagination (nested lists are always short).
          <div className="relative overflow-x-auto border border-border shadow-sm">
            <Table className="min-w-full">
                <TableHeader>
                  <TableRow className="border-b border-slate-700 bg-slate-800 hover:bg-slate-800 dark:bg-slate-900 dark:border-slate-700">
                    <TableHead
                      className="w-14 text-center text-xs font-semibold uppercase tracking-wider text-slate-300"
                      style={{ width: 56 }}
                    >
                      SL No
                    </TableHead>
                    {columns.map((c) => (
                      <TableHead
                        key={String(c.key)}
                        className="text-xs font-semibold uppercase tracking-wider text-slate-300"
                      >
                        {c.label}
                      </TableHead>
                    ))}
                    <TableHead
                      className="w-24 text-right text-xs font-semibold uppercase tracking-wider text-slate-300"
                      style={{ width: 96 }}
                    >
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((row, idx) => {
                    // Row is clickable only when the caller supplied
                    // `onRowClick` — behaviour is opt-in so sections that
                    // don't yet wire a ViewSheet keep their old UX unchanged.
                    // The pencil / delete icons stop propagation so clicking
                    // them doesn't also fire the row's onClick.
                    const clickable = Boolean(onRowClick);
                    return (
                    <TableRow
                      key={row.id ?? `new-${idx}`}
                      onClick={clickable ? () => onRowClick?.(row, idx) : undefined}
                      role={clickable ? "button" : undefined}
                      tabIndex={clickable ? 0 : undefined}
                      onKeyDown={
                        clickable
                          ? (e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                onRowClick?.(row, idx);
                              }
                            }
                          : undefined
                      }
                      className={[
                        "border-b border-border/50 transition-colors",
                        idx % 2 === 1
                          ? "bg-slate-50 dark:bg-slate-900/40"
                          : "bg-white dark:bg-background",
                        "hover:bg-slate-100 dark:hover:bg-slate-800/40",
                        clickable ? "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" : "",
                      ].join(" ")}
                    >
                      <TableCell className="text-center text-xs font-medium text-muted-foreground/60 bg-slate-50 dark:bg-slate-900/20">
                        {idx + 1}
                      </TableCell>
                      {columns.map((c) => {
                        const val = row[c.key];
                        const rendered = c.render ? c.render(val, row) : (val ?? "—");
                        // Show full text on hover via `title` when the rendered
                        // value is a plain string/number — otherwise skip
                        // (complex React children can't be stringified safely).
                        const isSimple = typeof rendered === "string" || typeof rendered === "number";
                        return (
                          <TableCell
                            key={String(c.key)}
                            className="max-w-[220px] truncate text-sm"
                            title={isSimple ? String(rendered) : undefined}
                          >
                            {rendered as React.ReactNode}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(idx);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteAt(idx);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

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

/**
 * Public export. `forwardRef` swallows the generic type parameter, so we
 * cast back to a generic function signature — the standard workaround for
 * forwardRef + generics. Consumers keep writing `<NestedListCard<Foo> …>`
 * and pass a `ref` typed as `React.Ref<NestedListHandle>` when they want
 * imperative access to `openEdit`.
 */
export const NestedListCard = forwardRef(NestedListCardInner) as <
  T extends { id?: number },
>(
  props: NestedListProps<T> & { ref?: React.Ref<NestedListHandle> },
) => React.ReactElement;

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
      <DialogContent
        className="!max-w-5xl w-[92vw] max-h-[90vh] overflow-y-auto"
        // Prevent accidental data loss: clicking the dark backdrop no longer
        // closes the modal. Escape key prompts for confirmation (only closes
        // if user confirms). Cancel button remains the deliberate exit path.
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          const ok = window.confirm(
            "Close this form? Any unsaved changes in this row will be lost.",
          );
          if (ok) onCancel();
        }}
      >
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
  error,
  warning,
}: {
  label: string;
  children: React.ReactNode;
  /** Backend-driven inline error — turns the label red + renders message below. */
  error?: string;
  /** Backend-driven inline warning — renders amber message below (only when no error). */
  warning?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className={`text-xs ${error ? "text-destructive" : ""}`}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {!error && warning && (
        <p className="text-xs text-amber-600 dark:text-amber-500">{warning}</p>
      )}
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

/**
 * Same API as MasterSelect (numeric id in/out) but backed by SearchableSelect
 * — gives the user a type-to-filter input + a selection chip below with a
 * ✕ to clear. Use for any master-data dropdown with many options
 * (commodities, machinery categories, marketing channels, etc.).
 */
export function MasterSearchableSelect({
  value,
  options,
  onChange,
  placeholder = "Type to search…",
}: {
  value: number | null | undefined;
  options: { id: number; label: string }[];
  onChange: (v: number | null) => void;
  placeholder?: string;
}) {
  return (
    <SearchableSelect
      value={value !== null && value !== undefined ? String(value) : ""}
      onChange={(v) => onChange(v === "" ? null : Number(v))}
      options={options.map((o) => ({ value: String(o.id), label: o.label }))}
      placeholder={placeholder}
    />
  );
}
