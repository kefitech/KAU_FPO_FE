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
  version_code: z.string().min(1, { message: "Version code is required" }).max(20),
  description: z.string().min(1, { message: "Description is required" }),
  deployed_at: z.string().min(1, { message: "Deployment date is required" }),
});

type FormValues = z.infer<typeof schema>;

export default function NewMlModelPage() {
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
    defaultValues: { version_code: "", description: "", deployed_at: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const formData = new FormData();
      formData.append("version_code", values.version_code);
      formData.append("description", values.description);
      formData.append("deployed_at", new Date(values.deployed_at).toISOString());
      if (file) formData.append("model_file", file);
      return adminMlModelsApi.create(formData);
    },
    onSuccess: () => {
      toast.success("Model version registered successfully");
      queryClient.invalidateQueries({ queryKey: ["ml-models"] });
      router.push("/admin/ml-models");
    },
    onError: (error: unknown) => {
      const msg = (error as { message?: string })?.message;
      toast.error(msg ?? "Failed to register model version");
    },
  });

  function onSubmit(values: FormValues) {
    if (!file) {
      setFileError("A model file is required.");
      return;
    }
    setFileError(null);
    mutation.mutate(values);
  }

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="font-bold text-2xl">Register Model Version</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">
          Upload a trained model file and register it as a new version. Registering does not
          activate it — use &quot;Activate&quot; from the list afterward.
        </p>
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Model Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form id="ml-model-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="version_code">
                    Version Code <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Controller
                    control={control}
                    name="version_code"
                    render={({ field }) => (
                      <Input id="version_code" placeholder="e.g. v1.2.0" maxLength={20} {...field} />
                    )}
                  />
                  {errors.version_code && <FieldError errors={[errors.version_code]} />}
                </Field>

                <Field>
                  <FieldLabel htmlFor="description">
                    Description <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Controller
                    control={control}
                    name="description"
                    render={({ field }) => (
                      <Input id="description" placeholder="e.g. Retrained with 2026 KAU dataset" {...field} />
                    )}
                  />
                  {errors.description && <FieldError errors={[errors.description]} />}
                </Field>

                <Field>
                  <FieldLabel htmlFor="deployed_at">
                    Deployment Date <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Controller
                    control={control}
                    name="deployed_at"
                    render={({ field }) => <Input id="deployed_at" type="date" {...field} />}
                  />
                  {errors.deployed_at && <FieldError errors={[errors.deployed_at]} />}
                </Field>

                <Field>
                  <FieldLabel htmlFor="model_file">
                    Model File <span className="text-destructive">*</span>
                  </FieldLabel>
                  <input
                    id="model_file"
                    type="file"
                    onChange={(e) => {
                      setFile(e.target.files?.[0] ?? null);
                      setFileError(null);
                    }}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-xs file:mr-3 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1 file:text-sm"
                  />
                  {fileError && <p className="text-destructive text-sm">{fileError}</p>}
                  <p className="text-muted-foreground text-xs">
                    Uploaded files are stored in the shared model directory. No file type is
                    currently restricted — validate carefully before uploading.
                  </p>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.push("/admin/ml-models")}>
            Cancel
          </Button>
          <Button type="submit" form="ml-model-form" disabled={mutation.isPending}>
            {mutation.isPending ? "Registering…" : "Register"}
          </Button>
        </div>
      </div>
    </div>
  );
}