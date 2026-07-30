"use client";

import { Suspense, useEffect, useState,useMemo } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { ExternalLink, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { type ApplicationListItem, adminApplicationsApi } from "@/app/admin/_api/applications";
import { reportsApi } from "@/app/admin/_api/reports";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ViewSheet } from "@/components/ui/view-sheet";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

import { getApplicationColumns } from "./_components/columns";

type T = Record<string, string>;

const STATUS_FILTERS = [
  {
    key: "status",
    label: "All Status",
    options: [
      { label: "Submitted", value: "submitted" },
      { label: "Under Review", value: "under_review" },
      { label: "Approved", value: "approved" },
      { label: "Rejected", value: "rejected" },
      { label: "Info Required", value: "info_required" },
      { label: "Draft", value: "draft" },
      { label: "Suspended", value: "suspended" },
      { label: "Claimed", value: "claimed" },
    ],
  },
  {
    key: "district",
    label: "All District",
    options: [
      { label: "Thiruvananthapuram", value: "TVM" },
      { label: "Kollam", value: "KLM" },
      { label: "Pathanamthitta", value: "PTA" },
      { label: "Alappuzha", value: "ALP" },
      { label: "Kottayam", value: "KTM" },
      { label: "Idukki", value: "IDK" },
      { label: "Ernakulam", value: "EKM" },
      { label: "Thrissur", value: "TSR" },
      { label: "Palakkad", value: "PKD" },
      { label: "Malappuram", value: "MLP" },
      { label: "Kozhikode", value: "KZD" },
      { label: "Wayanad", value: "WYD" },
      { label: "Kannur", value: "KNR" },
      { label: "Kasaragod", value: "KSD" },
    ],
  },
  {
    key: "tier",
    label: "All Tier",
    options: [
      { label: "Tier A", value: "A" },
      { label: "Tier B", value: "B" },
      { label: "Tier C", value: "C" },
      { label: "Tier D", value: "D" },
    ],
  },
];

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-blue-100 text-blue-700",
  under_review: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  info_required: "bg-orange-100 text-orange-700",
  suspended: "bg-gray-100 text-gray-600",
  claimed: "bg-purple-100 text-purple-700",
};

