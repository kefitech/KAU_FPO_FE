"use client";

import { useEffect, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";

import { cbbosApi } from "@/app/admin/_api/cbbos";
import { organisationsApi } from "@/app/admin/_api/organisations";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

// All organisations are registered the same way, so the type is fixed
const ORG_TYPE = "cbbo" as const;

const organisationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Name is required" })
    .max(255, { message: "Name must be 255 characters or fewer" }),
  contact_person: z
    .string()
    .trim()
    .min(1, { message: "Contact person is required" })
    .max(255, { message: "Contact person must be 255 characters or fewer" }),
  contact_designation: z.string().trim().max(255, { message: "Designation must be 255 characters or fewer" }),
  contact_email: z.string().trim().email({ message: "Enter a valid email address" }),
  contact_phone: z
    .string()
    .trim()
    .refine((v) => /^\d{10}$/.test(v), { message: "Enter a valid 10-digit phone number" }),
});

type OrganisationFormValues = z.infer<typeof organisationSchema>;

type T = Record<string, string>;

type ApiError = {
  response?: { data?: unknown };
  data?: unknown;
};

// Pull a readable message and per-field errors out of an API error
function parseApiError(error: unknown): { message?: string; fieldErrors: Record<string, string> } {
  const e = error as ApiError;
  const body = (e?.response?.data ?? e?.data) as Record<string, unknown> | undefined;
  const fieldErrors: Record<string, string> = {};
  let message: string | undefined;

  if (!body || typeof body !== "object") return { fieldErrors };

  if (typeof body.message === "string") message = body.message;
  if (typeof body.detail === "string") message = message ?? body.detail;

  // Field errors may be at the top level or nested under "errors" / "data"
  const sources = [body, body.errors, body.data].filter(
    (s): s is Record<string, unknown> => !!s && typeof s === "object" && !Array.isArray(s),
  );

  for (const source of sources) {
    for (const [key, value] of Object.entries(source)) {
      if (["message", "detail", "status", "errors", "data"].includes(key)) continue;
      const first = Array.isArray(value) ? value[0] : value;
      if (typeof first === "string" && !fieldErrors[key]) fieldErrors[key] = first;
    }
  }

  return { message, fieldErrors };
}

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-destructive text-sm">
      {message}
    </p>
  );
}

