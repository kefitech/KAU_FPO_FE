"use client";

import { Suspense, useEffect, useState } from "react";

import { fpoUsersApi } from "@/app/admin/_api/fpo-users";
import { DataTable } from "@/components/data-table";
import type { FilterConfig } from "@/components/data-table/data-table-toolbar";
import { ViewSheet } from "@/components/ui/view-sheet";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";
import type { FpoUser } from "@/types/admin";

import { getFpoUserColumns } from "./_components/columns";

type T = Record<string, string>;

const FILTERS: FilterConfig[] = [
  {
    key: "role",
    label: "Role",
    type: "select",
    options: [
      { label: "Primary", value: "primary" },
      { label: "Secondary", value: "secondary" },
    ],
  },
  {
    key: "is_active",
    label: "Status",
    type: "select",
    options: [
      { label: "Active", value: "true" },
      { label: "Inactive", value: "false" },
    ],
  },
];

export default function FpoUsersPage() {
  const locale = useLocaleStore((s) => s.locale);

  const [tTable, setTTable] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});
  const [userView, setUserView] = useState<{ open: boolean; row: FpoUser | null }>({ open: false, row: null });

  useEffect(() => {
    translationsApi
      .getPublic(locale, "fpo_users_table,common")
      .then((data) => {
        setTTable(data.fpo_users_table ?? {});
        setTCommon(data.common ?? {});
      })
      .catch(() => undefined);
  }, [locale]);

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      <div>
        <h1 className="font-bold text-2xl">{tTable.page_title ?? "FPO Users"}</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">
          {tTable.page_description ?? "Manage FPO primary and secondary user accounts"}
        </p>
      </div>

      <Suspense>
        <DataTable
          queryKey="fpo-users"
          queryFn={fpoUsersApi.getAll}
          columns={getFpoUserColumns(tTable, tCommon)}
          filters={FILTERS}
          onRowClick={(row) => setUserView({ open: true, row })}
        />
      </Suspense>

      <ViewSheet
        open={userView.open}
        onOpenChange={(open) => setUserView((s) => ({ ...s, open }))}
        title={tTable.view_title ?? "FPO User Details"}
        fields={
          userView.row
            ? [
                { label: tCommon.section_account ?? "Account", type: "section" },
                {
                  label: tTable.col_name ?? "Name",
                  value: [userView.row.first_name, userView.row.last_name].filter(Boolean).join(" "),
                },
                { label: tTable.col_email ?? "Email", value: userView.row.email },
                { label: tTable.col_phone ?? "Phone", value: userView.row.phone },
                { label: tCommon.section_fpo ?? "FPO", type: "section" },
                { label: tTable.col_fpo ?? "FPO Name", value: userView.row.fpo_name },
                {
                  label: tTable.col_role ?? "Role",
                  value:
                    userView.row.role === "primary"
                      ? (tTable.role_primary ?? "Primary")
                      : (tTable.role_secondary ?? "Secondary"),
                },
                { label: tCommon.section_access ?? "Access", type: "section" },
                {
                  label: tTable.col_status ?? "Status",
                  type: "status",
                  active: userView.row.is_active,
                  activeLabel: tCommon.badge_active ?? "Active",
                  inactiveLabel: tCommon.badge_inactive ?? "Inactive",
                },
                { label: tTable.col_joined ?? "Joined", type: "date", value: userView.row.joined_at },
                {
                  label: tTable.col_last_login ?? "Last Login",
                  value: userView.row.last_login
                    ? new Date(userView.row.last_login).toLocaleString()
                    : (tCommon.never ?? "Never"),
                },
              ]
            : []
        }
      />
    </div>
  );
}
