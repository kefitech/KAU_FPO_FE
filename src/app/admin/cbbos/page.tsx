"use client";

import { Suspense, useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { Pencil, Plus } from "lucide-react";

import { cbbosApi } from "@/app/admin/_api/cbbos";
import { getCBBOColumns } from "@/app/admin/cbbos/_components/columns";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { ViewSheet } from "@/components/ui/view-sheet";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";
import type { CBBO } from "@/types/admin";

type T = Record<string, string>;

export default function CBBOsPage() {
  const router = useRouter();
  const locale = useLocaleStore((s) => s.locale);
  const [tTable, setTTable] = useState<T>({});
  const [tConfirm, setTConfirm] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});
  const [cbboView, setCbboView] = useState<{ open: boolean; row: CBBO | null }>({ open: false, row: null });

  useEffect(() => {
    translationsApi
      .getPublic(locale, "cbbos_table,confirm_dialog,common")
      .then((data) => {
        setTTable(data.cbbos_table ?? {});
        setTConfirm(data.confirm_dialog ?? {});
        setTCommon(data.common ?? {});
      })
      .catch(() => undefined);
  }, [locale]);

  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl">{tTable.page_title ?? "CBBOs"}</h1>
          <p className="mt-0.5 text-muted-foreground text-sm">
            {tTable.page_description ?? "Manage CBBO/NGO accounts and their district assignments"}
          </p>
        </div>
        <Button size="sm" className="self-start sm:self-auto" onClick={() => router.push("/admin/cbbos/new")}>
          <Plus className="mr-1.5 h-4 w-4" />
          {tTable.add_button ?? "Add CBBO"}
        </Button>
      </div>

      <Suspense>
        <DataTable
          queryKey="cbbos"
          queryFn={cbbosApi.getAll}
          columns={getCBBOColumns(tTable, tConfirm, tCommon)}
          onRowClick={(row) => setCbboView({ open: true, row })}
          columnsLabel={tCommon.col_header ?? "Columns"}
          toggleColumnsLabel={tCommon.col_toggle_columns ?? "Toggle columns"}
        />
      </Suspense>

      <ViewSheet
        open={cbboView.open}
        onOpenChange={(open) => setCbboView((s) => ({ ...s, open }))}
        title={tTable.view_title ?? "CBBO Details"}
        actions={
          cbboView.row
            ? [
                {
                  label: tCommon.edit ?? "Edit",
                  icon: Pencil,
                  onClick: () => router.push(`/admin/cbbos/${cbboView.row?.id}/edit`),
                },
              ]
            : []
        }
        fields={
          cbboView.row
            ? [
                { label: tCommon.section_account ?? "Account", type: "section" },
                {
                  label: tTable.col_name ?? "Name",
                  value: [cbboView.row.first_name, cbboView.row.last_name].filter(Boolean).join(" "),
                },
                { label: tTable.col_email ?? "Email", value: cbboView.row.email },
                { label: tTable.col_phone ?? "Phone", value: cbboView.row.phone },
                { label: tCommon.section_access ?? "Access", type: "section" },
                {
                  label: tTable.col_status ?? "Status",
                  type: "status",
                  active: cbboView.row.is_active,
                  activeLabel: tCommon.badge_active ?? "Active",
                  inactiveLabel: tCommon.badge_inactive ?? "Inactive",
                },
                { label: tTable.col_date_joined ?? "Date Joined", type: "date", value: cbboView.row.date_joined },
                { label: tCommon.section_scope ?? "Scope", type: "section" },
                {
                  label: tTable.col_scope ?? "Districts",
                  type: "tags",
                  tags: cbboView.row.scope === "STATE" ? ["State-wide"] : cbboView.row.scope,
                },
              ]
            : []
        }
      />
    </div>
  );
}
