"use client";

import { Suspense, useEffect, useState } from "react";

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

const FILTERS: FilterConfig[] = [
  {
    key: "status",
    label: "Status",
    type: "select",
    options: [
      { label: "Pending", value: "pending" },
      { label: "Approved", value: "approved" },
      { label: "Rejected", value: "rejected" },
    ],
  },
];

export default function OwnershipClaimsPage() {
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const [reviewing, setReviewing] = useState<AdminOwnershipClaim | null>(null);
  const [sheet, setSheet] = useState<{ open: boolean; item: AdminOwnershipClaim | null }>({ open: false, item: null });

  useEffect(() => {
    translationsApi
      .getPublic(locale, "admin_ownership_claims,common")
      .then((data) => setT(data.admin_ownership_claims ?? {}))
      .catch(() => undefined);
  }, [locale]);

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
          filters={FILTERS}
          onRowClick={(row) => setSheet({ open: true, item: row })}
        />
      </Suspense>

      <ClaimReviewDialog
        claim={reviewing}
        onOpenChange={(open) => {
          if (!open) setReviewing(null);
        }}
      />

      {sheet.item && (
        <ViewSheet
          open={sheet.open}
          onOpenChange={(open) => setSheet((prev) => ({ ...prev, open }))}
          title={sheet.item.fpo_name}
          actions={[
            {
              label: t.action_review ?? "Review Claim",
              icon: ClipboardCheck,
              onClick: () => {
                setSheet((prev) => ({ ...prev, open: false }));
                setReviewing(sheet.item);
              },
            },
          ]}
          fields={[
            { type: "section", label: "Claimant" },
            { label: "Name", value: sheet.item.claimant_name },
            { label: "Email", value: sheet.item.claimant_email },
            { label: "Phone", value: sheet.item.claimant_phone },
            { type: "section", label: "Claim" },
            { label: "FPO", value: sheet.item.fpo_name },
            {
              label: "Status",
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
                  {sheet.item.status.charAt(0).toUpperCase() + sheet.item.status.slice(1)}
                </Badge>
              ),
            },
            { label: "Reason", value: sheet.item.reason },
            { label: "Submitted", type: "date", value: sheet.item.created_at },
            ...(sheet.item.reviewed_by
              ? [
                  { type: "section" as const, label: "Review" },
                  { label: "Reviewed By", value: sheet.item.reviewed_by },
                  { label: "Reviewed At", type: "date" as const, value: sheet.item.reviewed_at },
                  { label: "Notes", value: sheet.item.review_notes },
                ]
              : []),
          ]}
        />
      )}
    </div>
  );
}
