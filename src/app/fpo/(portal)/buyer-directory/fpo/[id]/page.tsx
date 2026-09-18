"use client";

import { useParams } from "next/navigation";

import { FpoProductCatalog } from "@/components/shared/fpo-product-catalog";
import { useLocaleStore } from "@/stores/locale-store";

export default function FpoBuyerDirectoryByFpoPage() {
  const { id } = useParams<{ id: string }>();
  const locale = useLocaleStore((s) => s.locale);

  return (
    <div className="flex flex-col gap-6 px-3 py-4 sm:px-6 sm:py-6">
      <FpoProductCatalog fpoId={Number(id)} locale={locale} backHref="/fpo/buyer-directory" />
    </div>
  );
}