"use client";

import { SchemeForm } from "../_components/scheme-form";

export default function NewSchemePage() {
  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="font-bold text-2xl">Add Scheme</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">
          Create a new government scheme entry for FPOs to browse.
        </p>
      </div>
      <SchemeForm mode="create" />
    </div>
  );
}
