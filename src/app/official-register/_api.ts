import { api } from "@/lib/api/client";

type Wrapped<T> = { status: string; message: string; data: T };

export interface GovtRegistrationPayload {
  email: string;
  first_name: string;
  last_name?: string;
  phone: string;
  designation: string;
  department: string;
  user_category: string;
  id_number: string;
  jurisdiction_type: "district" | "state";
  assigned_district?: string | null;
}

export interface CBBORegistrationPayload {
  email: string;
  first_name: string;
  last_name?: string;
  phone: string;
  designation?: string;
  organisation: number;
  level: "district" | "state";
  district_codes?: string[];
}

export interface PublicOrganisation {
  id: number;
  name: string;
  org_type: string;
  org_type_display: string;
}

export const officialRegisterApi = {
  registerGovernment: (payload: GovtRegistrationPayload) =>
    api.post<Wrapped<{ id: number; status: string }>>("/government/register/", payload).then((r) => r.data.data),
  registerCBBO: (payload: CBBORegistrationPayload) =>
    api.post<Wrapped<{ id: number; status: string }>>("/cbbo/register/", payload).then((r) => r.data.data),
  getOrganisations: () => api.get<Wrapped<PublicOrganisation[]>>("/cbbo/organisations/").then((r) => r.data.data),
  sendGovtOtp: (phone: string) =>
    api.post<Wrapped<null>>("/government/register/otp/send/", { phone }).then((r) => r.data),
  confirmGovtOtp: (phone: string, otp: string) =>
    api.post<Wrapped<null>>("/government/register/otp/confirm/", { phone, otp }).then((r) => r.data),
  sendCbboOtp: (phone: string) => api.post<Wrapped<null>>("/cbbo/register/otp/send/", { phone }).then((r) => r.data),
  sendGovtEmailOtp: (email: string) =>
    api.post<Wrapped<null>>("/government/register/otp/email/send/", { email }).then((r) => r.data),
  confirmGovtEmailOtp: (email: string, otp: string) =>
    api.post<Wrapped<null>>("/government/register/otp/email/confirm/", { email, otp }).then((r) => r.data),
  sendCbboEmailOtp: (email: string) =>
    api.post<Wrapped<null>>("/cbbo/register/otp/email/send/", { email }).then((r) => r.data),
  confirmCbboEmailOtp: (email: string, otp: string) =>
    api.post<Wrapped<null>>("/cbbo/register/otp/email/confirm/", { email, otp }).then((r) => r.data),
  confirmCbboOtp: (phone: string, otp: string) =>
    api.post<Wrapped<null>>("/cbbo/register/otp/confirm/", { phone, otp }).then((r) => r.data),
};
