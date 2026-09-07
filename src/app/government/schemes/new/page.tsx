"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { govtSchemesApi } from "@/app/government/_api/schemes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const CATEGORIES = [
  { value: "credit", label: "Credit & Finance" },
  { value: "insurance", label: "Insurance" },
  { value: "marketing", label: "Marketing & Trade" },
  { value: "infrastructure", label: "Infrastructure" },
  { value: "capacity_building", label: "Capacity Building" },
];

export default function NewSchemePage() {
  const router = useRouter();
  const [nameEn, setNameEn] = useState("");
  const [administeringBody, setAdministeringBody] = useState("");
  const [category, setCategory] = useState("infrastructure");
  const [objective, setObjective] = useState("");
  const [eligibility, setEligibility] = useState("");
  const [benefitDetails, setBenefitDetails] = useState("");
  const [applicationProcess, setApplicationProcess] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      govtSchemesApi.create({
        name_en: nameEn,
        administering_body: administeringBody,
        category,
        objective,
        eligibility,
        benefit_details: benefitDetails,
        application_process: applicationProcess,
        is_active: true,
      }),
    onSuccess: () => {
      toast.success("Scheme created");
      router.push("/government/schemes");
    },
    onError: (error: unknown) => {
      const msg = (error as { data?: { message?: string } })?.data?.message;
      toast.error(msg ?? "Failed to save scheme");
    },
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-bold text-2xl">New Scheme</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">Add a scheme or subsidy to the catalog</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!nameEn || !administeringBody || !eligibility || !benefitDetails || !applicationProcess) {
            toast.error("Fill in all required fields");
            return;
          }
          mutation.mutate();
        }}
      >
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Scheme Details</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Field>
                <FieldLabel htmlFor="name">Name *</FieldLabel>
                <Input id="name" value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="Scheme name" />
              </Field>
              <FieldGroup className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="body">Administering Body *</FieldLabel>
                  <Input id="body" value={administeringBody} onChange={(e) => setAdministeringBody(e.target.value)} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="category">Category</FieldLabel>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </Field>
              </FieldGroup>
              <Field>
                <FieldLabel htmlFor="objective">Objective</FieldLabel>
                <Textarea id="objective" value={objective} onChange={(e) => setObjective(e.target.value)} rows={2} />
              </Field>
              <Field>
                <FieldLabel htmlFor="eligibility">Eligibility *</FieldLabel>
                <Textarea id="eligibility" value={eligibility} onChange={(e) => setEligibility(e.target.value)} rows={2} />
              </Field>
              <Field>
                <FieldLabel htmlFor="benefits">Benefit Details *</FieldLabel>
                <Textarea id="benefits" value={benefitDetails} onChange={(e) => setBenefitDetails(e.target.value)} rows={2} />
              </Field>
              <Field>
                <FieldLabel htmlFor="process">Application Process *</FieldLabel>
                <Textarea id="process" value={applicationProcess} onChange={(e) => setApplicationProcess(e.target.value)} rows={2} />
              </Field>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.push("/government/schemes")}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : "Save Scheme"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
