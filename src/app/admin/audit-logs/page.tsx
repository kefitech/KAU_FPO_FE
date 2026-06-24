"use client";

import { Suspense, useEffect, useState } from "react";

import type { ColumnDef } from "@tanstack/react-table";

import { auditLogsApi } from "@/app/admin/_api/audit-logs";
import { DataTable } from "@/components/data-table";
import type { FilterConfig } from "@/components/data-table/data-table-toolbar";
import { Badge } from "@/components/ui/badge";
import { ViewSheet } from "@/components/ui/view-sheet";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";
import { getChangesDisplay, getObjectInfoDisplay, getPerformedByName, type AuditLog } from "@/types/admin";

type T = Record<string, string>;

const ACTION_TYPES = [
  "create", "update", "delete", "soft_delete", "restore",
  "login", "logout", "failed_login",
  "password_change", "password_reset",
  "export", "import",
  "document_upload", "document_delete",
  "fpo_profile_change", "fpo_submit", "fpo_status_change",
  "tier_recalculation",
  "fpo_user_invite", "fpo_user_activate", "fpo_user_deactivate",
];

const FILTERS: FilterConfig[] = [
  {
    key: "action",
    label: "Action",
    type: "select",
    options: ACTION_TYPES.map((a) => ({ label: a.replace(/_/g, " "), value: a })),
  },
  { key: "from_date", label: "From date", type: "date" },
  { key: "to_date", label: "To date", type: "date" },
];

const METHOD_COLORS: Record<string, string> = {
  GET: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  POST: "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400",
  PATCH: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  PUT: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  DELETE: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400",
};

function getColumns(t: T): ColumnDef<AuditLog>[] {
  return [
    {
      accessorKey: "created_at",
      header: t.col_time ?? "Time",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm whitespace-nowrap">
          {new Date(row.original.created_at).toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: "action_display",
      header: t.col_action ?? "Action",
      cell: ({ row }) => (
        <Badge variant="secondary" className="text-[11px] font-medium">
          {row.original.action_display || row.original.action}
        </Badge>
      ),
    },
    {
      accessorKey: "performed_by",
      header: t.col_performed_by ?? "Performed By",
      cell: ({ row }) => <span className="font-medium">{getPerformedByName(row.original.performed_by)}</span>,
    },
    {
      accessorKey: "object_info",
      header: t.col_object ?? "Object",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm max-w-[200px] truncate block">
          {getObjectInfoDisplay(row.original.object_info)}
        </span>
      ),
    },
    {
      accessorKey: "request_method",
      header: t.col_method ?? "Method",
      enableSorting: false,
      cell: ({ row }) => {
        const method = row.original.request_method;
        return (
          <Badge variant="outline" className={`text-[11px] font-mono ${METHOD_COLORS[method] ?? ""}`}>
            {method}
          </Badge>
        );
      },
    },
    {
      accessorKey: "ip_address",
      header: t.col_ip ?? "IP Address",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="font-mono text-muted-foreground text-xs">{row.original.ip_address || "—"}</span>
      ),
    },
  ];
}

export default function AuditLogsPage() {
  const locale = useLocaleStore((s) => s.locale);

  const [tTable, setTTable] = useState<T>({});
  const [logView, setLogView] = useState<{ open: boolean; row: AuditLog | null }>({ open: false, row: null });

  useEffect(() => {
    translationsApi
      .getPublic(locale, "audit_logs_table,common")
      .then((data) => setTTable(data.audit_logs_table ?? {}))
      .catch(() => undefined);
  }, [locale]);

  const columns = getColumns(tTable);

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      <div>
        <h1 className="font-bold text-2xl">{tTable.page_title ?? "Audit Logs"}</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">
          {tTable.page_description ?? "Complete trail of all system events and actions"}
        </p>
      </div>

      <Suspense>
        <DataTable
          queryKey="audit-logs"
          queryFn={auditLogsApi.getAll}
          columns={columns}
          filters={FILTERS}
          onRowClick={(row) => setLogView({ open: true, row })}
        />
      </Suspense>

      <ViewSheet
        open={logView.open}
        onOpenChange={(open) => setLogView((s) => ({ ...s, open }))}
        title={tTable.view_title ?? "Audit Log Details"}
        fields={
          logView.row
            ? [
                { label: tTable.col_action ?? "Action", type: "section" },
                {
                  label: tTable.col_action ?? "Action",
                  value: logView.row.action_display || logView.row.action,
                },
                { label: tTable.col_performed_by ?? "Performed By", value: getPerformedByName(logView.row.performed_by) },
                { label: tTable.col_time ?? "Time", type: "date", value: logView.row.created_at },
                { label: tTable.col_object ?? "Object", type: "section" },
                { label: tTable.col_object ?? "Object Info", value: getObjectInfoDisplay(logView.row.object_info) },
                { label: tTable.col_changes ?? "Changes", value: getChangesDisplay(logView.row.changes) },
                { label: tTable.col_request ?? "Request", type: "section" },
                { label: tTable.col_method ?? "Method", value: logView.row.request_method },
                { label: tTable.col_path ?? "Path", value: logView.row.request_path },
                { label: tTable.col_ip ?? "IP Address", value: logView.row.ip_address },
                { label: tTable.col_user_agent ?? "User Agent", value: logView.row.user_agent },
              ]
            : []
        }
      />
    </div>
  );
}
