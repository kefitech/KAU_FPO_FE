import { publicApiClient } from "./client";

export interface Faq {
  id: number;
  question: string;
  answer: string;
  category: string;
  order: number;
}

export interface FaqPagination {
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface FaqResponse {
  status: string;
  message: string;
  data: Faq[];
  meta: { pagination: FaqPagination };
}

export const faqApi = {
  getAll: async (params?: {
    page?: number;
    page_size?: number;
    category?: string;
  }): Promise<FaqResponse> => {
    const response = await publicApiClient.get<FaqResponse>("/public/faqs/", { params });
    return response.data;
  },
};
