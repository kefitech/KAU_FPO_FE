import { publicApiClient } from "./client";

/**
 * One card per **stock batch** — matches PublicProductListView on the
 * backend (apps/marketplace/api/public.py). A product with two live
 * batches appears as two cards with different quantities and prices.
 *
 * `id` is the ProductStock id (pass to inquire()). `product_id` is the
 * parent Product id — kept for "view all batches of this product" nav.
 */
export interface MarketHubProduct {
  id: number; // ProductStock id
  product_id: number;
  name: { en: string; ml: string };
  description: { en: string; ml: string };
  commodity_code: string;
  commodity_name: string;
  quantity: number;
  unit: string;
  price_per_unit: number;
  quality_certification: string;
  available_from: string;
  available_until: string | null;
  image: string | null;
  /** Direct seller phone for this batch (blank = no direct line published). */
  contact_phone: string;
  /** KAU #3 — true when the batch's validity ended within the past 3
   *  days but it's still shown with the grace_message banner. */
  in_grace_period: boolean;
  grace_message: string | null;
}

export interface MarketHubCommodity {
  commodity_code: string;
  latest_price: {
    date: string;
    min_price: number;
    max_price: number;
    modal_price: number;
    market_name: string;
    source: string;
  } | null;
}

export interface MarketHubOpportunity {
  commodity_code: string;
  interested_buyer_count: number;
  latest_price: {
    date: string;
    modal_price: number;
    market_name: string;
    source: string;
  } | null;
}

export interface MarketHubPagination {
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface MarketHubProductListResponse {
  status: string;
  message: string;
  data: MarketHubProduct[];
  meta: { pagination: MarketHubPagination };
}

export interface MarketHubDetailResponse<T> {
  status: string;
  message: string;
  data: T;
}

export interface InquiryPayload {
  name: string;
  email: string;
  phone?: string;
  message?: string;
}

export const marketHubApi = {
  getCommodities: async (): Promise<MarketHubDetailResponse<MarketHubCommodity[]>> => {
    const response =
      await publicApiClient.get<MarketHubDetailResponse<MarketHubCommodity[]>>("/public/market/commodities/");
    return response.data;
  },

  getOpportunities: async (): Promise<MarketHubDetailResponse<MarketHubOpportunity[]>> => {
    const response = await publicApiClient.get<MarketHubDetailResponse<MarketHubOpportunity[]>>(
      "/public/market/opportunities/",
    );
    return response.data;
  },

  getProducts: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    commodity?: string;
  }): Promise<MarketHubProductListResponse> => {
    const response = await publicApiClient.get<MarketHubProductListResponse>("/public/market/products/", {
      params,
    });
    return response.data;
  },

  /**
   * `stockId` is the id surfaced by getProducts() (a ProductStock id).
   * Returns the detail for that specific batch.
   */
  getProductById: async (stockId: number): Promise<MarketHubDetailResponse<MarketHubProduct>> => {
    const response = await publicApiClient.get<MarketHubDetailResponse<MarketHubProduct>>(
      `/public/market/products/${stockId}/`,
    );
    return response.data;
  },

  /**
   * `stockId` is the id on MarketHubProduct (a ProductStock id). The
   * inquiry locks onto the specific batch the visitor saw.
   */
  inquire: async (
    stockId: number,
    payload: InquiryPayload,
  ): Promise<MarketHubDetailResponse<{ inquiry_id: number }>> => {
    const response = await publicApiClient.post<MarketHubDetailResponse<{ inquiry_id: number }>>(
      `/public/market/products/${stockId}/inquire/`,
      payload,
    );
    return response.data;
  },
};
