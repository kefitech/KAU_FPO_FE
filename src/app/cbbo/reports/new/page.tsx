"use client";

import { useEffect, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { cbboFposApi } from "@/app/cbbo/_api/fpos";
import { cbboReportsApi } from "@/app/cbbo/_api/reports";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Textarea } from "@/components/ui/textarea";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

type T = Record<string, string>;

export default function NewCBBOReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetFpoId = searchParams.get("fpo_id");
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});

  const [fpoId, setFpoId] = useState(presetFpoId ?? "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [activities, setActivities] = useState("");
  const [participantsCount, setParticipantsCount] = useState("0");
  const [outcomes, setOutcomes] = useState("");

  useEffect(() => {
    translationsApi
      .getPublic(locale, "cbbo_reports_new,common")
      .then((data) => {
        setT({ ...(data.cbbo_reports_new ?? {}), ...(data.common ?? {}) });
      })
      .catch(() => undefined);
  }, [locale]);

  const { data: assignedFpos, isLoading: fposLoading } = useQuery({
    queryKey: ["cbbo", "fpos", "select-options"],
    queryFn: () => cbboFposApi.getAll({ page: 1, page_size: 200 }),
  });

  const fpoOptions = (assignedFpos?.data ?? []).map((f) => ({
    value: String(f.id),
    label: `${f.name} (${f.district_display ?? f.district})`,
  }));

  const { data: fpo } = useQuery({
    queryKey: ["cbbo-fpo", fpoId],
    queryFn: () => cbboFposApi.getById(Number(fpoId)),
    enabled: !!fpoId,
  });

  const mutation = useMutation({
    mutationFn: () =>
      cbboReportsApi.create({
        fpo_id: Number(fpoId),
        date,
        activities,
        participants_count: Number(participantsCount) || 0,
        outcomes,
      }),
    onSuccess: () => {
      toast.success(t.toast_saved ?? "Report saved as draft");
      router.push("/cbbo/reports");
    },
    onError: (error: unknown) => {
      const msg = (error as { data?: { message?: string } })?.data?.message;
      toast.error(msg ?? (t.toast_save_failed ?? "Failed to save report"));
    },
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-bold text-2xl">{t.page_title ?? "New Report"}</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">
          {t.page_description ?? "This report saves as a draft - submit it separately once ready."}
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!fpoId) {
            toast.error(t.error_select_fpo ?? "Select an FPO");
            return;
          }
          if (activities.trim().length < 10) {
            toast.error(t.error_activities_length ?? "Activities must be at least 10 characters");
            return;
          }
          mutation.mutate();
        }}
      >
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.section_title ?? "Report Details"}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Field>
                <FieldLabel htmlFor="fpo-id">
                  {t.field_fpo ?? "FPO"} <span className="text-destructive">*</span>
                </FieldLabel>
                <SearchableSelect
                  value={fpoId}
                  onChange={setFpoId}
                  options={fpoOptions}
                  placeholder={fposLoading ? (t.placeholder_fpo_loading ?? "Loading FPOs...") : (t.placeholder_fpo_search ?? "Search your assigned FPOs...")}
                  disabled={!!presetFpoId || fposLoading}
                />
                {fpo && (
                  <p className="mt-1 text-muted-foreground text-xs">
                    {t.label_selected ?? "Selected"}: {fpo.name} ({fpo.district_display ?? fpo.district})
                  </p>
                )}
              </Field>
              <FieldGroup className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="report-date">
                    {t.field_date ?? "Date"} <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input id="report-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="participants">{t.field_participants ?? "Participants Count"}</FieldLabel>
                  <Input
                    id="participants"
                    type="number"
                    min={0}
                    value={participantsCount}
                    onChange={(e) => setParticipantsCount(e.target.value)}
                  />
                </Field>
              </FieldGroup>
              <Field>
                <FieldLabel htmlFor="activities">
                  {t.field_activities ?? "Activities"} <span className="text-destructive">*</span>
                </FieldLabel>
                <Textarea
                  id="activities"
                  value={activities}
                  onChange={(e) => setActivities(e.target.value)}
                  placeholder={t.placeholder_activities ?? "What was done during the visit (min 10 characters)"}
                  rows={4}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="outcomes">{t.field_outcomes ?? "Outcomes"}</FieldLabel>
                <Textarea id="outcomes" value={outcomes} onChange={(e) => setOutcomes(e.target.value)} rows={3} />
              </Field>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.push("/cbbo/reports")}>
              {t.btn_cancel ?? "Cancel"}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (t.btn_saving ?? "Saving...") : (t.btn_save ?? "Save Draft")}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
