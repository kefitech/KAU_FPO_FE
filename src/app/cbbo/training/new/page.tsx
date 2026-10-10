"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";

import { cbboFposApi } from "@/app/cbbo/_api/fpos";
import { apiErrorMessage, cbboTrainingApi } from "@/app/cbbo/_api/training";
import { CommodityInput } from "@/app/fpo/(wizard)/register/_components/commodity-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

// Same cap as the backend serializer (TOPIC_MAX_CHARS); the column allows 300.
const TOPIC_MAX_CHARS = 200;

type T = Record<string, string>;

// Labels are shared with the government form.
const TRANSLATION_NS = "government_training_new";

type FieldKey = "fpo" | "topic" | "trainer" | "date" | "time" | "duration" | "participants" | "venue";
type FieldErrors = Partial<Record<FieldKey, string>>;

// Today's date as YYYY-MM-DD in local time (IST)
const todayLocalISO = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};

// Current time as HH:MM in local time
const nowLocalHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

// Letters in English or Malayalam
const HAS_LETTER = /[A-Za-z\u0D00-\u0D7F]/;
// Names: letters, spaces, dots, apostrophes, hyphens only
const NAME_PATTERN = /^[A-Za-z\u0D00-\u0D7F\s.'-]+$/;

// Block e, E, +, - (and "." for whole numbers) in number inputs
const blockNonNumeric = (allowDecimal: boolean) => (e: React.KeyboardEvent<HTMLInputElement>) => {
  const blocked = ["e", "E", "+", "-"];
  if (!allowDecimal) blocked.push(".");
  if (blocked.includes(e.key)) e.preventDefault();
};

export default function NewCbboTrainingSessionPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});

  useEffect(() => {
    translationsApi
      .getPublic(locale, `${TRANSLATION_NS},common`)
      .then((data) => setT({ ...(data.common ?? {}), ...(data[TRANSLATION_NS] ?? {}) }))
      .catch(() => undefined);
  }, [locale]);

  // Only FPOs assigned to this officer come back from /cbbo/fpos/; approved only, since
  // sessions can't be scheduled for drafts or pending applications
  const { data: fpoData, isLoading: fposLoading } = useQuery({
    queryKey: ["cbbo-fpos-for-training-picker", "approved"],
    queryFn: () => cbboFposApi.getAll({ page: 1, page_size: 500, status: "approved" }),
  });
  const fpoOptions = (fpoData?.data ?? [])
    .filter((f) => f.application_id)
    .map((f) => ({ code: f.application_id, name: f.name }));

  const [fpoIds, setFpoIds] = useState<string[]>([]);
  const [topic, setTopic] = useState("");
  const [trainerName, setTrainerName] = useState("");
  const [date, setDate] = useState(todayLocalISO());
  const [time, setTime] = useState("");
  const [durationHours, setDurationHours] = useState("2");
  const [participantsCount, setParticipantsCount] = useState("0");
  const [venue, setVenue] = useState("");

  // Validation state
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const touch = (key: FieldKey) => setTouched((prev) => ({ ...prev, [key]: true }));

  // Recomputed on every render, so errors are always current
  const errors: FieldErrors = (() => {
    const e: FieldErrors = {};

    // FPO(s): at least one
    if (fpoIds.length === 0) {
      e.fpo = t.err_fpo_required ?? "Select at least one FPO";
    }

    // Topic: required, 3 – 200 characters, must contain letters
    const tp = topic.trim();
    if (tp === "") {
      e.topic = t.err_topic_required ?? "Topic is required";
    } else if (tp.length < 3) {
      e.topic = t.err_topic_min ?? "Topic must be at least 3 characters";
    } else if (tp.length > TOPIC_MAX_CHARS) {
      e.topic = t.err_topic_max ?? "Topic must be under 200 characters";
    } else if (!HAS_LETTER.test(tp)) {
      e.topic = t.err_topic_invalid ?? "Enter a valid topic";
    }

    // Trainer name: required, 2 – 100 characters, letters only
    const tr = trainerName.trim();
    if (tr === "") {
      e.trainer = t.err_trainer_required ?? "Trainer name is required";
    } else if (tr.length < 2) {
      e.trainer = t.err_trainer_min ?? "Trainer name must be at least 2 characters";
    } else if (tr.length > 100) {
      e.trainer = t.err_trainer_max ?? "Trainer name must be under 100 characters";
    } else if (!NAME_PATTERN.test(tr) || !HAS_LETTER.test(tr)) {
      e.trainer = t.err_trainer_invalid ?? "Trainer name can contain only letters and spaces";
    }

    // Date: required, valid, today or later (upcoming sessions)
    if (!date) {
      e.date = t.err_date_required ?? "Date is required";
    } else if (Number.isNaN(Date.parse(date))) {
      e.date = t.err_date_invalid ?? "Enter a valid date";
    } else if (date < todayLocalISO()) {
      e.date = t.err_date_past ?? "Date cannot be in the past";
    }

    // Time: required, and not already passed if the date is today
    if (!time) {
      e.time = t.err_time_required ?? "Time is required";
    } else if (!/^\d{2}:\d{2}/.test(time)) {
      e.time = t.err_time_invalid ?? "Enter a valid time";
    } else if (date === todayLocalISO() && time.slice(0, 5) < nowLocalHHMM()) {
      e.time = t.err_time_past ?? "Time cannot be in the past";
    }

    // Duration: required, > 0, <= 24, steps of 0.5
    const duration = Number(durationHours);
    if (durationHours.trim() === "") {
      e.duration = t.err_duration_required ?? "Duration is required";
    } else if (Number.isNaN(duration)) {
      e.duration = t.err_duration_invalid ?? "Enter a valid number";
    } else if (duration <= 0) {
      e.duration = t.err_duration_min ?? "Duration must be greater than 0";
    } else if (duration > 24) {
      e.duration = t.err_duration_max ?? "Duration cannot exceed 24 hours";
    } else if (!Number.isInteger(duration * 2)) {
      e.duration = t.err_duration_step ?? "Use increments of 0.5 hours";
    }

    // Participants: required, whole number, 1 – 10,000
    const participants = Number(participantsCount);
    if (participantsCount.trim() === "") {
      e.participants = t.err_participants_required ?? "Participants is required";
    } else if (Number.isNaN(participants) || !Number.isInteger(participants)) {
      e.participants = t.err_participants_int ?? "Participants must be a whole number";
    } else if (participants < 1) {
      e.participants = t.err_participants_min ?? "At least 1 participant is required";
    } else if (participants > 10000) {
      e.participants = t.err_participants_max ?? "Participants cannot exceed 10,000";
    }

    // Venue: required, 3 – 200 characters, must contain letters
    const v = venue.trim();
    if (v === "") {
      e.venue = t.err_venue_required ?? "Venue is required";
    } else if (v.length < 3) {
      e.venue = t.err_venue_min ?? "Venue must be at least 3 characters";
    } else if (v.length > 200) {
      e.venue = t.err_venue_max ?? "Venue must be under 200 characters";
    } else if (!HAS_LETTER.test(v)) {
      e.venue = t.err_venue_invalid ?? "Enter a valid venue name";
    }

    return e;
  })();

  const hasErrors = Object.keys(errors).length > 0;
  const showError = (key: FieldKey) => (touched[key] || submitAttempted ? errors[key] : undefined);

  const mutation = useMutation({
    mutationFn: () =>
      cbboTrainingApi.create({
        fpo_application_ids: fpoIds,
        topic: topic.trim(),
        trainer_name: trainerName.trim(),
        date,
        time,
        duration_hours: Number(durationHours),
        participants_count: Number(participantsCount) || 0,
        venue: venue.trim(),
      }),
    onSuccess: (result) => {
      // The server message names any selected FPOs that were skipped.
      toast.success(result?.message ?? t.toast_created ?? "Training session recorded");
      queryClient.invalidateQueries({ queryKey: ["cbbo-training-sessions"] });
      router.push("/cbbo/training");
    },
    onError: (error: unknown) => {
      toast.error(apiErrorMessage(error, t.toast_create_failed ?? "Failed to save session"));
    },
  });

  const errorText = (msg?: string) => (msg ? <p className="mt-1 text-destructive text-xs">{msg}</p> : null);

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
        <h1 className="font-bold text-2xl">{t.create_title ?? "New Training Session"}</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">
          {t.create_subtitle ?? "Log a session you conducted for one or more FPOs"}
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
              {/* FPO(s) */}
              <Field>
                <FieldLabel htmlFor="fpo-picker">{t.field_fpos ?? "FPO(s)"} *</FieldLabel>
                <CommodityInput
                  value={fpoIds}
                  onChange={(value) => {
                    setFpoIds(value);
                    touch("fpo");
                  }}
                  disabled={fposLoading}
                  options={fpoOptions}
                  placeholder={
                    fposLoading ? (t.loading_fpos ?? "Loading FPOs…") : (t.placeholder_select_fpo ?? "Select FPO(s)…")
                  }
                  selectedLabel={(count) =>
                    (t.fpos_selected ?? "{count} FPO(s) selected").replace("{count}", String(count))
                  }
                  searchPlaceholder={t.search_fpo ?? "Search FPOs…"}
                  noResultsLabel={t.no_results ?? "No FPOs found"}
                />
                {errorText(showError("fpo"))}
              </Field>

              {/* Topic */}
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

              {/* Trainer name */}
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

              {/* Date + Time */}
              <FieldGroup className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="date">{t.field_date ?? "Date"} *</FieldLabel>
                  <Input
                    id="date"
                    type="date"
                    min={todayLocalISO()}
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
                  <FieldLabel htmlFor="time">{t.field_time ?? "Time"} *</FieldLabel>
                  <Input
                    id="time"
                    type="time"
                    value={time}
                    aria-invalid={!!showError("time")}
                    onChange={(e) => {
                      setTime(e.target.value);
                      touch("time");
                    }}
                    onBlur={() => touch("time")}
                  />
                  {errorText(showError("time"))}
                </Field>
              </FieldGroup>

              {/* Duration + Participants */}
              <FieldGroup className="grid grid-cols-2 gap-4">
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
                <Field>
                  <FieldLabel htmlFor="participants">{t.field_participants ?? "Participants"} *</FieldLabel>
                  <Input
                    id="participants"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={10000}
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
              </FieldGroup>

              {/* Venue */}
              <FieldGroup className="grid grid-cols-2 gap-4">
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
              {mutation.isPending ? (t.btn_saving ?? "Saving...") : (t.btn_save ?? "Save Session")}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
