"use client";

import { useQuery } from "@tanstack/react-query";
import { useWatch } from "react-hook-form";
import { z } from "zod";

import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDprSectionForm } from "@/hooks/use-dpr-section-form";
import { dprMasterApi } from "@/lib/api/dpr-master";

import { SectionHelp } from "./section-help";
import { SectionShell } from "./section-shell";

/**
 * §2.3.7 Rationale
 *
 * Backend shape:
 *   { rationale_other, selections: [{ rationale: id, justification: text }] }
 *
 * Form shape (easier for UI — one row per master rationale):
 *   { rationale_other, selectedIds: number[], justifications: Record<id, text> }
 *
 * `mapServerToForm` + `serializePayload` translate between the two.
 * Justifications are preserved for unchecked rows so the user can uncheck→recheck
 * without losing typed text (stripped by serializePayload before PATCH).
 */

const MAX_WORDS = 100;

// ── Input caps — mirror backend column widths on DPRSectionRationale ────
// `rationale_other` is CharField(200); justification is TextField (unbounded
// chars, 100-word limit enforced server-side). Enforce a defensive char cap
// on justification too so a paste of 100 mega-words can't blow past the
// intended budget. 100 words × ~15 chars = 1500 is comfortably above real
// justifications while safely below anything abusive.
const MAX_OTHER_TEXT_CHARS = 200;
const MAX_JUSTIFICATION_CHARS = 1500;

// Longest legitimate English/Malayalam word we should ever see in a
// justification. Anything longer is almost always adversarial filler
// (aaaaaaa…) that bypasses the "100 word" cap by removing whitespace.
// English long-word tail: "antidisestablishmentarianism" = 28 chars.
// Bumped to 45 for safety on hyphenated compounds and long Malayalam
// transliterations, but still small enough to reject filler pastes.
const MAX_WORD_LEN = 45;

const Schema = z.object({
  rationale_other: z.string(),
  selectedIds: z.array(z.number()),
  justifications: z.record(z.string(), z.string()),
});
type Data = z.infer<typeof Schema>;

interface ServerSelection {
  rationale: number;
  justification: string;
}
interface ServerData {
  rationale_other?: string;
  selections?: ServerSelection[];
}

function mapServerToForm(server: unknown): Data {
  const s = (server ?? {}) as ServerData;
  const selections = s.selections ?? [];
  return {
    rationale_other: s.rationale_other ?? "",
    selectedIds: selections.map((sel) => sel.rationale),
    justifications: Object.fromEntries(
      selections.map((sel) => [String(sel.rationale), sel.justification ?? ""]),
    ),
  };
}

function serializePayload(v: Data): Record<string, unknown> {
  return {
    rationale_other: v.rationale_other,
    selections: v.selectedIds.map((id) => ({
      rationale: id,
      justification: v.justifications[String(id)] ?? "",
    })),
  };
}

