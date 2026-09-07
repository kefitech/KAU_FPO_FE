"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { govtTrainingApi } from "@/app/government/_api/training";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default function NewTrainingSessionPage() {
  const router = useRouter();
  const [fpoId, setFpoId] = useState("");
  const [topic, setTopic] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [durationHours, setDurationHours] = useState("2");
  const [participantsCount, setParticipantsCount] = useState("0");
  const [venue, setVenue] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      govtTrainingApi.create({
        fpo_id: Number(fpoId),
        topic,
        date,
        duration_hours: Number(durationHours),
        participants_count: Number(participantsCount) || 0,
        venue,
      }),
    onSuccess: () => {
      toast.success("Training session recorded");
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
        <h1 className="font-bold text-2xl">New Training Session</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">Log a session you conducted for an FPO</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!fpoId || !topic || !date) {
            toast.error("Fill in FPO ID, topic, and date");
            return;
          }
          mutation.mutate();
        }}
      >
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Session Details</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Field>
                <FieldLabel htmlFor="fpo-id">FPO ID *</FieldLabel>
                <Input id="fpo-id" type="number" value={fpoId} onChange={(e) => setFpoId(e.target.value)} placeholder="Enter FPO id" />
              </Field>
              <Field>
                <FieldLabel htmlFor="topic">Topic *</FieldLabel>
                <Input id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Organic Farming Practices" />
              </Field>
              <FieldGroup className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="date">Date *</FieldLabel>
                  <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="duration">Duration (hours)</FieldLabel>
                  <Input id="duration" type="number" step="0.5" value={durationHours} onChange={(e) => setDurationHours(e.target.value)} />
                </Field>
              </FieldGroup>
              <FieldGroup className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="participants">Participants</FieldLabel>
                  <Input id="participants" type="number" min={0} value={participantsCount} onChange={(e) => setParticipantsCount(e.target.value)} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="venue">Venue</FieldLabel>
                  <Input id="venue" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Optional" />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.push("/government/training")}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : "Save Session"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
