"use client";

import { Suspense, useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import { Layers, Pencil, Plus, Upload } from "lucide-react";

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

import { BulkImportDialog } from "./_components/bulk-import-dialog";
import { getProductColumns } from "./_components/columns";
import { getInquiryColumns } from "./_components/inquiry-columns";
import { ManageBatchesSheet } from "./_components/manage-batches-sheet";
import { getMarketHubInquiryColumns } from "./_components/market-hub-inquiry-columns";

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

  const [batchesSheet, setBatchesSheet] = useState<{ open: boolean; product: Product | null }>({
    open: false,
    product: null,
  });

  const [bulkImportOpen, setBulkImportOpen] = useState(false);

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
            <>
              <Button size="sm" variant="outline" onClick={() => setBulkImportOpen(true)}>
                <Upload className="mr-1.5 h-4 w-4" />
                {tPage.bulk_import_btn ?? "Bulk Import"}
              </Button>
              <Button size="sm" onClick={() => router.push("/fpo/products/new")}>
                <Plus className="mr-1.5 h-4 w-4" />
                {tPage.add_btn ?? "Add Product"}
              </Button>
            </>
          )}
        </div>
      </div>

      {viewMode === "products" && (
        <Suspense>
          <DataTable
            queryKey="products"
            queryFn={productsApi.getAll}
            columns={getProductColumns(tTable, tCommon, {
              onManageBatches: (product) => setBatchesSheet({ open: true, product }),
            })}
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
            columns={getInquiryColumns(tPage)}
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
                {
                  label: tTable.action_manage_batches ?? "Manage Batches",
                  icon: Layers,
                  onClick: () => {
                    const p = productView.row;
                    if (!p) return;
                    setProductView((s) => ({ ...s, open: false }));
                    setBatchesSheet({ open: true, product: p });
                  },
                },
                {
                  label: tCommon.edit ?? "Edit",
                  icon: Pencil,
                  onClick: () => router.push(`/fpo/products/${productView.row?.id}/edit`),
                },
              ]
            : []
        }
        fields={
          productView.row
            ? (() => {
                const p = productView.row;
                const s = p.latest_stock;
                return [
                  { label: tTable.col_name ?? "Name", value: p.name.en },
                  {
                    label: tTable.col_commodity ?? "Commodity",
                    value: p.commodity_name || p.commodity_code || "—",
                  },
                  // All of the "latest batch" fields collapse to a single
                  // "No active batch" row when the product has no stocks
                  // yet — the FPO sees exactly where to go next.
                  ...(s
                    ? [
                        {
                          label: tTable.col_quantity ?? "Latest Qty",
                          value: `${s.quantity} ${s.unit}`,
                        },
                        {
                          label: tTable.col_price ?? "Latest Price per unit",
                          value: `₹${s.price_per_unit}`,
                        },
                        {
                          label: tTable.col_quality ?? "Quality Certification",
                          value: s.quality_certification || "—",
                        },
                        {
                          label: tTable.col_available_from ?? "Available From",
                          type: "date" as const,
                          value: s.available_from,
                        },
                        {
                          label: tTable.col_available_until ?? "Available Until",
                          type: "date" as const,
                          value: s.available_until ?? undefined,
                        },
                        {
                          label: tTable.col_status ?? "Latest Status",
                          value: tTable[`status_${s.status}`] ?? PRODUCT_STATUS_LABEL[s.status],
                        },
                        {
                          label: tTable.col_public ?? "Public",
                          type: "status" as const,
                          active: s.is_public,
                          activeLabel: tCommon.yes ?? "Yes",
                          inactiveLabel: tCommon.no ?? "No",
                        },
                      ]
                    : [
                        {
                          label: tTable.col_status ?? "Latest Status",
                          value: tTable.no_stock ?? "No stock batches yet",
                        },
                      ]),
                  {
                    label: tTable.col_total_batches ?? "Total batches",
                    value: String(p.stocks.length),
                  },
                ];
              })()
            : []
        }
      />

      {batchesSheet.product && (
        <ManageBatchesSheet
          product={batchesSheet.product}
          open={batchesSheet.open}
          onOpenChange={(open) =>
            setBatchesSheet((s) => (open ? { ...s, open } : { open: false, product: null }))
          }
          t={tTable}
          tCommon={tCommon}
        />
      )}

      <BulkImportDialog
        open={bulkImportOpen}
        onOpenChange={setBulkImportOpen}
        t={tPage}
        tCommon={tCommon}
      />
    </div>
  );
}
