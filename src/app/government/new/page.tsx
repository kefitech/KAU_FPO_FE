"use client";

import { GovernmentForm } from "@/app/government/_components/government-form";

export default function NewGovernmentPage() {
  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <h1 className="font-bold text-2xl">Add Government Official</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">Create a new government official account and assign their jurisdiction</p>
      </div>
      <GovernmentForm mode="create" />
    </div>
  );
}