import { api } from "@/lib/api/client";
import type { CreateProductPayload, Product, UpdateProductPayload } from "@/types/fpo";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

const BASE = "/marketplace/products/";

export const productsApi = {
  // DataTable's queryFn contract: takes DataTableParams, returns the raw
  // PaginatedResponse — no manual unwrapping here, DataTable reads
  // response.data / response.meta.pagination itself.
  getAll: (params: DataTableParams): Promise<PaginatedResponse<Product>> =>
    api.get(BASE, { params }).then((r) => r.data as PaginatedResponse<Product>),

  getById: (id: number): Promise<Product> =>
    api.get(`${BASE}${id}/`).then((r) => {
      const d = r.data as Record<string, unknown>;
      return (d.data ?? d) as Product;
    }),

  create: (payload: CreateProductPayload): Promise<Product> =>
    api.post(BASE, payload).then((r) => {
      const d = r.data as Record<string, unknown>;
      return (d.data ?? d) as Product;
    }),

  update: (id: number, payload: UpdateProductPayload): Promise<Product> =>
    api.patch(`${BASE}${id}/`, payload).then((r) => {
      const d = r.data as Record<string, unknown>;
      return (d.data ?? d) as Product;
    }),

  delete: (id: number): Promise<void> => api.delete(`${BASE}${id}/`).then(() => undefined),

  publish: (id: number): Promise<Product> =>
    api.post(`${BASE}${id}/publish/`).then((r) => {
      const d = r.data as Record<string, unknown>;
      return (d.data ?? d) as Product;
    }),

  markSold: (id: number): Promise<Product> =>
    api.post(`${BASE}${id}/mark-sold/`).then((r) => {
      const d = r.data as Record<string, unknown>;
      return (d.data ?? d) as Product;
    }),
};
