"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { rolesApi } from "@/app/admin/_api/roles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { Role } from "@/types/admin";

type T = Record<string, string>;

const schema = z.object({
  name: z.string().min(1, { message: "Role name is required" }).max(100, { message: "Max 100 characters" }),
});

type FormValues = z.infer<typeof schema>;

interface RoleFormProps {
  mode: "create" | "edit";
  role?: Role;
  t?: T;
  tCommon?: T;
}

const defaultValues: FormValues = { name: "" };

export function RoleForm({ mode, role, t = {}, tCommon = {} }: RoleFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = mode === "edit";

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: role ? { name: role.name ?? "" } : defaultValues,
  });

  useEffect(() => {
    if (role) reset({ name: role.name ?? "" });
  }, [role?.id, role?.name, role, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => (isEdit ? rolesApi.update(role!.id, values) : rolesApi.create(values)),
    onSuccess: () => {
      toast.success(
        isEdit ? (t.toast_updated ?? "Role updated successfully") : (t.toast_created ?? "Role created successfully"),
      );
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      if (!isEdit) router.push("/admin/roles");
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? (isEdit ? "Failed to update role" : "Failed to create role"));
    },
  });

  return (
    <div className="mx-auto w-full max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.section_details ?? "Role Details"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-6">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="role-name">
                  {t.name_label ?? "Role Name"} <span className="text-destructive">*</span>
                </FieldLabel>
                <Controller
                  control={control}
                  name="name"
                  render={({ field }) => (
                    <Input
                      id="role-name"
                      placeholder={t.name_placeholder ?? "e.g. FPO Manager"}
                      maxLength={100}
                      {...field}
                    />
                  )}
                />
                {errors.name && <FieldError errors={[errors.name]} />}
              </Field>
            </FieldGroup>

            <div className="flex items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => router.push("/admin/roles")}>
                {tCommon.cancel_btn ?? "Cancel"}
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : (tCommon.save_btn ?? "Save")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
