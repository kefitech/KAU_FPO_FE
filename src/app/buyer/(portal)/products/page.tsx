"use client";

import { useEffect, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { Building2, Calendar as CalendarIcon, Package, Search } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { type BuyerProduct, buyerProductsApi } from "@/app/buyer/_api/products";
import { masterDataApi } from "@/app/fpo/_api/master-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { translationsApi } from "@/lib/api/translations";
import { toMediaUrl } from "@/lib/utils/media-url";
import { useLocaleStore } from "@/stores/locale-store";

type T = Record<string, string>;

function ProductCard({ product, locale }: { product: BuyerProduct; locale: string }) {
  const name = locale === "ml" ? product.name.ml || product.name.en : product.name.en;
  const description = locale === "ml" ? product.description.ml || product.description.en : product.description.en;

  return (
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
          <Building2 className="h-3.5 w-3.5" />
          {product.fpo_name}
        </div>

        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
          <CalendarIcon className="h-3.5 w-3.5" />
          {product.available_from}
          {product.available_until ? ` – ${product.available_until}` : ""}
        </div>
      </CardContent>
    </Card>
  );
}

function formatDate(date: Date | undefined): string {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function BuyerProductsPage() {
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const [translationsLoading, setTranslationsLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [commodity, setCommodity] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    setTranslationsLoading(true);
    translationsApi
      .getPublic(locale, "buyer_products,common")
      .then((data) => setT({ ...(data.buyer_products ?? {}), ...(data.common ?? {}) }))
      .finally(() => setTranslationsLoading(false));
  }, [locale]);

  const { data: commodities = [] } = useQuery({
    queryKey: ["master-data", "commodity", locale],
    queryFn: () => masterDataApi.getCommodities(locale),
    staleTime: 10 * 60_000,
  });

  // Date range filter requires BOTH dates before it's applied — a
  // half-picked range is treated as "no filter yet."
  const dateFilterReady = !!dateRange?.from && !!dateRange?.to;

  const resetPage = () => setPage(1);

  const { data, isLoading } = useQuery({
    queryKey: [
      "buyer-products",
      locale,
      search,
      commodity,
      dateFilterReady ? dateRange?.from : null,
      dateFilterReady ? dateRange?.to : null,
      page,
      pageSize,
    ],
    queryFn: () =>
      buyerProductsApi.getAll({
        page,
        page_size: pageSize,
        search: search || undefined,
        commodity: commodity !== "all" ? commodity : undefined,
        date_from: dateFilterReady ? formatDate(dateRange?.from) : undefined,
        date_until: dateFilterReady ? formatDate(dateRange?.to) : undefined,
      }),
    staleTime: 30_000,
  });

  const products = data?.data ?? [];
  const total = data?.meta?.pagination?.total_count ?? 0;

  return (
    <div className="flex flex-col gap-6 px-3 py-4 sm:px-6 sm:py-6">
      {/* ── Header ── */}
      <div>
        <h1 className="font-bold text-xl sm:text-2xl">{t.page_title ?? "Explore Products"}</h1>
        <p className="text-muted-foreground text-sm">{t.page_description ?? "Browse products listed by FPOs"}</p>
      </div>

      {/* ── Search + Filter bar ── */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t.search_placeholder ?? "Search products…"}
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
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder={t.filter_commodity ?? "All commodities"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.filter_all ?? "All commodities"}</SelectItem>
            {commodities.map((c) => (
              <SelectItem key={c.id} value={c.code}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start font-normal sm:w-[260px]">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFilterReady
                ? `${formatDate(dateRange?.from)} – ${formatDate(dateRange?.to)}`
                : (t.date_filter_placeholder ?? "From date – Until date")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={(range) => {
                setDateRange(range);
                if (range?.from && range?.to) resetPage();
              }}
              numberOfMonths={2}
            />
            {dateRange && (
              <div className="flex justify-end border-t p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDateRange(undefined);
                    resetPage();
                  }}
                >
                  {t.date_filter_clear ?? "Clear"}
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* ── Product grid ── */}
      {translationsLoading || isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <Package className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">{t.empty_state ?? "No products found."}</p>
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
              resetPage();
            }}
          />
        </>
      )}
    </div>
  );
}