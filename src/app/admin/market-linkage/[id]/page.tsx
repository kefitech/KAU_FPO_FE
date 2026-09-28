"use client";

import { useParams } from "next/navigation";

import { marketLinkageApi } from "@/app/admin/_api/market-linkage";
import { FpoProductCatalog } from "@/components/shared/fpo-product-catalog";
import { useLocaleStore } from "@/stores/locale-store";

export default function MarketLinkageFpoProductsPage() {
  const { id } = useParams<{ id: string }>();
  const locale = useLocaleStore((s) => s.locale);
  const fpoId = Number(id);

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      <FpoProductCatalog
        fpoId={fpoId}
        locale={locale}
        backHref="/admin/market-linkage"
        fetchProducts={(params) => marketLinkageApi.getProductsByFPO(fpoId, params)}
        queryKey="market-linkage-products"
        showInquire={false}
      />
    </div>
  );
}
