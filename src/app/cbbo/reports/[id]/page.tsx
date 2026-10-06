"use client";

import { use, useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";

import { cbboReportsApi } from "@/app/cbbo/_api/reports";
import { apiErrorMessage } from "@/app/cbbo/_api/training";
import { SCROLL_TEXTAREA_CLASS, todayLocalISO } from "@/app/cbbo/reports/_lib/report-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { translationsApi } from "@/lib/api/translations";
import { hasLetterOrDigit } from "@/lib/validations/text";
import { useConfirmStore } from "@/stores/confirm-store";
import { useLocaleStore } from "@/stores/locale-store";

type T = Record<string, string>;

export default function CBBOReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});

  useEffect(() => {
    translationsApi
      .getPublic(locale, "cbbo_reports_detail,common")
      .then((data) => {
        setT({ ...(data.common ?? {}), ...(data.cbbo_reports_detail ?? {}) });
      })
      .catch(() => undefined);
  }, [locale]);

  const { data: report, isLoading } = useQuery({
    queryKey: ["cbbo-report", id],
    queryFn: () => cbboReportsApi.getById(Number(id)),
  });

  const [date, setDate] = useState("");
  const [activities, setActivities] = useState("");
  const [participantsCount, setParticipantsCount] = useState("0");
  const [outcomes, setOutcomes] = useState("");

  useEffect(() => {
    if (report) {
      setDate(report.date);
      setActivities(report.activities);
      setParticipantsCount(String(report.participants_count));
      setOutcomes(report.outcomes ?? "");
    }
  }, [report]);

  const isDraft = report?.status === "draft";

  const updateMutation = useMutation({
    mutationFn: () =>
      cbboReportsApi.update(Number(id), {
        date,
        activities,
        participants_count: Number(participantsCount) || 0,
        outcomes,
      }),
    onSuccess: () => {
      toast.success(t.toast_updated ?? "Report updated");
      queryClient.invalidateQueries({ queryKey: ["cbbo-report", id] });
      queryClient.invalidateQueries({ queryKey: ["cbbo-reports"] });
    },
    onError: (error: unknown) => {
      toast.error(apiErrorMessage(error, t.toast_update_failed ?? "Failed to update report"));
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => cbboReportsApi.submit(Number(id)),
    onSuccess: () => {
      toast.success(t.toast_submitted ?? "Report submitted - it's now locked");
      queryClient.invalidateQueries({ queryKey: ["cbbo-report", id] });
      queryClient.invalidateQueries({ queryKey: ["cbbo-reports"] });
    },
    onError: (error: unknown) => {
      const msg = (error as { data?: { message?: string } })?.data?.message;
      toast.error(msg ?? t.toast_submit_failed ?? "Failed to submit report");
    },
  });

  function handleSave() {
    // `max` only limits the picker; a typed-in date still needs checking
    if (date > todayLocalISO()) {
      toast.error(t.error_future_date ?? "Report date cannot be in the future");
      return;
    }
    if (activities.trim().length < 10) {
      toast.error(t.error_activities_length ?? "Activities must be at least 10 characters");
      return;
    }
    if (!hasLetterOrDigit(activities)) {
      toast.error(t.error_activities_symbols ?? "Activities must contain letters or numbers, not only symbols");
      return;
    }
    if (outcomes.trim() && !hasLetterOrDigit(outcomes)) {
      toast.error(t.error_outcomes_symbols ?? "Outcomes must contain letters or numbers, not only symbols");
      return;
    }
    updateMutation.mutate();
  }

  function handleSubmitReport() {
    confirm({
      title: t.confirm_submit_title ?? "Submit Report",
      description:
        t.confirm_submit_desc ?? "Once submitted, this report is locked and can no longer be edited. Continue?",
      confirmLabel: t.confirm_submit_btn ?? "Submit",
      confirmingLabel: t.confirm_submitting_btn ?? "Submitting...",
      variant: "default",
      onConfirm: () => submitMutation.mutateAsync(),
    });
  }

  if (isLoading || !report) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-sm">{t.loading ?? "Loading..."}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <button
        type="button"
        onClick={() => router.push("/cbbo/reports")}
        className="flex w-fit items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> {t.back ?? "Back"}
      </button>

      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-bold text-2xl">{report.fpo_name}</h1>
          {report.status === "submitted" ? (
            <Badge
              variant="outline"
              className="border-green-500/40 bg-green-500/10 text-[11px] text-green-700 dark:text-green-400"
            >
              {t.badge_submitted ?? "Submitted"}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="border-yellow-500/40 bg-yellow-500/10 text-[11px] text-yellow-700 dark:text-yellow-400"
            >
              {t.badge_draft ?? "Draft"}
            </Badge>
          )}
        </div>
        <p className="mt-0.5 text-muted-foreground text-sm">
          {t.filed_by ?? "Filed by"} {report.cbbo_name} {t.on_date ?? "on"}{" "}
          {new Date(report.created_at).toLocaleDateString()}
        </p>
      </div>

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.section_title ?? "Report Details"}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <FieldGroup className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="report-date">{t.field_date ?? "Date"}</FieldLabel>
                <Input
                  id="report-date"
                  type="date"
                  max={todayLocalISO()}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={!isDraft}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="participants">{t.field_participants ?? "Participants Count"}</FieldLabel>
                <Input
                  id="participants"
                  type="number"
                  min={0}
                  value={participantsCount}
                  onChange={(e) => setParticipantsCount(e.target.value)}
                  disabled={!isDraft}
                />
              </Field>
            </FieldGroup>
            <Field>
              <FieldLabel htmlFor="activities">{t.field_activities ?? "Activities"}</FieldLabel>
              <Textarea
                id="activities"
                value={activities}
                onChange={(e) => setActivities(e.target.value)}
                rows={4}
                className={SCROLL_TEXTAREA_CLASS}
                disabled={!isDraft}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="outcomes">{t.field_outcomes ?? "Outcomes"}</FieldLabel>
              <Textarea
                id="outcomes"
                value={outcomes}
                onChange={(e) => setOutcomes(e.target.value)}
                rows={3}
                className={SCROLL_TEXTAREA_CLASS}
                disabled={!isDraft}
              />
            </Field>
          </CardContent>
        </Card>

        {isDraft && (
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (t.btn_saving ?? "Saving...") : (t.btn_save_changes ?? "Save Changes")}
            </Button>
            <Button type="button" onClick={handleSubmitReport} disabled={submitMutation.isPending}>
              {submitMutation.isPending
                ? (t.btn_submitting ?? "Submitting...")
                : (t.btn_submit_report ?? "Submit Report")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
