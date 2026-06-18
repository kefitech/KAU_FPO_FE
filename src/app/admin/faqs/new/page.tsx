import { FaqForm } from "../_components/faq-form";

export default function NewFaqPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="mx-auto max-w-3xl w-full">
        <h1 className="font-bold text-2xl">Add FAQ</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Create a new frequently asked question for the landing page.</p>
      </div>
      <FaqForm mode="create" />
    </div>
  );
}
