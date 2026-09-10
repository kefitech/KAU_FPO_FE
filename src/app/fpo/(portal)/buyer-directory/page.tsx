"use client";

import { useEffect, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Calendar, CheckCircle2, Clock, Package, Search, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

import { type BuyerProduct, buyerProductsApi } from "@/app/buyer/_api/products";
import { buyerDirectoryApi } from "@/app/fpo/_api/buyer-directory";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

type T = Record<string, string>;

function ProductCard({ product, locale }: { product: BuyerProduct; locale: string }) {
  const name = locale === "ml" ? product.name.ml || product.name.en : product.name.en;
  const description = locale === "ml" ? product.description.ml || product.description.en : product.description.en;

  return (
    <Card>
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
          <Calendar className="h-3.5 w-3.5" />
          {product.available_from}
          {product.available_until ? ` – ${product.available_until}` : ""}
        </div>
      </CardContent>
    </Card>
  );
}

function ProductCatalogSection({ locale, t }: { locale: string; t: T }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["buyer-products", locale, search, page],
    queryFn: () =>
      buyerProductsApi.getAll({
        page,
        page_size: 20,
        search: search || undefined,
      }),
    staleTime: 30_000,
  });

  const products = data?.data ?? [];

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="relative">
        <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t.search_placeholder ?? "Search products…"}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="pl-9"
        />
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
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
      <div className="flex flex-col items-center gap-6 px-3 sm:px-6 py-4 sm:py-6 animate-pulse">
        <div className="w-full max-w-xl h-40 rounded-xl bg-muted" />
      </div>
    );
  }

  // Verified buyers get the full-width product catalog, not the
  // narrow centered card used for the not-registered/pending states.
  if (buyerStatus?.registered && buyerStatus.status === "verified") {
    return (
      <div className="flex flex-col gap-6 px-3 sm:px-6 py-4 sm:py-6">
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
    <div className="flex flex-col items-center justify-center gap-6 px-3 sm:px-6 py-4 sm:py-6 min-h-[80vh]">
      <div className="w-full max-w-xl rounded-xl border bg-card p-6 shadow-sm">
        {!buyerStatus?.registered && (
          <div className="flex flex-col items-center text-center gap-4 py-8">
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
          <div className="flex flex-col items-center text-center gap-4 py-8">
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
