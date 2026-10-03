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

/**
 * Product-master CRUD only (name, commodity, description, image). Stock
 * batches live on productStocksApi — a Product can now have many batches
 * live at once (apps/marketplace/api/stocks.py).
 *
 * On create, the backend still accepts flat first-batch fields
 * (quantity/unit/price_per_unit/available_from/...) and seeds the initial
 * stock row. On PATCH those flat fields are silently ignored — batch
 * edits must go through productStocksApi.update().
 */
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

  /**
   * Downloads the bulk-import Excel template. Returns a Blob so the caller
   * can hand it to a download link / FileSaver without touching the raw
   * axios response headers.
   */
  getBulkTemplate: (): Promise<Blob> =>
    api
      .get(`${BASE}bulk-template/`, { responseType: "blob" })
      .then((r) => r.data as Blob),

  /**
   * Uploads a filled bulk-import .xlsx / .csv. The backend creates one
   * Product + ACTIVE ProductStock per valid row and returns per-row
   * success / failure info (see `BulkImportResult` below).
   */
  bulkImport: (file: File): Promise<BulkImportResult> => {
    const form = new FormData();
    form.append("file", file);
    return api
      .post(`${BASE}bulk-import/`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => {
        const d = r.data as Record<string, unknown>;
        return (d.data ?? d) as BulkImportResult;
      });
  },
};

export interface BulkImportRowSuccess {
  row: number;
  product_id: number;
  name: string;
}

export interface BulkImportRowError {
  row: number;
  name_en: string;
  reason: string;
}

export interface BulkImportResult {
  success: number;
  failed: number;
  results: BulkImportRowSuccess[];
  errors: BulkImportRowError[];
}
