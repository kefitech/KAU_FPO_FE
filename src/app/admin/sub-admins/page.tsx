"use client";

import { Suspense, useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { Building2, Pencil, Plus } from "lucide-react";

import { subAdminsApi } from "@/app/admin/_api/sub-admins";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { ViewSheet } from "@/components/ui/view-sheet";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";
import type { SubAdmin } from "@/types/admin";

import { AssignFposDialog } from "./_components/assign-fpos-dialog";
import { getSubAdminColumns } from "./_components/columns";

type T = Record<string, string>;

export default function SubAdminsPage() {
  const router = useRouter();
  const locale = useLocaleStore((s) => s.locale);

  const [tTable, setTTable] = useState<T>({});
  const [tConfirm, setTConfirm] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});
  const [subAdminView, setSubAdminView] = useState<{ open: boolean; row: SubAdmin | null }>({ open: false, row: null });
  const [assignFpos, setAssignFpos] = useState<{ open: boolean; row: SubAdmin | null }>({ open: false, row: null });
  const openAssignFpos = (row: SubAdmin) => setAssignFpos({ open: true, row });

  useEffect(() => {
    translationsApi
      .getPublic(locale, "sub_admins_table,confirm_dialog,common")
      .then((data) => {
        setTTable(data.sub_admins_table ?? {});
        setTConfirm(data.confirm_dialog ?? {});
        setTCommon(data.common ?? {});
      })
      .catch(() => undefined);
  }, [locale]);

  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl">{tTable.page_title ?? "Sub-Admins"}</h1>
          <p className="mt-0.5 text-muted-foreground text-sm">
            {tTable.page_description ?? "Manage sub-admin accounts and their permissions"}
          </p>
        </div>
        <Button size="sm" className="self-start sm:self-auto" onClick={() => router.push("/admin/sub-admins/new")}>
          <Plus className="mr-1.5 h-4 w-4" />
          {tTable.add_button ?? "Add Sub-Admin"}
        </Button>
      </div>

      <Suspense>
        <DataTable
          queryKey="sub-admins"
          queryFn={subAdminsApi.getAll}
          columns={getSubAdminColumns(tTable, tConfirm, tCommon, { onAssignFpos: openAssignFpos })}
          onRowClick={(row) => setSubAdminView({ open: true, row })}
        />
      </Suspense>

      <ViewSheet
        open={subAdminView.open}
        onOpenChange={(open) => setSubAdminView((s) => ({ ...s, open }))}
        title={tTable.view_title ?? "Sub-Admin Details"}
        actions={
          subAdminView.row
            ? [
                {
                  label: tCommon.edit ?? "Edit",
                  icon: Pencil,
                  onClick: () => router.push(`/admin/sub-admins/${subAdminView.row?.id}/edit`),
                },
                {
                  label: tTable.assign_fpos ?? "Assign FPOs",
                  icon: Building2,
                  onClick: () => {
                    const row = subAdminView.row;
                    setSubAdminView((s) => ({ ...s, open: false }));
                    if (row) openAssignFpos(row);
                  },
                },
              ]
            : []
        }
        fields={
          subAdminView.row
            ? [
                { label: tCommon.section_account ?? "Account", type: "section" },
                {
                  label: tTable.col_name ?? "Name",
                  value: [subAdminView.row.first_name, subAdminView.row.last_name].filter(Boolean).join(" "),
                },
                { label: tTable.col_email ?? "Email", value: subAdminView.row.email },
                { label: tTable.col_phone ?? "Phone", value: subAdminView.row.phone },
                { label: tCommon.section_access ?? "Access", type: "section" },
                {
                  label: tTable.col_status ?? "Status",
                  type: "status",
                  active: subAdminView.row.is_active,
                  activeLabel: tCommon.badge_active ?? "Active",
                  inactiveLabel: tCommon.badge_inactive ?? "Inactive",
                },
                { label: tTable.col_date_joined ?? "Date Joined", type: "date", value: subAdminView.row.date_joined },
                { label: tCommon.section_permissions ?? "Permissions", type: "section" },
                { label: tTable.col_permissions ?? "Permissions", type: "tags", tags: subAdminView.row.permissions },
                {
                  label: tTable.col_assigned_fpos ?? "Assigned FPOs",
                  value: String(subAdminView.row.assigned_fpos_count ?? 0),
                },
              ]
            : []
        }
      />

      <AssignFposDialog
        subAdmin={assignFpos.row}
        open={assignFpos.open}
        onOpenChange={(open) => setAssignFpos((s) => ({ ...s, open }))}
        t={tTable}
      />
    </div>
  );
}
