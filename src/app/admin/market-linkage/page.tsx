"use client";

import { Suspense, useEffect, useState } from "react";

import { useQuery } from "@tanstack/react-query";

import { type LinkageFPO, marketLinkageApi } from "@/app/admin/_api/market-linkage";
import { DataTable } from "@/components/data-table";
import { ViewSheet } from "@/components/ui/view-sheet";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

import { getLinkageFPOColumns } from "./_components/columns";
import { ProductList } from "./_components/product-list";

type T = Record<string, string>;

export default function MarketLinkagePage() {
  const locale = useLocaleStore((s) => s.locale);
  const [tTable, setTTable] = useState<T>({});

  useEffect(() => {
    translationsApi.getPublic(locale, "market_linkage_table,common").then((data) => {
      setTTable(data.market_linkage_table ?? {});
    });
  }, [locale]);

  const [fpoView, setFpoView] = useState<{ open: boolean; row: LinkageFPO | null }>({
    open: false,
    row: null,
  });

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["market-linkage-products", fpoView.row?.id],
    queryFn: () => marketLinkageApi.getProductsByFPO(fpoView.row!.id),
    enabled: fpoView.open && !!fpoView.row,
  });

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
          onRowClick={(row) => setFpoView({ open: true, row })}
        />
      </Suspense>

      <ViewSheet
        open={fpoView.open}
        onOpenChange={(open) => setFpoView((s) => ({ ...s, open }))}
        title={fpoView.row?.name ?? tTable.view_title ?? "FPO Products"}
        fields={[
          {
            label: tTable.products_label ?? "Products",
            type: "node",
            node: productsLoading ? (
              <p className="text-sm text-muted-foreground py-4">{tTable.loading ?? "Loading products..."}</p>
            ) : (
              <ProductList products={productsData?.data ?? []} t={tTable} />
            ),
          },
        ]}
      />
    </div>
  );
}
