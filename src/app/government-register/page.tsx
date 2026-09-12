"use client";
import "@/app/globals.css";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { govtRegistrationApi } from "./_api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const USER_CATEGORIES = [
  { value: "agri_officer", label: "Agri Officer (PEN, 6 digits)" },
  { value: "university_official", label: "University Official (PEN, 6 digits)" },
  { value: "sfac_official", label: "SFAC Official (PAN)" },
  { value: "cbbo_personnel", label: "CBBO Personnel (CIN)" },
  { value: "nabard_official", label: "NABARD Official (Employee Index, 5-6 digits)" },
  { value: "atma_specialist", label: "ATMA Specialist (Employee ID or PAN)" },
];

export default function GovernmentRegisterPage() {
  const router = useRouter();
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
      toast.success("Registration submitted. An administrator will review your account.");
      router.push("/v1/login");
    },
    onError: (error: unknown) => {
      const errors = (error as { data?: { errors?: Record<string, string[]> } })?.data?.errors;
      const firstError = errors ? Object.values(errors)[0]?.[0] : undefined;
      toast.error(firstError ?? "Registration failed");
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-2xl">
        <div className="mb-6 text-center">
          <h1 className="font-bold text-2xl">Government Official Registration</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Your account will be reviewed by a KAU Super Admin before activation.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!email || !firstName || !phone || !password || !designation || !department || !idNumber) {
              toast.error("Please fill in all required fields");
              return;
            }
            if (jurisdictionType === "district" && !assignedDistrict) {
              toast.error("Please enter your district");
              return;
            }
            mutation.mutate();
          }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <FieldGroup className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="first-name">First Name *</FieldLabel>
                  <Input id="first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="last-name">Last Name</FieldLabel>
                  <Input id="last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </Field>
              </FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email *</FieldLabel>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              <FieldGroup className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="phone">Phone *</FieldLabel>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="password">Password *</FieldLabel>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Role &amp; ID Verification</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <FieldGroup className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="designation">Designation *</FieldLabel>
                  <Input id="designation" value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g. District Agricultural Officer" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="department">Department *</FieldLabel>
                  <Input id="department" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Department of Agriculture" />
                </Field>
              </FieldGroup>
              <Field>
                <FieldLabel htmlFor="user-category">User Category *</FieldLabel>
                <select
                  id="user-category"
                  value={userCategory}
                  onChange={(e) => setUserCategory(e.target.value)}
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                >
                  {USER_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </Field>
              <Field>
                <FieldLabel htmlFor="id-number">ID Number *</FieldLabel>
                <Input id="id-number" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="Matching the format for your selected category above" />
              </Field>
              <Field>
                <FieldLabel htmlFor="jurisdiction-type">Jurisdiction *</FieldLabel>
                <select
                  id="jurisdiction-type"
                  value={jurisdictionType}
                  onChange={(e) => setJurisdictionType(e.target.value as "district" | "state")}
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                >
                  <option value="district">District</option>
                  <option value="state">State</option>
                </select>
              </Field>
              {jurisdictionType === "district" && (
                <Field>
                  <FieldLabel htmlFor="district">District *</FieldLabel>
                  <Input id="district" value={assignedDistrict} onChange={(e) => setAssignedDistrict(e.target.value)} placeholder="e.g. Thrissur" />
                </Field>
              )}
            </CardContent>
          </Card>

          <div className="mt-6 flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.push("/v1/login")}>
              Already have an account? Log in
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Submitting..." : "Submit Registration"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
