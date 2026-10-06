"use client";

import { useEffect, useState } from "react";

import { useParams, useRouter } from "next/navigation";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";

import { apiErrorMessage, cbboTrainingApi } from "@/app/cbbo/_api/training";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { translationsApi } from "@/lib/api/translations";
import { hasLetterOrDigit } from "@/lib/validations/text";
import { useLocaleStore } from "@/stores/locale-store";

type T = Record<string, string>;

export default function EditCbboTrainingSessionPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useParams<{ id: string }>();
  const sessionId = Number(params.id);
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});

  useEffect(() => {
    translationsApi
      .getPublic(locale, "government_training_new,common")
      .then((data) => setT({ ...(data.common ?? {}), ...(data.government_training_new ?? {}) }))
      .catch(() => undefined);
  }, [locale]);

  const { data: session, isLoading } = useQuery({
    queryKey: ["cbbo", "training-session", sessionId],
    queryFn: () => cbboTrainingApi.getById(sessionId),
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
      cbboTrainingApi.update(sessionId, {
        topic,
        trainer_name: trainerName,
        date,
        duration_hours: Number(durationHours),
        participants_count: Number(participantsCount) || 0,
        venue,
      }),
    onSuccess: () => {
      toast.success(t.toast_updated ?? "Training session updated");
      queryClient.invalidateQueries({ queryKey: ["cbbo-training-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["cbbo", "training-session", sessionId] });
      router.push("/cbbo/training");
    },
    onError: (error: unknown) => {
      toast.error(apiErrorMessage(error, "Failed to update session"));
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

  if (!session || !session.can_edit) {
    return (
      <div className="p-6">
        <p className="text-destructive text-sm">Session not found, or you don&apos;t have permission to edit it.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <button
        type="button"
        onClick={() => router.push("/cbbo/training")}
        className="flex w-fit items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> {t.back ?? "Back"}
      </button>

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
          const symbolsOnly = (value: string) => value.trim() !== "" && !hasLetterOrDigit(value);
          if (symbolsOnly(topic)) {
            toast.error(t.err_topic_symbols ?? "Topic must contain letters or numbers, not only symbols");
            return;
          }
          if (symbolsOnly(trainerName)) {
            toast.error(t.err_trainer_symbols ?? "Trainer name must contain letters or numbers, not only symbols");
            return;
          }
          if (symbolsOnly(venue)) {
            toast.error(t.err_venue_symbols ?? "Venue must contain letters or numbers, not only symbols");
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
            <Button type="button" variant="outline" onClick={() => router.push("/cbbo/training")}>
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
