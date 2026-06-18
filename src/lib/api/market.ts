import type { ApiResponse, PaginatedResponse } from "@/types";
import type {
  BuyerRequirement,
  BuyerSellerMatch,
  MarketingStrategy,
  MarketOpportunity,
  ProductListing,
  ProductSearchFilters,
} from "@/types/market";

import { apiClient } from "./client";

// ============ Products ============

/**
 * Get list of products with optional filters
 */
export async function getProducts(
  filters?: ProductSearchFilters,
  page = 1,
  pageSize = 20,
): Promise<PaginatedResponse<ProductListing>> {
  const params = new URLSearchParams();
  params.append("page", String(page));
  params.append("pageSize", String(pageSize));

  if (filters?.category) params.append("category", filters.category);
  if (filters?.district) params.append("district", filters.district);
  if (filters?.priceMin) params.append("priceMin", String(filters.priceMin));
  if (filters?.priceMax) params.append("priceMax", String(filters.priceMax));
  if (filters?.certifications) params.append("certifications", filters.certifications.join(","));
  if (filters?.status) params.append("status", filters.status);
  if (filters?.search) params.append("search", filters.search);

  const response = await apiClient.get<PaginatedResponse<ProductListing>>(`/v1/products?${params.toString()}`);
  return response.data;
}

/**
 * Get single product by ID
 */
export async function getProduct(id: string): Promise<ProductListing> {
  const response = await apiClient.get<ApiResponse<ProductListing>>(`/v1/products/${id}`);
  return response.data.data;
}

/**
 * Get my products (FPO only)
 */
export async function getMyProducts(page = 1, pageSize = 20): Promise<PaginatedResponse<ProductListing>> {
  const response = await apiClient.get<PaginatedResponse<ProductListing>>(
    `/v1/products/me?page=${page}&pageSize=${pageSize}`,
  );
  return response.data;
}

/**
 * Create new product listing (FPO only)
 */
export async function createProduct(
  data: Omit<ProductListing, "id" | "fpoId" | "fpoName" | "views" | "inquiries" | "createdAt" | "updatedAt">,
): Promise<ProductListing> {
  const response = await apiClient.post<ApiResponse<ProductListing>>("/v1/products", data);
  return response.data.data;
}

/**
 * Update product (FPO only)
 */
export async function updateProduct(id: string, data: Partial<ProductListing>): Promise<ProductListing> {
  const response = await apiClient.patch<ApiResponse<ProductListing>>(`/v1/products/${id}`, data);
  return response.data.data;
}

/**
 * Delete product (FPO only)
 */
export async function deleteProduct(id: string): Promise<void> {
  await apiClient.delete(`/v1/products/${id}`);
}

// ============ Buyer Requirements ============

/**
 * Get buyer requirements / market demands
 */
export async function getBuyerRequirements(page = 1, pageSize = 20): Promise<PaginatedResponse<BuyerRequirement>> {
  const response = await apiClient.get<PaginatedResponse<BuyerRequirement>>(
    `/v1/market/requirements?page=${page}&pageSize=${pageSize}`,
  );
  return response.data;
}

/**
 * Get single buyer requirement
 */
export async function getBuyerRequirement(id: string): Promise<BuyerRequirement> {
  const response = await apiClient.get<ApiResponse<BuyerRequirement>>(`/v1/market/requirements/${id}`);
  return response.data.data;
}

// ============ Matches ============

/**
 * Get my matches (FPO - as seller)
 */
export async function getMyMatches(page = 1, pageSize = 20): Promise<PaginatedResponse<BuyerSellerMatch>> {
  const response = await apiClient.get<PaginatedResponse<BuyerSellerMatch>>(
    `/v1/market/matches/me?page=${page}&pageSize=${pageSize}`,
  );
  return response.data;
}

/**
 * Get single match details
 */
export async function getMatch(id: string): Promise<BuyerSellerMatch> {
  const response = await apiClient.get<ApiResponse<BuyerSellerMatch>>(`/v1/market/matches/${id}`);
  return response.data.data;
}

/**
 * Respond to match (accept/reject)
 */
export async function respondToMatch(
  id: string,
  response: "accepted" | "rejected",
  notes?: string,
): Promise<BuyerSellerMatch> {
  const res = await apiClient.post<ApiResponse<BuyerSellerMatch>>(`/v1/market/matches/${id}/respond`, {
    response,
    notes,
  });
  return res.data.data;
}

// ============ Market Opportunities ============

/**
 * Get market opportunities
 */
export async function getMarketOpportunities(page = 1, pageSize = 20): Promise<PaginatedResponse<MarketOpportunity>> {
  const response = await apiClient.get<PaginatedResponse<MarketOpportunity>>(
    `/v1/market/opportunities?page=${page}&pageSize=${pageSize}`,
  );
  return response.data;
}

// ============ Marketing Strategies ============

/**
 * Generate marketing strategy (AI)
 */
export async function generateMarketingStrategy(data: {
  commodity: string;
  region: string;
  targetMarket: string;
  productId?: string;
}): Promise<MarketingStrategy> {
  const response = await apiClient.post<ApiResponse<MarketingStrategy>>("/v1/market/strategies/generate", data);
  return response.data.data;
}

/**
 * Get my marketing strategies
 */
export async function getMyMarketingStrategies(): Promise<MarketingStrategy[]> {
  const response = await apiClient.get<ApiResponse<MarketingStrategy[]>>("/v1/market/strategies/me");
  return response.data.data;
}
