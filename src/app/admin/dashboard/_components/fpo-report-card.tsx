"use client";

import { useState, useMemo } from "react";

import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";

import { reportsApi } from "@/app/admin/_api/reports";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DISTRICT_OPTIONS } from "@/types/fpo";

const ALL_VALUE = "all";

type T = Record<string, string>;

const TIERS = [
  { label: "Tier A", value: "A" },
  { label: "Tier B", value: "B" },
  { label: "Tier C", value: "C" },
  { label: "Tier D", value: "D" },
];

export function FpoReportCard({ t }: { t: T }) {
  const STATUSES = [
    { label: t.status_draft ?? "Draft", value: "draft" },              // reuses admin_dashboard.status_draft
    { label: t.status_submitted ?? "Submitted", value: "submitted" },   // reuses admin_dashboard.status_submitted
    { label: t.status_under_review ?? "Under Review", value: "under_review" }, // reuses admin_dashboard.status_under_review
    { label: t.status_info_required ?? "Info Required", value: "info_required" }, // reuses admin_dashboard.status_info_required
    { label: t.status_approved ?? "Approved", value: "approved" },      // reuses admin_dashboard.status_approved
    { label: t.status_rejected ?? "Rejected", value: "rejected" },      // reuses admin_dashboard.status_rejected
    { label: t.status_suspended ?? "Suspended", value: "suspended" },   // reuses admin_dashboard.status_suspended
  ];
  const translatedDistricts = useMemo(
    () => DISTRICT_OPTIONS.map((d) => ({ ...d, label: t[`district_${d.value}`] ?? d.label })),
    [t]
  );

  const translatedTiers = useMemo(
    () => TIERS.map((tier) => ({ ...tier, label: t[`tier_${tier.value.toLowerCase()}`] ?? tier.label })),
    [t]
  );
  const [format, setFormat] = useState<"excel" | "pdf">("excel");
  const [status, setStatus] = useState("");
  const [district, setDistrict] = useState("");
  const [tier, setTier] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(false);
  const isSet = (v: string) => !!v && v !== ALL_VALUE;
  const hasFilters = !!(isSet(status) || isSet(district) || isSet(tier) || fromDate || toDate);

  const today = new Date().toISOString().split("T")[0];

  async function handleDownload() {
    setLoading(true);
    try {
      await reportsApi.downloadFpoSummary({
        file_format: format,
        status: isSet(status) ? status : undefined,
        district: isSet(district) ? district : undefined,
        tier: isSet(tier) ? tier : undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      });
      toast.success(t.toast_success ?? "Report downloaded successfully");
    } catch {
      toast.error(t.toast_failed ?? "Failed to download report");
    } finally {
      setLoading(false);
    }
  }

  function clearFilters() {
    setStatus("");
    setDistrict("");
    setTier("");
    setFromDate("");
    setToDate("");
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">{t.card_title ?? "FPO Summary Report"}</CardTitle>
            <p className="text-muted-foreground text-xs mt-0.5">{t.card_description ?? "Download filtered FPO data as Excel or PDF"}</p>
          </div>

          {/* Format toggle */}
          <div className="flex items-center gap-1 rounded-lg border p-1 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setFormat("excel")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                format === "excel" ? "bg-green-600 text-white" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              {t.format_excel ?? "Excel"}
            </button>
            <button
              type="button"
              onClick={() => setFormat("pdf")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                format === "pdf" ? "bg-red-600 text-white" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              {t.format_pdf ?? "PDF"}
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Filters */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">{t.label_status ?? "Status"}</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder={t.option_all ?? "All"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>{t.option_all ?? "All"}</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">{t.label_district ?? "District"}</Label>
            <Select value={district} onValueChange={setDistrict}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder={t.option_all ?? "All"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>{t.option_all ?? "All"}</SelectItem>
                {translatedDistricts.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
            <Label className="text-xs text-muted-foreground">{t.label_tier ?? "Tier"}</Label>
            <Select value={tier} onValueChange={setTier}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder={t.option_all ?? "All"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>{t.option_all ?? "All"}</SelectItem>
                  {translatedTiers.map((tierOpt) => (
                    <SelectItem key={tierOpt.value} value={tierOpt.value}>
                      {tierOpt.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Date range + actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="grid grid-cols-2 gap-3 sm:contents">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">{t.label_from_date ?? "From Date"}</Label>
              <input
                type="date"
                value={fromDate}
                max={toDate || today}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-8 w-full rounded-md border bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">{t.label_to_date ?? "To Date"}</Label>
              <input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                max={today}
                onChange={(e) => setToDate(e.target.value)}
                className="h-8 w-full rounded-md border bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-1 sm:items-center sm:justify-end">
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-center text-muted-foreground text-xs hover:text-foreground transition-colors sm:text-right"
              >
                {t.clear_filters ?? "Clear filters"}
              </button>
            )}
            <Button
              size="sm"
              onClick={handleDownload}
              disabled={loading}
              className={`w-full sm:w-auto ${format === "pdf" ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              {loading?
                (t.btn_downloading ?? "Downloading…"): 
                format === "pdf"?
                  (t.btn_download_pdf ?? "Download PDF"):
                  (t.btn_download_excel ?? "Download Excel")
              }
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
