"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";

import { govtFposApi } from "@/app/government/_api/fpos";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { govtReportsApi } from "@/app/government/_api/reports";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

type T = Record<string, string>;
const STATUS_BADGE_STYLES: Record<string, string> = {
  draft: "border-muted text-muted-foreground",
  submitted: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  under_review: "border-yellow-500/40 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  info_required: "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-400",
  approved: "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400",
  rejected: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400",
  suspended: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400",
  claimed: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400",
};

export default function GovernmentFPODirectoryPage() {
  const router = useRouter();
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const [tStatus, setTStatus] = useState<T>({});
  const [tDistricts, setTDistricts] = useState<T>({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    translationsApi
      .getPublic(locale, "government_fpos,government_dashboard,districts")
      .then((data) => {
        setT(data.government_fpos ?? {});
        setTStatus(data.government_dashboard ?? {});
        setTDistricts(data.districts ?? {});
      })
      .catch(() => undefined);
  }, [locale]);

  function getStatusLabel(status: string | undefined, fallback: string | undefined) {
    if (!status) return fallback ?? "";
    const key = String(status).toLowerCase().replace(/ /g, "_");
    return tStatus[`status_${key}`] ?? fallback ?? status;
  }

  function getDistrictLabel(code: string | undefined, fallback: string | undefined) {
    if (!code) return fallback ?? "";
    return tDistricts[`district_${code}`] ?? fallback ?? code;
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ["government", "fpos", "directory", search, statusFilter],
    queryFn: () =>
      govtFposApi.getAll({
        page: 1,
        page_size: 50,
        search: search || undefined,
        status: statusFilter || undefined,
      }),
  });

  const fpos = data?.data ?? [];
  const statusOptions = Array.from(
    new Map(fpos.map((f) => [f.status, f.status_display])).entries(),
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl">{t.page_title ?? "FPO Directory"}</h1>
          <p className="text-muted-foreground text-sm">
            {t.page_description ?? "Read-only view of FPOs in your jurisdiction"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => govtReportsApi.downloadFpoSummary({ file_format: "excel" })}>
            {t.btn_export_excel ?? "Export Excel"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => govtReportsApi.downloadFpoSummary({ file_format: "pdf" })}>
            {t.btn_export_pdf ?? "Export PDF"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.placeholder_search ?? "Search name or application ID..."}
            className="pl-8"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">{t.option_all_statuses ?? "All statuses"}</option>
          {statusOptions.map(([value, label]) => (
            <option key={value} value={value}>
              {getStatusLabel(value, label)}
            </option>
          ))}
        </select>
      </div>

      {isLoading && (
        <div className="flex h-40 items-center justify-center text-muted-foreground text-sm">
          {t.loading ?? "Loading FPOs..."}
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
          {t.error_load ?? "Couldn't load FPOs. Please try again."}
        </div>
      )}

      {!isLoading && !isError && (
        <Card>
          <CardContent className="p-0">
            {fpos.length === 0 && (
              <p className="p-6 text-center text-muted-foreground text-sm">{t.empty_no_fpos ?? "No FPOs found."}</p>
            )}
            {fpos.map((f, i) => (
              <button
                key={f.id}
                type="button"
                onClick={() => router.push(`/government/fpos/${f.id}`)}
                className={`flex w-full items-center justify-between p-4 text-left hover:bg-muted/50 ${
                  i !== fpos.length - 1 ? "border-b" : ""
                }`}
              >
                <div>
                  <p className="font-medium text-sm">{f.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {getDistrictLabel(f.district ?? undefined, f.district_display ?? undefined)} · {f.application_id}
                  </p>
                </div>
                <Badge variant="outline" className={STATUS_BADGE_STYLES[f.status] ?? "border-muted text-muted-foreground"}>
                  {getStatusLabel(f.status, f.status_display)}
                </Badge>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {data?.meta?.pagination && (
        <p className="text-muted-foreground text-xs">
          {(t.summary_count ?? "{count} total FPO(s) in your jurisdiction").replace("{count}", String(data.meta.pagination.total_count))}
        </p>
      )}
    </div>
  );
}
