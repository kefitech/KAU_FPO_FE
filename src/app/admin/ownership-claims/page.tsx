"use client";

import { Suspense, useEffect, useState, useMemo } from "react";

import { ClipboardCheck, ShieldAlert } from "lucide-react";

import { adminOwnershipClaimsApi } from "@/app/admin/_api/ownership-claims";
import { DataTable } from "@/components/data-table";
import type { FilterConfig } from "@/components/data-table/data-table-toolbar";
import { Badge } from "@/components/ui/badge";
import { ViewSheet } from "@/components/ui/view-sheet";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";
import type { AdminOwnershipClaim } from "@/types/admin";

import { ClaimReviewDialog } from "./_components/claim-review-dialog";
import { getOwnershipClaimColumns } from "./_components/columns";

type T = Record<string, string>;

const STATUS_VALUES = ["pending", "approved", "rejected"] as const;

export default function OwnershipClaimsPage() {
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});
  const [reviewing, setReviewing] = useState<AdminOwnershipClaim | null>(null);
  const [sheet, setSheet] = useState<{ open: boolean; item: AdminOwnershipClaim | null }>({ open: false, item: null });
  const [translationsLoading, setTranslationsLoading] = useState(true);

  useEffect(() => {
    setTranslationsLoading(true);
    translationsApi
      .getPublic(locale, "admin_ownership_claims,common")
      .then((data) => {
        setT(data.admin_ownership_claims ?? {});
        setTCommon(data.common ?? {});
      })
      .catch(() => undefined)
      .finally(() => setTranslationsLoading(false));
  }, [locale]);
  const filters: FilterConfig[] = useMemo(
    () => [
      {
        key: "status",
        label: t.col_status ?? "Status",
        type: "select",
        options: STATUS_VALUES.map((s) => ({
          label: t[`status_${s}`] ?? s,
          value: s,
        })),
      },
    ],
    [t]
  );

  if (translationsLoading) {
    return (
      <div className="flex flex-col gap-6 px-8 py-6">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-muted-foreground" />
          <div className="flex flex-col gap-1.5">
            <div className="h-6 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-72 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="h-64 w-full animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }


  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-muted-foreground" />
        <div>
          <h1 className="font-bold text-2xl">{t.page_title ?? "Ownership Claims"}</h1>
          <p className="text-muted-foreground text-sm">
            {t.page_description ?? "Review and manage FPO ownership transfer requests"}
          </p>
        </div>
      </div>

      <Suspense>
        <DataTable
          queryKey="ownership-claims"
          queryFn={adminOwnershipClaimsApi.list}
          columns={getOwnershipClaimColumns(t, setReviewing)}
          filters={filters}
          onRowClick={(row) => setSheet({ open: true, item: row })}
          columnsLabel={tCommon.col_header ?? "Columns"}
          toggleColumnsLabel={tCommon.col_toggle_columns ?? "Toggle columns"}
          searchPlaceholder={tCommon.search_placeholder ?? "Search..."}
          clearLabel={tCommon.cancel ?? "Clear"}
        />
      </Suspense>

      <ClaimReviewDialog
        claim={reviewing}
        onOpenChange={(open) => {
          if (!open) setReviewing(null);
        }}
        t={t}
      />

      {sheet.item && (
        <ViewSheet
          open={sheet.open}
          onOpenChange={(open) => setSheet((prev) => ({ ...prev, open }))}
          title={sheet.item.fpo_name}
          actions={
            sheet.item.status === "approved" || sheet.item.status === "rejected"
              ? []
              : [
                  {
                    label: t.btn_review ?? "Review Claim",
                    icon: ClipboardCheck,
                    onClick: () => {
                      setSheet((prev) => ({ ...prev, open: false }));
                      setReviewing(sheet.item);
                    },
                  },
                ]
          }
          fields={[
            { type: "section", label: t.section_claimant ?? "Claimant" },
            { label: t.label_claimant_name ?? "Name", value: sheet.item.claimant_name },
            { label: t.label_claimant_email ?? "Email", value: sheet.item.claimant_email },
            { label: t.label_claimant_phone ?? "Phone", value: sheet.item.claimant_phone },
            { type: "section", label: t.section_fpo_info ?? "Claim" },
            { label: t.col_fpo ?? "FPO", value: sheet.item.fpo_name },
            {
              label: t.col_status ?? "Status",
              type: "node",
              node: (
                <Badge
                  variant="secondary"
                  className={`text-xs font-medium ${
                    sheet.item.status === "approved"
                      ? "bg-green-100 text-green-700"
                      : sheet.item.status === "rejected"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {t[`status_${sheet.item.status}`] ?? sheet.item.status}
                </Badge>
              ),
            },
            { label: t.label_claim_notes ?? "Reason", value: sheet.item.reason },
            { label: t.col_submitted ?? "Submitted", type: "date", value: sheet.item.created_at },
            ...(sheet.item.reviewed_by
              ? [
              { type: "section" as const, label: t.review_dialog_title ?? "Review" },
              { label: t.col_reviewer ?? "Reviewed By", value: sheet.item.reviewed_by },
              { label: t.col_reviewed ?? "Reviewed At", type: "date" as const, value: sheet.item.reviewed_at },
              { label: t.label_admin_notes ?? "Notes", value: sheet.item.review_notes },
                ]
              : []),
          ]}
        />
      )}
    </div>
  );
}
