/**
 * Market Linkage & Product Types
 * Based on SRS Sections 3.2.5, 3.2.6, 3.2.7
 */

export type ProductStatus = "draft" | "pending" | "active" | "sold" | "expired" | "rejected";

export type QualityCertification =
  | "organic"
  | "gap"
  | "fssai"
  | "agmark"
  | "iso"
  | "haccp"
  | "india_organic"
  | "npop"
  | "other";

export interface ProductListing {
  id: string;
  fpoId: string;
  fpoName: string;
  productName: string;
  productNameMl?: string;
  category: string;
  categoryMl?: string;
  description?: string;
  descriptionMl?: string;
  pricing: {
    amount: number;
    unit: string; // e.g., "per kg", "per quintal"
    currency: string;
    negotiable: boolean;
  };
  quantity: {
    available: number;
    unit: string;
    minOrder?: number;
  };
  location: {
    district: string;
    address?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  qualityCertifications: QualityCertification[];
  images?: string[];
  harvestDate?: string;
  expiryDate?: string;
  status: ProductStatus;
  ondcListed: boolean;
  farmerConnectListed: boolean;
  views: number;
  inquiries: number;
  createdAt: string;
  updatedAt: string;
}

export type BuyerType = "retailer" | "wholesaler" | "processor" | "exporter" | "institution" | "individual";

export interface BuyerRequirement {
  id: string;
  buyerId: string;
  buyerName: string;
  buyerType: BuyerType;
  productCategory: string;
  productName?: string;
  quantity: {
    required: number;
    unit: string;
  };
  priceRange?: {
    min: number;
    max: number;
    currency: string;
  };
  qualityRequirements?: QualityCertification[];
  deliveryLocation: string;
  deliveryDistrict: string;
  deliveryDeadline?: string;
  description?: string;
  status: "active" | "fulfilled" | "expired" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

export type MatchStatus = "suggested" | "viewed" | "accepted" | "rejected" | "completed" | "expired";

export interface BuyerSellerMatch {
  id: string;
  productId: string;
  requirementId?: string;
  sellerId: string; // FPO ID
  sellerName: string;
  buyerId: string;
  buyerName: string;
  buyerType: BuyerType;
  productName: string;
  matchScore: number; // AI confidence score 0-100
  matchReasons: string[]; // Why this match was suggested
  quantity: {
    requested: number;
    available: number;
    unit: string;
  };
  pricing: {
    sellerPrice: number;
    buyerMaxPrice?: number;
    unit: string;
    currency: string;
  };
  location: {
    sellerDistrict: string;
    buyerDistrict: string;
    distance?: number; // km
  };
  status: MatchStatus;
  sellerResponse?: "accepted" | "rejected" | "pending";
  buyerResponse?: "accepted" | "rejected" | "pending";
  createdAt: string;
  respondedAt?: string;
  completedAt?: string;
}

export interface MarketOpportunity {
  id: string;
  title: string;
  titleMl?: string;
  description: string;
  descriptionMl?: string;
  type: "tender" | "contract" | "spot" | "forward";
  category: string;
  buyerName: string;
  buyerType: BuyerType;
  quantity: string;
  priceRange?: string;
  location: string;
  deadline?: string;
  requirements?: string[];
  status: "active" | "closed" | "expired";
  createdAt: string;
}

export interface MarketingStrategy {
  id: string;
  fpoId: string;
  productId?: string;
  commodity: string;
  region: string;
  targetMarket: string;
  strategy: {
    summary: string;
    summaryMl?: string;
    recommendations: string[];
    recommendationsMl?: string[];
    pricingStrategy?: string;
    distributionChannels?: string[];
    promotionTips?: string[];
  };
  generatedAt: string;
}

export interface ProductSearchFilters {
  category?: string;
  district?: string;
  priceMin?: number;
  priceMax?: number;
  certifications?: QualityCertification[];
  status?: ProductStatus;
  search?: string;
}
