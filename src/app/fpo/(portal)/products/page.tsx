"use client";

import { Suspense, useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { Pencil, Plus } from "lucide-react";

import { productsApi } from "@/app/fpo/_api/products";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { ViewSheet } from "@/components/ui/view-sheet";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";
import type { Product } from "@/types/fpo";
import { PRODUCT_STATUS_LABEL } from "@/types/fpo";

import { getProductColumns } from "./_components/columns";

type T = Record<string, string>;

export default function FpoProductsPage() {
  const router = useRouter();
  const locale = useLocaleStore((s) => s.locale);

  const [tPage, setTPage] = useState<T>({});
  const [tTable, setTTable] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});

  useEffect(() => {
    translationsApi.getPublic(locale, "fpo_products,product_table,common").then((data) => {
      setTPage(data.fpo_products ?? {});
      setTTable(data.product_table ?? {});
      setTCommon(data.common ?? {});
    });
  }, [locale]);

  const [productView, setProductView] = useState<{ open: boolean; row: Product | null }>({
    open: false,
    row: null,
  });

  return (
    <div className="flex flex-col gap-6 px-3 sm:px-6 py-4 sm:py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-bold text-2xl">{tPage.page_title ?? "My Products"}</h1>
          <p className="mt-0.5 text-muted-foreground text-sm">
            {tPage.page_description ?? "List and manage your FPO's agricultural products for market linkage."}
          </p>
        </div>
        <Button size="sm" onClick={() => router.push("/fpo/products/new")}>
          <Plus className="mr-1.5 h-4 w-4" />
          {tPage.add_btn ?? "Add Product"}
        </Button>
      </div>

      <Suspense>
        <DataTable
          queryKey="products"
          queryFn={productsApi.getAll}
          columns={getProductColumns(tTable, tCommon)}
          onRowClick={(row) => setProductView({ open: true, row })}
          columnsLabel={tCommon.columns_header}
          toggleColumnsLabel={tCommon.columns_toggle_columns}
          searchPlaceholder={tCommon.search_placeholder}
          clearLabel={tCommon.clear_filters}
        />
      </Suspense>

      <ViewSheet
        open={productView.open}
        onOpenChange={(open) => setProductView((s) => ({ ...s, open }))}
        title={tTable.view_title ?? "Product Details"}
        actions={
          productView.row
            ? [
                ...(productView.row.status !== "sold" && productView.row.status !== "expired"
                  ? [
                      {
                        label: tCommon.edit ?? "Edit",
                        icon: Pencil,
                        onClick: () => router.push(`/fpo/products/${productView.row?.id}/edit`),
                      },
                    ]
                  : []),
              ]
            : []
        }
        fields={
          productView.row
            ? [
                { label: tTable.col_name ?? "Name", value: productView.row.name.en },
                {
                  label: tTable.col_commodity ?? "Commodity ID",
                  type: "code",
                  value: String(productView.row.commodity),
                },
                {
                  label: tTable.col_quantity ?? "Quantity",
                  value: `${productView.row.quantity} ${productView.row.unit}`,
                },
                { label: tTable.col_price ?? "Price per unit", value: `₹${productView.row.price_per_unit}` },
                {
                  label: tTable.col_quality ?? "Quality Certification",
                  value: productView.row.quality_certification || "—",
                },
                {
                  label: tTable.col_available_from ?? "Available From",
                  type: "date",
                  value: productView.row.available_from,
                },
                {
                  label: tTable.col_available_until ?? "Available Until",
                  type: "date",
                  value: productView.row.available_until ?? undefined,
                },
                {
                  label: tTable.col_status ?? "Status",
                  value: tTable[`status_${productView.row.status}`] ?? PRODUCT_STATUS_LABEL[productView.row.status],
                },
                {
                  label: tTable.col_public ?? "Public",
                  type: "status",
                  active: productView.row.is_public,
                  activeLabel: tCommon.yes ?? "Yes",
                  inactiveLabel: tCommon.no ?? "No",
                },
              ]
            : []
        }
      />
    </div>
  );
}
