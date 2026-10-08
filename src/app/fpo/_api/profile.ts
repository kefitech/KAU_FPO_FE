import { apiClient } from "@/lib/api/client";

// Phone-OTP calls used by the shared My Profile form (components/profile) in
// every portal. Profile reads/writes themselves go through /auth/me/.
export const fpoProfileApi = {
  sendPhoneOtp: async (phone: string): Promise<{ phone: string }> => {
    const res = await apiClient.post("/fpo/pre-register/send-otp/", { phone });
    return res.data.data ?? res.data;
  },

  verifyPhoneOtp: async (phone: string, otp: string): Promise<{ phone_token: string }> => {
    const res = await apiClient.post("/fpo/pre-register/verify-otp/", { phone, otp });
    return res.data.data ?? res.data;
  },
};
