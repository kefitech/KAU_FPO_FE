"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { adminMlModelsApi } from "@/app/admin/_api/ml-models";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const schema = z.object({
  version_code: z.string().max(20).optional(),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function TrainMlModelPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { version_code: "", description: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const formData = new FormData();
      if (file) formData.append("dataset_file", file);
      if (values.version_code) formData.append("version_code", values.version_code);
      if (values.description) formData.append("description", values.description);
      return adminMlModelsApi.retrain(formData);
    },
    onSuccess: (data) => {
      // 202: the row exists in status "training"; the list page polls it.
      toast.success(`Training started as ${data.version_code} — it will show as Ready when finished`);
      if (data.validation_warnings?.length) {
        // Structural findings that didn't block the upload (unknown zone
        // values that were dropped, a very small file). The job can't be
        // cancelled -- if this was a mistake, fix the file and upload again.
        toast.warning(data.validation_warnings.join(" "), { duration: 12_000 });
      }
      queryClient.invalidateQueries({ queryKey: ["ml-models"] });
      router.push("/admin/ml-models");
    },
    onError: (error: unknown) => {
      // A rejected file (missing columns, wrong type, duplicate version code)
      // arrives here with a message naming the problem.
      const msg = (error as { message?: string })?.message;
      toast.error(msg ?? "Could not start training. Check the dataset and try again.", { duration: 12_000 });
    },
  });

  function onSubmit(values: FormValues) {
    if (!file) {
      setFileError("A dataset CSV is required.");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setFileError("Expected a .csv file.");
      return;
    }
    setFileError(null);
    mutation.mutate(values);
  }

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="font-bold text-2xl">Train Model from Dataset</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">
          Upload a cleaned CSV in the same shape as the source training dataset. The file is checked immediately;
          training then runs in the background and the new version appears in the list as Training, then Ready.
          Activating it is a separate step.
        </p>
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dataset</CardTitle>
          </CardHeader>
          <CardContent>
            <form id="ml-model-train-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="dataset_file">
                    Dataset CSV <span className="text-destructive">*</span>
                  </FieldLabel>
                  <input
                    id="dataset_file"
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      setFile(e.target.files?.[0] ?? null);
                      setFileError(null);
                    }}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-xs file:mr-3 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1 file:text-sm"
                  />
                  {fileError && <p className="text-destructive text-sm">{fileError}</p>}
                  <p className="text-muted-foreground text-xs">
                    Required columns and known zone values are checked before anything is queued — a missing column is
                    reported now, not after training.
                  </p>
                </Field>

                <Field>
                  <FieldLabel htmlFor="version_code">Version Code</FieldLabel>
                  <Controller
                    control={control}
                    name="version_code"
                    render={({ field }) => (
                      <Input id="version_code" placeholder="Auto-generated if left blank" maxLength={20} {...field} />
                    )}
                  />
                  {errors.version_code && <FieldError errors={[errors.version_code]} />}
                </Field>

                <Field>
                  <FieldLabel htmlFor="description">Description</FieldLabel>
                  <Controller
                    control={control}
                    name="description"
                    render={({ field }) => (
                      <Input
                        id="description"
                        placeholder="Auto-filled from training metrics if left blank"
                        {...field}
                      />
                    )}
                  />
                  {errors.description && <FieldError errors={[errors.description]} />}
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.push("/admin/ml-models")}>
            Cancel
          </Button>
          <Button type="submit" form="ml-model-train-form" disabled={mutation.isPending}>
            {mutation.isPending ? "Checking file…" : "Start training"}
          </Button>
        </div>
      </div>
    </div>
  );
}
