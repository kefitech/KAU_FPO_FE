"use client";

import { Suspense, useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { marketLinkageApi } from "@/app/admin/_api/market-linkage";
import { DataTable } from "@/components/data-table";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

import { getLinkageFPOColumns } from "./_components/columns";

type T = Record<string, string>;

export default function MarketLinkagePage() {
  const router = useRouter();
  const locale = useLocaleStore((s) => s.locale);
  const [tTable, setTTable] = useState<T>({});

  useEffect(() => {
    translationsApi.getPublic(locale, "market_linkage_table,common").then((data) => {
      setTTable(data.market_linkage_table ?? {});
    });
  }, [locale]);

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      <div>
        <h1 className="font-bold text-2xl">{tTable.page_title ?? "Market Linkage"}</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">
          {tTable.page_description ?? "Browse FPOs and the products they've listed for sale."}
        </p>
      </div>

      <Suspense>
        <DataTable
          queryKey="market-linkage-fpos"
          queryFn={marketLinkageApi.getFPOs}
          columns={getLinkageFPOColumns(tTable)}
          onRowClick={(row) => router.push(`/admin/market-linkage/${row.id}`)}
        />
      </Suspense>
    </div>
  );
}
