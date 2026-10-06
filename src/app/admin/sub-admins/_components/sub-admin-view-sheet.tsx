"use client";

import { useQuery } from "@tanstack/react-query";

import { subAdminsApi } from "@/app/admin/_api/sub-admins";
import { BackLink } from "@/components/layout/back-link";
import { type SheetField, ViewSheet } from "@/components/ui/view-sheet";
import { KERALA_DISTRICTS } from "@/lib/kerala-districts";
import type { SubAdmin } from "@/types/admin";

import { type SubAdminActionKey, type SubAdminColumnHandlers, useSubAdminActions } from "./use-sub-admin-actions";

type T = Record<string, string>;

// Everyday actions only — Disable 2FA, Reset Password and Delete stay in the table's row menu.
const SHEET_ACTIONS: SubAdminActionKey[] = ["edit", "transfer", "toggle_active"];

export function SubAdminViewSheet({
  subAdmin: row,
  open,
  onOpenChange,
  tTable = {},
  tConfirm = {},
  tCommon = {},
  handlers = {},
}: {
  subAdmin: SubAdmin;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tTable?: T;
  tConfirm?: T;
  tCommon?: T;
  handlers?: SubAdminColumnHandlers;
}) {
  // Start from the clicked row, then keep it fresh so the sheet reflects
  // activate / deactivate / transfer done from its own action bar.
  const { data } = useQuery({
    queryKey: ["sub-admin", String(row.id)],
    queryFn: () => subAdminsApi.getById(row.id),
    initialData: row,
    enabled: open,
  });
  const sa = data ?? row;

  const actions = useSubAdminActions(sa, { t: tTable, tConfirm, tCommon, handlers });

  const districtName = KERALA_DISTRICTS.find((d) => d.code === sa.district)?.name;
  const fpoCount = sa.visible_fpos_count ?? 0;

  const fields: SheetField[] = [
    { label: tCommon.section_account ?? "Account", type: "section" },
    { label: tTable.col_name ?? "Name", value: [sa.first_name, sa.last_name].filter(Boolean).join(" ") },
    { label: tTable.col_email ?? "Email", value: sa.email },
    { label: tTable.col_phone ?? "Phone", value: sa.phone },
    { label: tCommon.section_access ?? "Access", type: "section" },
    {
      label: tTable.col_status ?? "Status",
      type: "status",
      active: sa.is_active,
      activeLabel: tCommon.badge_active ?? "Active",
      inactiveLabel: tCommon.badge_inactive ?? "Inactive",
    },
    { label: tTable.col_date_joined ?? "Date Joined", type: "date", value: sa.date_joined },
    {
      label: tTable.col_district ?? "District",
      value: sa.district ? `${districtName ?? sa.district} (${sa.district})` : (tTable.no_district ?? "No district"),
    },
    { label: tTable.col_permissions ?? "Permissions", type: "tags", tags: sa.permissions },
    !sa.district || fpoCount === 0
      ? { label: tTable.col_visible_fpos ?? "FPOs in Scope", value: "0" }
      : {
          label: tTable.col_visible_fpos ?? "FPOs in Scope",
          type: "node",
          node: (
            <BackLink
              href={`/admin/applications?district=${sa.district}`}
              className="font-medium text-primary hover:underline"
            >
              {fpoCount} — {tTable.view_all ?? "View list →"}
            </BackLink>
          ),
        },
  ];

  return (
    <ViewSheet
      open={open}
      onOpenChange={onOpenChange}
      title={tTable.view_title ?? "Sub-Admin Details"}
      actions={actions
        .filter((a) => SHEET_ACTIONS.includes(a.key) && !a.hidden)
        .map((a) => ({
          label: a.label,
          icon: a.icon,
          onClick: a.onClick,
          disabled: a.disabled,
        }))}
      fields={fields}
    />
  );
}
