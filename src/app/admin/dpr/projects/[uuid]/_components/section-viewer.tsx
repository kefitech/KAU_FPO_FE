"use client";

/**
 * Read-only renderer for one DPR section's data.
 * Renders arbitrary JSON: primitives → key-value grid,
 * arrays of objects → table, arrays of strings → chips.
 *
 * Author: Athul Gopan (Kefi Tech Solutions)
 */

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Fields hidden from the view — audit/system fields
const HIDDEN_KEYS = new Set([
  "id",
  "created_at",
  "updated_at",
  "created_by",
  "updated_by",
  "project",
  "is_complete",
  "order",
]);

function humanizeKey(k: string): string {
  return k
    .replace(/_/g, " ")
    .replace(/\bpct\b/gi, "%")
    .replace(/\b(dpr|hr|ess|cin|pan|gstin|kva|kw)\b/gi, (m) => m.toUpperCase())
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function isEmpty(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "string" && v.trim() === "") return true;
  if (Array.isArray(v) && v.length === 0) return true;
  return false;
}

function isPrimitive(v: unknown): boolean {
  return v === null || ["string", "number", "boolean"].includes(typeof v);
}

function formatPrimitive(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

export function SectionViewer({ data }: { data: Record<string, unknown> | null }) {
  if (!data) {
    return (
      <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
        This section has not been filled yet.
      </div>
    );
  }

  const primitiveEntries: Array<[string, unknown]> = [];
  const arrayEntries: Array<[string, unknown[]]> = [];

  for (const [k, v] of Object.entries(data)) {
    if (HIDDEN_KEYS.has(k)) continue;
    if (Array.isArray(v)) {
      arrayEntries.push([k, v]);
    } else {
      primitiveEntries.push([k, v]);
    }
  }

  return (
    <div className="space-y-6">
      {/* Primitive fields as a 2-column key-value grid */}
      {primitiveEntries.length > 0 && (
        <div className="grid gap-x-6 gap-y-3 rounded-md border p-4 sm:grid-cols-2">
          {primitiveEntries.map(([k, v]) => (
            <div key={k} className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">{humanizeKey(k)}</span>
              <span className={`text-sm ${isEmpty(v) ? "text-muted-foreground italic" : ""}`}>
                {formatPrimitive(v)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Array fields */}
      {arrayEntries.map(([k, arr]) => (
        <div key={k} className="space-y-2">
          <h4 className="text-sm font-medium">{humanizeKey(k)}</h4>
          {arr.length === 0 ? (
            <div className="rounded-md border border-dashed py-4 text-center text-xs text-muted-foreground">
              No entries.
            </div>
          ) : arr.every((el) => typeof el === "string" || typeof el === "number") ? (
            <div className="flex flex-wrap gap-1.5">
              {arr.map((el, i) => (
                <span key={i} className="rounded-md bg-muted px-2 py-1 text-xs">{String(el)}</span>
              ))}
            </div>
          ) : (
            <ArrayTable rows={arr as Record<string, unknown>[]} />
          )}
        </div>
      ))}
    </div>
  );
}

function ArrayTable({ rows }: { rows: Record<string, unknown>[] }) {
  if (rows.length === 0) return null;
  // Collect union of keys, prefer commonly-used order
  const keys = Array.from(
    new Set(rows.flatMap((r) => Object.keys(r).filter((k) => !HIDDEN_KEYS.has(k))))
  );

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            {keys.map((k) => (
              <TableHead key={k}>{humanizeKey(k)}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i}>
              <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
              {keys.map((k) => {
                const v = row[k];
                if (isPrimitive(v)) {
                  return <TableCell key={k} className="text-sm">{formatPrimitive(v)}</TableCell>;
                }
                if (Array.isArray(v)) {
                  return (
                    <TableCell key={k} className="text-xs">
                      {v.length === 0 ? "—" : `${v.length} item${v.length === 1 ? "" : "s"}`}
                    </TableCell>
                  );
                }
                return <TableCell key={k} className="text-xs text-muted-foreground">—</TableCell>;
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
