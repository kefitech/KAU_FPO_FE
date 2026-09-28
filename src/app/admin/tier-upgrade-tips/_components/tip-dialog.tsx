"use client";

import { useEffect, useMemo, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  adminTierUpgradeTipsApi,
  type AdminTierUpgradeTip,
  type TipPayload,
  type TipTrigger,
} from "@/app/admin/_api/tier-upgrade-tips";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Textarea } from "@/components/ui/textarea";

type T = Record<string, string>;

const TRIGGERS: { value: TipTrigger; label: string; description: string }[] = [
  { value: "score_below_max",       label: "Score below max",        description: "Fires when this question didn't get full marks." },
  { value: "boolean_no",            label: "Boolean = No",           description: "For Yes/No questions where the answer is No." },
  { value: "value_below_threshold", label: "Value below threshold",  description: "Numeric answer < threshold." },
  { value: "value_above_threshold", label: "Value above threshold",  description: "Numeric answer > threshold." },
  { value: "answer_equals",         label: "Answer equals",          description: "Answer exactly matches a specific value." },
  { value: "answer_not_in",         label: "Answer not in list",     description: "Answer is not any of a set of allowed values." },
  { value: "unanswered",            label: "Unanswered",             description: "Question was skipped or left empty." },
  { value: "always",                label: "Always fire",            description: "Runs for every FPO — useful for maintain-tier tips." },
];

const NEEDS_THRESHOLD = new Set(["value_below_threshold", "value_above_threshold"]);
const NEEDS_VALUE     = new Set(["answer_equals"]);
const NEEDS_VALUES    = new Set(["answer_not_in"]);

