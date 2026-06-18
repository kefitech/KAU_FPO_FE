"use client";

import { use } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { adminSchemesApi } from "@/app/admin/_api/schemes";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminScheme } from "@/types/admin";
import type { PaginatedResponse } from "@/types/pagination";

import { SchemeForm } from "../../_components/scheme-form";

export default function EditSchemePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();

  const cachedList = queryClient.getQueryData<PaginatedResponse<AdminScheme>>(["schemes"]);
  const cachedScheme = cachedList?.data?.find((s) => s.id === Number(id));

  const { data: scheme, isLoading } = useQuery({
    queryKey: ["scheme", id],
    queryFn: () => adminSchemesApi.getById(Number(id)),
    enabled: !!id,
    initialData: cachedScheme,
  });

  if (isLoading && !scheme) {
    return (
      <div className="flex flex-col gap-6 px-8 py-6">
        <div className="mx-auto w-full max-w-3xl">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="mx-auto w-full max-w-3xl">
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="font-bold text-2xl">Edit Scheme</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">Update the details for this scheme.</p>
      </div>
      <SchemeForm mode="edit" scheme={scheme} />
    </div>
  );
}
