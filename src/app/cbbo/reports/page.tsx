"use client";

import { Suspense, useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { cbboReportsApi } from "@/app/cbbo/_api/reports";
import { apiErrorMessage } from "@/app/cbbo/_api/training";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { ViewSheet } from "@/components/ui/view-sheet";
import { translationsApi } from "@/lib/api/translations";
import { escapeHtml } from "@/lib/escape-html";
import { useConfirmStore } from "@/stores/confirm-store";
import { useLocaleStore } from "@/stores/locale-store";
import type { CBBOReportListItem } from "@/types/cbbo";

import { getReportColumns, ReportStatusBadge } from "./_components/columns";

type T = Record<string, string>;

// Activities / outcomes are free text, so keep the line breaks the officer typed
function MultilineText({ value }: { value: string }) {
  return value ? (
    <span className="whitespace-pre-wrap">{value}</span>
  ) : (
    <span className="text-muted-foreground">—</span>
  );
}

export default function CBBOReportsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const [sheet, setSheet] = useState<{ open: boolean; report: CBBOReportListItem | null }>({
    open: false,
    report: null,
  });

  const [tDistricts, setTDistricts] = useState<T>({});

  useEffect(() => {
    translationsApi
      .getPublic(locale, "cbbo_reports_list,districts,common")
      .then((data) => {
        setT({ ...(data.common ?? {}), ...(data.cbbo_reports_list ?? {}) });
        setTDistricts(data.districts ?? {});
      })
      .catch(() => undefined);
  }, [locale]);

  function getDistrictLabel(code: string | undefined, fallback: string | undefined) {
    if (!code) return fallback ?? "";
    return tDistricts[`district_${code}`] ?? fallback ?? code;
  }

  const deleteMutation = useMutation({
    mutationFn: (id: number) => cbboReportsApi.remove(id),
    onSuccess: (_, id) => {
      toast.success(t.toast_deleted ?? "Report deleted");
      queryClient.invalidateQueries({ queryKey: ["cbbo-reports"] });
      setSheet((prev) => (prev.report?.id === id ? { ...prev, open: false } : prev));
    },
    onError: (error: unknown) => {
      toast.error(apiErrorMessage(error, t.delete_failed ?? "Failed to delete report"));
    },
  });

  function openReport(report: CBBOReportListItem) {
    setSheet({ open: true, report });
  }

  function editReport(report: CBBOReportListItem) {
    router.push(`/cbbo/reports/${report.id}`);
  }

  function deleteReport(report: CBBOReportListItem) {
    confirm({
      title: t.delete_confirm_title ?? "Delete Report",
      description: (
        t.delete_confirm_desc ?? 'Delete the draft report for "{fpo}" dated {date}? This action cannot be undone.'
      )
        .replace("{fpo}", report.fpo_name)
        .replace("{date}", new Date(report.date).toLocaleDateString()),
      confirmLabel: t.delete ?? "Delete",
      confirmingLabel: t.deleting ?? "Deleting...",
      variant: "destructive",
      onConfirm: () => deleteMutation.mutateAsync(report.id),
    });
  }

  const columns = getReportColumns({
    t,
    getDistrictLabel,
    onView: openReport,
    onEdit: editReport,
    onDelete: deleteReport,
  });

  const r = sheet.report;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl">{t.page_title ?? "Reports"}</h1>
          <p className="mt-0.5 text-muted-foreground text-sm">
            {t.page_description ?? "Capacity building reports you've filed"}
          </p>
        </div>
        <Button size="sm" onClick={() => router.push("/cbbo/reports/new")}>
          <Plus className="mr-1.5 h-4 w-4" />
          {t.btn_new ?? "New Report"}
        </Button>
      </div>
      <Suspense>
        <DataTable
          queryKey="cbbo-reports"
          queryFn={cbboReportsApi.getAll}
          columns={columns}
          onRowClick={openReport}
          columnsLabel={t.col_header ?? "Columns"}
          toggleColumnsLabel={t.col_toggle_columns ?? "Toggle columns"}
          searchPlaceholder={t.search_placeholder ?? "Search by FPO, district or status..."}
        />
      </Suspense>

      {r && (
        <ViewSheet
          open={sheet.open}
          onOpenChange={(open) => setSheet((prev) => ({ ...prev, open }))}
          title={escapeHtml(r.fpo_name)}
          actions={
            // Submitted reports are locked, so only drafts can be edited or deleted
            r.status === "draft"
              ? [
                  {
                    label: t.action_edit ?? t.edit ?? "Edit",
                    icon: Pencil,
                    onClick: () => {
                      setSheet((prev) => ({ ...prev, open: false }));
                      editReport(r);
                    },
                  },
                  {
                    label: t.action_delete ?? t.delete ?? "Delete",
                    icon: Trash2,
                    variant: "destructive",
                    disabled: deleteMutation.isPending,
                    onClick: () => deleteReport(r),
                  },
                ]
              : []
          }
          fields={[
            { type: "section", label: t.section_report ?? "Report" },
            { label: t.col_fpo ?? "FPO", value: r.fpo_name },
            { label: t.col_district ?? "District", value: getDistrictLabel(r.district, r.district_display) },
            { label: t.col_date ?? "Date", type: "date", value: r.date },
            { label: t.col_participants ?? "Participants", value: String(r.participants_count) },
            { label: t.col_status ?? "Status", type: "node", node: <ReportStatusBadge status={r.status} t={t} /> },
            { type: "section", label: t.section_details ?? "Details" },
            { label: t.field_activities ?? "Activities", type: "node", node: <MultilineText value={r.activities} /> },
            { label: t.field_outcomes ?? "Outcomes", type: "node", node: <MultilineText value={r.outcomes} /> },
            { type: "section", label: t.section_record ?? "Record" },
            { label: t.field_created ?? "Created", type: "date", value: r.created_at },
            { label: t.field_updated ?? "Last Updated", type: "date", value: r.updated_at },
          ]}
        />
      )}
    </div>
  );
}
