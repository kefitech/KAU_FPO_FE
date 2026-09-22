"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, ImagePlus, PackagePlus, Pencil, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ViewSheet } from "@/components/ui/view-sheet";
import { useDprSectionForm } from "@/hooks/use-dpr-section-form";
import { api } from "@/lib/api/client";
import { dprApi } from "@/lib/api/dpr";
import { dprMasterApi } from "@/lib/api/dpr-master";

import {
  ChoiceSelect,
  MasterSelect,
  MasterSearchableSelect,
  ModalField,
  ModalRow,
  NestedListCard,
  type NestedListHandle,
} from "./nested-list";
import { SectionHelp } from "./section-help";
import { SectionShell } from "./section-shell";

// ── Types & schema ────────────────────────────────────────────────────────

const ProductItemSchema = z.object({
  id: z.number().optional(),
  order: z.number(),
  name: z.string(),
  category: z.number().nullable(),
  primary_or_secondary: z.string(),
  product_type: z.number().nullable(),
  unit_of_measurement: z.number().nullable(),
  annual_quantity: z.union([z.string(), z.number()]).nullable(),
  selling_unit: z.number().nullable(),
  selling_price_per_unit: z.union([z.string(), z.number()]).nullable(),
  // Tri-state on the FE — null = user hasn't answered (the field is optional),
  // true / false = explicit Yes / No. Coerced to boolean at save time
  // (`serializePayload` maps null → false to match backend BooleanField).
  is_value_added: z.boolean().nullable(),
  description: z.string(),
  // Read-only URL of the uploaded product photo (or null). Upload/delete
  // for EXISTING rows go through the dedicated multipart endpoint. For
  // NEW rows (no id yet) the file rides along on the section save via
  // `_pendingImage` (see `serializePayload` + Products backend view).
  image: z.string().nullable().optional(),
  // Ephemeral — never sent to the server as JSON. Holds a File the user
  // picked inside the "Add product" modal before the row has a backend id.
  // On section save, `serializePayload` moves it into a `FormData` blob
  // and tags the row with a matching `_image_key`. Cleared on refetch.
  _pendingImage: z.instanceof(File).nullable().optional(),
});
type ProductItem = z.infer<typeof ProductItemSchema>;

const Schema = z.object({
  items: z.array(ProductItemSchema),
});
type Data = z.infer<typeof Schema>;

const EMPTY_ITEM: ProductItem = {
  order: 0,
  name: "",
  category: null,
  primary_or_secondary: "",
  product_type: null,
  unit_of_measurement: null,
  annual_quantity: null,
  selling_unit: null,
  selling_price_per_unit: null,
  // Starts null so the Value-added dropdown shows its "Select" placeholder
  // for a fresh row — the field is optional, so we don't want to imply
  // "No" until the user explicitly picks.
  is_value_added: null,
  description: "",
};

const PRIMARY_SECONDARY_OPTIONS = [
  { value: "primary", label: "Primary Product" },
  { value: "secondary", label: "Secondary Product" },
];

// ── Input caps — mirror backend column widths ──────────────────────────────
// Backend: name = CharField(max_length=200), description = TextField (no cap
// so we impose one). Same 2000-char pattern as investment remarks — will be
// extracted into a shared CountedTextarea on the 3rd occurrence.
const MAX_PRODUCT_NAME_CHARS = 200;
const MAX_DESCRIPTION_CHARS = 2000;

// Backend: annual_quantity = Decimal(max_digits=18, decimal_places=3) — that
// allows values into the trillions. Nothing an FPO produces annually is
// remotely that large. Cap at 1 billion units — beyond that is almost
// certainly a mistyped or pasted garbage number.
const MAX_ANNUAL_QUANTITY = 1_000_000_000;
// Backend: selling_price_per_unit = Decimal(max_digits=15, decimal_places=2).
// A per-unit price above ₹10 lakh is very unusual (equipment, machinery, etc.).
// Cap at ₹10 crore per unit for maximum safety without blocking legitimate
// high-value products.
const MAX_UNIT_PRICE_INR = 100_000_000;

/**
 * Normalise a raw string from a decimal input so it:
 *   1. Keeps only digits + one decimal point
 *   2. Trims to at most `maxDecimals` decimal places
 *   3. Clips at `max` — silently caps runaway values pasted from anywhere
 * Empty string passes through untouched so the field can be cleared.
 * Same shape as the investment section's normaliseMoneyInput — extract to a
 * shared util on the 3rd occurrence.
 */
