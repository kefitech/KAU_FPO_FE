"use client";

import { Suspense, useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import { Pencil, Plus } from "lucide-react";

import { inquiriesApi } from "@/app/fpo/_api/inquiries";
import { marketHubInquiriesApi } from "@/app/fpo/_api/market-hub-inquiries";
import { productsApi } from "@/app/fpo/_api/products";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ViewSheet } from "@/components/ui/view-sheet";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";
import type { Product } from "@/types/fpo";
import { PRODUCT_STATUS_LABEL } from "@/types/fpo";

import { getInquiryColumns } from "./_components/inquiry-columns";
import { getMarketHubInquiryColumns } from "./_components/market-hub-inquiry-columns";
import { getProductColumns } from "./_components/columns";

type T = Record<string, string>;
type ViewMode = "products" | "inquiries" | "market-hub-inquiries";

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

  const [viewMode, setViewMode] = useState<ViewMode>("products");

  const STATUS_FILTERS = useMemo(
    () => [
      {
        key: "status",
        label: tTable.col_status ?? "Status",
        options: [
          { label: tTable.status_draft ?? "Draft", value: "draft" },
          { label: tTable.status_active ?? "Active", value: "active" },
          { label: tTable.status_sold ?? "Sold", value: "sold" },
          { label: tTable.status_expired ?? "Expired", value: "expired" },
        ],
      },
    ],
    [tTable],
  );

  const INQUIRY_STATUS_FILTERS = useMemo(
    () => [
      {
        key: "status",
        label: tPage.col_status ?? "Status",
        options: [
          { label: tPage.status_pending ?? "Pending", value: "pending" },
          { label: tPage.status_contacted ?? "Contacted", value: "contacted" },
          { label: tPage.status_resolved ?? "Resolved", value: "resolved" },
        ],
      },
    ],
    [tPage],
  );
    const MARKET_HUB_STATUS_FILTERS = useMemo(
    () => [
      {
        key: "status",
        label: tPage.col_status ?? "Status",
        options: [
          { label: tPage.status_mh_pending ?? "Pending", value: "suggested" },
          { label: tPage.status_mh_accepted ?? "Accepted", value: "accepted" },
          { label: tPage.status_mh_rejected ?? "Rejected", value: "rejected" },
        ],
      },
    ],
    [tPage],
  );

  const titles: Record<ViewMode, { title: string; description: string }> = {
    products: {
      title: tPage.page_title ?? "My Products",
      description: tPage.page_description ?? "List and manage your FPO's agricultural products for market linkage.",
    },
    inquiries: {
      title: tPage.inquiries_title ?? "My Product Inquiries",
      description: tPage.inquiries_description ?? "View and manage inquiries received on your products.",
    },
    "market-hub-inquiries": {
      title: tPage.market_hub_inquiries_title ?? "Market Hub Inquiries",
      description:
        tPage.market_hub_inquiries_description ??
        "View inquiries received from anonymous visitors on the public Market Hub.",
    },
  };

  return (
    <div className="flex flex-col gap-6 px-3 py-4 sm:px-6 sm:py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-bold text-2xl">{titles[viewMode].title}</h1>
          <p className="mt-0.5 text-muted-foreground text-sm">{titles[viewMode].description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="products">{tPage.view_products ?? "My Products"}</SelectItem>
              <SelectItem value="inquiries">{tPage.view_inquiries ?? "Inquiries"}</SelectItem>
              <SelectItem value="market-hub-inquiries">
                {tPage.view_market_hub_inquiries ?? "Market Hub Inquiries"}
              </SelectItem>
            </SelectContent>
          </Select>
          {viewMode === "products" && (
            <Button size="sm" onClick={() => router.push("/fpo/products/new")}>
              <Plus className="mr-1.5 h-4 w-4" />
              {tPage.add_btn ?? "Add Product"}
            </Button>
          )}
        </div>
      </div>

      {viewMode === "products" && (
        <Suspense>
          <DataTable
            queryKey="products"
            queryFn={productsApi.getAll}
            columns={getProductColumns(tTable, tCommon)}
            filters={STATUS_FILTERS}
            onRowClick={(row) => setProductView({ open: true, row })}
            columnsLabel={tCommon.columns_header}
            toggleColumnsLabel={tCommon.columns_toggle_columns}
            searchPlaceholder={tCommon.search_placeholder}
            clearLabel={tCommon.clear_filters}
          />
        </Suspense>
      )}

      {viewMode === "inquiries" && (
        <Suspense>
          <DataTable
            queryKey="inquiries"
            queryFn={inquiriesApi.getAll}
            columns={getInquiryColumns()}
            filters={INQUIRY_STATUS_FILTERS}
            columnsLabel={tCommon.columns_header}
            toggleColumnsLabel={tCommon.columns_toggle_columns}
            searchPlaceholder={tCommon.search_placeholder}
            clearLabel={tCommon.clear_filters}
          />
        </Suspense>
      )}

      {viewMode === "market-hub-inquiries" && (
        <Suspense>
          <DataTable
            queryKey="market-hub-inquiries"
            queryFn={marketHubInquiriesApi.getAll}
            columns={getMarketHubInquiryColumns(tPage)}     
            filters={MARKET_HUB_STATUS_FILTERS}
            columnsLabel={tCommon.columns_header}
            toggleColumnsLabel={tCommon.columns_toggle_columns}
            searchPlaceholder={tCommon.search_placeholder}
            clearLabel={tCommon.clear_filters}
          />
        </Suspense>
      )}

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