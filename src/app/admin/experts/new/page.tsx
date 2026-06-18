"use client";

import { ExpertForm } from "../_components/expert-form";

export default function NewExpertPage() {
  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="font-bold text-2xl">Add Expert</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">
          Add a new expert to the KAU Expert Directory.
        </p>
      </div>
      <ExpertForm mode="create" />
    </div>
  );
}
