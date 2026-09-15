"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { cbbosApi } from "@/app/admin/_api/cbbos";
import { organisationsApi } from "@/app/admin/_api/organisations";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

type T = Record<string, string>;

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
  const [orgType, setOrgType] = useState<"cbbo" | "ngo">("cbbo");
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
    mutationFn: () =>
      organisationsApi.create({
        name,
        org_type: orgType,
        contact_person: contactPerson,
        contact_designation: contactDesignation || undefined,
        contact_email: contactEmail,
        contact_phone: contactPhone,
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
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? (t.org_create_failed ?? "Failed to create organisation"));
    },
  });

  function resetForm() {
    setName("");
    setOrgType("cbbo");
    setContactPerson("");
    setContactDesignation("");
    setContactEmail("");
    setContactPhone("");
    setSelectedDistricts([]);
    setErrors({});
  }

  function handleSubmit() {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = t.val_name_required ?? "Name is required";
    if (!contactPerson.trim()) newErrors.contactPerson = t.val_contact_person_required ?? "Contact person is required";
    if (!contactEmail.trim()) newErrors.contactEmail = t.val_contact_email_required ?? "Contact email is required";
    if (!contactPhone.trim()) newErrors.contactPhone = t.val_contact_phone_required ?? "Contact phone is required";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    createMutation.mutate();
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
            <Input id="org-name" value={name} onChange={(e) => setName(e.target.value)} />
            {errors.name && <FieldError errors={[{ message: errors.name }]} />}
          </Field>

          <Field>
            <FieldLabel htmlFor="org-type">{t.org_field_type ?? "Type"} *</FieldLabel>
            <select
              id="org-type"
              value={orgType}
              onChange={(e) => setOrgType(e.target.value as "cbbo" | "ngo")}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="cbbo">{t.org_type_cbbo ?? "CBBO"}</option>
              <option value="ngo">{t.org_type_ngo ?? "NGO"}</option>
            </select>
          </Field>

          <Field data-invalid={!!errors.contactPerson}>
            <FieldLabel htmlFor="org-contact-person">{t.org_field_contact_person ?? "Contact Person"} *</FieldLabel>
            <Input id="org-contact-person" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
            {errors.contactPerson && <FieldError errors={[{ message: errors.contactPerson }]} />}
          </Field>

          <Field>
            <FieldLabel htmlFor="org-contact-designation">{t.org_field_contact_designation ?? "Contact Designation"}</FieldLabel>
            <Input id="org-contact-designation" value={contactDesignation} onChange={(e) => setContactDesignation(e.target.value)} />
          </Field>

          <Field data-invalid={!!errors.contactEmail}>
            <FieldLabel htmlFor="org-contact-email">{t.org_field_contact_email ?? "Contact Email"} *</FieldLabel>
            <Input id="org-contact-email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            {errors.contactEmail && <FieldError errors={[{ message: errors.contactEmail }]} />}
          </Field>

          <Field data-invalid={!!errors.contactPhone}>
            <FieldLabel htmlFor="org-contact-phone">{t.org_field_contact_phone ?? "Contact Phone"} *</FieldLabel>
            <Input id="org-contact-phone" type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            {errors.contactPhone && <FieldError errors={[{ message: errors.contactPhone }]} />}
          </Field>

          <FieldGroup>
            <FieldLabel>{t.org_field_districts ?? "Districts Covered"}</FieldLabel>
            {selectedDistricts.length > 0 && (
              <div className="mb-1 flex flex-wrap gap-1">
                {selectedDistricts.map((code) => (
                  <span
                    key={code}
                    className="cursor-pointer rounded bg-muted px-2 py-0.5 text-[10px]"
                    onClick={() => setSelectedDistricts((s) => s.filter((c) => c !== code))}
                  >
                    {code} ×
                  </span>
                ))}
              </div>
            )}
            <div className="grid max-h-48 grid-cols-2 gap-0.5 overflow-y-auto rounded-md border bg-background px-2 py-1 sm:grid-cols-3">
              {availableDistricts.map((d) => {
                const checked = selectedDistricts.includes(d.code);
                return (
                  <label key={d.code} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted">
                    <input
                      type="checkbox"
                      className="h-4 w-4 shrink-0 rounded border accent-primary"
                      checked={checked}
                      onChange={() =>
                        setSelectedDistricts((s) => (checked ? s.filter((c) => c !== d.code) : [...s, d.code]))
                      }
                    />
                    <span className="text-sm">{d.name}</span>
                  </label>
                );
              })}
            </div>
          </FieldGroup>
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
