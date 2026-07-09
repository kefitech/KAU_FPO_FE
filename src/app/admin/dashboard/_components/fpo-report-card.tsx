"use client";

import { useState } from "react";

import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";

import { reportsApi } from "@/app/admin/_api/reports";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DISTRICT_OPTIONS } from "@/types/fpo";

const STATUSES = [
  { label: "Draft", value: "draft" },
  { label: "Submitted", value: "submitted" },
  { label: "Under Review", value: "under_review" },
  { label: "Info Required", value: "info_required" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "Suspended", value: "suspended" },
];

const TIERS = [
  { label: "Tier A", value: "A" },
  { label: "Tier B", value: "B" },
  { label: "Tier C", value: "C" },
  { label: "Tier D", value: "D" },
];

export function FpoReportCard() {
  const [format, setFormat] = useState<"excel" | "pdf">("excel");
  const [status, setStatus] = useState("");
  const [district, setDistrict] = useState("");
  const [tier, setTier] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(false);

  const hasFilters = !!(status || district || tier || fromDate || toDate);
  const today = new Date().toISOString().split("T")[0];

  async function handleDownload() {
    setLoading(true);
    try {
      await reportsApi.downloadFpoSummary({
        file_format: format,
        status: status || undefined,
        district: district || undefined,
        tier: tier || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      });
      toast.success("Report downloaded successfully");
    } catch {
      toast.error("Failed to download report");
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
            <CardTitle className="text-base">FPO Summary Report</CardTitle>
            <p className="text-muted-foreground text-xs mt-0.5">
              Download filtered FPO data as Excel or PDF
            </p>
          </div>

          {/* Format toggle */}
          <div className="flex items-center gap-1 rounded-lg border p-1 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setFormat("excel")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                format === "excel"
                  ? "bg-green-600 text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Excel
            </button>
            <button
              type="button"
              onClick={() => setFormat("pdf")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                format === "pdf"
                  ? "bg-red-600 text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              PDF
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Filters */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">District</Label>
            <Select value={district} onValueChange={setDistrict}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="All districts" />
              </SelectTrigger>
              <SelectContent>
                {DISTRICT_OPTIONS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
            <Label className="text-xs text-muted-foreground">Tier</Label>
            <Select value={tier} onValueChange={setTier}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="All tiers" />
              </SelectTrigger>
              <SelectContent>
                {TIERS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
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
              <Label className="text-xs text-muted-foreground">From Date</Label>
              <input
                type="date"
                value={fromDate}
                max={toDate || today}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-8 w-full rounded-md border bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">To Date</Label>
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
                Clear filters
              </button>
            )}
            <Button
              size="sm"
              onClick={handleDownload}
              disabled={loading}
              className={`w-full sm:w-auto ${format === "pdf" ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              {loading ? "Downloading…" : `Download ${format === "pdf" ? "PDF" : "Excel"}`}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
