"use client";

/**
 * DPR Field Rules — KAU admin editor for Level 2 (field-level) rules.
 *
 * Level 1 (component × section M/O/H) lives at /admin/dpr-applicability.
 * This page handles the more granular Level 2 rules — show/hide an
 * individual FIELD inside a section based on either a component check
 * or a sibling-field value check.
 *
 * Rule shapes:
 *   component_in — "Show/hide <field> in <section> when project has ANY
 *                   of these components selected."
 *   field_equals — "Show/hide <field> in <section> when <trigger_field>
 *                   in the same section equals <trigger_value>."
 *
 * Author: Athul Gopan (Kefi Tech Solutions)
 */

import { useEffect, useRef, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Edit2,
  Layers,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import {
  dprFieldRulesApi,
  type FieldRule,
  type FieldRulePayload,
  type FieldRuleRecipe,
  type FieldRuleVisibility,
} from "@/app/admin/_api/dpr-field-rules";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";


type DraftRule = {
  id?: number;
  data_element_key: string;
  field_name: string;
  recipe_type: FieldRuleRecipe;
  visibility: FieldRuleVisibility;
  required_components: number[];
  trigger_field: string;
  trigger_value: string;
  notes: string;
};

const BLANK_DRAFT: DraftRule = {
  data_element_key: "",
  field_name: "",
  recipe_type: "component_in",
  visibility: "show_when",
  required_components: [],
  trigger_field: "",
  trigger_value: "",
  notes: "",
};


function ruleToDraft(rule: FieldRule): DraftRule {
  return {
    id: rule.id,
    data_element_key: rule.data_element_key,
    field_name: rule.field_name,
    recipe_type: rule.recipe_type,
    visibility: rule.visibility,
    required_components: rule.required_components,
    trigger_field: rule.trigger_field,
    trigger_value: rule.trigger_value,
    notes: rule.notes,
  };
}


function draftToPayload(d: DraftRule): FieldRulePayload {
  const base: FieldRulePayload = {
    data_element_key: d.data_element_key,
    field_name: d.field_name,
    recipe_type: d.recipe_type,
    visibility: d.visibility,
    notes: d.notes,
  };
  if (d.recipe_type === "component_in") {
    base.required_components = d.required_components;
    base.trigger_field = "";
    base.trigger_value = "";
  } else {
    base.required_components = [];
    base.trigger_field = d.trigger_field;
    base.trigger_value = d.trigger_value;
  }
  return base;
}


export default function FieldRulesPage() {
  const queryClient = useQueryClient();

  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [recipeFilter, setRecipeFilter] = useState<string>("all");
  // KAU 2026-09-20 — text search over field_name / notes for finding a
  // specific rule fast once the rule set grows beyond a handful.
  const [textSearch, setTextSearch] = useState("");

  // Schema (section keys, components, dropdown enums) — long staleTime
  // because this rarely changes.
  const schemaQ = useQuery({
    queryKey: ["dpr-field-rules-schema"],
    queryFn: () => dprFieldRulesApi.schema(),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const rulesQ = useQuery({
    queryKey: [
      "dpr-field-rules",
      sectionFilter,
      recipeFilter,
    ],
    queryFn: () =>
      dprFieldRulesApi.list({
        section: sectionFilter !== "all" ? sectionFilter : undefined,
        recipe_type: recipeFilter !== "all" ? (recipeFilter as FieldRuleRecipe) : undefined,
      }),
    staleTime: 30_000,
  });

  const rawRules = rulesQ.data ?? [];
  const schema = schemaQ.data;

  // Client-side text search — cheaper than another network round trip.
  const rules = textSearch.trim()
    ? rawRules.filter((r) => {
        const q = textSearch.toLowerCase();
        return (
          r.field_name.toLowerCase().includes(q) ||
          r.notes.toLowerCase().includes(q) ||
          r.data_element_key.toLowerCase().includes(q)
        );
      })
    : rawRules;

  // Group by section for readability — 50+ mixed rules in a flat list is
  // impossible to scan. Sections rendered in the order they appear in
  // schema.section_keys so KAU sees them in a consistent order.
  const rulesBySection = new Map<string, FieldRule[]>();
  for (const r of rules) {
    if (!rulesBySection.has(r.data_element_key)) {
      rulesBySection.set(r.data_element_key, []);
    }
    rulesBySection.get(r.data_element_key)!.push(r);
  }
  const orderedSections = (schema?.section_keys ?? []).filter((k) =>
    rulesBySection.has(k),
  );

  // Options for the section-key SearchableSelect. Cast to a plain array so
  // TypeScript is happy — SearchableSelect wants ReadonlyArray<SelectOption>.
  const sectionOptionsForFilter = [
    { value: "all", label: "All sections" },
    ...(schema?.section_keys ?? []).map((k) => ({ value: k, label: k })),
  ];
  const sectionOptionsForForm = (schema?.section_keys ?? []).map((k) => ({
    value: k,
    label: k,
  }));
  const recipeOptionsForFilter = [
    { value: "all", label: "All recipes" },
    ...(schema?.recipe_types ?? []).map((r) => ({ value: r.value, label: r.label })),
  ];
  const recipeOptionsForForm = (schema?.recipe_types ?? []).map((r) => ({
    value: r.value,
    label: r.label,
  }));
  const visibilityOptionsForForm = (schema?.visibility_directions ?? []).map((v) => ({
    value: v.value,
    label: v.label,
  }));

  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<DraftRule>(BLANK_DRAFT);

  function openCreate() {
    setDraft(BLANK_DRAFT);
    setDialogOpen(true);
  }
  function openEdit(rule: FieldRule) {
    setDraft(ruleToDraft(rule));
    setDialogOpen(true);
  }

  const saveMutation = useMutation({
    mutationFn: (d: DraftRule) =>
      d.id
        ? dprFieldRulesApi.update(d.id, draftToPayload(d))
        : dprFieldRulesApi.create(draftToPayload(d)),
    onSuccess: () => {
      toast.success(draft.id ? "Field rule updated" : "Field rule created");
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["dpr-field-rules"] });
    },
    onError: (err: unknown) => {
      // Try to extract the DRF ValidationError shape.
      const anyErr = err as { response?: { data?: unknown } };
      const detail = anyErr?.response?.data ?? "Save failed.";
      toast.error(typeof detail === "string" ? detail : JSON.stringify(detail));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => dprFieldRulesApi.remove(id),
    onSuccess: () => {
      toast.success("Field rule deleted");
      queryClient.invalidateQueries({ queryKey: ["dpr-field-rules"] });
    },
    onError: () => toast.error("Delete failed"),
  });

  function submitDraft() {
    // Minimal client-side guard — deeper validation happens server-side.
    if (!draft.data_element_key || !draft.field_name) {
      toast.error("Section and field name are required.");
      return;
    }
    if (draft.recipe_type === "component_in" && draft.required_components.length === 0) {
      toast.error("Select at least one component for 'component_in' rules.");
      return;
    }
    if (draft.recipe_type === "field_equals" && (!draft.trigger_field || !draft.trigger_value)) {
      toast.error("trigger_field and trigger_value are required for 'field_equals' rules.");
      return;
    }
    saveMutation.mutate(draft);
  }

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      {/* Top bar — back link left, primary action right (matches
          /admin/dpr-knowledge, /admin/dpr-master-data, etc.) */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/dashboard">
              <ArrowLeft className="mr-1 h-4 w-4" /> Dashboard
            </Link>
          </Button>
        </div>
        <Button size="sm" onClick={openCreate} disabled={!schema}>
          <Plus className="mr-1 h-4 w-4" /> Add rule
        </Button>
      </div>

      {/* Page title with icon badge — same shape as other DPR admin pages. */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Layers className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-bold text-2xl">DPR Field Rules (Level 2)</h1>
          <p className="mt-0.5 max-w-3xl text-sm text-muted-foreground">
            Show or hide individual fields inside a DPR wizard section based on
            components the FPO has selected, or on the value of a sibling
            field in the same section. Level 1 (Mandatory / Optional / Hidden
            matrix per section) is separate and lives at{" "}
            <Link href="/admin/dpr-applicability" className="underline">
              /admin/dpr-applicability
            </Link>
            .
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="min-w-64 flex-1 space-y-1">
            <Label className="text-xs">Search field / notes</Label>
            <Input
              value={textSearch}
              onChange={(e) => setTextSearch(e.target.value)}
              placeholder="e.g. steam_capacity, is_operational…"
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Filter — section</Label>
            <SearchableSelect
              value={sectionFilter}
              onChange={setSectionFilter}
              options={sectionOptionsForFilter}
              placeholder="All sections"
              className="w-52"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Filter — recipe</Label>
            <SearchableSelect
              value={recipeFilter}
              onChange={setRecipeFilter}
              options={recipeOptionsForFilter}
              placeholder="All recipes"
              className="w-52"
            />
          </div>
          <div className="ml-auto text-xs text-muted-foreground">
            {rulesQ.isLoading ? "loading…" : `${rules.length} of ${rawRules.length} rule${rawRules.length === 1 ? "" : "s"}`}
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {rulesQ.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : rules.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {rawRules.length === 0 ? (
              <>
                No field rules yet. Click <strong>Add rule</strong> to create the first one.
              </>
            ) : (
              <>
                No rules match the current filters.
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {orderedSections.map((sectionKey) => {
            const sectionRules = rulesBySection.get(sectionKey) ?? [];
            return (
              <div key={sectionKey} className="space-y-2">
                <div className="flex items-baseline gap-2 border-b pb-1">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    {sectionKey}
                  </h2>
                  <span className="text-[11px] text-muted-foreground">
                    {sectionRules.length} rule{sectionRules.length === 1 ? "" : "s"}
                  </span>
                </div>
                {/* Same table style as the FPO wizard's NestedListCard —
                    dark slate header, zebra rows, SL No column, Actions on
                    the right. Consistent visual language across the whole
                    DPR module (FPO wizard tables and admin CRUD tables). */}
                <div className="relative overflow-x-auto border border-border shadow-sm">
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow className="border-b border-slate-700 bg-slate-800 hover:bg-slate-800 dark:bg-slate-900 dark:border-slate-700">
                        <TableHead
                          className="text-center text-xs font-semibold uppercase tracking-wider text-slate-300"
                          style={{ width: 56 }}
                        >
                          SL No
                        </TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                          Field
                        </TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                          Condition
                        </TableHead>
                        <TableHead
                          className="text-xs font-semibold uppercase tracking-wider text-slate-300"
                          style={{ width: 120 }}
                        >
                          Direction
                        </TableHead>
                        <TableHead
                          className="text-right text-xs font-semibold uppercase tracking-wider text-slate-300"
                          style={{ width: 96 }}
                        >
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sectionRules.map((rule, idx) => (
                        <RuleTableRow
                          key={rule.id}
                          rule={rule}
                          slNo={idx + 1}
                          zebra={idx % 2 === 1}
                          onEdit={() => openEdit(rule)}
                          onDelete={() => {
                            if (confirm(`Delete rule #${rule.id}? This cannot be undone.`)) {
                              deleteMutation.mutate(rule.id);
                            }
                          }}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{draft.id ? "Edit field rule" : "New field rule"}</DialogTitle>
            <DialogDescription>
              Field rules govern whether an individual field is shown to the FPO
              in a given section, based on components selected or a sibling
              field's value.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Section *</Label>
                <SearchableSelect
                  value={draft.data_element_key}
                  onChange={(v) => setDraft({ ...draft, data_element_key: v })}
                  options={sectionOptionsForForm}
                  placeholder="Choose a section…"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Field name *</Label>
                {(() => {
                  const availableFields = schema?.section_fields?.[draft.data_element_key] ?? [];
                  // Autocomplete only when the picked section has known
                  // fields — otherwise degrade to free text so the admin
                  // still has an escape hatch for edge cases.
                  if (availableFields.length > 0) {
                    return (
                      <SearchableSelect
                        value={draft.field_name}
                        onChange={(v) => setDraft({ ...draft, field_name: v })}
                        options={availableFields.map((f) => ({ value: f, label: f }))}
                        placeholder="Search field name…"
                      />
                    );
                  }
                  return (
                    <Input
                      value={draft.field_name}
                      onChange={(e) => setDraft({ ...draft, field_name: e.target.value })}
                      placeholder="e.g. steam_capacity"
                    />
                  );
                })()}
                <p className="text-[10px] text-muted-foreground">
                  {schema?.section_fields?.[draft.data_element_key]?.length
                    ? "Pick from real fields on this section — prevents typos that would silently break the rule."
                    : "Free text — this section isn't in the introspection map yet."}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Recipe *</Label>
                <SearchableSelect
                  value={draft.recipe_type}
                  onChange={(v) => setDraft({ ...draft, recipe_type: v as FieldRuleRecipe })}
                  options={recipeOptionsForForm}
                  placeholder="Choose a recipe…"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Visibility *</Label>
                <SearchableSelect
                  value={draft.visibility}
                  onChange={(v) => setDraft({ ...draft, visibility: v as FieldRuleVisibility })}
                  options={visibilityOptionsForForm}
                  placeholder="Choose a direction…"
                />
              </div>
            </div>

            {/* Recipe-specific inputs */}
            {draft.recipe_type === "component_in" && (
              <ComponentPicker
                components={schema?.components ?? []}
                selectedIds={draft.required_components}
                onChange={(next) =>
                  setDraft({ ...draft, required_components: next })
                }
              />
            )}

            {draft.recipe_type === "field_equals" && (
              <div className="space-y-2 rounded-md border p-3">
                <Label className="text-xs font-semibold">Sibling-field condition *</Label>
                <p className="text-[11px] text-muted-foreground">
                  Rule fires when <strong>trigger_field</strong> in the SAME
                  section has the value <strong>trigger_value</strong>. Value is
                  compared as string.
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs">trigger_field</Label>
                    <Input
                      value={draft.trigger_field}
                      onChange={(e) =>
                        setDraft({ ...draft, trigger_field: e.target.value })
                      }
                      placeholder="e.g. is_operational"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">trigger_value</Label>
                    <Input
                      value={draft.trigger_value}
                      onChange={(e) =>
                        setDraft({ ...draft, trigger_value: e.target.value })
                      }
                      placeholder="e.g. true"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Textarea
                rows={2}
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                placeholder="Optional — human-readable explanation for future admins."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitDraft} disabled={saveMutation.isPending}>
              {saveMutation.isPending && (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              )}
              {draft.id ? "Save changes" : "Create rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


type ComponentRow = { id: number; code: string; label_en: string; group: string };

/**
 * Tag + search picker for a multi-select of DPR components.
 *
 * The BE has 40+ components across ~7 groups. A checkbox grid is hostile
 * once you're past 10 items. This picker uses the "chip + typeahead"
 * pattern: selected components render as removable pills, and a single
 * search input reveals a filtered dropdown of unselected components.
 *
 * UX contract:
 *   • Chips at top = "these are the components you've picked". Click × to remove.
 *   • Focus the input → dropdown opens with everything not yet selected.
 *   • Type in the input → dropdown filters live (label/code/group).
 *   • Click an option → adds it as a chip; input clears; dropdown stays open
 *     so a burst of picks feels fluid.
 *   • Blur / Escape → dropdown closes.
 */
function ComponentPicker({
  components,
  selectedIds,
  onChange,
}: {
  components: ComponentRow[];
  selectedIds: number[];
  onChange: (next: number[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedSet = new Set(selectedIds);
  const selectedRows = components.filter((c) => selectedSet.has(c.id));

  const available = components.filter((c) => {
    if (selectedSet.has(c.id)) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      c.label_en.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.group.toLowerCase().includes(q)
    );
  });

  function add(id: number) {
    onChange([...selectedIds, id]);
    setQuery("");
    inputRef.current?.focus();
  }
  function remove(id: number) {
    onChange(selectedIds.filter((x) => x !== id));
  }

  // Close the dropdown when the user clicks outside the component.
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="space-y-2 rounded-md border p-3" ref={containerRef}>
      <div className="flex items-baseline justify-between">
        <Label className="text-xs font-semibold">Required components *</Label>
        <span className="text-[11px] text-muted-foreground">
          {selectedIds.length} selected
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Rule fires when the project has <strong>any</strong> of the selected
        components. Search by name, code, or group.
      </p>

      {/* Chip row for selected components */}
      {selectedRows.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedRows.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 py-0.5 pr-1 pl-2 text-xs text-primary"
            >
              {c.label_en}
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-primary/20"
                onClick={() => remove(c.id)}
                aria-label={`Remove ${c.label_en}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search + dropdown */}
      <div className="relative">
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder={selectedRows.length === 0 ? "Search + click to add components…" : "Add more…"}
          className="h-8"
        />
        {open && (
          <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
            {available.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                {query
                  ? `No components match "${query}".`
                  : "All components are already selected."}
              </p>
            ) : (
              available.slice(0, 50).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => add(c.id)}
                  className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                >
                  <span>{c.label_en}</span>
                  <span className="text-[10px] text-muted-foreground/70">
                    {c.group.replace(/_/g, " ")} · {c.code}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}


/**
 * Table row rendering one field rule. Matches the visual style of the
 * FPO wizard's NestedListCard — zebra-striped rows, muted SL No, tight
 * Actions column on the right with pencil / trash icons.
 */
function RuleTableRow({
  rule,
  slNo,
  zebra,
  onEdit,
  onDelete,
}: {
  rule: FieldRule;
  slNo: number;
  zebra: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const visibilityTone =
    rule.visibility === "show_when"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
      : "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200";

  return (
    <TableRow
      className={cn(
        "border-b border-border/50 transition-colors hover:bg-muted/40",
        zebra ? "bg-slate-50 dark:bg-slate-900/40" : "bg-white dark:bg-background",
      )}
    >
      <TableCell className="text-center text-xs text-muted-foreground">{slNo}</TableCell>
      <TableCell>
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold">
          {rule.field_name}
        </code>
        {rule.notes && (
          <p className="mt-0.5 text-[10px] italic text-muted-foreground">
            {rule.notes}
          </p>
        )}
      </TableCell>
      <TableCell className="text-sm">
        {rule.recipe_type === "component_in" ? (
          <span>
            project has any of:{" "}
            {rule.required_components_detail.map((c, i) => (
              <span key={c.id}>
                <code className="text-xs">{c.code}</code>
                {i < rule.required_components_detail.length - 1 && ", "}
              </span>
            ))}
          </span>
        ) : (
          <span>
            <code className="text-xs">{rule.trigger_field}</code> equals{" "}
            <code className="text-xs">{rule.trigger_value}</code>
          </span>
        )}
      </TableCell>
      <TableCell>
        <Badge className={cn("text-[10px]", visibilityTone)}>
          {rule.visibility === "show_when" ? "SHOW when" : "HIDE when"}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={onEdit}
            aria-label="Edit rule"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-destructive hover:text-destructive"
            onClick={onDelete}
            aria-label="Delete rule"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}


