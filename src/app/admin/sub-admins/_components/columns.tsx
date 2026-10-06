"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { RowActions } from "@/components/data-table/row-actions";
import { BackLink } from "@/components/layout/back-link";
import { Badge } from "@/components/ui/badge";
import type { SubAdmin } from "@/types/admin";

import { type SubAdminColumnHandlers, useSubAdminActions } from "./use-sub-admin-actions";

type T = Record<string, string>;

// Long (especially Malayalam) header labels wrap at this width instead of stretching the column.
const HEADER_MAX_WIDTH = "140px";

function SubAdminActions({
  subAdmin,
  t,
  tConfirm,
  tCommon,
  handlers,
}: {
  subAdmin: SubAdmin;
  t: T;
  tConfirm: T;
  tCommon: T;
  handlers: SubAdminColumnHandlers;
}) {
  const actions = useSubAdminActions(subAdmin, { t, tConfirm, tCommon, handlers });
  return <RowActions actions={actions} />;
}

export function getSubAdminColumns(
  t: T = {},
  tConfirm: T = {},
  tCommon: T = {},
  handlers: SubAdminColumnHandlers = {},
): ColumnDef<SubAdmin>[] {
  return [
    {
      accessorKey: "first_name",
      header: t.col_name ?? "Name",
      meta: { headerMaxWidth: HEADER_MAX_WIDTH },
      cell: ({ row }) => {
        const name = `${row.original.first_name} ${row.original.last_name}`.trim();
        return <span className="font-medium">{name || "—"}</span>;
      },
    },
    {
      accessorKey: "email",
      header: t.col_email ?? "Email",
      meta: { hideOnMobile: true, headerMaxWidth: HEADER_MAX_WIDTH },
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span>,
    },
    {
      accessorKey: "permissions",
      header: t.col_permissions ?? "Permissions",
      meta: { hideOnMobile: true, headerMaxWidth: HEADER_MAX_WIDTH },
      cell: ({ row }) => {
        const perms = row.original.permissions;
        if (perms.length === 0) {
          return <span className="text-muted-foreground text-xs">{t.no_permissions ?? "None"}</span>;
        }
        const visible = perms.slice(0, 2);
        const rest = perms.length - 2;
        return (
          <div className="flex flex-wrap gap-1">
            {visible.map((p) => (
              <Badge key={p} variant="secondary" className="font-mono text-[10px]">
                {p}
              </Badge>
            ))}
            {rest > 0 && (
              <Badge variant="outline" className="text-[10px]">
                +{rest}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "district",
      header: t.col_district ?? "District",
      meta: { headerMaxWidth: HEADER_MAX_WIDTH },
      cell: ({ row }) => {
        const code = row.original.district;
        // No district → sees no FPOs; the super admin fixes it with Transfer District.
        if (!code) {
          return (
            <Badge
              variant="outline"
              className="border-amber-500/50 bg-amber-500/10 text-[11px] text-amber-700 dark:text-amber-400"
              title={t.no_district_hint ?? "Sees no FPOs until transferred to a district"}
            >
              {t.no_district ?? "No district"}
            </Badge>
          );
        }
        return (
          <Badge variant="outline" className="font-mono text-[11px]">
            {code}
          </Badge>
        );
      },
    },
    {
      accessorKey: "visible_fpos_count",
      header: t.col_visible_fpos ?? "FPOs in Scope",
      meta: { hideOnMobile: true, headerMaxWidth: HEADER_MAX_WIDTH },
      enableSorting: false,
      cell: ({ row }) => {
        const sa = row.original;
        const count = sa.visible_fpos_count ?? 0;
        if (!sa.district || count === 0) {
          return <span className="text-muted-foreground text-xs">{t.no_assigned_fpos_short ?? "None"}</span>;
        }
        // Clickable — jump to the applications list pre-filtered so the admin
        // can drill into each FPO for tier / products / documents / etc.
        return (
          <BackLink
            href={`/admin/applications?district=${sa.district}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex"
          >
            <Badge
              variant="secondary"
              className="cursor-pointer text-[11px] hover:bg-primary hover:text-primary-foreground"
              title={t.view_fpos_hint ?? "View FPOs in scope"}
            >
              {count}
            </Badge>
          </BackLink>
        );
      },
    },
    {
      accessorKey: "is_active",
      header: t.col_status ?? "Status",
      meta: { headerMaxWidth: HEADER_MAX_WIDTH },
      cell: ({ row }) =>
        row.original.is_active ? (
          <Badge
            variant="outline"
            className="border-green-500/40 bg-green-500/10 text-[11px] text-green-700 dark:text-green-400"
          >
            {t.status_active ?? "Active"}
          </Badge>
        ) : (
          <Badge variant="outline" className="border-muted text-[11px] text-muted-foreground">
            {t.status_inactive ?? "Inactive"}
          </Badge>
        ),
    },
    {
      accessorKey: "date_joined",
      header: t.col_joined ?? "Joined",
      meta: { hideOnMobile: true, headerMaxWidth: HEADER_MAX_WIDTH },
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">{new Date(row.original.date_joined).toLocaleDateString()}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <SubAdminActions subAdmin={row.original} t={t} tConfirm={tConfirm} tCommon={tCommon} handlers={handlers} />
      ),
    },
  ];
}
