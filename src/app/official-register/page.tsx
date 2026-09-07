"use client";
import "@/app/globals.css";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useState } from "react";

import { officialRegisterApi } from "./_api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DISTRICT_OPTIONS } from "@/types/fpo";

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
const baseSchema = z.object({
  mode: z.enum(["government", "cbbo"]),
  first_name: z.string().min(1, { message: "First name is required." }),
  last_name: z.string().optional(),
  email: z.string().email({ message: "Please enter a valid email address." }),
  phone: z.string().regex(/^[6-9]\d{9}$/, { message: "Enter a valid 10-digit Indian mobile number." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  designation: z.string().optional(),
  department: z.string().optional(),
  user_category: z.string().optional(),
  id_number: z.string().optional(),
  jurisdiction_type: z.enum(["district", "state"]).optional(),
  assigned_district: z.string().optional(),
  organisation: z.string().optional(),
  level: z.enum(["district", "state"]).optional(),
  district_code: z.string().optional(),
});

const registerSchema = baseSchema.superRefine((data, ctx) => {
  if (data.mode === "government") {
    if (!data.department) {
      ctx.addIssue({ code: "custom", message: "Department is required.", path: ["department"] });
    }
    if (!data.id_number) {
      ctx.addIssue({ code: "custom", message: "ID number is required.", path: ["id_number"] });
    } else {
      const patterns = ID_PATTERNS[data.user_category ?? ""];
      const value = data.id_number.trim().toUpperCase();
      const matches = patterns?.some((p) => p.test(value));
      if (!matches) {
        ctx.addIssue({
          code: "custom",
          message: `Invalid format. Expected: ${ID_LABELS[data.user_category ?? ""]}`,
          path: ["id_number"],
        });
      }
    }
    if (data.jurisdiction_type === "district" && !data.assigned_district) {
      ctx.addIssue({ code: "custom", message: "District is required.", path: ["assigned_district"] });
    }
  }
  if (data.mode === "cbbo") {
    if (!data.organisation) {
      ctx.addIssue({ code: "custom", message: "Organisation is required.", path: ["organisation"] });
    }
    if (data.level === "district" && !data.district_code) {
      ctx.addIssue({ code: "custom", message: "District code is required.", path: ["district_code"] });
    }
  }
});

type RegisterValues = z.infer<typeof registerSchema>;
export default function OfficialRegisterPage() {
  const router = useRouter();

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      mode: "government",
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      password: "",
      designation: "",
      department: "",
      user_category: "agri_officer",
      id_number: "",
      jurisdiction_type: "district",
      assigned_district: "",
      organisation: "",
      level: "district",
      district_code: "",
    },
  });

  const mode = form.watch("mode");
  const jurisdictionType = form.watch("jurisdiction_type");
  const level = form.watch("level");

  const { data: organisations = [] } = useQuery({
    queryKey: ["public-organisations"],
    queryFn: () => officialRegisterApi.getOrganisations(),
    enabled: mode === "cbbo",
  });

  const govtMutation = useMutation({
    mutationFn: (vars: RegisterValues) =>
      officialRegisterApi.registerGovernment({
        email: vars.email, first_name: vars.first_name, last_name: vars.last_name ?? "",
        phone: vars.phone, password: vars.password,
        designation: vars.designation ?? "", department: vars.department ?? "",
        user_category: vars.user_category ?? "", id_number: vars.id_number ?? "",
        jurisdiction_type: vars.jurisdiction_type ?? "district",
        assigned_district: vars.jurisdiction_type === "district" ? vars.assigned_district : null,
      }),
    onSuccess: () => {
      toast.success("Registration submitted. An administrator will review your account.");
      router.push("/v1/login");
    },
    onError: (error: unknown) => {
      const errors = (error as { data?: { errors?: Record<string, string[]> } })?.data?.errors;
      toast.error(errors ? Object.values(errors)[0]?.[0] : "Registration failed");
    },
  });

  const cbboMutation = useMutation({
    mutationFn: (vars: RegisterValues) =>
      officialRegisterApi.registerCBBO({
        email: vars.email, first_name: vars.first_name, last_name: vars.last_name ?? "",
        phone: vars.phone, password: vars.password, designation: vars.designation ?? "",
        organisation: Number(vars.organisation), level: vars.level ?? "district",
        district_codes: vars.level === "district" && vars.district_code ? [vars.district_code] : [],
      }),
    onSuccess: () => {
      toast.success("Registration submitted. An administrator will review your account.");
      router.push("/v1/login");
    },
    onError: (error: unknown) => {
      const errors = (error as { data?: { errors?: Record<string, string[]> } })?.data?.errors;
      toast.error(errors ? Object.values(errors)[0]?.[0] : "Registration failed");
    },
  });

  const mutation = mode === "government" ? govtMutation : cbboMutation;

  const onSubmit = (values: RegisterValues) => {
    mutation.mutate(values);
  };

  const handleModeSwitch = (newMode: "government" | "cbbo") => {
    if (newMode === mode) return;
    form.reset({
      mode: newMode,
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      password: "",
      designation: "",
      department: "",
      user_category: "agri_officer",
      id_number: "",
      jurisdiction_type: "district",
      assigned_district: "",
      organisation: "",
      level: "district",
      district_code: "",
    });
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-background dark:via-background dark:to-background">
      <header className="flex items-center justify-between border-b bg-background/80 px-4 sm:px-6 py-3 backdrop-blur-sm">
        <a href="/" className="flex items-center gap-2 font-medium text-sm">
          <img src="/assets/img/logo.png" alt="KAU" className="h-7 w-auto" />
          <span className="hidden sm:inline">KAU-FPO Platform</span>
        </a>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-muted-foreground text-sm">
            <span className="hidden sm:inline">Already registered? </span>
            <a href="/v1/login" className="font-medium text-green-600 hover:underline">
              Sign in
            </a>
          </span>
        </div>
      </header>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          <div className="mb-6 text-center">
            <h1 className="font-bold text-2xl">Official Registration</h1>
            <p className="mt-1 text-muted-foreground text-sm">
              Your account will be reviewed by a KAU Super Admin before activation.
            </p>
          </div>

          <div className="mb-6 flex justify-center gap-2">
            <Button type="button" variant={mode === "government" ? "default" : "outline"} onClick={() => handleModeSwitch("government")}>
              Government Official
            </Button>
            <Button type="button" variant={mode === "cbbo" ? "default" : "outline"} onClick={() => handleModeSwitch("cbbo")}>
              CBBO / NGO Officer
            </Button>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Account</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <FieldGroup className="grid grid-cols-2 gap-4">
                  <Controller
                    control={form.control}
                    name="first_name"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="first-name">First Name *</FieldLabel>
                        <Input {...field} id="first-name" aria-invalid={fieldState.invalid} />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="last_name"
                    render={({ field }) => (
                      <Field>
                        <FieldLabel htmlFor="last-name">Last Name</FieldLabel>
                        <Input {...field} id="last-name" />
                      </Field>
                    )}
                  />
                </FieldGroup>
                <Controller
                  control={form.control}
                  name="email"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="email">Email *</FieldLabel>
                      <Input {...field} id="email" type="email" aria-invalid={fieldState.invalid} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <FieldGroup className="grid grid-cols-2 gap-4">
                  <Controller
                    control={form.control}
                    name="phone"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="phone">Phone *</FieldLabel>
                        <Input {...field} id="phone" aria-invalid={fieldState.invalid} />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="password"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="password">Password *</FieldLabel>
                        <Input {...field} id="password" type="password" aria-invalid={fieldState.invalid} />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                </FieldGroup>
                <Controller
                  control={form.control}
                  name="designation"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor="designation">Designation</FieldLabel>
                      <Input {...field} id="designation" />
                    </Field>
                  )}
                />
              </CardContent>
            </Card>

            {mode === "government" && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-base">Government Details</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <Controller
                    control={form.control}
                    name="department"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="department">Department *</FieldLabel>
                        <Input {...field} id="department" placeholder="e.g. Department of Agriculture" aria-invalid={fieldState.invalid} />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="user_category"
                    render={({ field }) => (
                      <Field>
                        <FieldLabel htmlFor="user-category">User Category *</FieldLabel>
                        <select
                          {...field}
                          id="user-category"
                          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                        >
                          {USER_CATEGORIES.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                      </Field>
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="id_number"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="id-number">ID Number *</FieldLabel>
                        <Input {...field} id="id-number" placeholder="Matching the format for your selected category" aria-invalid={fieldState.invalid} />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="jurisdiction_type"
                    render={({ field }) => (
                      <Field>
                        <FieldLabel htmlFor="jurisdiction-type">Jurisdiction *</FieldLabel>
                        <select
                          {...field}
                          id="jurisdiction-type"
                          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                        >
                          <option value="district">District</option>
                          <option value="state">State</option>
                        </select>
                      </Field>
                    )}
                  />
                  {jurisdictionType === "district" && (
                    <Controller
                      control={form.control}
                      name="assigned_district"
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="district">District *</FieldLabel>
                          <select
                            {...field}
                            id="district"
                            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                          >
                            <option value="">Select a district</option>
                            {DISTRICT_OPTIONS.map((d) => (
                              <option key={d.value} value={d.value}>{d.label}</option>
                            ))}
                          </select>
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                  )}
                </CardContent>
              </Card>
            )}
            {mode === "cbbo" && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-base">CBBO / NGO Details</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <Controller
                    control={form.control}
                    name="organisation"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="organisation">Organisation *</FieldLabel>
                        <select
                          {...field}
                          id="organisation"
                          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                        >
                          <option value="">Select an organisation</option>
                          {organisations.map((org) => (
                            <option key={org.id} value={org.id}>{org.name} ({org.org_type_display})</option>
                          ))}
                        </select>
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="level"
                    render={({ field }) => (
                      <Field>
                        <FieldLabel htmlFor="level">Level *</FieldLabel>
                        <select
                          {...field}
                          id="level"
                          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                        >
                          <option value="district">District</option>
                          <option value="state">State</option>
                        </select>
                      </Field>
                    )}
                  />
                  {level === "district" && (
                    <Controller
                      control={form.control}
                      name="district_code"
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="district-code">District Code *</FieldLabel>
                          <select
                            {...field}
                            id="district-code"
                            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                          >
                            <option value="">Select a district</option>
                            {DISTRICT_OPTIONS.map((d) => (
                              <option key={d.value} value={d.value}>{d.label}</option>
                            ))}
                          </select>
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                  )}
                </CardContent>
              </Card>
            )}
            <div className="mt-6 flex items-center gap-3">
              <a href="/v1/login" className="text-muted-foreground text-sm hover:text-foreground">
                ← Back to Login
              </a>
              <Button type="submit" className="flex-1" disabled={mutation.isPending}>
                {mutation.isPending ? "Registering..." : "Register"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
