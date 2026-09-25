"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { useQuery } from "@tanstack/react-query";
import { Building2, Calendar as CalendarIcon, Package, Search } from "lucide-react";
import { toast } from "sonner";

import { buyerDashboardApi } from "@/app/buyer/_api/dashboard";
import { type BuyerProduct, buyerProductsApi } from "@/app/buyer/_api/products";
import { masterDataApi } from "@/app/fpo/_api/master-data";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { InquiryDialog } from "@/components/ui/inquiry-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { translationsApi } from "@/lib/api/translations";
import { toMediaUrl } from "@/lib/utils/media-url";
import { useLocaleStore } from "@/stores/locale-store";

type T = Record<string, string>;

function ProductCard({ product, locale, t }: { product: BuyerProduct; locale: string; t: T }) {
  const name = locale === "ml" ? product.name.ml || product.name.en : product.name.en;
  const description = locale === "ml" ? product.description.ml || product.description.en : product.description.en;
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

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
              {product.commodity_name ?? product.commodity_code}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {description && (
            <div className="flex flex-col gap-1">
              <p
                className={
                  descExpanded ? "text-muted-foreground text-sm" : "line-clamp-2 text-muted-foreground text-sm"
                }
              >
                {description}
              </p>
              {description.length > 120 && (
                <button
                  type="button"
                  onClick={() => setDescExpanded((v) => !v)}
                  className="w-fit text-primary text-xs font-medium hover:underline"
                >
                  {descExpanded ? (t.read_less ?? "Read less") : (t.read_more ?? "Read more")}
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex flex-col gap-0.5">
              <span className="text-muted-foreground text-xs">{t.label_quantity ?? "Quantity"}</span>
              <span className="font-medium">
                {product.quantity} {product.unit}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-muted-foreground text-xs">{t.label_price ?? "Price"}</span>
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
          <Link href={`/buyer/products/fpo/${product.fpo}`} className="text-primary text-xs hover:underline">
            {t.view_all_products ?? "View all products from this FPO"}
          </Link>

          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <CalendarIcon className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">{t.label_available ?? "Available"}:</span>{" "}
            {formatAvailability(product.available_from, product.available_until)}
          </div>

          <Button size="sm" className="mt-1" onClick={() => setInquiryOpen(true)}>
            {t.btn_inquire ?? "Inquire"}
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
function formatDate(date: Date | undefined): string {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function formatAvailability(from: string, until?: string | null): string {
  if (!from) return "";
  const dateOpts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const fromDate = new Date(from);
  const fromWithYear = fromDate.toLocaleDateString("en-GB", { ...dateOpts, year: "numeric" });

  if (!until || until === from) {
    return fromWithYear;
  }

  const untilDate = new Date(until);
  const untilWithYear = untilDate.toLocaleDateString("en-GB", { ...dateOpts, year: "numeric" });

  if (fromDate.getFullYear() === untilDate.getFullYear()) {
    const fromShort = fromDate.toLocaleDateString("en-GB", dateOpts);
    return `${fromShort} – ${untilWithYear}`;
  }

  return `${fromWithYear} – ${untilWithYear}`;
}

export default function BuyerProductsPage() {
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const [translationsLoading, setTranslationsLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [selectedCommodities, setSelectedCommodities] = useState<string[]>([]);
  const [defaultApplied, setDefaultApplied] = useState(false);
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [untilDate, setUntilDate] = useState<Date | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const resetPage = () => setPage(1);

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
  const { data: buyerDashboard } = useQuery({
    queryKey: ["buyer-dashboard", locale],
    queryFn: buyerDashboardApi.get,
    staleTime: 60_000,
  });

  // Default the commodity filter to the buyer's interested commodities —
  // but only once, the first time buyerDashboard data arrives. After that,
  // whatever the buyer ticks/unticks themselves takes over completely.
  useEffect(() => {
    if (!defaultApplied && buyerDashboard) {
      if (buyerDashboard.commodities_interested?.length) {
        setSelectedCommodities(buyerDashboard.commodities_interested);
      }
      setDefaultApplied(true);
    }
  }, [buyerDashboard, defaultApplied]);

  // Date range filter requires BOTH dates before it's applied — picking
  // only one is treated as "no filter yet."
  const dateFilterReady = !!fromDate && !!untilDate;

  const { data, isLoading } = useQuery({
    queryKey: [
      "buyer-products",
      locale,
      search,
      selectedCommodities,
      dateFilterReady ? fromDate : null,
      dateFilterReady ? untilDate : null,
      page,
      pageSize,
    ],
    queryFn: () =>
      buyerProductsApi.getAll({
        page,
        page_size: pageSize,
        search: search || undefined,
        commodity: selectedCommodities.length > 0 ? selectedCommodities.join(",") : undefined,
        date_from: dateFilterReady ? formatDate(fromDate) : undefined,
        date_until: dateFilterReady ? formatDate(untilDate) : undefined,
      }),
    staleTime: 30_000,
    // Wait until we've decided the default commodity selection (from the
    // buyer's interests) before firing the first request, so we don't
    // briefly show "all products" and then jump to the filtered list.
    enabled: defaultApplied,
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-start font-normal sm:w-56">
              {selectedCommodities.length > 0
                ? `${selectedCommodities.length} ${t.commodities_selected_suffix ?? "commodities selected"}`
                : (t.filter_commodity ?? "All commodities")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-h-72 overflow-y-auto">
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setSelectedCommodities([]);
                resetPage();
              }}
            >
              {t.filter_all ?? "All commodities"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {commodities.map((c) => (
              <DropdownMenuCheckboxItem
                key={c.id}
                checked={selectedCommodities.includes(c.code)}
                onSelect={(e) => e.preventDefault()}
                onCheckedChange={(checked) => {
                  setSelectedCommodities((prev) => (checked ? [...prev, c.code] : prev.filter((v) => v !== c.code)));
                  resetPage();
                }}
              >
                {c.name}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start font-normal sm:w-[180px]">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {fromDate ? formatDate(fromDate) : (t.from_date_placeholder ?? "From date")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={fromDate}
              onSelect={(date) => {
                setFromDate(date);
                if (date && untilDate) resetPage();
              }}
            />
            {fromDate && (
              <div className="flex justify-end border-t p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFromDate(undefined);
                    resetPage();
                  }}
                >
                  {t.date_filter_clear ?? "Clear"}
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start font-normal sm:w-[180px]">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {untilDate ? formatDate(untilDate) : (t.until_date_placeholder ?? "To date")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={untilDate}
              onSelect={(date) => {
                if (date && fromDate && date < fromDate) {
                  toast.error("'To date' cannot be earlier than 'From date'.");
                  return;
                }
                setUntilDate(date);
                if (fromDate && date) resetPage();
              }}
              disabled={fromDate ? { before: fromDate } : undefined}
            />
            {untilDate && (
              <div className="flex justify-end border-t p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setUntilDate(undefined);
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
      {translationsLoading || !defaultApplied || isLoading ? (
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
              <ProductCard key={product.id} product={product} locale={locale} t={t} />
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
