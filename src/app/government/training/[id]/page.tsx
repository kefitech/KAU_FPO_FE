"use client";

import { useEffect, useState } from "react";

import { useParams, useRouter } from "next/navigation";

import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { govtTrainingApi } from "@/app/government/_api/training";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

type T = Record<string, string>;

export default function EditTrainingSessionPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const sessionId = Number(params.id);
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});

  useEffect(() => {
    translationsApi
      .getPublic(locale, "government_training_new")
      .then((data) => setT(data.government_training_new ?? {}))
      .catch(() => undefined);
  }, [locale]);

  const { data: session, isLoading } = useQuery({
    queryKey: ["government", "training-session", sessionId],
    queryFn: () => govtTrainingApi.getById(sessionId),
    enabled: Number.isFinite(sessionId),
  });

  const [topic, setTopic] = useState("");
  const [trainerName, setTrainerName] = useState("");
  const [date, setDate] = useState("");
  const [durationHours, setDurationHours] = useState("2");
  const [participantsCount, setParticipantsCount] = useState("0");
  const [venue, setVenue] = useState("");

  useEffect(() => {
    if (!session) return;
    setTopic(session.topic);
    setTrainerName(session.trainer_name ?? "");
    setDate(session.date);
    setDurationHours(String(session.duration_hours));
    setParticipantsCount(String(session.participants_count));
    setVenue(session.venue ?? "");
  }, [session]);

  const mutation = useMutation({
    mutationFn: () =>
      govtTrainingApi.update(sessionId, {
        topic,
        date,
        duration_hours: Number(durationHours),
        participants_count: Number(participantsCount) || 0,
        venue,
      }),
    onSuccess: () => {
      toast.success(t.toast_updated ?? "Training session updated");
      router.push("/government/training");
    },
    onError: (error: unknown) => {
      const msg = (error as { data?: { message?: string } })?.data?.message;
      toast.error(msg ?? "Failed to update session");
    },
  });

  if (!Number.isFinite(sessionId)) {
    return (
      <div className="p-6">
        <p className="text-destructive text-sm">Invalid session.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <div className="h-7 w-56 animate-pulse rounded bg-muted" />
        <div className="h-64 w-full max-w-2xl animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-6">
        <p className="text-destructive text-sm">
          Session not found, or you don't have permission to edit it.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-bold text-2xl">{t.edit_title ?? "Edit Training Session"}</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">
          {t.edit_subtitle ?? "Update the details of this session"}
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!topic || !date) {
            toast.error(t.validation_required ?? "Fill in topic and date");
            return;
          }
          mutation.mutate();
        }}
      >
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.section_details ?? "Session Details"}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Field>
                <FieldLabel>{t.field_fpo ?? "FPO"}</FieldLabel>
                <Input value={session.fpo_name} disabled readOnly />
              </Field>
              <Field>
                <FieldLabel htmlFor="topic">{t.field_topic ?? "Topic"} *</FieldLabel>
                <Input
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder={t.placeholder_topic ?? "e.g. Organic Farming Practices"}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="trainer-name">{t.field_trainer_name ?? "Trainer Name"}</FieldLabel>
                <Input
                  id="trainer-name"
                  value={trainerName}
                  onChange={(e) => setTrainerName(e.target.value)}
                  placeholder={t.placeholder_trainer_name ?? "Name of the person who conducted the session"}
                />
              </Field>
              <FieldGroup className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="date">{t.field_date ?? "Date"} *</FieldLabel>
                  <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="duration">{t.field_duration ?? "Duration (hours)"}</FieldLabel>
                  <Input
                    id="duration"
                    type="number"
                    step="0.5"
                    value={durationHours}
                    onChange={(e) => setDurationHours(e.target.value)}
                  />
                </Field>
              </FieldGroup>
              <FieldGroup className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="participants">{t.field_participants ?? "Participants"}</FieldLabel>
                  <Input
                    id="participants"
                    type="number"
                    min={0}
                    value={participantsCount}
                    onChange={(e) => setParticipantsCount(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="venue">{t.field_venue ?? "Venue"}</FieldLabel>
                  <Input
                    id="venue"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder={t.placeholder_venue ?? "Optional"}
                  />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.push("/government/training")}>
              {t.btn_cancel ?? "Cancel"}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (t.btn_saving ?? "Saving...") : (t.btn_save ?? "Save Changes")}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}