"use client";
import "@/app/globals.css";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

import { govtRegistrationApi } from "./_api";

type T = Record<string, string>;

const USER_CATEGORIES = [
  { value: "agri_officer", label: "Agri Officer (PEN, 6 digits)" },
  { value: "university_official", label: "University Official (PEN, 6 digits)" },
  { value: "sfac_official", label: "SFAC Official (PAN)" },
  { value: "cbbo_personnel", label: "CBBO Personnel (CIN)" },
  { value: "nabard_official", label: "NABARD Official (Employee Index, 5-6 digits)" },
  { value: "atma_specialist", label: "ATMA Specialist (Employee ID or PAN)" },
];

const ID_PATTERNS: Record<string, RegExp[]> = {
  agri_officer: [/^\d{6}$/],
  university_official: [/^\d{6}$/],
  sfac_official: [/^[A-Z]{5}\d{4}[A-Z]$/],
  cbbo_personnel: [/^[LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/],
  nabard_official: [/^\d{5}$/, /^\d{6}$/],
  atma_specialist: [/^\d{6,8}$/, /^[A-Z]{5}\d{4}[A-Z]$/],
};

const ID_LABELS: Record<string, string> = {
  agri_officer: "Permanent Employee Number (PEN) - 6-digit number",
  university_official: "Permanent Employee Number (PEN) - 6-digit number",
  sfac_official: "Permanent Account Number (PAN) - 10 characters",
  cbbo_personnel: "Corporate Identity Number (CIN) - 21 characters, starts with L or U",
  nabard_official: "Employee Index Number - 5 or 6-digit number",
  atma_specialist: "Employee ID (6-8 digits) or PAN (10 characters)",
};

// Longest allowed value for each category, used to cap input length as the user types.
const ID_MAX_LENGTH: Record<string, number> = {
  agri_officer: 6,
  university_official: 6,
  sfac_official: 10,
  cbbo_personnel: 21,
  nabard_official: 6,
  atma_specialist: 10,
};

// Categories whose ID is always numeric, so non-digit input can be blocked as it's typed.
const ID_DIGITS_ONLY: Record<string, boolean> = {
  agri_officer: true,
  university_official: true,
  nabard_official: true,
};

function sanitizeIdNumberInput(userCategory: string, rawValue: string): string {
  const upper = rawValue.toUpperCase();
  const filtered = ID_DIGITS_ONLY[userCategory] ? upper.replace(/[^0-9]/g, "") : upper.replace(/[^A-Z0-9]/g, "");
  const maxLength = ID_MAX_LENGTH[userCategory] ?? 21;
  return filtered.slice(0, maxLength);
}

function validateIdNumber(userCategory: string, rawValue: string): string | null {
  const value = rawValue.trim().toUpperCase();
  const patterns = ID_PATTERNS[userCategory];
  if (!patterns?.some((p) => p.test(value))) {
    return `Invalid format. Expected: ${ID_LABELS[userCategory] ?? "a valid ID number"}`;
  }
  if (/^0+$/.test(value)) {
    return "ID number cannot be all zeros";
  }
  return null;
}

export default function GovernmentRegisterPage() {
  const router = useRouter();
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [designation, setDesignation] = useState("");
  const [department, setDepartment] = useState("");
  const [userCategory, setUserCategory] = useState("agri_officer");
  const [idNumber, setIdNumber] = useState("");
  const [jurisdictionType, setJurisdictionType] = useState<"district" | "state">("district");
  const [assignedDistrict, setAssignedDistrict] = useState("");

  useEffect(() => {
    translationsApi
      .getPublic(locale, "government_register")
      .then((data) => setT(data.government_register ?? {}))
      .catch(() => undefined);
  }, [locale]);

  const mutation = useMutation({
    mutationFn: () =>
      govtRegistrationApi.register({
        email,
        first_name: firstName,
        last_name: lastName,
        phone,
        password,
        designation,
        department,
        user_category: userCategory,
        id_number: idNumber,
        jurisdiction_type: jurisdictionType,
        assigned_district: jurisdictionType === "district" ? assignedDistrict : null,
      }),
    onSuccess: () => {
      toast.success(t.toast_success ?? "Registration submitted. An administrator will review your account.");
      router.push("/v1/login");
    },
    onError: (error: unknown) => {
      const errors = (error as { data?: { errors?: Record<string, string[]> } })?.data?.errors;
      const firstError = errors ? Object.values(errors)[0]?.[0] : undefined;
      toast.error(firstError ?? t.toast_failed ?? "Registration failed");
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-2xl">
        <div className="mb-2 flex justify-end">
          <LocaleSwitcher />
        </div>
        <div className="mb-6 text-center">
          <h1 className="font-bold text-2xl">{t.page_title ?? "Government Official Registration"}</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            {t.page_description ?? "Your account will be reviewed by a KAU Super Admin before activation."}
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!email || !firstName || !phone || !password || !designation || !department || !idNumber) {
              toast.error(t.val_required_fields ?? "Please fill in all required fields");
              return;
            }
            const idNumberError = validateIdNumber(userCategory, idNumber);
            if (idNumberError) {
              toast.error(idNumberError);
              return;
            }
            if (jurisdictionType === "district" && !assignedDistrict) {
              toast.error(t.val_district_required ?? "Please enter your district");
              return;
            }
            mutation.mutate();
          }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.section_account ?? "Account"}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <FieldGroup className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="first-name">{t.field_first_name ?? "First Name"} *</FieldLabel>
                  <Input id="first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="last-name">{t.field_last_name ?? "Last Name"}</FieldLabel>
                  <Input id="last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </Field>
              </FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">{t.field_email ?? "Email"} *</FieldLabel>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              <FieldGroup className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="phone">{t.field_phone ?? "Phone"} *</FieldLabel>
                  <Input
                    id="phone"
                    type="tel"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder={t.placeholder_phone ?? "98765 43210"}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="password">{t.field_password ?? "Password"} *</FieldLabel>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">{t.section_id_verification ?? "Role & ID Verification"}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <FieldGroup className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="designation">{t.field_designation ?? "Designation"} *</FieldLabel>
                  <Input
                    id="designation"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder={t.placeholder_designation ?? "e.g. District Agricultural Officer"}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="department">{t.field_department ?? "Department"} *</FieldLabel>
                  <Input
                    id="department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder={t.placeholder_department ?? "e.g. Department of Agriculture"}
                  />
                </Field>
              </FieldGroup>
              <Field>
                <FieldLabel htmlFor="user-category">{t.field_user_category ?? "User Category"} *</FieldLabel>
                <select
                  id="user-category"
                  value={userCategory}
                  onChange={(e) => {
                    setUserCategory(e.target.value);
                    setIdNumber("");
                  }}
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                >
                  {USER_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field>
                <FieldLabel htmlFor="id-number">{t.field_id_number ?? "ID Number"} *</FieldLabel>
                <Input
                  id="id-number"
                  value={idNumber}
                  maxLength={ID_MAX_LENGTH[userCategory] ?? 21}
                  onChange={(e) => setIdNumber(sanitizeIdNumberInput(userCategory, e.target.value))}
                  placeholder={
                    t.placeholder_id_number ??
                    `e.g. ${ID_LABELS[userCategory] ?? "Matching the format for your selected category above"}`
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="jurisdiction-type">{t.field_jurisdiction ?? "Jurisdiction"} *</FieldLabel>
                <select
                  id="jurisdiction-type"
                  value={jurisdictionType}
                  onChange={(e) => setJurisdictionType(e.target.value as "district" | "state")}
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                >
                  <option value="district">{t.option_district ?? "District"}</option>
                  <option value="state">{t.option_state ?? "State"}</option>
                </select>
              </Field>
              {jurisdictionType === "district" && (
                <Field>
                  <FieldLabel htmlFor="district">{t.field_district ?? "District"} *</FieldLabel>
                  <Input
                    id="district"
                    value={assignedDistrict}
                    onChange={(e) => setAssignedDistrict(e.target.value)}
                    placeholder={t.placeholder_district ?? "e.g. Thrissur"}
                  />
                </Field>
              )}
            </CardContent>
          </Card>

          <div className="mt-6 flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.push("/v1/login")}>
              {t.btn_already_registered ?? "Already have an account? Log in"}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (t.btn_submitting ?? "Submitting...") : (t.btn_submit ?? "Submit Registration")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
