"use client";

/**
 * DPR Knowledge Base — KAU Central Admin editor for the AI grounding sources.
 *
 * Per KAU RCD reply A.2 (2026-09-03). Admins curate the knowledge base that
 * grounds AI-generated DPR narratives: KAU PoP publications, government
 * schemes, Kefi Tech SOPs, Kerala statutory portals, and AGMARKNET price
 * feeds. Every AI paragraph will trace back to the KB entry IDs it drew
 * from (Phase 5 wires the trace).
 *
 * UX approach:
 *   - Shared `<DataTable>` — same pagination + search + column visibility
 *     + filter chips as /admin/dpr/projects and /admin/audit-logs.
 *   - "Add entry" opens a full-screen dialog for the write shape.
 *   - Each row has Edit / Supersede / Deactivate / Delete inline.
 *
 * Author: Athul Gopan (Kefi Tech Solutions)
 */

import { useMemo, useState } from "react";

import type { ColumnDef } from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Ban,
  BookOpen,
  Edit2,
  Layers,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import {
  dprKnowledgeApi,
  SOURCE_TYPE_LABELS,
  SOURCE_TYPE_LABELS_SHORT,
  SOURCE_TYPE_ORDER,
  type KnowledgeEntryDetail,
  type KnowledgeEntryInput,
  type KnowledgeEntryRow,
  type KnowledgeSourceType,
} from "@/app/admin/_api/dpr-knowledge";
import { DataTable } from "@/components/data-table";
import type { FilterConfig } from "@/components/data-table/data-table-toolbar";
import { Badge } from "@/components/ui/badge";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// DPR section keys — hard-coded so the filter select doesn't need a network call.
// Backend filter accepts any string, so a mismatch is a UX issue not a bug.
const DPR_SECTION_OPTIONS = [
  "identification",
  "components",
  "nature-of-business",
  "investment",
  "products",
  "location",
  "rationale",
  "baseline",
  "capacity",
  "raw-material",
  "market",
  "technology",
  "site",
  "civil",
  "machinery",
  "utilities",
  "hr",
  "finance",
  "compliance",
  "ess",
  "implementation",
  "risk",
];

// ── Page ───────────────────────────────────────────────────────────────────

type DialogState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; entry: KnowledgeEntryRow }
  | { mode: "supersede"; entry: KnowledgeEntryRow };

