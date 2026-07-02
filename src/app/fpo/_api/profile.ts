import { apiClient } from "@/lib/api/client";

interface FpoProfile {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  preferred_language: string;
}

interface FpoProfileResponse {
  status: string;
  message: string;
  data: FpoProfile;
}

export const fpoProfileApi = {
  get: async (): Promise<FpoProfile> => {
    const res = await apiClient.get<FpoProfileResponse>("/fpo/me/profile/");
    return res.data.data;
  },

  update: async (payload: Partial<Omit<FpoProfile, "id" | "email">>): Promise<FpoProfile> => {
    const res = await apiClient.patch<FpoProfileResponse>("/fpo/me/profile/", payload);
    return res.data.data;
  },
};
