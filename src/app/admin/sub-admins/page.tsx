"use client";

import { Suspense, useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { useQuery } from "@tanstack/react-query";
import { FileUp, Pencil, Plus } from "lucide-react";

import { subAdminsApi } from "@/app/admin/_api/sub-admins";
import { DataTable } from "@/components/data-table";
import { BackLink } from "@/components/layout/back-link";
import { Button } from "@/components/ui/button";
import { ViewSheet } from "@/components/ui/view-sheet";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";
import type { SubAdmin } from "@/types/admin";

import { BulkInviteDialog } from "./_components/bulk-invite-dialog";
import { getSubAdminColumns } from "./_components/columns";
import { TransferDistrictDialog } from "./_components/transfer-district-dialog";

type T = Record<string, string>;

export default function SubAdminsPage() {
  const router = useRouter();
  const locale = useLocaleStore((s) => s.locale);

  const [tTable, setTTable] = useState<T>({});
  const [tConfirm, setTConfirm] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});
  const [subAdminView, setSubAdminView] = useState<{ open: boolean; row: SubAdmin | null }>({ open: false, row: null });
  const [transferRow, setTransferRow] = useState<{ open: boolean; row: SubAdmin | null }>({ open: false, row: null });
  const [bulkOpen, setBulkOpen] = useState(false);
  const openTransfer = (row: SubAdmin) => setTransferRow({ open: true, row });

  const { data: capStatus } = useQuery({
    queryKey: ["sub-admin-district-cap-status"],
    queryFn: subAdminsApi.getDistrictCapStatus,
    staleTime: 60_000,
  });

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
        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)}>
            <FileUp className="mr-1.5 h-4 w-4" />
            {tTable.bulk_invite_button ?? "Bulk Invite"}
          </Button>
          <Button size="sm" onClick={() => router.push("/admin/sub-admins/new")}>
            <Plus className="mr-1.5 h-4 w-4" />
            {tTable.add_button ?? "Add Sub-Admin"}
          </Button>
        </div>
      </div>

      {capStatus && (
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(capStatus)
            .filter(([, info]) => info.count > 0)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([code, info]) => {
              const pct = info.cap > 0 ? info.count / info.cap : 0;
              const cls =
                pct >= 1
                  ? "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400"
                  : pct >= 0.8
                    ? "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                    : "border-muted";
              return (
                <span
                  key={code}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${cls}`}
                  title={info.district_name}
                >
                  <span className="font-mono">{code}</span>
                  <span className="tabular-nums">
                    {info.count} / {info.cap}
                  </span>
                </span>
              );
            })}
        </div>
      )}

      <Suspense>
        <DataTable
          queryKey="sub-admins"
          queryFn={subAdminsApi.getAll}
          columns={getSubAdminColumns(tTable, tConfirm, tCommon, {
            onTransferDistrict: openTransfer,
          })}
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
                (() => {
                  const sa = subAdminView.row;
                  const count = sa.visible_fpos_count ?? 0;
                  if (!sa.district || count === 0) {
                    return {
                      label: tTable.col_visible_fpos ?? "FPOs in Scope",
                      value: "0",
                    };
                  }
                  return {
                    label: tTable.col_visible_fpos ?? "FPOs in Scope",
                    type: "node" as const,
                    node: (
                      <BackLink
                        href={`/admin/applications?district=${sa.district}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {count} — {tTable.view_all ?? "View list →"}
                      </BackLink>
                    ),
                  };
                })(),
              ]
            : []
        }
      />

      <BulkInviteDialog open={bulkOpen} onOpenChange={setBulkOpen} t={tTable} />

      <TransferDistrictDialog
        subAdmin={transferRow.row}
        open={transferRow.open}
        onOpenChange={(open) => setTransferRow((s) => ({ ...s, open }))}
        t={tTable}
      />
    </div>
  );
}
