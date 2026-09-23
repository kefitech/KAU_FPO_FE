import { apiClient } from "@/lib/api/client";

interface BuyerAccountProfile {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  preferred_language: string;
}

interface BuyerAccountProfileResponse {
  status: string;
  message: string;
  data: BuyerAccountProfile;
}

export const buyerAccountProfileApi = {
  get: async (): Promise<BuyerAccountProfile> => {
    const res = await apiClient.get<BuyerAccountProfileResponse>("/marketplace/buyer/me/profile/");
    return res.data.data;
  },

  update: async (
    payload: Partial<Omit<BuyerAccountProfile, "id" | "email">>,
  ): Promise<BuyerAccountProfile> => {
    const res = await apiClient.patch<BuyerAccountProfileResponse>("/marketplace/buyer/me/profile/", payload);
    return res.data.data;
  },

  // Reuses the FPO pre-registration phone-OTP endpoints — they're generic
  // (AllowAny, no FPO-model dependency, just phone + OTP + UserProfile
  // uniqueness check), so they work fine for verifying a buyer's new phone
  // number too.
  sendPhoneOtp: async (phone: string): Promise<{ phone: string }> => {
    const res = await apiClient.post("/fpo/pre-register/send-otp/", { phone });
    return res.data.data ?? res.data;
  },

  verifyPhoneOtp: async (phone: string, otp: string): Promise<{ phone_token: string }> => {
    const res = await apiClient.post("/fpo/pre-register/verify-otp/", { phone, otp });
    return res.data.data ?? res.data;
  },
};