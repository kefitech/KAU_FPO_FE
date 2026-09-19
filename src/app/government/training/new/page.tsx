"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { CommodityInput } from "@/app/fpo/(wizard)/register/_components/commodity-input";
import { govtFposApi } from "@/app/government/_api/fpos";
import { govtTrainingApi } from "@/app/government/_api/training";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

type T = Record<string, string>;

export default function NewTrainingSessionPage() {
  const router = useRouter();
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});

  useEffect(() => {
    translationsApi
      .getPublic(locale, "government_training_new")
      .then((data) => setT(data.government_training_new ?? {}))
      .catch(() => undefined);
  }, [locale]);

  const { data: fpoData, isLoading: fposLoading } = useQuery({
    queryKey: ["government-fpos-for-training-picker"],
    queryFn: () => govtFposApi.getAll({ page: 1, page_size: 500 }),
  });
  const fpoOptions = (fpoData?.data ?? []).map((f) => ({ code: f.application_id, name: f.name }));

  const [fpoIds, setFpoIds] = useState<string[]>([]);
  const [topic, setTopic] = useState("");
  const [trainerName, setTrainerName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [durationHours, setDurationHours] = useState("2");
  const [participantsCount, setParticipantsCount] = useState("0");
  const [venue, setVenue] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      govtTrainingApi.create({
        fpo_application_ids: fpoIds,
        topic,
        trainer_name: trainerName,
        date,
        duration_hours: Number(durationHours),
        participants_count: Number(participantsCount) || 0,
        venue,
      }),
    onSuccess: (result: any) => {
      toast.success(result?.message ?? t.toast_created ?? "Training session recorded");
      router.push("/government/training");
    },
    onError: (error: unknown) => {
      const msg = (error as { data?: { message?: string } })?.data?.message;
      toast.error(msg ?? "Failed to save session");
    },
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-bold text-2xl">{t.create_title ?? "New Training Session"}</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">
          {t.create_subtitle ?? "Log a session you conducted for one or more FPOs"}
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (fpoIds.length === 0 || !topic || !date) {
            toast.error(t.validation_required ?? "Select at least one FPO and fill in topic and date");
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
                <FieldLabel htmlFor="fpo-picker">{t.field_fpos ?? "FPO(s)"} *</FieldLabel>
                <CommodityInput
                  value={fpoIds}
                  onChange={setFpoIds}
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
              </FieldGroup>
              <FieldGroup className="grid grid-cols-2 gap-4">
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
              </FieldGroup>
              <FieldGroup className="grid grid-cols-2 gap-4">
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
              {mutation.isPending ? (t.btn_saving ?? "Saving...") : (t.btn_save ?? "Save Session")}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
