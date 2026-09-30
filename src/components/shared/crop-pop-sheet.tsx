"use client";

import { useEffect, useState } from "react";

import { type SheetField, ViewSheet } from "@/components/ui/view-sheet";
import { getCropPackageOfPractices } from "@/lib/api/recommendation";
import type { CropPackageOfPractices } from "@/types/recommendation";

type T = Record<string, string>;

// ViewSheet renders `title` via dangerouslySetInnerHTML, so escape the crop
// name rather than trusting it (it originates from the ML service response).
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Multi-line PoP text (fertilizer schedules, numbered steps) must keep its
// line breaks; ViewSheet's plain text rows don't, so wrap in a pre-wrap node.
function preWrap(text: string) {
  return <div className="whitespace-pre-wrap text-sm">{text}</div>;
}

function buildCropPopFields(pop: CropPackageOfPractices, t: T): SheetField[] {
  const fields: SheetField[] = [];

  if (pop.crop_group) fields.push({ label: t.pop_crop_group ?? "Crop group", type: "text", value: pop.crop_group });
  if (pop.season) fields.push({ label: t.pop_season ?? "Season", type: "node", node: preWrap(pop.season) });
  if (pop.spacing) fields.push({ label: t.pop_spacing ?? "Spacing", type: "text", value: pop.spacing });
  if (pop.expected_yield) {
    fields.push({ label: t.pop_yield ?? "Expected yield", type: "text", value: pop.expected_yield });
  }

  if (pop.varieties.length) {
    fields.push({
      label: t.pop_varieties ?? "Varieties",
      type: "node",
      node: (
        <ul className="list-disc space-y-1 pl-4 text-sm">
          {pop.varieties.map((v, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: variety rows are static book content
            <li key={i}>
              <span className="font-medium">{v.name}</span>
              {v.description ? ` — ${v.description}` : ""}
            </li>
          ))}
        </ul>
      ),
    });
  }

  const textBlocks: [string, string, string][] = [
    [pop.manuring_fertilizer, "pop_manuring", "Manuring / fertilizer"],
    [pop.plant_protection, "pop_plant_protection", "Plant protection"],
    [pop.harvesting, "pop_harvesting", "Harvesting"],
  ];
  for (const [value, key, fallback] of textBlocks) {
    if (value) fields.push({ label: t[key] ?? fallback, type: "node", node: preWrap(value) });
  }

  if (pop.sections.length) {
    fields.push({ label: t.pop_detail ?? "Package of Practices detail", type: "section" });
    for (const s of pop.sections) {
      fields.push({ label: s.heading, type: "node", node: preWrap(s.body) });
    }
  }

  fields.push({
    label: t.pop_source ?? "Source",
    type: "text",
    value: pop.source_page_range ? `${pop.source_reference} (p. ${pop.source_page_range})` : pop.source_reference,
  });

  return fields;
}

interface CropPopSheetProps {
  /** Crop to show, or null when closed. Each change triggers a fresh fetch. */
  crop: string | null;
  onClose: () => void;
  /** Translation labels (fpo_recommendations section); {} falls back to English. */
  t?: T;
}

/**
 * Side sheet showing a crop's KAU Package of Practices, fetched by crop name
 * (GET /recommendations/pop/). Shared by the FPO recommendations list and the
 * admin model-test results -- both open it by clicking a recommended crop.
 */
export function CropPopSheet({ crop, onClose, t = {} }: CropPopSheetProps) {
  const [popData, setPopData] = useState<CropPackageOfPractices | null>(null);
  const [popLoading, setPopLoading] = useState(false);

  // The sheet itself carries no PoP content, so each selection triggers a
  // fresh fetch; the cancelled flag stops a slow earlier response from
  // overwriting a newer selection.
  useEffect(() => {
    if (!crop) {
      setPopData(null);
      return;
    }
    let cancelled = false;
    setPopLoading(true);
    getCropPackageOfPractices(crop)
      .then((data) => {
        if (!cancelled) setPopData(data);
      })
      .catch(() => {
        if (!cancelled) setPopData(null);
      })
      .finally(() => {
        if (!cancelled) setPopLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [crop]);

  return (
    <ViewSheet
      open={!!crop}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
      title={escapeHtml(crop ?? "")}
      fields={
        popLoading
          ? [{ label: "", type: "text", value: t.pop_loading ?? "Loading…" }]
          : popData
            ? buildCropPopFields(popData, t)
            : [
                {
                  label: "",
                  type: "text",
                  // Expected, not an error: content is transcribed crop by crop.
                  value: (t.pop_empty ?? "Detailed practices for {crop} haven't been added yet.").replace(
                    "{crop}",
                    crop ?? "",
                  ),
                },
              ]
      }
    />
  );
}
