import type { LoginCredentials, LoginResponse, MeResponse } from "@/types";

import { api, publicApi } from "./client";

export interface RegisterPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
  confirm_password: string;
  eligibility_token: string;
  phone_token: string;
}

export const authApi = {
  register: (payload: RegisterPayload) =>
    publicApi.post<{ status: string; data: import("@/types").User }>("/auth/register/", payload).then((r) => r.data.data),

  login: (credentials: LoginCredentials) =>
    api.post<{ status: string; data: LoginResponse }>("/auth/login/", credentials).then((r) => r.data.data),

  logout: () => api.post("/auth/logout/"),

  me: () => api.get<{ status: string; data: MeResponse }>("/auth/me/").then((r) => r.data.data),

  forgotPassword: (payload: { email?: string; phone?: string }) =>
    api.post<{ status: string; message: string; data: null }>("/auth/password/forgot/", payload).then((r) => r.data),

  verifyOtp: (payload: { phone: string; otp: string }) =>
    api
      .post<{ status: string; message: string; data: { reset_token: string } }>("/auth/password/verify-otp/", payload)
      .then((r) => r.data.data),

  resetPassword: (payload: { token: string; new_password: string; confirm_password: string }) =>
    api.post<{ status: string; message: string; data: null }>("/auth/password/reset/", payload).then((r) => r.data),

  changePassword: (payload: { partial_token: string; new_password: string; confirm_password: string }) =>
    api
      .post<{ status: string; message: string; data: { user: import("@/types").User } }>(
        "/auth/password/change/",
        payload,
      )
      .then((r) => r.data.data),

  updateProfile: (payload: { first_name?: string; last_name?: string; phone?: string; preferred_language?: string }) =>
    api
      .patch<{ status: string; message: string; data: import("@/types").User }>("/auth/me/profile/", payload)
      .then((r) => r.data.data),

  changeCurrentPassword: (payload: { current_password: string; new_password: string; confirm_password: string }) =>
    api.post<{ status: string; message: string }>("/auth/password/change-current/", payload).then((r) => r.data),
};