export function TipDialog({
  open,
  onOpenChange,
  editing,
  t,
  tCommon,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: AdminTierUpgradeTip | null;
  t: T;
  tCommon: T;
}) {
  const queryClient = useQueryClient();

  const { data: questions = [] } = useQuery({
    queryKey: ["tier-upgrade-tips-questions"],
    queryFn: adminTierUpgradeTipsApi.questions,
    staleTime: 5 * 60_000,
    enabled: open,
  });

  const [questionId,   setQuestionId]   = useState<string>("");
  const [trigger,      setTrigger]      = useState<TipTrigger>("score_below_max");
  const [threshold,    setThreshold]    = useState<string>("");
  const [triggerValue, setTriggerValue] = useState<string>("");
  const [triggerValues,setTriggerValues]= useState<string>(""); // comma-separated
  const [tipEn,        setTipEn]        = useState<string>("");
  const [tipMl,        setTipMl]        = useState<string>("");
  const [targetTier,   setTargetTier]   = useState<"A" | "B" | "C" | "D">("A");
  const [priority,     setPriority]     = useState<string>("5");
  const [isActive,     setIsActive]     = useState(true);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      const qId = questions.find((q) => q.question_no === editing.question_no)?.id ?? null;
      setQuestionId(qId ? String(qId) : "");
      setTrigger(editing.trigger_type);
      const tv = editing.trigger_value ?? {};
      setThreshold(tv.threshold !== undefined ? String(tv.threshold) : "");
      setTriggerValue(tv.value !== undefined ? String(tv.value) : "");
      setTriggerValues(Array.isArray(tv.values) ? (tv.values as string[]).join(", ") : "");
      setTipEn(editing.tip_en);
      setTipMl(editing.tip_ml);
      setTargetTier(editing.target_tier);
      setPriority(String(editing.priority));
      setIsActive(editing.is_active);
    } else {
      setQuestionId("");
      setTrigger("score_below_max");
      setThreshold("");
      setTriggerValue("");
      setTriggerValues("");
      setTipEn("");
      setTipMl("");
      setTargetTier("A");
      setPriority("5");
      setIsActive(true);
    }
  }, [open, editing, questions]);

  const questionOptions = useMemo(
    () => questions.map((q) => ({
      value: String(q.id),
      label: `Q${q.question_no} — ${q.text.slice(0, 60)}${q.text.length > 60 ? "…" : ""}`,
    })),
    [questions],
  );

  const buildTriggerValue = (): Record<string, unknown> => {
    if (NEEDS_THRESHOLD.has(trigger)) return threshold ? { threshold: Number(threshold) } : {};
    if (NEEDS_VALUE.has(trigger))     return triggerValue ? { value: triggerValue } : {};
    if (NEEDS_VALUES.has(trigger))    return triggerValues
      ? { values: triggerValues.split(",").map((s) => s.trim()).filter(Boolean) }
      : {};
    return {};
  };

  const saveMutation = useMutation({
    mutationFn: (payload: TipPayload) =>
      editing
        ? adminTierUpgradeTipsApi.update(editing.id, payload)
        : adminTierUpgradeTipsApi.create(payload),
    onSuccess: () => {
      toast.success(editing ? (t.toast_updated ?? "Tip updated") : (t.toast_created ?? "Tip created"));
      queryClient.invalidateQueries({ queryKey: ["tier-upgrade-tips"] });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? tCommon.save_failed ?? "Failed to save";
      toast.error(message);
    },
  });

  const handleSubmit = () => {
    if (!questionId) {
      toast.error(t.err_question_required ?? "Pick a question.");
      return;
    }
    if (!tipEn.trim()) {
      toast.error(t.err_tip_en_required ?? "English tip is required.");
      return;
    }
    saveMutation.mutate({
      question_id:   Number(questionId),
      trigger_type:  trigger,
      trigger_value: buildTriggerValue(),
      tip_en:        tipEn.trim(),
      tip_ml:        tipMl.trim(),
      target_tier:   targetTier,
      priority:      Number(priority) || 5,
      is_active:     isActive,
    });
  };

  const triggerDescription = TRIGGERS.find((tr) => tr.value === trigger)?.description ?? "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? (t.dialog_edit_title ?? "Edit Tier Upgrade Tip") : (t.dialog_add_title ?? "Add Tier Upgrade Tip")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="col-span-1 sm:col-span-2">
              <Label>{t.field_question ?? "Tier assessment question"}</Label>
              <SearchableSelect
                value={questionId}
                onChange={setQuestionId}
                options={questionOptions}
                placeholder={t.field_question_placeholder ?? "Select a question…"}
              />
            </div>

            <div>
              <Label>{t.field_trigger ?? "Trigger"}</Label>
              <NativeSelect value={trigger} onChange={(e) => setTrigger(e.target.value as TipTrigger)}>
                {TRIGGERS.map((tr) => (
                  <option key={tr.value} value={tr.value}>{tr.label}</option>
                ))}
              </NativeSelect>
              <p className="mt-1 text-muted-foreground text-xs">{triggerDescription}</p>
            </div>

            <div>
              <Label>{t.field_target_tier ?? "Target tier"}</Label>
              <NativeSelect value={targetTier} onChange={(e) => setTargetTier(e.target.value as "A" | "B" | "C" | "D")}>
                <option value="A">Tier A</option>
                <option value="B">Tier B</option>
                <option value="C">Tier C</option>
                <option value="D">Tier D</option>
              </NativeSelect>
            </div>

            {NEEDS_THRESHOLD.has(trigger) && (
              <div>
                <Label>{t.field_threshold ?? "Threshold value"}</Label>
                <Input
                  type="number"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  placeholder="e.g. 33"
                />
              </div>
            )}

            {NEEDS_VALUE.has(trigger) && (
              <div>
                <Label>{t.field_answer_value ?? "Answer value to match"}</Label>
                <Input value={triggerValue} onChange={(e) => setTriggerValue(e.target.value)} placeholder="e.g. no" />
              </div>
            )}

            {NEEDS_VALUES.has(trigger) && (
              <div className="col-span-1 sm:col-span-2">
                <Label>{t.field_allowed_values ?? "Allowed values (comma-separated)"}</Label>
                <Input
                  value={triggerValues}
                  onChange={(e) => setTriggerValues(e.target.value)}
                  placeholder="e.g. full_time, contractual"
                />
              </div>
            )}

            <div>
              <Label>{t.field_priority ?? "Priority (1 = highest)"}</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              />
            </div>

            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4"
                />
                {t.field_active ?? "Active"}
              </label>
            </div>
          </div>

          <div>
            <Label>{t.field_tip_en ?? "Tip (English)"}</Label>
            <Textarea
              value={tipEn}
              onChange={(e) => setTipEn(e.target.value)}
              rows={3}
              placeholder="e.g. Increase women directors on the Board to at least 3…"
            />
          </div>

          <div>
            <Label>{t.field_tip_ml ?? "Tip (Malayalam — optional)"}</Label>
            <Textarea
              value={tipMl}
              onChange={(e) => setTipMl(e.target.value)}
              rows={3}
              placeholder="ബോർഡിലെ വനിതാ ഡയറക്ടർമാരുടെ എണ്ണം…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon.cancel ?? "Cancel"}
          </Button>
          <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editing ? (tCommon.save ?? "Save") : (tCommon.create ?? "Create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
