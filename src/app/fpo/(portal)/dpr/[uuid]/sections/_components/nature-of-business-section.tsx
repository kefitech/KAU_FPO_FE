"use client";

import { useQuery } from "@tanstack/react-query";
import { useWatch } from "react-hook-form";
import { z } from "zod";

import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDprSectionForm } from "@/hooks/use-dpr-section-form";
import { dprMasterApi } from "@/lib/api/dpr-master";

import { SectionHelp } from "./section-help";
import { SectionShell } from "./section-shell";

const Schema = z.object({
  natures: z.array(z.number()),
  nature_other: z.string(),
});
type Data = z.infer<typeof Schema>;

export function NatureOfBusinessSection({ uuid }: { uuid: string }) {
  const masterQuery = useQuery({
    queryKey: ["dpr-master", "nature-of-business"],
    queryFn: () => dprMasterApi.list("nature-of-business"),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const { form, isLoading, isDirty, isSaving, lastSavedAt, saveError, save, discard } = useDprSectionForm<Data>({
    uuid,
    sectionKey: "nature-of-business",
    schema: Schema,
    defaultValues: {
      natures: [],
      nature_other: "",
    },
  });

  // Use `useWatch` (not `form.watch`) — more reliable subscription for arrays
  // that are set via `form.reset()`. Ensures checkboxes re-render when server
  // data hydrates the form on initial load.
  const selectedIds =
    useWatch({ control: form.control, name: "natures" }) ?? [];

  function toggle(id: number, checked: boolean) {
    const current = form.getValues("natures") ?? [];
    const next = checked ? [...current, id] : current.filter((i) => i !== id);
    form.setValue("natures", next, { shouldDirty: true });
  }

  const otherId = masterQuery.data?.find((r) => r.code === "other")?.id;
  const showOther = otherId !== undefined && selectedIds.includes(otherId);

  const loading = isLoading || masterQuery.isLoading;

  return (
    <SectionShell
      uuid={uuid}
      sectionKey="nature-of-business"
      loading={loading}
      isDirty={isDirty}
      isSaving={isSaving}
      lastSavedAt={lastSavedAt}
      saveError={saveError}
      onSave={save}
      onDiscard={discard}
      help={
        <SectionHelp
          title="Nature of Business"
          purpose="Tick every business model your project will operate under. Different from Project Components — Components describe WHAT ACTIVITIES the project does (extract oil, store copra, sell bottles); Nature of Business describes HOW the FPO earns revenue from those activities (processing income, retail margins, export earnings). An integrated FPO usually spans several business models at once."
          whatToFill={[
            "Browse the 15 business model options — Primary Production, Aggregation, Processing, Value Addition, Storage, Packaging, Marketing, Trading, Retail Sales, Input Supply, Service Delivery, Custom Hiring, Export, Integrated Enterprise, Others.",
            "Tick every option that describes a way your project will generate revenue. At least one is required.",
            "Multi-select is normal — a coconut oil FPO typically ticks Processing + Value Addition + Packaging + Marketing + Retail Sales all together.",
            "If your business model isn't listed, tick 'Others' and describe it in the text field that appears.",
            "When 'Others' is ticked, the specify text is required (e.g. 'Franchisee operator for edible-oil brand').",
          ]}
          tips={[
            "Nature of Business ≠ Components. Coconut oil unit's Components = Processing + Storage + Marketing (physical activities). Its Nature of Business = Processing + Value Addition + Packaging + Marketing + Retail Sales (revenue streams).",
            "Along with Components, this drives which fields the rest of the wizard shows. If you later add or remove a business model, some fields further in the wizard may appear or hide accordingly.",
            "The 'Others' text stays in the database even if you un-tick it — so re-ticking restores what you typed.",
            "If you're unsure whether to tick Value Addition — ask: does the FPO transform the raw commodity into something worth more? Cold-pressed coconut oil vs bulk copra → yes, tick it.",
          ]}
          downstream={[
            "Dynamic questionnaire — some field-level rules key on your Nature of Business selection",
            "AI Project Background chapter — business-model list appears in the prompt context",
            "AI Financial Analysis chapter — informs revenue-model narrative",
            "AI Market Analysis chapter — informs marketing-strategy narrative",
            "PDF cover page + Business Model section",
          ]}
        />
      }
    >
      {/* id="dpr-field-natures" is the scroll target used by the readiness
          panel — clicking "At least one Nature of Business shall be selected"
          deep-links here. Placed on the outer Card so the scroll lands
          above the whole checkbox grid. */}
      <Card id="dpr-field-natures">
        <CardContent className="space-y-5 p-6">
          <div>
            <div className="mb-3 text-sm font-semibold">
              Select all business models that apply to this project
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {(masterQuery.data ?? []).map((item) => (
                <label
                  key={item.id}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={selectedIds.includes(item.id)}
                    onCheckedChange={(c) => toggle(item.id, !!c)}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {showOther && (
            // id="dpr-field-nature_other" — separate anchor for the
            // "Please specify the other nature of business" readiness error
            // when Others is ticked but the text is left blank.
            <div id="dpr-field-nature_other" className="space-y-1.5 border-l-2 border-primary/30 pl-4">
              <Label htmlFor="nature_other">Please specify (Others) *</Label>
              <Input
                id="nature_other"
                placeholder="Describe the other business model…"
                autoFocus
                {...form.register("nature_other")}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </SectionShell>
  );
}
