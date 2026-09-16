import { api } from "@/lib/api/client";
import type { CreateProductPayload, Product, UpdateProductPayload } from "@/types/fpo";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

const BASE = "/marketplace/products/";

/**
 * Converts a product payload to FormData if it includes an image file,
 * otherwise returns the plain object for a normal JSON request.
 * Nested objects (name, description) get JSON-stringified — the backend's
 * JSONField accepts this form correctly from multipart uploads.
 */
function toProductFormData(
  payload: CreateProductPayload | UpdateProductPayload,
): CreateProductPayload | UpdateProductPayload | FormData {
  if (!payload.image) return payload;

  const form = new FormData();
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue;
    if (key === "image") {
      form.append("image", value as File);
    } else if (typeof value === "object") {
      form.append(key, JSON.stringify(value));
    } else {
      form.append(key, String(value));
    }
  }
  return form;
}

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

  create: (payload: CreateProductPayload): Promise<Product> => {
    const body = toProductFormData(payload);
    return api
      .post(BASE, body, body instanceof FormData ? { headers: { "Content-Type": "multipart/form-data" } } : undefined)
      .then((r) => {
        const d = r.data as Record<string, unknown>;
        return (d.data ?? d) as Product;
      });
  },

  update: (id: number, payload: UpdateProductPayload): Promise<Product> => {
    const body = toProductFormData(payload);
    return api
      .patch(
        `${BASE}${id}/`,
        body,
        body instanceof FormData ? { headers: { "Content-Type": "multipart/form-data" } } : undefined,
      )
      .then((r) => {
        const d = r.data as Record<string, unknown>;
        return (d.data ?? d) as Product;
      });
  },

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
