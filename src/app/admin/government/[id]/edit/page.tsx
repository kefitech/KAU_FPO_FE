"use client";
import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { governmentApi } from "@/app/admin/_api/government";
import { GovernmentForm } from "../../_components/government-form";

export default function EditGovernmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: official, isLoading } = useQuery({
    queryKey: ["government-official", id],
    queryFn: () => governmentApi.getById(Number(id)),
  });

  if (isLoading || !official) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <h1 className="font-bold text-2xl">Edit Government Official</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">
          Update account details for {official.first_name} {official.last_name}
        </p>
      </div>
      <GovernmentForm mode="edit" official={official} />
    </div>
  );
}
