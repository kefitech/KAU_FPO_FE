"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";

import { governmentApi } from "@/app/admin/_api/government";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { ViewSheet } from "@/components/ui/view-sheet";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";
import type { GovernmentOfficial } from "@/types/admin";

import { getGovernmentColumns } from "./_components/columns";

type T = Record<string, string>;

export default function GovernmentPage() {
  const router = useRouter();
  const locale = useLocaleStore((s) => s.locale);
  const [tTable, setTTable] = useState<T>({});
  const [tConfirm, setTConfirm] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});
  const [officialView, setOfficialView] = useState<{ open: boolean; row: GovernmentOfficial | null }>({
    open: false,
    row: null,
  });

  useEffect(() => {
    translationsApi
      .getPublic(locale, "government_table,confirm_dialog,common")
      .then((data) => {
        setTTable(data.government_table ?? {});
        setTConfirm(data.confirm_dialog ?? {});
        setTCommon(data.common ?? {});
      })
      .catch(() => undefined);
  }, [locale]);

  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl">{tTable.page_title ?? "Government Officials"}</h1>
          <p className="mt-0.5 text-muted-foreground text-sm">
            {tTable.page_description ?? "Manage government official accounts and their jurisdiction"}
          </p>
        </div>
        <Button size="sm" variant="outline" className="self-start sm:self-auto" onClick={() => router.push("/admin/government/pending")}>
          {tTable.pending_approvals_button ?? "Pending Approvals"}
        </Button>
        <Button size="sm" className="self-start sm:self-auto" onClick={() => router.push("/admin/government/new")}>
          <Plus className="mr-1.5 h-4 w-4" />
          {tTable.add_button ?? "Add Official"}
        </Button>
      </div>

      <Suspense>
        <DataTable
          queryKey="government"
          queryFn={governmentApi.getAll}
          columns={getGovernmentColumns(tTable, tConfirm, tCommon)}
          onRowClick={(row) => setOfficialView({ open: true, row })}
        />
      </Suspense>

      <ViewSheet
        open={officialView.open}
        onOpenChange={(open) => setOfficialView((s) => ({ ...s, open }))}
        title={tTable.view_title ?? "Official Details"}
        actions={
          officialView.row
            ? [{ label: tCommon.edit ?? "Edit", icon: Pencil, onClick: () => router.push(`/admin/government/${officialView.row?.id}/edit`) }]
            : []
        }
        fields={
          officialView.row
            ? [
                { label: tCommon.section_account ?? "Account", type: "section" },
                {
                  label: tTable.col_name ?? "Name",
                  value: [officialView.row.first_name, officialView.row.last_name].filter(Boolean).join(" "),
                },
                { label: tTable.col_email ?? "Email", value: officialView.row.email },
                { label: tTable.col_phone ?? "Phone", value: officialView.row.phone },
                { label: tTable.col_designation ?? "Designation", value: officialView.row.designation },
                { label: tTable.col_department ?? "Department", value: officialView.row.department },
                { label: tCommon.section_access ?? "Access", type: "section" },
                {
                  label: tTable.col_status ?? "Status",
                  type: "status",
                  active: officialView.row.is_active,
                  activeLabel: tCommon.badge_active ?? "Active",
                  inactiveLabel: tCommon.badge_inactive ?? "Inactive",
                },
                { label: tTable.col_date_joined ?? "Date Joined", type: "date", value: officialView.row.date_joined },
                { label: tCommon.section_scope ?? "Jurisdiction", type: "section" },
                {
                  label: tTable.col_jurisdiction ?? "Jurisdiction",
                  type: "tags",
                  tags:
                    officialView.row.jurisdiction_type === "state"
                      ? ["State-wide"]
                      : [officialView.row.assigned_district_display ?? officialView.row.assigned_district ?? ""],
                },
              ]
            : []
        }
      />
    </div>
  );
}
