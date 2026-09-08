"use client";

import { use } from "react";

import { useQuery } from "@tanstack/react-query";

import { cbbosApi } from "@/app/admin/_api/cbbos";

import { CBBOForm } from "../../_components/cbbo-form";

export default function EditCBBOPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: cbbo, isLoading } = useQuery({
    queryKey: ["cbbo", id],
    queryFn: () => cbbosApi.getById(Number(id)),
  });

  if (isLoading || !cbbo) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <h1 className="font-bold text-2xl">Edit CBBO</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">
          Update account details for {cbbo.first_name} {cbbo.last_name}
        </p>
      </div>
      <CBBOForm mode="edit" cbbo={cbbo} />
    </div>
  );
}
