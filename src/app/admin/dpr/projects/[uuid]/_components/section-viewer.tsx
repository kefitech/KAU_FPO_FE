"use client";

/**
 * Read-only professional renderer for one DPR section's data.
 *
 * Handles arbitrary JSON payloads returned by the admin project detail
 * endpoint. Design goals:
 *   - Long text (descriptions, notes) breaks out to a full-width row for
 *     readability. Short primitives stack in a 2-3 column definition grid.
 *   - Numbers right-align in tabular-nums font.
 *   - Currency (fields ending _cost/_amount/_price/_turnover/_revenue) prefix ₹.
 *   - Percentages (fields ending _pct/_percent) suffix %.
 *   - Booleans render as coloured pill badges (Yes / No).
 *   - Dates + datetimes format via toLocaleDateString.
 *   - Empty values print an em-dash in muted italic — distinguishable from
 *     "0" or "false" which are real answers.
 *   - FK-enriched `{id, name}` objects show `name`.
 *   - M2M enriched arrays render as label chips with primary tint.
 *   - Nested arrays of objects still fall through to a data table (with
 *     zebra rows + sticky header for professionalism).
 *
 * Author: Athul Gopan (Kefi Tech Solutions)
 */

import dynamic from "next/dynamic";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Leaflet touches `window` — must be SSR-disabled dynamic import. Reused
// from the FPO dashboard: shows a read-only marker at (lat, lng) on OSM tiles.
const LocationMap = dynamic(
  () =>
    import("@/app/fpo/(portal)/dashboard/_components/location-map").then(
      (m) => ({ default: m.LocationMap }),
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-52 w-full items-center justify-center rounded-lg border bg-muted/20 text-xs text-muted-foreground">
        Loading map…
      </div>
    ),
  },
);

// Fields hidden from the view — audit / system / internal metadata.
// UUID + status already shown in the header. `field_sources` is provenance
// tracking used by the calc engine; not user-visible.
const HIDDEN_KEYS = new Set([
  "id", "uuid", "status", "created_at", "updated_at", "created_by", "updated_by",
  "deleted_at", "deleted_by", "is_deleted", "project", "is_complete", "order",
  "field_sources",
]);

// Preferred order for common top-of-form fields so admin scans them first.
// Anything not in this list is appended in insertion order.
const PRIORITY_KEYS = [
  "title", "name", "brief_description", "description",
  "primary_commodity", "commodity", "category", "project_types",
];

function humanizeKey(k: string): string {
  return k
    .replace(/_/g, " ")
    .replace(/\bpct\b/gi, "%")
    .replace(/\b(dpr|hr|ess|cin|pan|gstin|tds|kva|kw|mof|npv|irr|dscr|ai)\b/gi, (m) => m.toUpperCase())
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

/** Backend enriches FK fields to `{id, name}` for admin oversight. */
function isLabelObject(v: unknown): v is { id: number | string; name: string } {
  return (
    typeof v === "object" && v !== null && !Array.isArray(v)
    && "name" in (v as Record<string, unknown>)
  );
}

/** Long-text fields deserve a full-width row instead of being squeezed
 *  into a 2-col grid cell. Threshold ~120 chars, or any field that ends
 *  in `_description` / `_notes` / `_remarks` / `_strategy`. */
function isLongText(k: string, v: unknown): boolean {
  if (typeof v !== "string") return false;
  if (v.length > 120) return true;
  return /_(description|notes|remarks|strategy|address|justification|reason)$/i.test(k);
}

const CURRENCY_SUFFIXES = [
  "_cost", "_amount", "_price", "_turnover", "_revenue", "_income", "_expense",
  "_budget", "_contribution", "_loan", "_subsidy", "_grant", "_capex", "_opex",
  "_wc", "_capital",
];

function isCurrency(k: string): boolean {
  const lower = k.toLowerCase();
  return CURRENCY_SUFFIXES.some((s) => lower.endsWith(s) || lower.includes(s));
}

function isPercent(k: string): boolean {
  return /_pct$|_percent$|_rate$/i.test(k);
}

function isDate(v: unknown): boolean {
  if (typeof v !== "string") return false;
  // ISO date or datetime — YYYY-MM-DD or full ISO
  return /^\d{4}-\d{2}-\d{2}(T|$)/.test(v);
}

// Indian-style comma grouping (12,34,567 not 1,234,567)
function fmtIndianNumber(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  const [intPart, decPart] = n.toString().split(".");
  const neg = intPart.startsWith("-");
  const abs = neg ? intPart.slice(1) : intPart;
  const last3 = abs.slice(-3);
  const rest = abs.slice(0, -3);
  const grouped: string[] = [];
  let s = rest;
  while (s.length > 2) {
    grouped.push(s.slice(-2));
    s = s.slice(0, -2);
  }
  if (s) grouped.push(s);
  const intFmt = (rest ? grouped.reverse().join(",") + "," : "") + last3;
  const out = decPart ? `${intFmt}.${decPart}` : intFmt;
  return neg ? `-${out}` : out;
}

function formatValue(k: string, v: unknown): { text: string; extraClass?: string } {
  if (v === null || v === undefined || (typeof v === "string" && v.trim() === "")) {
    return { text: "—", extraClass: "text-muted-foreground italic" };
  }
  if (typeof v === "boolean") {
    return { text: v ? "Yes" : "No" };
  }
  if (isLabelObject(v)) {
    return { text: v.name || String(v.id) };
  }
  if (isDate(v)) {
    const d = new Date(v as string);
    if (!Number.isNaN(d.getTime())) {
      return { text: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) };
    }
  }
  // Numeric — currency / percent / plain
  if (typeof v === "number" || (typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v))) {
    const n = typeof v === "number" ? v : Number(v);
    if (isCurrency(k)) {
      return { text: `₹ ${fmtIndianNumber(n)}`, extraClass: "font-mono tabular-nums" };
    }
    if (isPercent(k)) {
      return { text: `${n}%`, extraClass: "font-mono tabular-nums" };
    }
    return { text: fmtIndianNumber(n), extraClass: "font-mono tabular-nums" };
  }
  if (typeof v === "object") {
    return { text: JSON.stringify(v), extraClass: "font-mono text-xs" };
  }
  return { text: String(v) };
}

