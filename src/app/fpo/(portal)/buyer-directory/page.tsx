"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Calendar as CalendarIcon, CheckCircle2, Clock, Package, Search, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

import { type BuyerProduct, buyerProductsApi } from "@/app/buyer/_api/products";
import { buyerDirectoryApi } from "@/app/fpo/_api/buyer-directory";
import { masterDataApi } from "@/app/fpo/_api/master-data";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
//arunima 17 sep
import { InquiryDialog } from "@/components/ui/inquiry-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const imageUrl = toMediaUrl(product.image);

  return (
    <>
      <Card className="flex h-full flex-col overflow-hidden">
        {imageUrl ? (
          // biome-ignore lint/performance/noImgElement: product photo URL is dynamic, not a static asset
          <img src={imageUrl} alt={name} className="h-40 w-full shrink-0 object-cover" />
        ) : (
          <div className="flex h-40 w-full shrink-0 items-center justify-center bg-muted text-muted-foreground text-xs">
            <Package className="h-8 w-8" />
          </div>
        )}
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-1 text-base">{name}</CardTitle>
            <Badge variant="outline" className="shrink-0 font-normal">
              {product.commodity_code}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-3">
          {description && (
            <div className="flex flex-col gap-1">
              <p className={descExpanded ? "text-muted-foreground text-sm" : "line-clamp-2 text-muted-foreground text-sm"}>
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
            <Badge variant="secondary" className="w-fit max-w-full truncate font-normal">
              {product.quality_certification}
            </Badge>
          )}
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
          <Building2 className="h-3.5 w-3.5" />
          {product.fpo_name}
        </div>
        <Link
          href={`/fpo/buyer-directory/fpo/${product.fpo}`}
          className="text-primary text-xs hover:underline"
        >
          {t.view_all_products ?? "View all products from this FPO"}
        </Link>
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <CalendarIcon className="h-3.5 w-3.5" />
            {product.available_from}
            {product.available_until ? ` – ${product.available_until}` : ""}
          </div>
          <Button size="sm" className="mt-auto" onClick={() => setInquiryOpen(true)}>
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

function ProductCatalogSection({ locale, t }: { locale: string; t: T }) {
  const [search, setSearch] = useState("");
  const [commodity, setCommodity] = useState("");
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [untilDate, setUntilDate] = useState<Date | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data: commodities = [] } = useQuery({
    queryKey: ["master-data", "commodity", locale],
    queryFn: () => masterDataApi.getCommodities(locale),
    staleTime: 10 * 60_000,
  });

  // Date range filter requires BOTH dates before it's applied — picking
  // only one is treated as "no filter yet."
  const dateFilterReady = !!fromDate && !!untilDate;

  const { data, isLoading } = useQuery({
    queryKey: [
      "buyer-products",
      locale,
      search,
      commodity,
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
        commodity: commodity !== "all" ? commodity : undefined,
        date_from: dateFilterReady ? formatDate(fromDate) : undefined,
        date_until: dateFilterReady ? formatDate(untilDate) : undefined,
      }),
    staleTime: 30_000,
  });

  const products = data?.data ?? [];
  const total = data?.meta?.pagination?.total_count ?? 0;

  // Reset to page 1 whenever any filter changes.
  const resetPage = () => setPage(1);

  return (
    <div className="flex w-full flex-col gap-4">
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
          value={commodity || "all"}
          onValueChange={(v) => {
            setCommodity(v === "all" ? "" : v);
            resetPage();
          }}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder={t.commodity_filter_placeholder ?? "All commodities"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.commodity_filter_all ?? "All commodities"}</SelectItem>
            {commodities.map((c) => (
              <SelectItem key={c.id} value={c.code}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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
                <Button variant="ghost" size="sm" onClick={() => { setFromDate(undefined); resetPage(); }}>
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
                <Button variant="ghost" size="sm" onClick={() => { setUntilDate(undefined); resetPage(); }}>
                  {t.date_filter_clear ?? "Clear"}
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
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

function formatDate(date: Date | undefined): string {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function BuyerDirectoryPage() {
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const queryClient = useQueryClient();

  useEffect(() => {
    translationsApi.getPublic(locale, "fpo_buyer_directory,common").then((data) => {
      setT(data.fpo_buyer_directory ?? {});
    });
  }, [locale]);

  const {
    data: buyerStatus,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["buyer-directory-my-status"],
    queryFn: () => buyerDirectoryApi.getMyStatus(),
  });

  const registerMutation = useMutation({
    mutationFn: () => buyerDirectoryApi.register(),
    onSuccess: () => {
      toast.success(t.toast_registered ?? "Registration request sent successfully.");
      queryClient.invalidateQueries({ queryKey: ["buyer-directory-my-status"] });
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { message?: string } } } | undefined;
      toast.error(
        axiosErr?.response?.data?.message ?? t.toast_register_failed ?? "Failed to register. Please try again.",
      );
    },
  });

  if (isLoading) {
    return (
      <div className="flex animate-pulse flex-col items-center gap-6 px-3 py-4 sm:px-6 sm:py-6">
        <div className="h-40 w-full max-w-xl rounded-xl bg-muted" />
      </div>
    );
  }

  // Verified buyers get the full-width product catalog, not the
  // narrow centered card used for the not-registered/pending states.
  if (buyerStatus?.registered && buyerStatus.status === "verified") {
    return (
      <div className="flex flex-col gap-6 px-3 py-4 sm:px-6 sm:py-6">
        <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-green-600" />
          <div>
            <h2 className="font-semibold text-base">{t.verified_title ?? "Approved!"}</h2>
            <p className="text-muted-foreground text-sm">
              {t.verified_desc ?? "Your FPO is approved as a buyer. Browse products from other FPOs below."}
            </p>
          </div>
        </div>
        <ProductCatalogSection locale={locale} t={t} />
      </div>
    );
  }

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-6 px-3 py-4 sm:px-6 sm:py-6">
      <div className="w-full max-w-xl rounded-xl border bg-card p-6 shadow-sm">
        {!buyerStatus?.registered && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <ShoppingCart className="h-10 w-10 text-muted-foreground" />
            <div>
              <h2 className="font-semibold text-lg">{t.not_registered_title ?? "Register as a Buyer"}</h2>
              <p className="mt-1 text-muted-foreground text-sm">
                {t.not_registered_desc ??
                  "Register your FPO as a buyer to purchase products listed by other FPOs on the marketplace."}
              </p>
            </div>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => registerMutation.mutate()}
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending
                ? (t.btn_registering ?? "Registering…")
                : (t.btn_register ?? "Register as a Buyer")}
            </Button>
          </div>
        )}

        {buyerStatus?.registered && buyerStatus.status === "pending" && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <Clock className="h-10 w-10 text-amber-500" />
            <div>
              <h2 className="font-semibold text-lg">{t.pending_title ?? "Request Pending"}</h2>
              <p className="mt-1 text-muted-foreground text-sm">
                {t.pending_desc ?? "Your request is pending approval. KAU Admin will review it shortly."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}