export default function AdminDprKnowledgePage() {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<DialogState>({ mode: "closed" });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-dpr-knowledge"] });

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => dprKnowledgeApi.deactivate(id),
    onSuccess: () => {
      invalidate();
      toast.success("Entry deactivated (kept for traceability).");
    },
    onError: () => toast.error("Failed to deactivate entry."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => dprKnowledgeApi.remove(id),
    onSuccess: () => {
      invalidate();
      toast.success("Entry deleted.");
    },
    onError: () => toast.error("Failed to delete entry."),
  });

  // Columns depend on the mutation callbacks — declared inline via useMemo
  // rather than a top-level function so they can capture the setDialog closure
  // for edit/supersede.
  const columns = useMemo<ColumnDef<KnowledgeEntryRow>[]>(
    () => [
      {
        accessorKey: "source_type",
        header: "Source",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              {row.original.source_type_display}
            </span>
            <p className="text-xs text-muted-foreground">{row.original.source_name}</p>
            {row.original.source_version && (
              <p className="text-[10px] text-muted-foreground">
                v: {row.original.source_version}
              </p>
            )}
          </div>
        ),
      },
      {
        accessorKey: "title",
        header: "Title",
        enableSorting: false,
        cell: ({ row }) => (
          <div>
            <p className="text-sm font-medium leading-snug">{row.original.title}</p>
            {row.original.tags.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {row.original.tags.slice(0, 4).map((t) => (
                  <span
                    key={t}
                    className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: "section_keys",
        header: "Sections",
        enableSorting: false,
        cell: ({ row }) => {
          const keys = row.original.section_keys;
          if (keys.length === 0) {
            return <span className="text-[10px] text-muted-foreground">Any</span>;
          }
          return (
            <div className="flex flex-wrap gap-1">
              {keys.slice(0, 3).map((s) => (
                <span key={s} className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                  {s}
                </span>
              ))}
              {keys.length > 3 && (
                <span className="text-[10px] text-muted-foreground">+{keys.length - 3}</span>
              )}
            </div>
          );
        },
      },
      {
        id: "coverage",
        header: "Coverage",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span title="Commodities">🌾 {row.original.commodity_count}</span>
            <span title="Components">🧩 {row.original.component_count}</span>
            <span title="Business types">🏢 {row.original.business_type_count}</span>
            <span className="ml-1 rounded bg-muted px-1 py-0.5 text-[10px] uppercase">
              {row.original.language}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "is_active",
        header: "State",
        enableSorting: false,
        cell: ({ row }) => {
          if (row.original.is_active) {
            return (
              <Badge variant="secondary" className="text-[10px]">
                Active
              </Badge>
            );
          }
          if (row.original.superseded_by) {
            return (
              <Badge variant="outline" className="text-[10px]">
                Superseded by #{row.original.superseded_by}
              </Badge>
            );
          }
          return (
            <Badge variant="outline" className="text-[10px]">
              Inactive
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDialog({ mode: "edit", entry: row.original })}
              title="Edit in place"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDialog({ mode: "supersede", entry: row.original })}
              title="Create a new version and mark this superseded"
            >
              <Layers className="h-3.5 w-3.5" />
            </Button>
            {row.original.is_active && (
              <Button
                size="sm"
                variant="ghost"
                disabled={deactivateMutation.isPending}
                onClick={() => {
                  if (
                    window.confirm(
                      `Deactivate "${row.original.title}"? Existing narrative citations stay traceable.`,
                    )
                  ) {
                    deactivateMutation.mutate(row.original.id);
                  }
                }}
                title="Soft-deactivate (keeps entry for citation trace)"
              >
                <Ban className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (
                  window.confirm(
                    `Delete "${row.original.title}"? Deactivating is preferred — deleting removes citation trace.`,
                  )
                ) {
                  deleteMutation.mutate(row.original.id);
                }
              }}
              title="Hard delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [deactivateMutation, deleteMutation],
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        key: "source_type",
        label: "Source type",
        type: "select",
        options: SOURCE_TYPE_ORDER.map((t) => ({
          value: t,
          label: SOURCE_TYPE_LABELS[t],
        })),
      },
      {
        key: "section",
        label: "Section",
        type: "select",
        options: DPR_SECTION_OPTIONS.map((s) => ({ value: s, label: s })),
      },
      {
        key: "language",
        label: "Language",
        type: "select",
        options: [
          { value: "en", label: "English" },
          { value: "ml", label: "Malayalam" },
        ],
      },
      {
        key: "is_active",
        label: "State",
        type: "select",
        options: [
          { value: "true", label: "Active only" },
          { value: "false", label: "Inactive only" },
        ],
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/dashboard">
              <ArrowLeft className="mr-1 h-4 w-4" /> Dashboard
            </Link>
          </Button>
        </div>
        <Button size="sm" onClick={() => setDialog({ mode: "create" })}>
          <Plus className="mr-1 h-4 w-4" /> Add entry
        </Button>
      </div>

      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <BookOpen className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-bold text-2xl">DPR Knowledge Base</h1>
          <p className="mt-0.5 max-w-3xl text-sm text-muted-foreground">
            Authoritative source content that grounds AI-generated DPR narratives
            (KAU RCD A.2). Add entries from KAU Package of Practices, government schemes,
            Kefi Tech SOPs, Kerala statutory portals, and AGMARKNET. Every AI paragraph
            traces back to the entry IDs it cited.
          </p>
        </div>
      </div>

      <DataTable
        queryKey="admin-dpr-knowledge"
        queryFn={dprKnowledgeApi.getAll}
        columns={columns}
        filters={filters}
        columnsLabel="Columns"
        toggleColumnsLabel="Toggle columns"
        searchPlaceholder="Search title, content, source…"
        clearLabel="Clear"
      />

      <EntryDialog
        state={dialog}
        onClose={() => setDialog({ mode: "closed" })}
        onSaved={invalidate}
      />
    </div>
  );
}

// ── Editor dialog ──────────────────────────────────────────────────────────
// Handles create + edit + supersede. Supersede is functionally "create a new
// entry, then attach as replacement" — the backend endpoint does both
// atomically, so from the FE it's the same form.

function EntryDialog({
  state,
  onClose,
  onSaved,
}: {
  state: DialogState;
  onClose: () => void;
  onSaved: () => void;
}) {
  const open = state.mode !== "closed";
  const targetId = state.mode === "edit" || state.mode === "supersede" ? state.entry.id : null;

  // Load full detail only when editing/superseding — need `content` field
  // that's absent from the list row shape.
  const { data: detail } = useQuery({
    queryKey: ["admin-dpr-knowledge-detail", targetId],
    queryFn: () => (targetId ? dprKnowledgeApi.retrieve(targetId) : Promise.resolve(null)),
    enabled: !!targetId,
  });

  const [form, setForm] = useState<KnowledgeEntryInput>(() => defaultForm());
  const initialisedForRef = useMemo(() => ({ ref: null as string | null }), []);
  const initialiseKey = `${state.mode}:${targetId ?? "new"}:${detail?.id ?? "loading"}`;
  if (open && initialisedForRef.ref !== initialiseKey) {
    initialisedForRef.ref = initialiseKey;
    if (state.mode === "create") {
      setForm(defaultForm());
    } else if (detail) {
      setForm(detailToForm(detail));
    }
  }
  if (!open && initialisedForRef.ref !== null) {
    initialisedForRef.ref = null;
  }

  const submitMutation = useMutation({
    mutationFn: async (payload: KnowledgeEntryInput) => {
      if (state.mode === "edit" && targetId) {
        return dprKnowledgeApi.update(targetId, payload);
      }
      if (state.mode === "supersede" && targetId) {
        return dprKnowledgeApi.supersede(targetId, payload);
      }
      return dprKnowledgeApi.create(payload);
    },
    onSuccess: (result) => {
      toast.success(
        state.mode === "edit"
          ? `Updated: ${result.title}`
          : state.mode === "supersede"
            ? `Superseded — new entry #${result.id}`
            : `Created entry #${result.id}`,
      );
      onSaved();
      onClose();
    },
    onError: (err) => {
      console.warn("[KB entry save]", err);
      toast.error("Failed to save entry. Check required fields.");
    },
  });

  const canSubmit =
    !!form.source_type &&
    form.source_name.trim() !== "" &&
    form.title.trim() !== "" &&
    form.content.trim() !== "";

  const title =
    state.mode === "edit"
      ? "Edit knowledge entry"
      : state.mode === "supersede"
        ? "Supersede knowledge entry"
        : "Add knowledge entry";
  const desc =
    state.mode === "supersede"
      ? `Old entry #${targetId} will be auto-deactivated and linked to the new one via superseded_by.`
      : "Fields marked * are required. Section keys + tags accept comma-separated values.";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !submitMutation.isPending) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{desc}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Top row: 1 col on mobile, 3 on md+.
              `min-w-0` on each cell lets the Select trigger truncate its
              value instead of overflowing into the neighbouring cell — this
              is the fix for the "Kerala statutory / regulatory" overlap. */}
          <div className="grid gap-3 md:grid-cols-3">
            <div className="min-w-0 space-y-1.5">
              <Label className="text-xs">Source type *</Label>
              <Select
                value={form.source_type}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, source_type: v as KnowledgeSourceType }))
                }
              >
                <SelectTrigger className="h-9 w-full">
                  {/* Explicit short label so the trigger stays compact
                      regardless of the long option name. */}
                  <span className="truncate">
                    {SOURCE_TYPE_LABELS_SHORT[form.source_type] ?? "—"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_TYPE_ORDER.map((t) => (
                    <SelectItem key={t} value={t}>
                      {SOURCE_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label className="text-xs">Language</Label>
              <Select
                value={form.language ?? "en"}
                onValueChange={(v) => setForm((f) => ({ ...f, language: v }))}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ml">Malayalam</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label className="text-xs">Source version</Label>
              <Input
                placeholder="e.g. 2024 Edition"
                value={form.source_version ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, source_version: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Source name *</Label>
            <Input
              placeholder='e.g. "KAU PoP — Turmeric" or "PMKSY Per Drop More Crop"'
              value={form.source_name}
              onChange={(e) => setForm((f) => ({ ...f, source_name: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Source URL</Label>
            <Input
              placeholder="https://…"
              value={form.source_url ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, source_url: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Title *</Label>
            <Input
              placeholder="One-line summary shown to admins"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Content * (used verbatim in AI prompts)</Label>
            <Textarea
              rows={8}
              placeholder="A few short paragraphs. Large docs should be split into multiple entries."
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Section keys (comma-separated)</Label>
              <Input
                placeholder="e.g. market, technology"
                value={(form.section_keys ?? []).join(", ")}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    section_keys: splitCsv(e.target.value),
                  }))
                }
              />
              <p className="text-[10px] text-muted-foreground">
                Blank = applies to any section (universal).
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tags (comma-separated)</Label>
              <Input
                placeholder="e.g. prices, monthly, organic"
                value={(form.tags ?? []).join(", ")}
                onChange={(e) => setForm((f) => ({ ...f, tags: splitCsv(e.target.value) }))}
              />
            </div>
          </div>

          <p className="rounded-md border border-dashed bg-muted/30 p-3 text-[11px] text-muted-foreground">
            Commodity, component, and business-type filters (M2M) can be edited from the Django
            admin for now — a full picker UI ships in Phase 5 when narrative generation goes live.
            Blank filters here mean the entry is universal.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitMutation.isPending}>
            Cancel
          </Button>
          <Button
            disabled={!canSubmit || submitMutation.isPending}
            onClick={() => submitMutation.mutate(form)}
          >
            {submitMutation.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            {state.mode === "edit"
              ? "Save changes"
              : state.mode === "supersede"
                ? "Create replacement"
                : "Create entry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function defaultForm(): KnowledgeEntryInput {
  return {
    source_type: "sop",
    source_name: "",
    source_url: "",
    source_version: "",
    title: "",
    content: "",
    language: "en",
    section_keys: [],
    tags: [],
    commodities: [],
    components: [],
    business_types: [],
    is_active: true,
  };
}

function detailToForm(d: KnowledgeEntryDetail): KnowledgeEntryInput {
  return {
    source_type: d.source_type,
    source_name: d.source_name,
    source_url: d.source_url,
    source_version: d.source_version,
    title: d.title,
    content: d.content,
    language: d.language,
    section_keys: d.section_keys ?? [],
    tags: d.tags ?? [],
    commodities: d.commodities ?? [],
    components: d.components ?? [],
    business_types: d.business_types ?? [],
    is_active: d.is_active,
  };
}

function splitCsv(v: string): string[] {
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
