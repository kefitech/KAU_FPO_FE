"use client";

import { useEffect, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { cbboFposApi } from "@/app/cbbo/_api/fpos";
import { cbboReportsApi } from "@/app/cbbo/_api/reports";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Textarea } from "@/components/ui/textarea";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

type T = Record<string, string>;

const MAX_PARTICIPANTS = 100000;
const MAX_PARTICIPANTS_DIGITS = String(MAX_PARTICIPANTS).length;

// Fixed height with vertical scroll for long text
const SCROLL_TEXTAREA_CLASS =
  "field-sizing-fixed min-h-24 max-h-48 resize-none overflow-y-auto whitespace-pre-wrap break-words";

function getErrorMessage(error: unknown): string | undefined {
  const e = error as {
    data?: { message?: string };
    response?: { data?: { message?: string } };
  };
  return e?.response?.data?.message ?? e?.data?.message;
}

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
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    mutationFn: (payload: {
      fpo_id: number;
      date: string;
      activities: string;
      participants_count: number;
      outcomes: string;
    }) => cbboReportsApi.create(payload),
    onSuccess: () => {
      toast.success(t.toast_saved ?? "Report saved as draft");
      router.push("/cbbo/reports");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) ?? t.toast_save_failed ?? "Failed to save report");
    },
  });

  function clearError(field: string) {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function handleParticipantsChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, MAX_PARTICIPANTS_DIGITS);
    if (digits === "") {
      setParticipantsCount("");
    } else {
      setParticipantsCount(String(Math.min(Number(digits), MAX_PARTICIPANTS)));
    }
    clearError("participants_count");
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!fpoId) {
      newErrors.fpo_id = t.error_select_fpo ?? "Select an FPO";
    }

    if (activities.trim().length < 10) {
      newErrors.activities = t.error_activities_length ?? "Activities must be at least 10 characters";
    }

    const countStr = participantsCount.trim() === "" ? "0" : participantsCount.trim();
    const count = Number(countStr);
    if (!/^\d+$/.test(countStr) || !Number.isSafeInteger(count) || count < 0 || count > MAX_PARTICIPANTS) {
      newErrors.participants_count =
        t.error_participants_range ?? `Participants count must be between 0 and ${MAX_PARTICIPANTS}`;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error(Object.values(newErrors)[0]);
      return;
    }

    setErrors({});
    mutation.mutate({
      fpo_id: Number(fpoId),
      date,
      activities: activities.trim(),
      participants_count: count,
      outcomes: outcomes.trim(),
    });
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-bold text-2xl">{t.page_title ?? "New Report"}</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">
          {t.page_description ?? "This report saves as a draft - submit it separately once ready."}
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.section_title ?? "Report Details"}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Field data-invalid={!!errors.fpo_id}>
                <FieldLabel htmlFor="fpo-id">
                  {t.field_fpo ?? "FPO"} <span className="text-destructive">*</span>
                </FieldLabel>
                <SearchableSelect
                  value={fpoId}
                  onChange={(v) => {
                    setFpoId(v);
                    clearError("fpo_id");
                  }}
                  options={fpoOptions}
                  placeholder={
                    fposLoading
                      ? (t.placeholder_fpo_loading ?? "Loading FPOs...")
                      : (t.placeholder_fpo_search ?? "Search your assigned FPOs...")
                  }
                  disabled={!!presetFpoId || fposLoading}
                />
                {fpo && (
                  <p className="mt-1 text-muted-foreground text-xs">
                    {t.label_selected ?? "Selected"}: {fpo.name} ({fpo.district_display ?? fpo.district})
                  </p>
                )}
                {errors.fpo_id && <FieldError errors={[{ message: errors.fpo_id }]} />}
              </Field>

              <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="report-date">
                    {t.field_date ?? "Date"} <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input id="report-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </Field>

                <Field data-invalid={!!errors.participants_count}>
                  <FieldLabel htmlFor="participants">{t.field_participants ?? "Participants Count"}</FieldLabel>
                  <Input
                    id="participants"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={MAX_PARTICIPANTS_DIGITS}
                    value={participantsCount}
                    onChange={(e) => handleParticipantsChange(e.target.value)}
                    onFocus={(e) => e.target.select()}
                  />
                  {errors.participants_count && <FieldError errors={[{ message: errors.participants_count }]} />}
                </Field>
              </FieldGroup>

              <Field data-invalid={!!errors.activities}>
                <FieldLabel htmlFor="activities">
                  {t.field_activities ?? "Activities"} <span className="text-destructive">*</span>
                </FieldLabel>
                <Textarea
                  id="activities"
                  value={activities}
                  onChange={(e) => {
                    setActivities(e.target.value);
                    clearError("activities");
                  }}
                  placeholder={t.placeholder_activities ?? "What was done during the visit (min 10 characters)"}
                  rows={4}
                  className={SCROLL_TEXTAREA_CLASS}
                />
                {errors.activities && <FieldError errors={[{ message: errors.activities }]} />}
              </Field>

              <Field>
                <FieldLabel htmlFor="outcomes">{t.field_outcomes ?? "Outcomes"}</FieldLabel>
                <Textarea
                  id="outcomes"
                  value={outcomes}
                  onChange={(e) => setOutcomes(e.target.value)}
                  rows={3}
                  className={SCROLL_TEXTAREA_CLASS}
                />
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
