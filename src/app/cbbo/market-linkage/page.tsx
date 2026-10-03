"use client";

import { Suspense, useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import type { ColumnDef } from "@tanstack/react-table";

import type { LinkageFPO } from "@/app/admin/_api/market-linkage";
import { cbboMarketLinkageApi } from "@/app/cbbo/_api/market-linkage";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

type T = Record<string, string>;

export default function CbboMarketLinkagePage() {
  const router = useRouter();
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});

  useEffect(() => {
    translationsApi.getPublic(locale, "cbbo_market_linkage,common").then((data) => {
      setT(data.cbbo_market_linkage ?? {});
    });
  }, [locale]);

  const columns: ColumnDef<LinkageFPO>[] = [
    {
      accessorKey: "name",
      header: t.col_name ?? "FPO Name",
      cell: ({ row }) => (
        <span className="font-medium">
          {locale === "ml" && row.original.name_ml ? row.original.name_ml : row.original.name}
        </span>
      ),
    },
    {
      accessorKey: "district_display",
      header: t.col_district ?? "District",
      meta: { hideOnMobile: true },
    },
    {
      accessorKey: "product_count",
      header: t.col_products ?? "Listed Batches",
      cell: ({ row }) => <Badge variant="secondary">{row.original.product_count}</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-bold text-2xl">{t.page_title ?? "Market Linkage"}</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">
          {t.page_description ?? "Products listed by the FPOs in your assigned districts."}
        </p>
      </div>

      <Suspense>
        <DataTable
          queryKey="cbbo-market-linkage-fpos"
          queryFn={cbboMarketLinkageApi.getFPOs}
          columns={columns}
          onRowClick={(row) => router.push(`/cbbo/market-linkage/${row.id}`)}
          columnsLabel={t.col_header ?? "Columns"}
          toggleColumnsLabel={t.col_toggle_columns ?? "Toggle columns"}
          searchPlaceholder={t.search_placeholder ?? "Search FPOs..."}
        />
      </Suspense>
    </div>
  );
}