function wordCount(text: string): number {
  return (text || "").trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Longest single "word" in the string. Used to detect the "aaaa…aaa" filler
 * bypass — a user pasting a huge single token to circumvent the 100-word
 * cap. Legitimate justifications never have single words longer than ~30
 * chars; anything over MAX_WORD_LEN is treated as filler.
 */
function longestWordLen(text: string): number {
  const tokens = (text || "").trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 0;
  return Math.max(...tokens.map((t) => t.length));
}

export function RationaleSection({ uuid }: { uuid: string }) {
  const masterQuery = useQuery({
    queryKey: ["dpr-master", "project-rationales"],
    queryFn: () => dprMasterApi.list("project-rationales"),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const { form, isLoading, isDirty, isSaving, lastSavedAt, saveError, fieldErrors, fieldWarnings, save, discard } = useDprSectionForm<Data>({
    uuid,
    sectionKey: "rationale",
    schema: Schema,
    defaultValues: {
      rationale_other: "",
      selectedIds: [],
      justifications: {},
    },
    mapServerToForm,
    serializePayload,
  });

  // useWatch instead of form.watch — reactive subscription that survives
  // form.reset() after autosave. Same pattern used across every DPR section.
  const selectedIds = useWatch({ control: form.control, name: "selectedIds" }) ?? [];
  const justifications = useWatch({ control: form.control, name: "justifications" }) ?? {};
  const rationaleOther = useWatch({ control: form.control, name: "rationale_other" }) ?? "";

  // Convenience setter — always includes `shouldDirty: true` so the Save
  // button + autosave both fire reliably. Same helper as location-section.
  const setField = <K extends keyof Data>(name: K, value: Data[K]) =>
    form.setValue(name as never, value as never, { shouldDirty: true });

  function toggle(id: number, checked: boolean) {
    const current = form.getValues("selectedIds") ?? [];
    const next = checked ? [...current, id] : current.filter((i) => i !== id);
    setField("selectedIds", next);
  }

  function updateJustification(id: number, text: string) {
    const current = form.getValues("justifications") ?? {};
    setField("justifications", { ...current, [String(id)]: text.slice(0, MAX_JUSTIFICATION_CHARS) });
  }

  const otherId = masterQuery.data?.find((r) => r.code === "other")?.id;
  const showOther = otherId !== undefined && selectedIds.includes(otherId);

  // ── Live required-field validation ─────────────────────────────────────
  // Mirrors `apps/fpo/services/dpr/rationale_validators.py` exactly so the
  // user sees errors immediately — no waiting for autosave + readiness
  // fetch. Backend fieldErrors still wins when present (covers server-only
  // rules). Same pattern as products.validateRow + location.err().
  const liveErrors: Record<string, string | undefined> = {};
  if (selectedIds.length === 0) {
    liveErrors.selections = "At least one reason shall be selected.";
  }
  if (showOther && !String(rationaleOther).trim()) {
    liveErrors.rationale_other =
      'Please specify — "Others" was selected but no description provided.';
  }
  selectedIds.forEach((id, i) => {
    const text = justifications[String(id)] ?? "";
    const trimmed = text.trim();
    const wc = wordCount(text);
    const longest = longestWordLen(text);
    if (!trimmed) {
      liveErrors[`selections[${i}].justification`] = "Justification is required.";
    } else if (longest > MAX_WORD_LEN) {
      // Filler-bypass guard — pasting "aaaa…aaa" as one giant token skirts
      // the 100-word rule since split-on-whitespace counts it as 1 word.
      // A single word longer than ~45 chars is almost never legitimate.
      liveErrors[`selections[${i}].justification`] =
        `Please enter real justification text — a single "word" of ${longest} characters looks like filler.`;
    } else if (wc > MAX_WORDS) {
      liveErrors[`selections[${i}].justification`] =
        `Justification exceeds ${MAX_WORDS} words (${wc} words).`;
    }
  });
  const err = (name: string): string | undefined =>
    fieldErrors.get(name) ?? liveErrors[name];

  const loading = isLoading || masterQuery.isLoading;

  return (
    <SectionShell
      uuid={uuid}
      sectionKey="rationale"
      loading={loading}
      isDirty={isDirty}
      isSaving={isSaving}
      lastSavedAt={lastSavedAt}
      saveError={saveError}
      onSave={save}
      onDiscard={discard}
      help={
        <SectionHelp
          title="Project Rationale"
          purpose="Capture why the FPO is taking on this project — the strategic reasons behind the investment. Each rationale you tick gets a brief 100-word justification explaining how it applies to your specific project. These justifications feed the DPR's AI-generated Executive Summary and Project Background chapters, so this is the 'why' story a funder or grant committee reads first."
          whatToFill={[
            "Browse the rationale list — options like Increase farmer income, Value addition, Reduce post-harvest losses, Tap new market, Employment generation, Import substitution, etc.",
            "Tick every rationale that applies to your project. At least one is required. Most integrated projects tick 3–5.",
            "For each tick, a text box opens below the row. Write a brief justification — max 100 words — explaining how that specific reason applies to your project. Concrete numbers help ('₹18 lakh/yr additional income for 400 farmers').",
            "If none of the pre-defined rationales fit, tick 'Others (Specify)' at the bottom and describe the reason in the text field that appears.",
            "Word counter under each textbox turns amber near 100, red over — go over and the readiness panel flags it.",
          ]}
          tips={[
            "Justifications go directly into the AI narrative. Vague ones like 'to help farmers' produce vague chapters; specific ones with numbers, timeframes and beneficiary counts produce sharp, credible DPRs.",
            "Multiple rationales are normal. A coconut oil FPO might legitimately tick Increase income + Value addition + Reduce losses + Tap new market — four different lenses on the same investment.",
            "Uncheck preserves your typed justification (kept locally) so you can retick without retyping — useful when you're exploring which rationales fit.",
            "Whitespace-only text counts as blank — the required check trims and rejects. Type real content.",
            "If you pick 'Others', both the justification textarea AND the 'Please specify' input are required.",
          ]}
          downstream={[
            "AI Executive Summary chapter — pulls the rationale narrative for the opening pages",
            "AI Project Background chapter — expands on each reason with commodity + market context",
            "PDF 'Rationale' section — renders your ticked reasons + justifications verbatim",
            "Grant / appraisal committee — this is the section that answers 'why should we fund this?'",
          ]}
        />
      }
    >
      {/* id="dpr-field-selections" is the readiness scroll target — clicking
          "At least one reason shall be selected" from the readiness panel
          deep-links here. Placed on the outer Card so the scroll lands
          above the checkbox list. */}
      <Card id="dpr-field-selections">
        <CardContent className="space-y-4 p-6">
          <div className="text-sm text-muted-foreground">
            Select all applicable reasons. For each, provide a brief justification (max {MAX_WORDS} words).
          </div>

          {/* Live + backend error banner. `err()` returns backend message
              first, falling back to the live rule ("At least one reason
              shall be selected") when the list is empty. Hidden as soon as
              the user picks any option. */}
          {err("selections") && (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
              {err("selections")}
            </p>
          )}
          {selectedIds.length === 0 &&
            !err("selections") &&
            fieldWarnings.get("selections") && (
              <p className="rounded-md border border-amber-500/30 bg-amber-50 p-2 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                {fieldWarnings.get("selections")}
              </p>
            )}

          <div className="space-y-3">
            {(masterQuery.data ?? []).map((item) => {
              const isChecked = selectedIds.includes(item.id);
              const justText = justifications[String(item.id)] ?? "";
              const wc = wordCount(justText);
              const wcClass =
                wc > MAX_WORDS
                  ? "text-destructive"
                  : wc > MAX_WORDS * 0.8
                    ? "text-amber-600"
                    : "text-muted-foreground";
              // Merged live + backend error. Backend reports errors as
              // `selections[N].justification` where N is the row's position
              // in the payload (== its index in selectedIds). Live errors
              // fire immediately on blank / >100 words; backend takes over
              // once it has authoritative feedback.
              const selectionIndex = selectedIds.indexOf(item.id);
              const justificationError =
                isChecked && selectionIndex >= 0
                  ? err(`selections[${selectionIndex}].justification`)
                  : undefined;
              return (
                <div
                  key={item.id}
                  className={`rounded-md border ${
                    justificationError
                      ? "border-destructive/50 bg-destructive/[0.03]"
                      : isChecked
                        ? "border-primary/30 bg-primary/[0.03]"
                        : "border-transparent"
                  } p-3 transition-colors`}
                >
                  <label className="flex cursor-pointer items-start gap-2 text-sm">
                    <Checkbox
                      className="mt-0.5"
                      checked={isChecked}
                      onCheckedChange={(c) => toggle(item.id, !!c)}
                    />
                    <span className={`flex-1 ${justificationError ? "text-destructive" : ""}`}>
                      {item.label}
                    </span>
                  </label>
                  {isChecked && (
                    <div className="mt-2 space-y-1 pl-6">
                      <Textarea
                        // rows={4} gives room for a real ~100-word
                        // justification without cramping. Textarea still
                        // grows internally if the user overruns.
                        rows={4}
                        placeholder="Brief justification…"
                        value={justText}
                        // Char cap defends against a paste of "100 mega-words"
                        // that satisfies the word limit but blows past a
                        // reasonable byte budget. updateJustification also
                        // slices defensively.
                        maxLength={MAX_JUSTIFICATION_CHARS}
                        onChange={(e) => updateJustification(item.id, e.target.value)}
                        className={`text-sm ${
                          justificationError ? "border-destructive focus-visible:ring-destructive/40" : ""
                        }`}
                      />
                      {justificationError && (
                        <p className="text-xs text-destructive">{justificationError}</p>
                      )}
                      {/* Show BOTH words and chars — pure word count is
                          misleading when a user pastes a giant no-space
                          "word" (which counts as 1 but eats ~1500 chars).
                          The dual display exposes filler content and the
                          char portion also confirms the maxLength cap is
                          actually applying. */}
                      <div className={`text-xs ${wcClass}`}>
                        {wc}/{MAX_WORDS} words · {justText.length}/{MAX_JUSTIFICATION_CHARS} chars
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {showOther && (
            <div id="dpr-field-rationale_other" className="space-y-1.5 pt-2">
              <Label
                htmlFor="rationale_other"
                className={err("rationale_other") ? "text-destructive" : undefined}
              >
                Please specify (Others) *
              </Label>
              {/* Controlled input (not register) so the Save button + autosave
                  fire reliably on every keystroke — same fix pattern as
                  location-section F3. `maxLength` matches backend
                  CharField(200); defensive `.slice()` in onChange handles
                  the rare programmatic-paste-past-cap case. */}
              <Input
                id="rationale_other"
                placeholder="Describe the other rationale…"
                value={rationaleOther as string}
                maxLength={MAX_OTHER_TEXT_CHARS}
                onChange={(e) =>
                  setField("rationale_other", e.target.value.slice(0, MAX_OTHER_TEXT_CHARS))
                }
              />
              {err("rationale_other") && (
                <p className="text-xs text-destructive">{err("rationale_other")}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </SectionShell>
  );
}
