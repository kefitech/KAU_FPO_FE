import { api } from "@/lib/api/client";
import type { CreateStockPayload, ProductStock, UpdateStockPayload } from "@/types/fpo";

/**
 * Nested per-product stock-batch CRUD (apps/marketplace/api/stocks.py).
 * A Product can have multiple batches live at once; each goes through its
 * own lifecycle (draft → active → sold / expired).
 */
const stockUrl = (productId: number, stockId?: number) =>
  stockId == null
    ? `/marketplace/products/${productId}/stocks/`
    : `/marketplace/products/${productId}/stocks/${stockId}/`;

export const productStocksApi = {
  list: (productId: number): Promise<ProductStock[]> =>
    api.get(stockUrl(productId)).then((r) => {
      const d = r.data as Record<string, unknown>;
      // The viewset returns StandardResponse-wrapped output; unwrap.
      return (d.data ?? d) as ProductStock[];
    }),

  getById: (productId: number, stockId: number): Promise<ProductStock> =>
    api.get(stockUrl(productId, stockId)).then((r) => {
      const d = r.data as Record<string, unknown>;
      return (d.data ?? d) as ProductStock;
    }),

  create: (productId: number, payload: CreateStockPayload): Promise<ProductStock> =>
    api.post(stockUrl(productId), payload).then((r) => {
      const d = r.data as Record<string, unknown>;
      return (d.data ?? d) as ProductStock;
    }),

  update: (productId: number, stockId: number, payload: UpdateStockPayload): Promise<ProductStock> =>
    api.patch(stockUrl(productId, stockId), payload).then((r) => {
      const d = r.data as Record<string, unknown>;
      return (d.data ?? d) as ProductStock;
    }),

  delete: (productId: number, stockId: number): Promise<void> =>
    api.delete(stockUrl(productId, stockId)).then(() => undefined),

  publish: (productId: number, stockId: number): Promise<ProductStock> =>
    api.post(`${stockUrl(productId, stockId)}publish/`).then((r) => {
      const d = r.data as Record<string, unknown>;
      return (d.data ?? d) as ProductStock;
    }),

  markSold: (productId: number, stockId: number): Promise<ProductStock> =>
    api.post(`${stockUrl(productId, stockId)}mark-sold/`).then((r) => {
      const d = r.data as Record<string, unknown>;
      return (d.data ?? d) as ProductStock;
    }),
};
