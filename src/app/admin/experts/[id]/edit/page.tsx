"use client";

import { use } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { adminExpertsApi } from "@/app/admin/_api/experts";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminExpert } from "@/types/admin";
import type { PaginatedResponse } from "@/types/pagination";

import { ExpertForm } from "../../_components/expert-form";

export default function EditExpertPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();

  const cachedList = queryClient.getQueryData<PaginatedResponse<AdminExpert>>(["experts"]);
  const cachedExpert = cachedList?.data?.find((e) => e.id === Number(id));

  const { data: expert, isLoading } = useQuery({
    queryKey: ["expert", id],
    queryFn: () => adminExpertsApi.getById(Number(id)),
    enabled: !!id,
    initialData: cachedExpert,
  });

  if (isLoading && !expert) {
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
        <h1 className="font-bold text-2xl">Edit Expert</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">Update the details for this expert.</p>
      </div>
      <ExpertForm mode="edit" expert={expert} />
    </div>
  );
}
