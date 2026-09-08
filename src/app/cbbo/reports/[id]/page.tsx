"use client";

import { use, useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { cbboReportsApi } from "@/app/cbbo/_api/reports";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useConfirmStore } from "@/stores/confirm-store";

export default function CBBOReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);

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
      toast.success("Report updated");
      queryClient.invalidateQueries({ queryKey: ["cbbo-report", id] });
      queryClient.invalidateQueries({ queryKey: ["cbbo-reports"] });
    },
    onError: (error: unknown) => {
      const msg = (error as { data?: { message?: string } })?.data?.message;
      toast.error(msg ?? "Failed to update report");
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => cbboReportsApi.submit(Number(id)),
    onSuccess: () => {
      toast.success("Report submitted — it's now locked");
      queryClient.invalidateQueries({ queryKey: ["cbbo-report", id] });
      queryClient.invalidateQueries({ queryKey: ["cbbo-reports"] });
    },
    onError: (error: unknown) => {
      const msg = (error as { data?: { message?: string } })?.data?.message;
      toast.error(msg ?? "Failed to submit report");
    },
  });

  function handleSubmitReport() {
    confirm({
      title: "Submit Report",
      description: "Once submitted, this report is locked and can no longer be edited. Continue?",
      confirmLabel: "Submit",
      confirmingLabel: "Submitting...",
      variant: "default",
      onConfirm: () => submitMutation.mutateAsync(),
    });
  }

  if (isLoading || !report) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-2xl">{report.fpo_name}</h1>
            {report.status === "submitted" ? (
              <Badge
                variant="outline"
                className="border-green-500/40 bg-green-500/10 text-[11px] text-green-700 dark:text-green-400"
              >
                Submitted
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-yellow-500/40 bg-yellow-500/10 text-[11px] text-yellow-700 dark:text-yellow-400"
              >
                Draft
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-muted-foreground text-sm">
            Filed by {report.cbbo_name} on {new Date(report.created_at).toLocaleDateString()}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => router.push("/cbbo/reports")}>
          Back to Reports
        </Button>
      </div>

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Report Details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <FieldGroup className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="report-date">Date</FieldLabel>
                <Input
                  id="report-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={!isDraft}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="participants">Participants Count</FieldLabel>
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
              <FieldLabel htmlFor="activities">Activities</FieldLabel>
              <Textarea
                id="activities"
                value={activities}
                onChange={(e) => setActivities(e.target.value)}
                rows={4}
                disabled={!isDraft}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="outcomes">Outcomes</FieldLabel>
              <Textarea
                id="outcomes"
                value={outcomes}
                onChange={(e) => setOutcomes(e.target.value)}
                rows={3}
                disabled={!isDraft}
              />
            </Field>
          </CardContent>
        </Card>

        {isDraft && (
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
            <Button type="button" onClick={handleSubmitReport} disabled={submitMutation.isPending}>
              {submitMutation.isPending ? "Submitting..." : "Submit Report"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