export default function ApplicationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});
  const [downloading, setDownloading] = useState(false);
  const [translationsLoading, setTranslationsLoading] = useState(true);


  const filters = useMemo(
    () => [
      {
        key: "status",
        label: t.filter_all_status ?? "All Status",
        options: [
          { label: t.status_submitted ?? "Submitted", value: "submitted" },
          { label: t.status_under_review ?? "Under Review", value: "under_review" },
          { label: t.status_approved ?? "Approved", value: "approved" },
          { label: t.status_rejected ?? "Rejected", value: "rejected" },
          { label: t.status_info_required ?? "Info Required", value: "info_required" },
          { label: t.status_draft ?? "Draft", value: "draft" },
          { label: t.status_suspended ?? "Suspended", value: "suspended" },
          { label: t.status_claimed ?? "Claimed", value: "claimed" },
        ],
      },
      {
        key: "district",
        label: t.filter_all_district ?? "All District",
        options: [
          { value: "TVM", label: t.district_TVM ?? "Thiruvananthapuram" },
          { value: "KLM", label: t.district_KLM ?? "Kollam" },
          { value: "PTA", label: t.district_PTA ?? "Pathanamthitta" },
          { value: "ALP", label: t.district_ALP ?? "Alappuzha" },
          { value: "KTM", label: t.district_KTM ?? "Kottayam" },
          { value: "IDK", label: t.district_IDK ?? "Idukki" },
          { value: "EKM", label: t.district_EKM ?? "Ernakulam" },
          { value: "TSR", label: t.district_TSR ?? "Thrissur" },
          { value: "PKD", label: t.district_PKD ?? "Palakkad" },
          { value: "MLP", label: t.district_MLP ?? "Malappuram" },
          { value: "KZD", label: t.district_KZD ?? "Kozhikode" },
          { value: "WYD", label: t.district_WYD ?? "Wayanad" },
          { value: "KNR", label: t.district_KNR ?? "Kannur" },
          { value: "KSD", label: t.district_KSD ?? "Kasaragod" },
        ],
      },
      {
        key: "tier",
        label: t.filter_all_tier ?? "All Tier",
        options: [
          { label: t.tier_a ?? "Tier A", value: "A" },
          { label: t.tier_b ?? "Tier B", value: "B" },
          { label: t.tier_c ?? "Tier C", value: "C" },
          { label: t.tier_d ?? "Tier D", value: "D" },
        ],
      },
    ],
    [t]
  );
  async function handleDownload(format: "excel" | "pdf") {
    setDownloading(true);
    try {
      await reportsApi.downloadFpoSummary({
        file_format: format,
        status: searchParams.get("status") ?? undefined,
        district: searchParams.get("district") ?? undefined,
        tier: searchParams.get("tier") ?? undefined,
      });
      toast.success("Report downloaded");
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string } | undefined;
      const msg = e?.status ? `Failed to download report (${e.status})` : "Failed to download report";
      console.error("[ReportDownload]", err);
      toast.error(msg);
    } finally {
      setDownloading(false);
    }
  }
  const [sheet, setSheet] = useState<{ open: boolean; app: ApplicationListItem | null }>({
    open: false,
    app: null,
  });

  useEffect(() => {
    setTranslationsLoading(true);
    translationsApi
      .getPublic(locale, "applications_table,admin_dashboard,districts,common")
      .then((data) => {
        setT({ ...(data.districts ?? {}), ...(data.admin_dashboard ?? {}), ...(data.applications_table ?? {}) });
        setTCommon(data.common ?? {});
      })
      .catch(() => undefined)
      .finally(() => setTranslationsLoading(false));
  }, [locale]);

  const a = sheet.app;

  if (translationsLoading) {
    return (
      <div className="flex flex-col gap-6 py-6">
        <div className="flex flex-col gap-2">
          <div className="h-7 w-56 animate-pulse rounded bg-muted" />
          <div className="h-4 w-80 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-9 w-full animate-pulse rounded-lg bg-muted" />
        <div className="h-64 w-full animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }


  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl">{t.page_title ?? "FPO Applications"}</h1>
          <p className="mt-0.5 text-muted-foreground text-sm">
            {t.page_description ?? "Review and manage FPO registration applications"}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" disabled={downloading} className="self-start sm:self-auto">
              {downloading ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="mr-1.5 h-4 w-4" />
              )}
              {t.btn_download ?? "Download Report"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
              {searchParams.get("status") || searchParams.get("district") || searchParams.get("tier")
                ? (t.download_label_filtered ?? "Downloads with active filters")
                : (t.download_label_all ?? "Downloads all applications")}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleDownload("excel")}>
              <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
              {t.download_as_excel ?? "Download as Excel"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDownload("pdf")}>
              <FileText className="mr-2 h-4 w-4 text-red-600" />
              {t.download_as_pdf ?? "Download as PDF"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Suspense>
        
        <DataTable
          queryKey="applications"
          queryFn={adminApplicationsApi.getAll}
          columns={getApplicationColumns(t, tCommon, locale)}
          filters={filters}
          onRowClick={(row) => setSheet({ open: true, app: row })}
          columnsLabel={tCommon.col_header ?? "Columns"}
          toggleColumnsLabel={tCommon.col_toggle_columns ?? "Toggle columns"}
          searchPlaceholder={tCommon.search_placeholder ?? "Search..."}
          clearLabel={tCommon.cancel ?? "Clear"}
        />
      </Suspense>

      {a && (
        <ViewSheet
          open={sheet.open}
          onOpenChange={(open) => setSheet((prev) => ({ ...prev, open }))}
          title={a.name}
          actions={[
            {
              label: t.btn_view_document ?? "View Full Details",
              icon: ExternalLink,
              onClick: () => router.push(`/admin/applications/${a.id}`),
            },
          ]}
          fields={[
            { type: "section", label: t.section_application ?? "Application" },
            { label: t.field_application_id ?? "Application ID", type: "code", value: a.application_id },
            {
              label: t.field_status ?? "Status",
              type: "node",
              node: (
                <Badge
                  className={`text-xs font-medium ${STATUS_COLORS[a.status] ?? "bg-muted text-muted-foreground"}`}
                  variant="secondary"
                >
                  {t[`status_${a.status}`] ?? a.status_display}
                </Badge>
              ),
            },
            { label: t.field_district ?? "District", value: t[`district_${a.district}`] ?? a.district_display },
            {
              label: t.field_tier ?? "Tier",
              value: a.tier
                ? (t[`tier_${a.tier.toLowerCase()}`] ?? a.tier)
                : a.current_tier
                  ? (t[`tier_${a.current_tier.toLowerCase()}`] ?? a.current_tier)
                  : (t.tier_not_assessed ?? "—"),
            },
            { label: t.field_total_members ?? "Total Members", value: a.total_members != null ? String(a.total_members) : "—" },
            { label: t.field_submitted ?? "Submitted", type: "date", value: a.created_at },
            { label: t.field_last_updated ?? "Last Updated", type: "date", value: a.updated_at },
            { type: "section", label: t.section_contact ?? "Contact" },
            { label: t.field_office_email ?? "Office Email", value: a.office_email },
            { label: t.field_office_phone ?? "Office Phone", value: a.office_phone },
            { type: "section", label: t.section_primary_user ?? "Primary User" },
            { label: tCommon.field_name ?? "Name", value: a.primary_user_name },
            { label: tCommon.field_email ?? "Email", value: a.primary_user_email },
            { label: tCommon.field_phone ?? "Phone", value: a.primary_user_phone },
          ]}
        />
      )}
    </div>
  );
}