/** Sort keys by PRIORITY_KEYS first, then insertion order. */
function sortKeys(keys: string[]): string[] {
  const priority = PRIORITY_KEYS.filter((k) => keys.includes(k));
  const rest = keys.filter((k) => !PRIORITY_KEYS.includes(k));
  return [...priority, ...rest];
}

// ─────────────────────────────────────────────────────────────────────────────
// Main viewer
// ─────────────────────────────────────────────────────────────────────────────

export function SectionViewer({ data }: { data: Record<string, unknown> | null }) {
  if (!data) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed bg-muted/10 py-12 text-center">
        <p className="text-sm font-medium text-muted-foreground">
          This section has not been filled yet.
        </p>
        <p className="text-xs text-muted-foreground/70">
          Once the FPO saves data here, it will appear in this view.
        </p>
      </div>
    );
  }

  // Geo coordinates — if both lat + lng are present, render a Leaflet map
  // and hide the raw numeric fields from the primitive grid.
  const latRaw = data.latitude;
  const lngRaw = data.longitude;
  const lat = typeof latRaw === "number" ? latRaw : latRaw ? Number(latRaw) : NaN;
  const lng = typeof lngRaw === "number" ? lngRaw : lngRaw ? Number(lngRaw) : NaN;
  const hasGeo = Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);

  // Bucket: long-text (full width) vs short primitives (grid) vs arrays
  const longTextEntries: Array<[string, string]> = [];
  const shortEntries: Array<[string, unknown]> = [];
  const arrayEntries: Array<[string, unknown[]]> = [];

  for (const [k, v] of Object.entries(data)) {
    if (HIDDEN_KEYS.has(k)) continue;
    // Suppress raw lat/lng fields when the map is going to render them.
    if (hasGeo && (k === "latitude" || k === "longitude")) continue;
    if (Array.isArray(v)) {
      arrayEntries.push([k, v]);
    } else if (isLongText(k, v)) {
      longTextEntries.push([k, v as string]);
    } else {
      shortEntries.push([k, v]);
    }
  }

  const sortedShortKeys = sortKeys(shortEntries.map(([k]) => k));
  const shortMap = new Map(shortEntries);

  return (
    <div className="space-y-6">
      {/* Geo map — rendered when the section carries lat + lng (Location section) */}
      {hasGeo && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
            Pinned Location
          </p>
          <div className="overflow-hidden rounded-lg border">
            <LocationMap lat={lat} lng={lng} />
          </div>
          <p className="text-[11px] text-muted-foreground">
            {lat.toFixed(6)}, {lng.toFixed(6)}
          </p>
        </div>
      )}

      {/* Long-text fields — full-width readable cards */}
      {longTextEntries.map(([k, v]) => (
        <div key={k} className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
            {humanizeKey(k)}
          </p>
          <div className="rounded-lg border bg-card p-4 text-sm leading-relaxed">
            {v || <span className="italic text-muted-foreground">—</span>}
          </div>
        </div>
      ))}

      {/* Short primitives — 2 or 3 column definition grid */}
      {sortedShortKeys.length > 0 && (
        <div className="overflow-hidden rounded-lg border bg-card">
          <dl className="grid divide-y sm:grid-cols-2 sm:divide-y-0 sm:divide-x">
            {sortedShortKeys.map((k) => {
              const v = shortMap.get(k);
              const { text, extraClass } = formatValue(k, v);
              const empty = isEmpty(v);
              return (
                <div key={k} className="grid grid-cols-[minmax(140px,40%)_1fr] gap-3 border-t px-4 py-2.5 first:border-t-0 sm:border-t-0 sm:[&:nth-child(-n+2)]:border-t-0">
                  <dt className="text-xs text-muted-foreground">
                    {humanizeKey(k)}
                  </dt>
                  <dd className={`text-sm ${empty ? "text-muted-foreground italic" : ""} ${extraClass ?? ""}`}>
                    {text}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      )}

      {/* Arrays */}
      {arrayEntries.map(([k, arr]) => (
        <ArraySection key={k} label={humanizeKey(k)} arr={arr} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Array renderer — decides between chips (labels) and table (rows)
// ─────────────────────────────────────────────────────────────────────────────

function ArraySection({ label, arr }: { label: string; arr: unknown[] }) {
  if (arr.length === 0) {
    return (
      <div className="space-y-2">
        <div className="flex items-baseline gap-2">
          <h4 className="text-sm font-semibold">{label}</h4>
          <span className="text-xs text-muted-foreground">(empty)</span>
        </div>
        <div className="rounded-lg border border-dashed bg-muted/10 py-4 text-center text-xs text-muted-foreground">
          No entries.
        </div>
      </div>
    );
  }

  // Chip list — bare strings / numbers
  if (arr.every((el) => typeof el === "string" || typeof el === "number")) {
    return (
      <div className="space-y-2">
        <div className="flex items-baseline gap-2">
          <h4 className="text-sm font-semibold">{label}</h4>
          <span className="text-xs text-muted-foreground">({arr.length})</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {arr.map((el, i) => (
            <span key={i} className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs">
              {String(el)}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // FK-enriched label chips
  if (arr.every(isLabelObject)) {
    return (
      <div className="space-y-2">
        <div className="flex items-baseline gap-2">
          <h4 className="text-sm font-semibold">{label}</h4>
          <span className="text-xs text-muted-foreground">({arr.length})</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {arr.map((el, i) => (
            <span
              key={i}
              className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
            >
              {(el as { name: string }).name}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // Data table
  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2">
        <h4 className="text-sm font-semibold">{label}</h4>
        <span className="text-xs text-muted-foreground">({arr.length})</span>
      </div>
      <ArrayTable rows={arr as Record<string, unknown>[]} />
    </div>
  );
}

function ArrayTable({ rows }: { rows: Record<string, unknown>[] }) {
  if (rows.length === 0) return null;
  // Preserve first-row key order (mostly reflects backend ordering)
  const keys = Array.from(
    new Set(rows.flatMap((r) => Object.keys(r).filter((k) => !HIDDEN_KEYS.has(k))))
  );

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="w-10 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              #
            </TableHead>
            {keys.map((k) => (
              <TableHead
                key={k}
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {humanizeKey(k)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i} className={i % 2 === 1 ? "bg-muted/10" : ""}>
              <TableCell className="text-xs font-medium text-muted-foreground">
                {i + 1}
              </TableCell>
              {keys.map((k) => {
                const v = row[k];
                if (isPrimitive(v) || isLabelObject(v)) {
                  const { text, extraClass } = formatValue(k, v);
                  return (
                    <TableCell key={k} className={`text-sm ${extraClass ?? ""}`}>
                      {text}
                    </TableCell>
                  );
                }
                if (Array.isArray(v)) {
                  return (
                    <TableCell key={k} className="text-xs">
                      {v.length === 0 ? (
                        <span className="italic text-muted-foreground">empty</span>
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-0.5">
                          {v.length} item{v.length === 1 ? "" : "s"}
                        </span>
                      )}
                    </TableCell>
                  );
                }
                return (
                  <TableCell key={k} className="text-xs text-muted-foreground">—</TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
