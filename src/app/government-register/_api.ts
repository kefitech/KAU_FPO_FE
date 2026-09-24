import { api } from "@/lib/api/client";

export interface GovtRegistrationPayload {
  email: string;
  first_name: string;
  last_name?: string;
  phone: string;
  password: string;
  designation: string;
  department: string;
  user_category: string;
  id_number: string;
  jurisdiction_type: "district" | "state";
  assigned_district?: string | null;
}

type Wrapped<T> = { status: string; message: string; data: T };

export const govtRegistrationApi = {
  register: (payload: GovtRegistrationPayload) =>
    api.post<Wrapped<{ id: number; status: string }>>("/government/register/", payload).then((r) => r.data.data),
};
