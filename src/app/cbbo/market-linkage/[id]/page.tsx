"use client";

import { useParams } from "next/navigation";

import { cbboMarketLinkageApi } from "@/app/cbbo/_api/market-linkage";
import { FpoProductCatalog } from "@/components/shared/fpo-product-catalog";
import { useLocaleStore } from "@/stores/locale-store";

export default function CbboMarketLinkageFpoProductsPage() {
  const { id } = useParams<{ id: string }>();
  const locale = useLocaleStore((s) => s.locale);
  const fpoId = Number(id);

  return (
    <div className="flex flex-col gap-6 p-6">
      <FpoProductCatalog
        fpoId={fpoId}
        locale={locale}
        backHref="/cbbo/market-linkage"
        fetchProducts={(params) => cbboMarketLinkageApi.getProductsByFPO(fpoId, params)}
        queryKey="cbbo-market-linkage-products"
        showInquire={false}
      />
    </div>
  );
}
