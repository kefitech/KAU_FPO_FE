"use client";

import { Suspense, useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { adminApplicationsApi } from "@/app/admin/_api/applications";
import { DataTable } from "@/components/data-table";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

import { getApplicationColumns } from "./_components/columns";

type T = Record<string, string>;

const STATUS_FILTERS = [
  {
    key: "status",
    label: "Status",
    options: [
      { label: "Submitted", value: "submitted" },
      { label: "Under Review", value: "under_review" },
      { label: "Approved", value: "approved" },
      { label: "Rejected", value: "rejected" },
      { label: "Info Required", value: "info_required" },
      { label: "Draft", value: "draft" },
      { label: "Suspended", value: "suspended" },
    ],
  },
  {
    key: "district",
    label: "District",
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
    label: "Tier",
    options: [
      { label: "Tier A", value: "A" },
      { label: "Tier B", value: "B" },
      { label: "Tier C", value: "C" },
      { label: "Tier D", value: "D" },
    ],
  },
];

export default function ApplicationsPage() {
  const router = useRouter();
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});

  useEffect(() => {
    translationsApi
      .getPublic(locale, "applications_table,common")
      .then((data) => {
        setT(data.applications_table ?? {});
        setTCommon(data.common ?? {});
      })
      .catch(() => undefined);
  }, [locale]);

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      <div>
        <h1 className="font-bold text-2xl">{t.page_title ?? "FPO Applications"}</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">
          {t.page_description ?? "Review and manage FPO registration applications"}
        </p>
      </div>

      <Suspense>
        <DataTable
          queryKey="applications"
          queryFn={adminApplicationsApi.getAll}
          columns={getApplicationColumns(t, tCommon)}
          filters={STATUS_FILTERS}
          onRowClick={(row) => router.push(`/admin/applications/${row.id}`)}
        />
      </Suspense>
    </div>
  );
}
