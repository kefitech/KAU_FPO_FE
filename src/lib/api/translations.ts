import { apiClient } from "./client";

export type TranslationScreen = Record<string, string>;
export type TranslationsData = Record<string, TranslationScreen>;

interface TranslationsResponse {
  status: string;
  data: TranslationsData;
}

export const translationsApi = {
  getPublic: async (lang = "en", screen?: string): Promise<TranslationsData> => {
    const params: Record<string, string> = { lang };
    if (screen) params.screen = screen;
    const response = await apiClient.get<TranslationsResponse>("/translations/public/", { params });
    return response.data.data;
  },
};
