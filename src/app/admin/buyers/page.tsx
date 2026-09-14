"use client";

import { Suspense, useEffect, useMemo, useState } from "react";

import { adminBuyersApi } from "@/app/admin/_api/buyers";
import { DataTable } from "@/components/data-table";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

import { getBuyerColumns } from "./_components/columns";

type T = Record<string, string>;

export default function AdminBuyersPage() {
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const [buyerType, setBuyerType] = useState<"" | "fpo" | "external">("");

  useEffect(() => {
    translationsApi.getPublic(locale, "buyers_table,common").then((data) => {
      setT(data.buyers_table ?? {});
    });
  }, [locale]);

  const STATUS_FILTERS = useMemo(
    () => [
      {
        key: "status",
        label: t.filter_status ?? "Status",
        options: [
          { label: t.status_pending ?? "Pending", value: "pending" },
          { label: t.status_verified ?? "Verified", value: "verified" },
          { label: t.status_deactivated ?? "Deactivated", value: "deactivated" },
          { label: t.status_rejected ?? "Rejected", value: "rejected" },
        ],
      },
    ],
    [t],
  );

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      <div>
        <h1 className="font-bold text-2xl">{t.page_title ?? "Buyer Directory"}</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">
          {t.page_description ?? "Review and manage buyer registrations."}
        </p>
      </div>

      <div className="flex justify-end">
        <select
          value={buyerType}
          onChange={(e) => setBuyerType(e.target.value as "" | "fpo" | "external")}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">{t.filter_all ?? "All"}</option>
          <option value="fpo">{t.filter_fpo ?? "FPO Buyers"}</option>
          <option value="external">{t.filter_external ?? "External Buyers"}</option>
        </select>
      </div>

      <Suspense>
        <DataTable
          queryKey={`admin-buyers-${buyerType}`}
          queryFn={(params) => adminBuyersApi.getAll({ ...params, buyer_type: buyerType || undefined })}
          columns={getBuyerColumns(t)}
          filters={STATUS_FILTERS}
        />
      </Suspense>
    </div>
  );
}