function normaliseDecimalInput(
  raw: string,
  { max, maxDecimals }: { max: number; maxDecimals: number },
): string {
  if (raw === "" || raw == null) return "";
  const cleaned = raw.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  const withOneDot =
    parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : cleaned;
  const [intPart = "", decPart] = withOneDot.split(".");
  const trimmedDec = decPart !== undefined ? decPart.slice(0, maxDecimals) : undefined;
  const finalStr =
    trimmedDec !== undefined ? `${intPart}.${trimmedDec}` : intPart;
  if (finalStr === "" || finalStr === ".") return finalStr;
  const n = Number(finalStr);
  if (Number.isFinite(n) && n > max) return String(max);
  return finalStr;
}

function toDecimalString(v: string | number | null): string | null {
  if (v === null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? String(n) : null;
}

/**
 * Per-row validation — mirrors `products_validators.py` exactly.
 * Returned as a partial record so `rowErrors.name`, `rowErrors.annual_quantity`
 * etc. either hold the message or are `undefined`. Used in three places:
 *   1. Modal — each ModalField reads the matching key to render inline red
 *   2. Modal — Save button disabled unless the row has zero errors
 *   3. Table — row is flagged with a warning icon when any error exists
 * Keeping this function inline (not extracted) so the exact rule wording
 * lives beside the section it validates and updates land in one PR.
 */
type RowErrors = Partial<Record<
  "name" | "unit_of_measurement" | "annual_quantity" | "selling_price_per_unit",
  string
>>;

function validateRow(row: ProductItem): RowErrors {
  const errors: RowErrors = {};

  if (!(row.name ?? "").trim()) {
    errors.name = "Product name is required.";
  }
  if (!row.unit_of_measurement) {
    errors.unit_of_measurement = "Unit of measurement is required.";
  }
  const qty = row.annual_quantity;
  if (qty === null || qty === "" || !(Number(qty) > 0)) {
    errors.annual_quantity = "Annual quantity must be greater than 0.";
  }
  const price = row.selling_price_per_unit;
  if (price === null || price === "" || !(Number(price) > 0)) {
    errors.selling_price_per_unit = "Selling price must be greater than 0.";
  }

  return errors;
}

function serializePayload(v: Data): Record<string, unknown> | FormData {
  // Build the JSON `items` array first — same shape as before, but each
  // new row with a pending File gets tagged with an `_image_key` so the
  // backend can match it to a form file part.
  let pendingCount = 0;
  const items = v.items.map((it, idx) => {
    const base: Record<string, unknown> = {
      ...it,
      order: idx,
      annual_quantity: toDecimalString(it.annual_quantity),
      selling_price_per_unit: toDecimalString(it.selling_price_per_unit),
      is_value_added: it.is_value_added === true,
    };
    // Strip the ephemeral holder; it never goes to the server as JSON.
    delete base._pendingImage;
    // Only attach pending files for BRAND-NEW rows (no server id yet).
    // Once the row has been saved and re-hydrated with an id, a lingering
    // File in local state (e.g. after an autosave `keepDirtyValues` reset)
    // must be ignored so we don't upload the same photo every 5 seconds.
    if (!it.id && it._pendingImage instanceof File) {
      pendingCount += 1;
      base._image_key = `new_${pendingCount}`;
    }
    return base;
  });

  // No pending files → keep the old JSON shape. Preserves the JSON code
  // path across the rest of the app (autosave, unchanged rows, etc).
  if (pendingCount === 0) {
    return { items };
  }

  // Multipart flow — same items JSON as a string field, plus one file
  // part per pending image. Backend `DPRProductsSectionView.patch`
  // detects this shape and attaches files after row creation.
  const fd = new FormData();
  fd.append("items", JSON.stringify(items));
  let n = 0;
  for (const it of v.items) {
    if (!it.id && it._pendingImage instanceof File) {
      n += 1;
      fd.append(`image_new_${n}`, it._pendingImage);
    }
  }
  return fd;
}

// ── Product image upload widget ───────────────────────────────────────────

/**
 * Photo upload for one product row.
 *
 * - Available only after the row has been saved once (needs backend `id`).
 * - Direct multipart POST to the dedicated image endpoint — does NOT
 *   go through the section save (that path is JSON and would clobber
 *   uploaded images on re-save).
 * - Client-side type/size checks mirror the server's (jpg/png/webp ≤5 MB);
 *   server is authoritative but pre-check avoids the round-trip.
 * - Success updates the row's `image` field locally so the thumbnail
 *   swaps immediately. Also invalidates the section query so a fresh GET
 *   returns the same URL on next mount.
 */
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function ProductImageField({
  uuid,
  rowId,
  currentImageUrl,
  pendingFile,
  onChange,
  onPendingChange,
}: {
  uuid: string;
  rowId: number | undefined;
  currentImageUrl: string | null | undefined;
  /** Ephemeral File the user picked before the row has a backend id.
   *  Non-null only in the "attach on save" path. */
  pendingFile?: File | null | undefined;
  /** For existing rows: fires when the direct multipart upload succeeds. */
  onChange: (newUrl: string | null) => void;
  /** For new rows: fires when the user picks / clears the pending file. */
  onPendingChange?: (file: File | null) => void;
}) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadMut = useMutation({
    mutationFn: (file: File) => dprApi.uploadProductImage(uuid, rowId!, file),
    onSuccess: (data) => {
      onChange(data.image_url);
      qc.invalidateQueries({ queryKey: ["dpr-section", uuid, "products"] });
      toast.success("Product photo uploaded.");
    },
    onError: () => toast.error("Failed to upload photo. Try again."),
  });

  const deleteMut = useMutation({
    mutationFn: () => dprApi.deleteProductImage(uuid, rowId!),
    onSuccess: () => {
      onChange(null);
      qc.invalidateQueries({ queryKey: ["dpr-section", uuid, "products"] });
      toast.success("Product photo removed.");
    },
    onError: () => toast.error("Failed to remove photo."),
  });

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!ALLOWED_IMAGE_TYPES.includes(f.type)) {
      toast.error("Only JPEG, PNG, or WebP images allowed.");
      return;
    }
    if (f.size > MAX_IMAGE_BYTES) {
      toast.error("Image is larger than 5 MB.");
      return;
    }
    // Existing row → direct multipart upload for immediate feedback.
    // New row → stash the file in the parent's ephemeral state; it will
    // ride along on the section save.
    if (rowId) {
      uploadMut.mutate(f);
    } else if (onPendingChange) {
      onPendingChange(f);
      toast.success("Photo attached. It will upload when you save the product.");
    }
  }

  // Preview source — existing image URL wins, else a local object URL for
  // the pending file (so user sees a thumb inside the modal before save).
  const previewUrl = useMemo(() => {
    if (currentImageUrl) return currentImageUrl;
    if (pendingFile) return URL.createObjectURL(pendingFile);
    return null;
  }, [currentImageUrl, pendingFile]);
  // Revoke object URLs on unmount / file swap to avoid leaks.
  useEffect(() => {
    if (!currentImageUrl && pendingFile && previewUrl) {
      return () => URL.revokeObjectURL(previewUrl);
    }
  }, [currentImageUrl, pendingFile, previewUrl]);

  const hasPending = !!pendingFile;
  const busy = uploadMut.isPending || deleteMut.isPending;

  return (
    <div className="flex items-start gap-4">
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt="Product"
          className="h-24 w-32 rounded border object-cover"
        />
      ) : (
        <div className="flex h-24 w-32 items-center justify-center rounded border border-dashed bg-muted text-xs text-muted-foreground">
          No photo
        </div>
      )}
      <div className="flex flex-col gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFile}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          <ImagePlus className="mr-1.5 h-3.5 w-3.5" />
          {uploadMut.isPending
            ? "Uploading…"
            : currentImageUrl || hasPending
              ? "Replace"
              : "Upload"}
        </Button>
        {currentImageUrl && rowId && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            disabled={busy}
            onClick={() => deleteMut.mutate()}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Remove
          </Button>
        )}
        {hasPending && !rowId && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => onPendingChange?.(null)}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Remove
          </Button>
        )}
        <p className="text-xs text-muted-foreground">
          JPEG, PNG, or WebP · Max 5 MB · Appears on the DPR PDF cover &amp; products page.
          {hasPending && !rowId ? " Will upload when you save this product." : ""}
        </p>
      </div>
    </div>
  );
}

