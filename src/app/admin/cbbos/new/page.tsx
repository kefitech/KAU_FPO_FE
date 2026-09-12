"use client";

import { CBBOForm } from "../_components/cbbo-form";

export default function NewCBBOPage() {
  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <h1 className="font-bold text-2xl">Add CBBO</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">
          Create a new CBBO/NGO account and assign their jurisdiction
        </p>
      </div>
      <CBBOForm mode="create" />
    </div>
  );
}