interface AddOrganisationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export function AddOrganisationDialog({ open, onOpenChange, onCreated }: AddOrganisationDialogProps) {
  const queryClient = useQueryClient();
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactDesignation, setContactDesignation] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    translationsApi
      .getPublic(locale, "cbbos_table,common")
      .then((data) => setT({ ...(data.common ?? {}), ...(data.cbbos_table ?? {}) }))
      .catch(() => undefined);
  }, [locale]);

  const { data: availableDistricts = [] } = useQuery({
    queryKey: ["available-districts-org-dialog"],
    queryFn: () => cbbosApi.getAvailableDistricts(),
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: (values: OrganisationFormValues) =>
      organisationsApi.create({
        name: values.name,
        org_type: ORG_TYPE,
        contact_person: values.contact_person,
        contact_designation: values.contact_designation || undefined,
        contact_email: values.contact_email,
        contact_phone: values.contact_phone,
        districts_covered: selectedDistricts,
      }),
    onSuccess: () => {
      toast.success(t.org_created ?? "Organisation created");
      queryClient.invalidateQueries({ queryKey: ["organisations-for-cbbo-form"] });
      resetForm();
      onOpenChange(false);
      onCreated?.();
    },
    onError: (error: unknown) => {
      const { message, fieldErrors } = parseApiError(error);
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
        toast.error(Object.values(fieldErrors)[0]);
        return;
      }
      toast.error(message ?? t.org_create_failed ?? "Failed to create organisation");
    },
  });

  function resetForm() {
    setName("");
    setContactPerson("");
    setContactDesignation("");
    setContactEmail("");
    setContactPhone("");
    setSelectedDistricts([]);
    setErrors({});
  }

  function clearError(field: string) {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function handleSubmit() {
    const newErrors: Record<string, string> = {};

    // Explicit whitespace checks, independent of the zod version
    if (!name.trim()) {
      newErrors.name = t.org_error_name_required ?? "Name is required";
    }
    if (!contactPerson.trim()) {
      newErrors.contact_person = t.org_error_contact_person_required ?? "Contact person is required";
    }

    const result = organisationSchema.safeParse({
      name,
      contact_person: contactPerson,
      contact_designation: contactDesignation,
      contact_email: contactEmail,
      contact_phone: contactPhone,
    });

    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = String(issue.path[0]);
        if (!newErrors[field]) newErrors[field] = issue.message;
      }
    }

    if (Object.keys(newErrors).length > 0 || !result.success) {
      setErrors(newErrors);
      toast.error(Object.values(newErrors)[0] ?? "Please fix the errors in the form");
      return;
    }

    setErrors({});
    // result.data holds the trimmed values
    createMutation.mutate(result.data);
  }

  function toggleDistrict(code: string) {
    setSelectedDistricts((s) => (s.includes(code) ? s.filter((c) => c !== code) : [...s, code]));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.add_org_dialog_title ?? "Add Organisation"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="org-name">{t.org_field_name ?? "Name"} *</FieldLabel>
            <Input
              id="org-name"
              value={name}
              maxLength={255}
              aria-invalid={!!errors.name}
              className={errors.name ? "border-destructive" : undefined}
              onChange={(e) => {
                setName(e.target.value);
                clearError("name");
              }}
            />
            <ErrorText message={errors.name} />
          </Field>

          <Field data-invalid={!!errors.contact_person}>
            <FieldLabel htmlFor="org-contact-person">{t.org_field_contact_person ?? "Contact Person"} *</FieldLabel>
            <Input
              id="org-contact-person"
              value={contactPerson}
              maxLength={255}
              aria-invalid={!!errors.contact_person}
              className={errors.contact_person ? "border-destructive" : undefined}
              onChange={(e) => {
                setContactPerson(e.target.value);
                clearError("contact_person");
              }}
            />
            <ErrorText message={errors.contact_person} />
          </Field>

          <Field data-invalid={!!errors.contact_designation}>
            <FieldLabel htmlFor="org-contact-designation">
              {t.org_field_contact_designation ?? "Contact Designation"}
            </FieldLabel>
            <Input
              id="org-contact-designation"
              value={contactDesignation}
              maxLength={255}
              aria-invalid={!!errors.contact_designation}
              className={errors.contact_designation ? "border-destructive" : undefined}
              onChange={(e) => {
                setContactDesignation(e.target.value);
                clearError("contact_designation");
              }}
            />
            <ErrorText message={errors.contact_designation} />
          </Field>

          <Field data-invalid={!!errors.contact_email}>
            <FieldLabel htmlFor="org-contact-email">{t.org_field_contact_email ?? "Contact Email"} *</FieldLabel>
            <Input
              id="org-contact-email"
              type="email"
              value={contactEmail}
              aria-invalid={!!errors.contact_email}
              className={errors.contact_email ? "border-destructive" : undefined}
              onChange={(e) => {
                setContactEmail(e.target.value);
                clearError("contact_email");
              }}
            />
            <ErrorText message={errors.contact_email} />
          </Field>

          <Field data-invalid={!!errors.contact_phone}>
            <FieldLabel htmlFor="org-contact-phone">{t.org_field_contact_phone ?? "Contact Phone"} *</FieldLabel>
            <Input
              id="org-contact-phone"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={contactPhone}
              aria-invalid={!!errors.contact_phone}
              className={errors.contact_phone ? "border-destructive" : undefined}
              onChange={(e) => {
                setContactPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                clearError("contact_phone");
              }}
            />
            <ErrorText message={errors.contact_phone} />
          </Field>

          <Field data-invalid={!!errors.districts_covered}>
            <FieldLabel>{t.org_field_districts ?? "Districts Covered"}</FieldLabel>

            {selectedDistricts.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedDistricts.map((code) => {
                  const districtName = availableDistricts.find((d) => d.code === code)?.name ?? code;
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => toggleDistrict(code)}
                      className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs hover:bg-muted/70"
                    >
                      {districtName}
                      <span aria-hidden className="text-muted-foreground">
                        ×
                      </span>
                      <span className="sr-only">Remove {districtName}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="grid max-h-48 grid-cols-1 gap-x-2 gap-y-0.5 overflow-y-auto rounded-md border bg-background p-1 sm:grid-cols-2">
              {availableDistricts.map((d) => {
                const checked = selectedDistricts.includes(d.code);
                return (
                  <label
                    key={d.code}
                    htmlFor={`district-${d.code}`}
                    className="flex min-w-0 cursor-pointer items-start gap-2 rounded px-2 py-1.5 hover:bg-muted"
                  >
                    <input
                      id={`district-${d.code}`}
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border accent-primary"
                      checked={checked}
                      onChange={() => {
                        toggleDistrict(d.code);
                        clearError("districts_covered");
                      }}
                    />
                    <span className="min-w-0 truncate text-sm leading-5" title={d.name}>
                      {d.name}
                    </span>
                  </label>
                );
              })}
            </div>
            <ErrorText message={errors.districts_covered} />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={createMutation.isPending}>
            {t.cancel ?? "Cancel"}
          </Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? (t.creating ?? "Creating...") : (t.create ?? "Create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