// ── Import from marketplace picker ───────────────────────────────────────

interface MarketplaceProductRow {
  id: number;
  name: Record<string, string> | string;
  unit: string;
  price_per_unit: string | number;
  image?: string | null;
}

interface MarketplaceListPage {
  data: MarketplaceProductRow[];
  meta?: {
    pagination?: {
      page: number;
      total_pages: number;
      total_count: number;
      has_next: boolean;
      has_previous: boolean;
    };
  };
}

const PICKER_PAGE_SIZE = 10;

function ImportFromMarketplaceButton({
  uuid,
  onImported,
}: {
  uuid: string;
  onImported: (newItem: Record<string, unknown>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Debounce the search term so we don't hit the API on every keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 whenever the search term changes so results start from top.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const listQuery = useQuery({
    queryKey: ["marketplace-products", "import-picker", debouncedSearch, page],
    queryFn: () =>
      api
        .get<MarketplaceListPage>("/marketplace/products/", {
          params: {
            page,
            page_size: PICKER_PAGE_SIZE,
            status: "active",
            ...(debouncedSearch ? { search: debouncedSearch } : {}),
          },
        })
        .then((r) => r.data),
    enabled: open,
    staleTime: 60_000,
  });
  const rows = listQuery.data?.data ?? [];
  const pagination = listQuery.data?.meta?.pagination;

  const importMut = useMutation({
    mutationFn: (id: number) => dprApi.importProductFromMarketplace(uuid, id),
    onSuccess: (data) => {
      toast.success("Product imported. Complete the DPR-specific fields.");
      setOpen(false);
      onImported(data);
    },
    onError: () => toast.error("Failed to import product. Try again."),
  });

  const pickName = (n: MarketplaceProductRow["name"]) =>
    typeof n === "string" ? n : n?.en || n?.ml || "(unnamed)";

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
        >
          <PackagePlus className="mr-1.5 h-3.5 w-3.5" />
          Import from my products
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Import from my products</DialogTitle>
            <DialogDescription>
              Pick a product from your marketplace listings. Name, unit, price
              and photo get pre-filled — you can adjust and complete the
              DPR-specific fields (Primary/Secondary, Product Type, projections)
              in the next step.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Search my products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {listQuery.isLoading && (
              <p className="text-sm text-muted-foreground">Loading…</p>
            )}
            {!listQuery.isLoading && rows.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {debouncedSearch
                  ? "No products match that search."
                  : (
                    <>
                      No products in your marketplace yet. Add products from{" "}
                      <a href="/fpo/products" className="underline">
                        My Products
                      </a>{" "}
                      first, or use "Add product" below to enter one manually.
                    </>
                  )}
              </p>
            )}
            {rows.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={importMut.isPending}
                onClick={() => importMut.mutate(p.id)}
                className="flex w-full items-center gap-3 rounded border p-2 text-left hover:bg-muted disabled:opacity-50"
              >
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.image}
                    alt=""
                    className="h-12 w-12 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded bg-muted text-[10px] text-muted-foreground">
                    No photo
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{pickName(p.name)}</p>
                  <p className="text-xs text-muted-foreground">
                    ₹{p.price_per_unit} / {p.unit}
                  </p>
                </div>
              </button>
            ))}
          </div>
          {pagination && pagination.total_pages > 1 && (
            <div className="flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
              <span>
                Page {pagination.page} of {pagination.total_pages}
                {pagination.total_count > 0 && ` · ${pagination.total_count} total`}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!pagination.has_previous || listQuery.isFetching}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!pagination.has_next || listQuery.isFetching}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Section component ─────────────────────────────────────────────────────

