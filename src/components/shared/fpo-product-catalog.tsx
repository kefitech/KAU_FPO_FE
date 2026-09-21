"use client";

import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Package, Search } from "lucide-react";
import Link from "next/link";

import { type BuyerProduct, buyerProductsApi } from "@/app/buyer/_api/products";
import { masterDataApi } from "@/app/fpo/_api/master-data";
import { Button } from "@/components/ui/button";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { InquiryDialog } from "@/components/ui/inquiry-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toMediaUrl } from "@/lib/utils/media-url";

function ProductCard({ product, locale }: { product: BuyerProduct; locale: string }) {
  const name = locale === "ml" ? product.name.ml || product.name.en : product.name.en;
  const description = locale === "ml" ? product.description.ml || product.description.en : product.description.en;
  const [inquiryOpen, setInquiryOpen] = useState(false);

  return (
    <>
      <Card className="overflow-hidden">
        {toMediaUrl(product.image) && (
          // biome-ignore lint/performance/noImgElement: product photo URL is dynamic, not a static asset
          <img src={toMediaUrl(product.image) ?? undefined} alt={name} className="h-40 w-full object-cover" />
        )}
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">{name}</CardTitle>
            <Badge variant="outline" className="shrink-0 font-normal">
              {product.commodity_code}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {description && <p className="text-muted-foreground text-sm">{description}</p>}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex flex-col gap-0.5">
              <span className="text-muted-foreground text-xs">Quantity</span>
              <span className="font-medium">
                {product.quantity} {product.unit}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-muted-foreground text-xs">Price</span>
              <span className="font-medium">₹{product.price_per_unit}</span>
            </div>
          </div>
          {product.quality_certification && (
            <Badge variant="secondary" className="w-fit font-normal">
              {product.quality_certification}
            </Badge>
          )}
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
            {product.available_from}
            {product.available_until ? ` – ${product.available_until}` : ""}
          </div>
          <Button size="sm" className="mt-1" onClick={() => setInquiryOpen(true)}>
            Inquire
          </Button>
        </CardContent>
      </Card>
      <InquiryDialog
        open={inquiryOpen}
        onOpenChange={setInquiryOpen}
        productId={product.id}
        productName={name}
        unit={product.unit}
        availableQuantity={Number(product.quantity)}
      />
    </>
  );
}

interface FpoProductCatalogProps {
  fpoId: number;
  locale: string;
  backHref: string;
}

export function FpoProductCatalog({ fpoId, locale, backHref }: FpoProductCatalogProps) {
  const [search, setSearch] = useState("");
  const [commodity, setCommodity] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const resetPage = () => setPage(1);

  const { data: commodities = [] } = useQuery({
    queryKey: ["master-data", "commodity", locale],
    queryFn: () => masterDataApi.getCommodities(locale),
    staleTime: 10 * 60_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["buyer-products-by-fpo", fpoId, search, commodity, page, pageSize],
    queryFn: () =>
      buyerProductsApi.getAll({
        page,
        page_size: pageSize,
        fpo: String(fpoId),
        search: search || undefined,
        commodity: commodity !== "all" ? commodity : undefined,
      }),
    staleTime: 30_000,
  });

  const products = data?.data ?? [];
  const total = data?.meta?.pagination?.total_count ?? 0;
  const fpoName = products[0]?.fpo_name;

  return (
    <div className="flex flex-col gap-4">
      <Link href={backHref} className="flex w-fit items-center gap-1.5 text-muted-foreground text-sm hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <div>
        <h1 className="font-bold text-2xl">{fpoName ? `Products from ${fpoName}` : "Products from this FPO"}</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">Browse all products listed by this FPO.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetPage();
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={commodity}
          onValueChange={(v) => {
            setCommodity(v);
            resetPage();
          }}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="All commodities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All commodities</SelectItem>
            {commodities.map((c) => (
              <SelectItem key={c.id} value={c.code}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <Package className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">No products found for this FPO.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} locale={locale} />
            ))}
          </div>
          <DataTablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </>
      )}
    </div>
  );
}