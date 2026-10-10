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
import {
  blockNonNumeric,
  MAX_TRAINING_PARTICIPANTS,
  type SessionFieldKey,
  todayLocalISO,
  validateTrainingSession,
} from "@/lib/validations/training-session";
import { useLocaleStore } from "@/stores/locale-store";

// Same cap as the backend serializer (TOPIC_MAX_CHARS); the column allows 300.
const TOPIC_MAX_CHARS = 200;

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

  // Validation state, same behaviour as the create form
  const [touched, setTouched] = useState<Partial<Record<SessionFieldKey, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const touch = (key: SessionFieldKey) => setTouched((prev) => ({ ...prev, [key]: true }));

  const errors = validateTrainingSession(
    { topic, trainerName, date, durationHours, participantsCount, venue },
    t,
    session?.date,
  );
  const hasErrors = Object.keys(errors).length > 0;
  const showError = (key: SessionFieldKey) => (touched[key] || submitAttempted ? errors[key] : undefined);
  const errorText = (msg?: string) => (msg ? <p className="mt-1 text-destructive text-xs">{msg}</p> : null);

  const mutation = useMutation({
    mutationFn: () =>
      cbboTrainingApi.update(sessionId, {
        topic: topic.trim(),
        trainer_name: trainerName.trim(),
        date,
        duration_hours: Number(durationHours),
        participants_count: Number(participantsCount) || 0,
        venue: venue.trim(),
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
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitAttempted(true);
          if (hasErrors) {
            toast.error(t.validation_fix_errors ?? "Please fix the highlighted fields");
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
                  maxLength={TOPIC_MAX_CHARS}
                  aria-invalid={!!showError("topic")}
                  onChange={(e) => {
                    setTopic(e.target.value);
                    touch("topic");
                  }}
                  onBlur={() => touch("topic")}
                  placeholder={t.placeholder_topic ?? "e.g. Organic Farming Practices"}
                />
                <p className="text-right text-muted-foreground text-xs">
                  {topic.length}/{TOPIC_MAX_CHARS}
                </p>
                {errorText(showError("topic"))}
              </Field>
              <Field>
                <FieldLabel htmlFor="trainer-name">{t.field_trainer_name ?? "Trainer Name"} *</FieldLabel>
                <Input
                  id="trainer-name"
                  value={trainerName}
                  maxLength={100}
                  aria-invalid={!!showError("trainer")}
                  onChange={(e) => {
                    setTrainerName(e.target.value);
                    touch("trainer");
                  }}
                  onBlur={() => touch("trainer")}
                  placeholder={t.placeholder_trainer_name ?? "Name of the person who conducted the session"}
                />
                {errorText(showError("trainer"))}
              </Field>
              <FieldGroup className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="date">{t.field_date ?? "Date"} *</FieldLabel>
                  <Input
                    id="date"
                    type="date"
                    // A past session keeps its saved date selectable
                    min={session.date < todayLocalISO() ? session.date : todayLocalISO()}
                    value={date}
                    aria-invalid={!!showError("date")}
                    onChange={(e) => {
                      setDate(e.target.value);
                      touch("date");
                    }}
                    onBlur={() => touch("date")}
                  />
                  {errorText(showError("date"))}
                </Field>
                <Field>
                  <FieldLabel htmlFor="duration">{t.field_duration ?? "Duration (hours)"} *</FieldLabel>
                  <Input
                    id="duration"
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    min={0.5}
                    max={24}
                    value={durationHours}
                    aria-invalid={!!showError("duration")}
                    onKeyDown={blockNonNumeric(true)}
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) => {
                      setDurationHours(e.target.value);
                      touch("duration");
                    }}
                    onBlur={() => touch("duration")}
                  />
                  {errorText(showError("duration"))}
                </Field>
              </FieldGroup>
              <FieldGroup className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="participants">{t.field_participants ?? "Participants"} *</FieldLabel>
                  <Input
                    id="participants"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={MAX_TRAINING_PARTICIPANTS}
                    step={1}
                    value={participantsCount}
                    aria-invalid={!!showError("participants")}
                    onKeyDown={blockNonNumeric(false)}
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) => {
                      setParticipantsCount(e.target.value);
                      touch("participants");
                    }}
                    onBlur={() => touch("participants")}
                  />
                  {errorText(showError("participants"))}
                </Field>
                <Field>
                  <FieldLabel htmlFor="venue">{t.field_venue ?? "Venue"} *</FieldLabel>
                  <Input
                    id="venue"
                    value={venue}
                    maxLength={200}
                    aria-invalid={!!showError("venue")}
                    onChange={(e) => {
                      setVenue(e.target.value);
                      touch("venue");
                    }}
                    onBlur={() => touch("venue")}
                    placeholder={t.placeholder_venue_required ?? "e.g. Panchayat Hall"}
                  />
                  {errorText(showError("venue"))}
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