export function ProductsSection({ uuid }: { uuid: string }) {
  const queryClient = useQueryClient();
  const {
    form,
    isLoading,
    isDirty,
    isSaving,
    lastSavedAt,
    saveError,
    fieldErrors,
    fieldWarnings,
    save,
    discard,
  } = useDprSectionForm<Data>({
    uuid,
    sectionKey: "products",
    schema: Schema,
    defaultValues: { items: [] },
    serializePayload,
  });

  // Use `useWatch` (not `form.watch`) — reliable reactive subscription so the
  // table re-renders when server data hydrates the form.
  const items = useWatch({ control: form.control, name: "items" }) ?? [];

  // Master dropdowns — cached 24h on the client
  const categoryQuery = useQuery({
    queryKey: ["dpr-master", "product-categories"],
    queryFn: () => dprMasterApi.list("product-categories"),
    staleTime: 24 * 60 * 60 * 1000,
  });
  const productTypeQuery = useQuery({
    queryKey: ["dpr-master", "product-types"],
    queryFn: () => dprMasterApi.list("product-types"),
    staleTime: 24 * 60 * 60 * 1000,
  });
  const unitQuery = useQuery({
    queryKey: ["dpr-master", "capacity-units"],
    queryFn: () => dprMasterApi.list("capacity-units"),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const labelOf = (
    list: { id: number; label: string }[] | undefined,
    id: number | null,
  ) => (id !== null && list?.find((r) => r.id === id)?.label) || "—";

  function handleChange(next: ProductItem[]) {
    form.setValue("items", next, { shouldDirty: true });
  }

  // ── Row view drawer (matches the `/fpo/products` UX) ───────────────────
  // Clicking a row opens ViewSheet showing the row's fields read-only.
  // The Edit action on ViewSheet closes the drawer and pops the existing
  // edit modal for that row (via NestedListCard's exposed openEdit ref).
  const nestedRef = useRef<NestedListHandle>(null);

  // Bridge from ReadinessPanel → this section's nested list. When the user
  // clicks a warning like "items[2].product_type" in the right-hand panel,
  // the panel scrolls the Products card into view and dispatches
  // `dpr:field-focus`. We pick that up and pop the edit modal for the
  // correct row so the user lands directly on the field to fix, not just
  // in the vicinity of the products list.
  useEffect(() => {
    function handleFocus(evt: Event) {
      const detail = (evt as CustomEvent<{ field?: string }>).detail;
      const field = detail?.field ?? "";
      const match = field.match(/^items\[(\d+)\]/);
      if (!match) return;
      const idx = Number(match[1]);
      if (!Number.isInteger(idx) || idx < 0) return;
      // Tiny defer so the scrollIntoView has painted before the modal
      // opens on top — otherwise the flash highlight is invisible.
      setTimeout(() => nestedRef.current?.openEdit(idx), 150);
    }
    window.addEventListener("dpr:field-focus", handleFocus as EventListener);
    return () => window.removeEventListener("dpr:field-focus", handleFocus as EventListener);
  }, []);
  const [rowView, setRowView] = useState<{
    open: boolean;
    row: ProductItem | null;
    index: number;
  }>({ open: false, row: null, index: -1 });

  const primaryOrSecondaryLabel = (v: string) =>
    PRIMARY_SECONDARY_OPTIONS.find((o) => o.value === v)?.label ?? "—";

  return (
    <SectionShell
      uuid={uuid}
      sectionKey="products"
      loading={isLoading}
      isDirty={isDirty}
      isSaving={isSaving}
      lastSavedAt={lastSavedAt}
      saveError={saveError}
      onSave={save}
      onDiscard={discard}
      help={
        <SectionHelp
          title="Products & Services"
          purpose="List every product or service the project will produce and sell. This is the revenue side of your plan — each row is one thing the FPO offers, with the annual quantity and selling price that flows straight into the financial projections. At least one row is required; add as many as you need."
          whatToFill={[
            "Click 'Add product' to open the entry form. Each row captures one product, service or by-product.",
            "Product / service name is required. Use a short descriptive name (e.g. 'Cold-Pressed Virgin Coconut Oil — Retail').",
            "Unit of measurement is required. Pick the unit you produce in (Litre, Kilogram, Tonne, Piece, etc.). Same unit is used for the annual quantity below.",
            "Annual quantity is required and must be greater than 0. This is the total amount produced in one year — drives revenue = quantity × selling price.",
            "Selling price per unit (₹) is required and must be greater than 0. Realistic per-unit price at the point of sale.",
            "Category (recommended) — pick the closest match from the seeded list. Helps the AI narrative pull relevant Kerala market data.",
            "Primary / Secondary — mark your main revenue drivers as Primary; by-products and side offerings as Secondary.",
            "Product type (recommended) — Finished, Intermediate, By-product, or Service. Improves AI content.",
            "Value-added product (optional) — Yes if the product involves processing / transformation that commands a premium; No if it's raw output. Leave blank if you're not sure.",
            "Selling unit and Description are optional. Selling unit matters only when what you sell differs from what you produce (e.g. produced in kilograms, sold in 500g packets).",
            "You can add unlimited rows. Click any row to open the details drawer; click Edit inside the drawer or the pencil icon to change a row.",
          ]}
          tips={[
            "Quantity × selling price becomes your Year-1 revenue in the Finance section. Keep the numbers realistic — they drive P&L, cash flow, IRR, DSCR and every ratio your DPR is judged on.",
            "Unit consistency matters. If you enter '120000 Litre' for annual quantity and '280 / Litre' for selling price, the calc engine gets ₹3.36 Cr revenue. Mixing units silently corrupts the projections.",
            "Add by-products too. Coconut oil cake from oil extraction, husks, shells — these often generate real income (₹18/kg × 40,000 kg = ₹7.2 lakh/yr) and skipping them under-states the project's viability.",
            "Value-added is a judgment call. Cold-pressed variants, retail-packaged goods, and branded products almost always qualify. Bulk / raw output does not. If your project spans both, add separate rows.",
            "The status icon on each row shows whether all required fields are filled — amber means something is missing, green means the row passes.",
          ]}
          downstream={[
            "Finance section — Year-1 revenue table pulls directly from your quantity × price entries",
            "P&L, cash flow, IRR, DSCR, break-even and every financial ratio in the DPR PDF",
            "AI Executive Summary + Market Analysis chapters — product list appears in the prompt context",
            "PDF product-mix table and cover-page product line",
          ]}
        />
      }
    >
      {/* id="dpr-field-items" is the readiness scroll target — clicking
          "At least one product or service shall be entered" from the
          readiness panel deep-links here. Placed on the outer wrapper so
          the scroll lands above the NestedListCard. */}
      <div id="dpr-field-items">
      <ImportFromMarketplaceButton
        uuid={uuid}
        onImported={(newItem) => {
          // Append the fresh row straight into the form's items array. The
          // useDprSectionForm hook only seeds from the server fetch ONCE
          // (hasSeededRef guard), so invalidating the query wouldn't reach
          // the form. Also keep the section-query cache in sync so a page
          // refresh shows the same row without a re-fetch flash.
          const current = form.getValues("items") ?? [];
          const shaped = ProductItemSchema.parse({
            ...EMPTY_ITEM,
            ...(newItem as object),
            order: current.length,
          });
          const next = [...current, shaped];
          form.setValue("items", next, { shouldDirty: true });
          queryClient.setQueryData(
            ["dpr-section", uuid, "products"],
            (prev: unknown) => {
              const p = (prev ?? {}) as { items?: unknown[] };
              return { ...p, items: [...(p.items ?? []), newItem] };
            },
          );
          // Auto-open the edit modal on the newly appended row so the user
          // lands on the DPR-only mandatory fields (Primary/Secondary, Product
          // Type, Category, Annual Quantity) without hunting.
          setTimeout(() => nestedRef.current?.openEdit(next.length - 1), 50);
        }}
      />
      <NestedListCard<ProductItem>
        ref={nestedRef}
        onRowClick={(row, idx) => setRowView({ open: true, row, index: idx })}
        title="Products & Services"
        items={items}
        onChange={handleChange}
        emptyRow={EMPTY_ITEM}
        addLabel="Add product"
        editLabel="Edit product"
        emptyHint="No products yet. Click Add product to start."
        error={fieldErrors.get("items")}
        warning={fieldWarnings.get("items")}
        // Save button in the modal is now gated on the SAME rules the backend
        // enforces (name / unit / qty>0 / price>0) — not just non-blank name.
        // Prevents "row saved locally but explodes at readiness time".
        isValid={(row) => Object.keys(validateRow(row)).length === 0}
        columns={[
          {
            // Leading status column — small green check when the row passes
            // every backend rule, small amber warning when any field is missing
            // or invalid. Gives the user an at-a-glance signal on which row
            // needs attention without opening every modal.
            key: "id",
            label: "",
            render: (_v, row) => {
              const bad = Object.keys(validateRow(row)).length > 0;
              return bad ? (
                <AlertCircle
                  className="h-4 w-4 text-amber-600 dark:text-amber-500"
                  aria-label="Row has missing or invalid required fields"
                />
              ) : (
                <CheckCircle2
                  className="h-4 w-4 text-emerald-600 dark:text-emerald-500"
                  aria-label="Row passes all required-field checks"
                />
              );
            },
          },
          { key: "name", label: "Name" },
          {
            key: "category",
            label: "Category",
            render: (v) => labelOf(categoryQuery.data, v as number | null),
          },
          {
            key: "annual_quantity",
            label: "Qty / yr",
            render: (v, row) => {
              const qty = v ?? "—";
              const unit = labelOf(unitQuery.data, row.unit_of_measurement);
              return unit === "—" ? String(qty) : `${qty} ${unit}`;
            },
          },
          {
            key: "selling_price_per_unit",
            label: "Price (₹)",
            render: (v, row) => {
              const p = v ?? "—";
              const su = labelOf(unitQuery.data, row.selling_unit);
              return su === "—" ? String(p) : `${p} / ${su}`;
            },
          },
        ]}
        renderModal={(row, set) => {
          // Inline validation runs live on every keystroke — the ModalField
          // `error` prop below reads each key. Same rules as validateRow's
          // return shape so the modal, the row status icon, and the Save
          // button all agree on what "valid" means.
          const rowErrors = validateRow(row);
          return (
          <>
            <ModalField label="Product / service name *" error={rowErrors.name}>
              <Input
                value={row.name}
                onChange={(e) =>
                  set("name", e.target.value.slice(0, MAX_PRODUCT_NAME_CHARS))
                }
                maxLength={MAX_PRODUCT_NAME_CHARS}
                placeholder="e.g. Basmati Rice — Premium"
              />
            </ModalField>

            <ModalRow>
              <ModalField label="Category">
                {/* Type-to-search — 18 product categories seeded, long enough
                    that a plain dropdown is painful. Selection chip below the
                    input has a ✕ to clear. */}
                <MasterSearchableSelect
                  value={row.category}
                  options={categoryQuery.data ?? []}
                  onChange={(v) => set("category", v)}
                  placeholder="Type to search category…"
                />
              </ModalField>
              <ModalField label="Primary / Secondary">
                <ChoiceSelect
                  value={row.primary_or_secondary}
                  options={PRIMARY_SECONDARY_OPTIONS}
                  onChange={(v) => set("primary_or_secondary", v)}
                  placeholder="Select"
                />
              </ModalField>
            </ModalRow>

            <ModalRow>
              <ModalField label="Product type">
                <MasterSelect
                  value={row.product_type}
                  options={productTypeQuery.data ?? []}
                  onChange={(v) => set("product_type", v)}
                  placeholder="Finished / Intermediate / By-product / Service"
                />
              </ModalField>
              <ModalField label="Value-added product (optional)">
                {/* Tri-state Yes / No / placeholder — this field is
                    optional so we don't want the dropdown to imply "No"
                    for a fresh row. When the user hasn't picked anything,
                    ChoiceSelect shows its placeholder; picking Yes or No
                    is entirely their choice. Coerced to boolean at save
                    time in serializePayload. */}
                <ChoiceSelect
                  value={
                    row.is_value_added === true
                      ? "yes"
                      : row.is_value_added === false
                        ? "no"
                        : ""
                  }
                  options={[
                    { value: "yes", label: "Yes" },
                    { value: "no", label: "No" },
                  ]}
                  onChange={(v) =>
                    set("is_value_added", v === "yes" ? true : v === "no" ? false : null)
                  }
                  placeholder="Select (optional)"
                />
              </ModalField>
            </ModalRow>

            <ModalRow>
              <ModalField label="Annual quantity *" error={rowErrors.annual_quantity}>
                {/* type="text" + inputMode="decimal" — matches investment
                    pattern. type="number" has no length cap so a pasted
                    60-digit number sails through; normaliser strips non-
                    numeric chars, enforces 3 decimals (matches backend
                    Decimal(18, 3)), and clips at 1 billion units. */}
                <Input
                  type="text"
                  inputMode="decimal"
                  maxLength={14}
                  placeholder="e.g. 120000"
                  value={row.annual_quantity !== null ? String(row.annual_quantity) : ""}
                  onChange={(e) => {
                    const cleaned = normaliseDecimalInput(e.target.value, {
                      max: MAX_ANNUAL_QUANTITY,
                      maxDecimals: 3,
                    });
                    set("annual_quantity", cleaned === "" ? null : cleaned);
                  }}
                />
              </ModalField>
              <ModalField label="Unit of measurement *" error={rowErrors.unit_of_measurement}>
                <MasterSearchableSelect
                  value={row.unit_of_measurement}
                  options={unitQuery.data ?? []}
                  onChange={(v) => set("unit_of_measurement", v)}
                  placeholder="Type to search unit…"
                />
              </ModalField>
            </ModalRow>

            <ModalRow>
              <ModalField
                label="Selling price per unit (₹) *"
                error={rowErrors.selling_price_per_unit}
              >
                {/* Same normaliser pattern as quantity — 2 decimals (matches
                    backend Decimal(15, 2)) and capped at ₹10 crore/unit. */}
                <Input
                  type="text"
                  inputMode="decimal"
                  maxLength={14}
                  placeholder="e.g. 280"
                  value={
                    row.selling_price_per_unit !== null
                      ? String(row.selling_price_per_unit)
                      : ""
                  }
                  onChange={(e) => {
                    const cleaned = normaliseDecimalInput(e.target.value, {
                      max: MAX_UNIT_PRICE_INR,
                      maxDecimals: 2,
                    });
                    set(
                      "selling_price_per_unit",
                      cleaned === "" ? null : cleaned,
                    );
                  }}
                />
              </ModalField>
              <ModalField label="Selling unit">
                <MasterSearchableSelect
                  value={row.selling_unit}
                  options={unitQuery.data ?? []}
                  onChange={(v) => set("selling_unit", v)}
                  placeholder="Type to search unit…"
                />
              </ModalField>
            </ModalRow>

            <ModalField label="Brief description">
              {/* Backend `description` is TextField (no length limit). Cap
                  here at 2000 chars — same pattern as investment remarks.
                  Character counter turns amber past 90%, destructive at cap. */}
              <div className="space-y-1">
                <Textarea
                  rows={2}
                  maxLength={MAX_DESCRIPTION_CHARS}
                  value={row.description}
                  onChange={(e) =>
                    set(
                      "description",
                      e.target.value.slice(0, MAX_DESCRIPTION_CHARS),
                    )
                  }
                  placeholder="Optional notes about this product…"
                />
                {(() => {
                  const len = (row.description ?? "").length;
                  const near = len > MAX_DESCRIPTION_CHARS * 0.9;
                  const at = len >= MAX_DESCRIPTION_CHARS;
                  return (
                    <div
                      className={
                        at
                          ? "text-right text-xs font-medium text-destructive"
                          : near
                            ? "text-right text-xs text-amber-600"
                            : "text-right text-xs text-muted-foreground"
                      }
                    >
                      {len} / {MAX_DESCRIPTION_CHARS} chars
                    </div>
                  );
                })()}
              </div>
            </ModalField>
            <ModalField label="Product photo (optional)">
              <ProductImageField
                uuid={uuid}
                rowId={row.id}
                currentImageUrl={row.image ?? null}
                pendingFile={row._pendingImage ?? null}
                onChange={(newUrl) => set("image", newUrl)}
                onPendingChange={(file) => set("_pendingImage", file)}
              />
            </ModalField>
          </>
          );
        }}
      />
      </div>

      {/* Row-detail drawer — same ViewSheet component used on /fpo/products.
          Opens on row click (see onRowClick above), shows all fields
          read-only, and the Edit action closes the drawer and pops the
          existing edit modal for the same row via the imperative ref. */}
      <ViewSheet
        open={rowView.open}
        onOpenChange={(open) => setRowView((s) => ({ ...s, open }))}
        title={rowView.row?.name || "Product details"}
        actions={
          rowView.row
            ? [
                {
                  label: "Edit",
                  icon: Pencil,
                  onClick: () => {
                    const idx = rowView.index;
                    setRowView({ open: false, row: null, index: -1 });
                    // Defer to next tick so the sheet close animation
                    // doesn't overlap the modal open animation.
                    setTimeout(() => nestedRef.current?.openEdit(idx), 0);
                  },
                },
              ]
            : []
        }
        fields={
          rowView.row
            ? [
                ...(rowView.row.image
                  ? [
                      {
                        label: "Product photo",
                        type: "node" as const,
                        node: (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={rowView.row.image}
                            alt="Product"
                            className="h-40 w-56 rounded border object-cover"
                          />
                        ),
                      },
                    ]
                  : []),
                { label: "Name", value: rowView.row.name || "—" },
                {
                  label: "Category",
                  value: labelOf(categoryQuery.data, rowView.row.category),
                },
                {
                  label: "Primary / Secondary",
                  value: primaryOrSecondaryLabel(rowView.row.primary_or_secondary),
                },
                {
                  label: "Product type",
                  value: labelOf(productTypeQuery.data, rowView.row.product_type),
                },
                {
                  label: "Value-added product",
                  type: "status",
                  active: rowView.row.is_value_added === true,
                  activeLabel: "Yes",
                  inactiveLabel:
                    rowView.row.is_value_added === false ? "No" : "Not specified",
                },
                {
                  label: "Annual quantity",
                  value:
                    rowView.row.annual_quantity !== null
                      ? `${rowView.row.annual_quantity} ${labelOf(
                          unitQuery.data,
                          rowView.row.unit_of_measurement,
                        )}`
                      : "—",
                },
                {
                  label: "Selling price per unit",
                  value:
                    rowView.row.selling_price_per_unit !== null
                      ? `₹${rowView.row.selling_price_per_unit} / ${labelOf(
                          unitQuery.data,
                          rowView.row.selling_unit,
                        )}`
                      : "—",
                },
                {
                  label: "Description",
                  value: rowView.row.description || "—",
                },
              ]
            : []
        }
      />
    </SectionShell>
  );
}
