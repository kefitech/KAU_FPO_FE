"use client";

import { Badge } from "@/components/ui/badge";
import type { Product, ProductStatus } from "@/types/fpo";

type T = Record<string, string>;

function statusClasses(status: ProductStatus): string {
  switch (status) {
    case "draft":
      return "border-slate-200 bg-slate-50 text-slate-700";
    case "active":
      return "border-green-200 bg-green-50 text-green-700";
    case "sold":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "expired":
      return "border-red-200 bg-red-50 text-red-700";
  }
}

// Defensive: a few legacy rows have `name` as a plain string instead of
// the {en, ml} shape every other product uses (confirmed live via API
// testing — ids 1 and 3 in FPO 4's data). Guard both shapes.
function getProductName(product: Product): string {
  const name = product.name as unknown;
  if (typeof name === "string") return name;
  if (name && typeof name === "object" && "en" in name) {
    return (name as { en: string }).en;
  }
  return "—";
}

export function ProductList({ products, t }: { products: Product[]; t: T }) {
  if (products.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">{t.no_products ?? "This FPO has no products listed yet."}</p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {products.map((product) => (
        <div key={product.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="font-medium text-sm truncate">{getProductName(product)}</span>
            <span className="text-xs text-muted-foreground">
              {product.quantity} {product.unit} · ₹{product.price_per_unit}
            </span>
          </div>
          <Badge variant="outline" className={statusClasses(product.status)}>
            {product.status}
          </Badge>
        </div>
      ))}
    </div>
  );
}
