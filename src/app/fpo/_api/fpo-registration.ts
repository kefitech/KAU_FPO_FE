import { api, publicApi } from "@/lib/api/client";
import type {
  FpoApplicationStatus,
  FpoDocument,
  FpoDocumentList,
  FpoDocumentType,
  FpoEligibilityPayload,
  FpoEligibilityResponse,
  FpoFieldValidation,
  FpoProfile,
  FpoRegisterPayload,
  FpoStep1Payload,
  FpoStep2Payload,
  FpoStep3Payload,
  FpoStep4Payload,
} from "@/types/fpo";

const BASE = "/fpo/";

type Wrapped<T> = { status: string; message: string; data: T };
const unwrap = <T>(r: { data: Wrapped<T> }) => r.data.data;

export const fpoRegistrationApi = {
  // Public endpoints — no session cookie sent to avoid 401 on AllowAny views
  checkEligibility: (payload: FpoEligibilityPayload) =>
    publicApi.post<Wrapped<FpoEligibilityResponse>>(`${BASE}eligibility-check/`, payload).then(unwrap),

  sendPreRegisterOtp: (phone: string) =>
    publicApi.post<Wrapped<{ phone: string }>>(`${BASE}pre-register/send-otp/`, { phone }).then(unwrap),

  verifyPreRegisterOtp: (phone: string, otp: string) =>
    publicApi.post<Wrapped<{ phone_token: string }>>(`${BASE}pre-register/verify-otp/`, { phone, otp }).then(unwrap),

  register: (payload: FpoRegisterPayload) =>
    api.post<Wrapped<FpoProfile>>(`${BASE}register/`, payload).then(unwrap),

  getProfile: () => api.get<Wrapped<FpoProfile>>(`${BASE}me/`).then(unwrap),

  updateStep: (payload: FpoStep1Payload | FpoStep2Payload | FpoStep3Payload | FpoStep4Payload) =>
    api.patch<Wrapped<FpoProfile>>(`${BASE}me/`, payload).then(unwrap),

  getStatus: () => api.get<Wrapped<FpoApplicationStatus>>(`${BASE}me/status/`).then(unwrap),

  submit: () => api.post<Wrapped<unknown>>(`${BASE}me/submit/`).then(unwrap),

  validateField: (field: string, value: string) =>
    api.post<Wrapped<FpoFieldValidation>>(`${BASE}validate-field/`, { field, value }).then(unwrap),

  getDocuments: () => api.get<Wrapped<FpoDocumentList>>(`${BASE}me/documents/`).then(unwrap),

  uploadDocument: (documentType: FpoDocumentType, file: File) => {
    const formData = new FormData();
    formData.append("document_type", documentType);
    formData.append("file", file);
    return api
      .post<Wrapped<FpoDocument>>(`${BASE}me/documents/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then(unwrap);
  },

  deleteDocument: (docId: string) => api.delete(`${BASE}me/documents/${docId}/`),

  sendEmailOtp: () => api.post(`${BASE}email-verify/send/`),

  confirmEmailOtp: (otp: string) => api.post(`${BASE}email-verify/confirm/`, { otp }),

  sendPhoneOtp: () => api.post(`${BASE}phone-verify/send/`),

  confirmPhoneOtp: (otp: string) => api.post(`${BASE}phone-verify/confirm/`, { otp }),
};
