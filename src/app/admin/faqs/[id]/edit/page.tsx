"use client";

import { use } from "react";

import { FaqForm } from "../../_components/faq-form";

export default function EditFaqPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="mx-auto max-w-3xl w-full">
        <h1 className="font-bold text-2xl">Edit FAQ</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Update the FAQ details.</p>
      </div>
      <FaqForm mode="edit" id={Number(id)} />
    </div>
  );
}
