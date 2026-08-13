"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { SheetField } from "@/components/ui/view-sheet";
import type { FpoScheme } from "@/types/fpo";
import { ExternalLink } from "lucide-react";

export type T = Record<string, string>;

export const SCHEME_CATEGORIES = ["", "credit", "insurance", "marketing", "infrastructure", "capacity_building"];

export const CATEGORY_LABEL_KEYS: Record<string, { key: string; fallback: string }> = {
  "": { key: "filter_all", fallback: "All Schemes" },
  credit: { key: "filter_credit", fallback: "Credit & Finance" },
  insurance: { key: "filter_insurance", fallback: "Insurance" },
  marketing: { key: "filter_marketing", fallback: "Marketing & Trade" },
  infrastructure: { key: "filter_infrastructure", fallback: "Infrastructure" },
  capacity_building: { key: "filter_capacity_building", fallback: "Capacity Building" },
};

export const CATEGORY_BADGE_COLORS: Record<string, string> = {
  credit: "bg-blue-100 text-blue-700 border-blue-200",
  insurance: "bg-purple-100 text-purple-700 border-purple-200",
  marketing: "bg-green-100 text-green-700 border-green-200",
  infrastructure: "bg-orange-100 text-orange-700 border-orange-200",
  capacity_building: "bg-yellow-100 text-yellow-700 border-yellow-200",
};

export function SchemeSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-5 flex flex-col gap-3">
      <Skeleton className="h-5 w-24 rounded-full" />
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-8 w-28 mt-2" />
    </div>
  );
}

export function buildSchemeFields(scheme: FpoScheme, t: T): SheetField[] {
  const fields: SheetField[] = [];

  fields.push({ label: t.card_category ?? "Category", type: "node", node: (
    <Badge className={`w-fit text-xs font-medium border ${CATEGORY_BADGE_COLORS[scheme.category] ?? "bg-muted text-muted-foreground"}`} variant="outline">
      {scheme.category_display}
    </Badge>
  )});

  if (scheme.administering_body) {
    fields.push({ label: t.card_administered_by ?? "Administered By", type: "text", value: scheme.administering_body });
  }
  if (scheme.objective) {
    fields.push({ label: t.detail_objective ?? "Objective", type: "text", value: scheme.objective });
  }
  if (scheme.eligibility) {
    fields.push({ label: t.card_eligibility ?? "Eligibility", type: "text", value: scheme.eligibility });
  }
  if (scheme.benefit_details) {
    fields.push({ label: t.card_benefits ?? "Benefits", type: "text", value: scheme.benefit_details });
  }
  if (scheme.application_process) {
    fields.push({ label: t.detail_how_to_apply ?? "How to Apply", type: "text", value: scheme.application_process });
  }
  if (scheme.last_updated) {
    fields.push({ label: t.detail_last_updated ?? "Last Updated", type: "date", value: scheme.last_updated });
  }

  return fields;
}

export function SchemeCard({ scheme, t, onViewDetails }: { scheme: FpoScheme; t: T; onViewDetails: () => void }) {
  const badgeClass = CATEGORY_BADGE_COLORS[scheme.category] ?? "bg-muted text-muted-foreground";

  return (
    <div className="rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3 p-5">
      <Badge className={`w-fit text-xs font-medium border ${badgeClass}`} variant="outline">
        {scheme.category_display}
      </Badge>
      <h3 className="font-semibold text-base leading-snug">{scheme.name}</h3>
      {scheme.administering_body && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">{t.card_administered_by ?? "Administered by:"}</span> {scheme.administering_body}
        </p>
      )}
      {scheme.eligibility && (
        <div>
          <p className="text-xs font-medium text-foreground mb-0.5">{t.card_eligibility ?? "Eligibility"}</p>
          <p className="text-xs text-muted-foreground line-clamp-2">{scheme.eligibility}</p>
        </div>
      )}
      {scheme.benefit_details && (
        <div>
          <p className="text-xs font-medium text-foreground mb-0.5">{t.card_benefits ?? "Benefits"}</p>
          <p className="text-xs text-muted-foreground line-clamp-2">{scheme.benefit_details}</p>
        </div>
      )}
      <div className="mt-auto pt-2 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={onViewDetails}>
          {t.btn_view_details ?? "View Details"}
        </Button>
        {scheme.official_link && (
          <Button variant="ghost" size="sm" asChild className="h-auto min-w-0 max-w-full whitespace-normal">
            <a href={scheme.official_link} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5 shrink-0" />
              <span className="min-w-0 break-words">{t.btn_visit ?? "Website"}</span>
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}