"use client";

import { useEffect, useRef, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ChevronDown, ChevronUp, ClipboardList, Edit2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { tierAssessmentApi } from "@/app/fpo/_api/tier-assessment";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";
import type { TierAssessmentAnswer, TierAssessmentData, TierDomainScore, TierHistoryItem, TierQuestion, TierUpload } from "@/types/fpo";

import { FileUploadSection } from "./_components/file-upload-section";
import { QuestionField } from "./_components/question-field";

type T = Record<string, string>;
type AnswerMap = Record<number, string | number | string[]>;

function tierColor(tier: string) {
  return (
    {
      A: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300",
      B: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300",
      C: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300",
      D: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300",
    }[tier] ?? "bg-muted text-muted-foreground border"
  );
}

function groupByDomain(questions: TierQuestion[]) {
  const map = new Map<string, TierQuestion[]>();
  for (const q of questions) {
    if (q.input_type === "computed") continue;
    const key = q.domain_name;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(q);
  }
  return map;
}

function isVisible(q: TierQuestion, answers: AnswerMap) {
  if (!q.is_conditional || q.condition_on_question_no === null) return true;
  return String(answers[q.condition_on_question_no] ?? "") === q.condition_value;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TierBadgeLarge({ tier }: { tier: string }) {
  return (
    <div className={`flex h-20 w-20 items-center justify-center rounded-full border-2 text-3xl font-bold ${tierColor(tier)}`}>
      {tier || "—"}
    </div>
  );
}

function SaveIndicator({ status, t }: { status: "idle" | "saving" | "saved"; t: T }) {
  if (status === "idle") return null;
  if (status === "saving")
    return (
      <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
        <Loader2 className="h-3 w-3 animate-spin" />
        {t.save_saving ?? "Saving…"}
      </span>
    );
  return (
    <span className="flex items-center gap-1.5 text-green-600 text-xs dark:text-green-400">
      <CheckCircle2 className="h-3 w-3" />
      {t.save_saved ?? "Saved"}
    </span>
  );
}

function SubmittedView({
  data,
  onReopen,
  reopening,
  t,
}: {
  data: TierAssessmentData;
  onReopen?: () => void;
  reopening?: boolean;
  t: T;
}) {
  const { assessment } = data;
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  if (!assessment) return null;
  const domains = assessment.domain_scores ?? [];
  const questions = data.questions ?? [];
  const uploads = assessment.uploads ?? [];
  const total = assessment.total_score ? Number(assessment.total_score) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-4 rounded-xl border bg-card p-5 sm:p-8 text-center shadow-sm">
        <p className="font-medium text-muted-foreground text-sm">
          {(t.result_label ?? "{year} Assessment Result").replace("{year}", data.financial_year)}
        </p>
        <TierBadgeLarge tier={assessment.tier_assigned} />
        <div>
          <p className="font-bold text-2xl">
            {(t.result_tier ?? "Tier {tier}").replace("{tier}", assessment.tier_assigned || "—")}
          </p>
          {total !== null && (
            <p className="mt-1 text-muted-foreground text-sm">
              {t.result_total_score ?? "Total Score:"}{" "}
              <span className="font-semibold text-foreground">{total.toFixed(1)}</span>
            </p>
          )}
        </div>
        {assessment.submitted_at && (
          <p className="text-muted-foreground text-xs">
            {t.result_submitted_on ?? "Submitted on"}{" "}
            {new Date(assessment.submitted_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        )}
        {onReopen && (
          <Button variant="outline" size="sm" onClick={onReopen} disabled={reopening}>
            {reopening ? (
              <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />{t.btn_reopening ?? "Reopening…"}</>
            ) : (
              <><Edit2 className="mr-1.5 h-3.5 w-3.5" />{t.btn_edit_assessment ?? "Edit Assessment"}</>
            )}
          </Button>
        )}
      </div>

      {domains.length > 0 && (
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="border-b px-5 py-3.5">
            <h2 className="font-semibold text-sm">{t.section_score_breakdown ?? "Score Breakdown by Domain"}</h2>
          </div>
          <div className="divide-y">
            {domains.map((d) => (
              <DomainScoreRow
                key={d.domain_code}
                domain={d}
                questions={questions}
                answers={assessment.answers}
                uploads={uploads}
                expanded={expandedDomain === d.domain_code}
                onToggle={() => setExpandedDomain((cur) => (cur === d.domain_code ? null : d.domain_code))}
                t={t}
              />
            ))}
          </div>
          {total !== null && (
            <div className="flex items-center justify-between border-t bg-muted/30 px-5 py-3">
              <span className="font-semibold text-sm">{t.label_total ?? "Total"}</span>
              <div className="flex items-center gap-3">
                <span className="font-bold text-sm">
                  {total.toFixed(1)} / {domains.reduce((s, d) => s + d.max_score, 0)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatAnswerValue(q: TierQuestion, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  const options = q.answer_config?.options as { value: string; label: string }[] | undefined;
  const labelFor = (v: string | number) => {
    const match = options?.find((o) => String(o.value) === String(v));
    return match?.label ?? String(v);
  };
  if (Array.isArray(value)) return value.map((v) => labelFor(v)).join(", ");
  return labelFor(value as string | number);
}

function fileNameFromUrl(url: string) {
  const parts = url.split("/");
  return parts[parts.length - 1] ?? url;
}

function AnsweredQuestionRow({
  question,
  answerEntry,
  upload,
  t,
}: {
  question: TierQuestion;
  answerEntry: TierAssessmentAnswer | undefined;
  upload?: TierUpload;
  t: T;
}) {
  return (
    <div className="flex flex-col gap-1.5 px-4 sm:px-5 py-3">
      <div className="flex items-start gap-2">
        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-muted-foreground text-xs">
          {question.question_no}
        </span>
        <p className="text-sm leading-relaxed">{question.text}</p>
      </div>
      <p className="pl-7 text-sm font-medium">
        {formatAnswerValue(question, (answerEntry as { answer?: unknown } | undefined)?.answer)}
      </p>
      {question.has_upload && (
        <div className="pl-7">
          {upload ? (
            <a href={upload.file_url} target="_blank" rel="noopener noreferrer" className="text-primary text-xs underline underline-offset-2">
              {fileNameFromUrl(upload.file_url)}
            </a>
          ) : (
            <span className="text-muted-foreground text-xs">
              {question.upload_label || (t.no_file_uploaded ?? "No file uploaded")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function DomainScoreRow({
  domain, questions, answers, uploads, expanded, onToggle, t,
}: {
  domain: TierDomainScore;
  questions: TierQuestion[];
  answers: TierAssessmentAnswer[];
  uploads: TierUpload[];
  expanded: boolean;
  onToggle: () => void;
  t: T;
}) {
  const pct = domain.max_score > 0 ? (domain.score / domain.max_score) * 100 : 0;
  const domainQuestions = questions
    .filter((q) => q.domain_name === domain.domain_name && q.input_type !== "computed")
    .sort((a, b) => a.question_no - b.question_no);
  const answerByQNo = new Map((answers ?? []).map((a) => [a.question_no, a]));
  const uploadByQNo = new Map(uploads.map((u) => [u.question_no, u]));

  return (
    <div>
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 px-4 sm:px-5 py-3 text-left" aria-expanded={expanded}>
        <span className="min-w-0 flex-1 text-sm">{domain.domain_name}</span>
        <div className="flex items-center gap-3">
          <div className="hidden h-1.5 w-28 overflow-hidden rounded-full bg-muted sm:block">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
          </div>
          <span className="shrink-0 text-right font-medium text-sm tabular-nums">
            {domain.score.toFixed(1)} / {domain.max_score}
          </span>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="divide-y border-t bg-muted/20">
          {domainQuestions.length === 0 ? (
            <p className="px-5 py-3 text-muted-foreground text-sm">{t.no_questions_domain ?? "No questions in this domain."}</p>
          ) : (
            domainQuestions.map((q) => (
              <AnsweredQuestionRow
                key={q.question_no}
                question={q}
                answerEntry={answerByQNo.get(q.question_no)}
                upload={uploadByQNo.get(q.question_no)}
                t={t}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function HistorySection({ items, currentYear, t }: { items: TierHistoryItem[]; currentYear: string; t: T }) {
  const [open, setOpen] = useState(false);
  const past = items.filter((i) => i.financial_year !== currentYear && i.status === "submitted");
  if (past.length === 0) return null;

  const recordLabel = past.length === 1
    ? (t.history_records_one ?? "{count} record").replace("{count}", String(past.length))
    : (t.history_records_many ?? "{count} records").replace("{count}", String(past.length));

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between px-5 py-4 text-left">
        <span className="font-semibold text-sm">{t.section_history ?? "Past Assessment History"}</span>
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <span>{recordLabel}</span>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {open && (
        <div className="divide-y border-t">
          {past.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 sm:px-5 py-3">
              <span className="font-medium text-sm">{item.financial_year}</span>
              <div className={`rounded-full border px-2.5 py-0.5 font-bold text-xs ${tierColor(item.tier_assigned)}`}>
                {(t.result_tier ?? "Tier {tier}").replace("{tier}", item.tier_assigned)}
              </div>
              <span className="text-muted-foreground text-sm">
                {t.history_score ?? "Score:"} {Number(item.total_score).toFixed(1)}
              </span>
              <span className="ml-auto text-muted-foreground text-xs">
                {new Date(item.submitted_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TierAssessmentPage() {
  const queryClient = useQueryClient();
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});

  useEffect(() => {
    translationsApi
      .getPublic(locale, "fpo_tier_assessment,common")
      .then((data) => setT(data.fpo_tier_assessment ?? {}))
      .catch(() => undefined);
  }, [locale]);

  const [answerMap, setAnswerMap] = useState<AnswerMap>({});
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearQueueRef = useRef<Set<number>>(new Set());
  const assessmentIdRef = useRef<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["fpo-tier-assessment"],
    queryFn: tierAssessmentApi.get,
    staleTime: 60_000,
  });

  const { data: history = [] } = useQuery({
    queryKey: ["fpo-tier-history"],
    queryFn: tierAssessmentApi.history,
    staleTime: 60_000,
  });

  useEffect(() => {
    const assessment = data?.assessment;
    if (!assessment) return;
    assessmentIdRef.current = assessment.id;
    if (assessment.answers?.length) {
      const map: AnswerMap = {};
      for (const a of assessment.answers) {
        if (a.answer !== null && a.answer !== undefined) {
          map[a.question_no] = a.answer;
        }
      }
      setAnswerMap(map);
    }
  }, [data?.assessment?.id]);

  const saveMutation = useMutation({
    mutationFn: (payload: { answers: Record<string, string | number | string[] | null> }) =>
      tierAssessmentApi.save(assessmentIdRef.current!, payload.answers),
    onSuccess: () => {
      clearQueueRef.current.clear();
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus((s) => (s === "saved" ? "idle" : s)), 2000);
    },
    onError: () => setSaveStatus("idle"),
  });

  const startMutation = useMutation({
    mutationFn: tierAssessmentApi.start,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fpo-tier-assessment"] }),
    onError: (err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        queryClient.invalidateQueries({ queryKey: ["fpo-tier-assessment"] });
      } else {
        toast.error(t.toast_start_failed ?? "Failed to start assessment");
      }
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => tierAssessmentApi.submit(assessmentIdRef.current!),
    onSuccess: () => {
      toast.success(t.toast_submitted ?? "Assessment submitted! Your tier has been assigned.");
      queryClient.invalidateQueries({ queryKey: ["fpo-tier-assessment"] });
      queryClient.invalidateQueries({ queryKey: ["fpo-tier-history"] });
      queryClient.invalidateQueries({ queryKey: ["fpo-dashboard"] });
    },
    onError: () => toast.error(t.toast_submit_failed ?? "Submission failed. Ensure all required questions are answered."),
  });

  const reopenMutation = useMutation({
    mutationFn: () => tierAssessmentApi.reopen(assessmentIdRef.current!),
    onSuccess: () => {
      toast.success(t.toast_reopened ?? "Assessment reopened. You can now edit your answers.");
      queryClient.invalidateQueries({ queryKey: ["fpo-tier-assessment"] });
      queryClient.invalidateQueries({ queryKey: ["fpo-dashboard"] });
    },
    onError: () => toast.error(t.toast_reopen_failed ?? "Failed to reopen assessment. Please try again."),
  });

  function scheduleSave(map: AnswerMap) {
    if (!assessmentIdRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus("saving");
    const snapshot = { ...map };
    const clears = new Set(clearQueueRef.current);
    saveTimerRef.current = setTimeout(() => {
      const answers: Record<string, string | number | string[] | null> = {};
      for (const [k, v] of Object.entries(snapshot)) answers[k] = v;
      for (const qNo of clears) answers[String(qNo)] = null;
      saveMutation.mutate({ answers });
    }, 1000);
  }

  function updateAnswer(qNo: number, value: string | number | string[]) {
    const next = { ...answerMap, [qNo]: value };
    if (data?.questions) {
      for (const q of data.questions) {
        if (q.is_conditional && q.condition_on_question_no === qNo) {
          const condMet = String(value) === q.condition_value;
          if (!condMet && next[q.question_no] !== undefined) {
            clearQueueRef.current.add(q.question_no);
            delete next[q.question_no];
          }
        }
      }
    }
    setAnswerMap(next);
    scheduleSave(next);
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 px-3 sm:px-6 py-4 sm:py-6">
        <Skeleton className="h-8 w-48" />
        <div className="flex flex-col gap-4 rounded-xl border p-6">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
        </div>
      </div>
    );
  }

  const assessment = data?.assessment;
  const questions = data?.questions ?? [];
  const financialYear = data?.financial_year ?? "";
  const yearLabel = (t.label_financial_year ?? "{year} Financial Year").replace("{year}", financialYear);

  // ── No assessment yet ─────────────────────────────────────────────────────────
  if (!assessment) {
    return (
      <div className="flex flex-col gap-6 px-3 sm:px-6 py-4 sm:py-6">
        <div>
          <h1 className="font-bold text-2xl">{t.page_title ?? "Tier Assessment"}</h1>
          <p className="mt-0.5 text-muted-foreground text-sm">{t.page_description ?? "Annual assessment to determine your FPO's performance tier"}</p>
        </div>

        <div className="flex flex-col items-center gap-5 rounded-xl border bg-card p-6 sm:p-12 text-center shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <ClipboardList className="h-8 w-8 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-lg">
              {(t.not_started_title ?? "{year} Assessment Not Started").replace("{year}", financialYear)}
            </p>
            <p className="mt-1 max-w-sm text-muted-foreground text-sm">
              {t.not_started_desc ?? "Complete the annual tier assessment to receive your FPO performance rating and unlock relevant support programmes."}
            </p>
          </div>
          <Button onClick={() => startMutation.mutate()} disabled={startMutation.isPending} size="lg">
            {startMutation.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t.btn_starting ?? "Starting…"}</>
            ) : (
              t.btn_start ?? "Start Assessment"
            )}
          </Button>
        </div>

        <HistorySection items={history} currentYear={financialYear} t={t} />
      </div>
    );
  }

  // ── Submitted — read-only results ─────────────────────────────────────────────
  if (assessment.status === "submitted") {
    return (
      <div className="flex flex-col gap-6 px-3 sm:px-6 py-4 sm:py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-bold text-2xl">{t.page_title ?? "Tier Assessment"}</h1>
            <p className="mt-0.5 text-muted-foreground text-sm">{yearLabel}</p>
          </div>
          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            {t.badge_submitted ?? "Submitted"}
          </Badge>
        </div>

        <SubmittedView data={data} onReopen={() => reopenMutation.mutate()} reopening={reopenMutation.isPending} t={t} />
        <HistorySection items={history} currentYear={financialYear} t={t} />
      </div>
    );
  }

  // ── Draft — question form ─────────────────────────────────────────────────────
  const uploads: TierUpload[] = assessment.uploads ?? [];
  const uploadsForQuestion = (qNo: number) => uploads.filter((u) => u.question_no === qNo);
  const domains = groupByDomain(questions);
  const visibleRequired = questions.filter((q) => q.is_required && q.input_type !== "computed" && isVisible(q, answerMap));
  const answeredRequired = visibleRequired.filter((q) => {
    const val = answerMap[q.question_no];
    if (val === undefined || val === null || val === "") return false;
    if (Array.isArray(val)) return val.length > 0;
    return true;
  });
  const allRequiredDone = answeredRequired.length === visibleRequired.length;
  const remaining = visibleRequired.length - answeredRequired.length;
  const remainingText = remaining === 1
    ? (t.submit_remaining_one ?? "{count} required question remaining.").replace("{count}", String(remaining))
    : (t.submit_remaining_many ?? "{count} required questions remaining.").replace("{count}", String(remaining));

  return (
    <div className="flex flex-col gap-6 px-3 sm:px-6 py-4 sm:py-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-bold text-2xl">{t.page_title ?? "Tier Assessment"}</h1>
          <p className="mt-0.5 text-muted-foreground text-sm">{yearLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <SaveIndicator status={saveStatus} t={t} />
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
            {t.badge_draft ?? "Draft"}
          </Badge>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-2.5 text-sm">
        <span className="text-muted-foreground">{t.progress_label ?? "Progress:"}</span>
        <span className="font-medium">
          {(t.progress_text ?? "{answered} / {total} required questions answered")
            .replace("{answered}", String(answeredRequired.length))
            .replace("{total}", String(visibleRequired.length))}
        </span>
        <div className="ml-auto hidden h-1.5 w-32 overflow-hidden rounded-full bg-muted sm:block">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: visibleRequired.length > 0 ? `${(answeredRequired.length / visibleRequired.length) * 100}%` : "0%" }}
          />
        </div>
      </div>

      {/* Domain question groups */}
      {Array.from(domains.entries()).map(([domainName, qs]) => (
        <div key={domainName} className="rounded-xl border bg-card shadow-sm">
          <div className="border-b bg-muted/30 px-5 py-3">
            <h2 className="font-semibold text-sm">{domainName}</h2>
          </div>
          <div className="divide-y">
            {qs.map((q) => {
              if (!isVisible(q, answerMap)) return null;
              return (
                <div key={q.question_no} className="px-5 py-4">
                  <div className="mb-3 flex items-start gap-2">
                    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-muted-foreground text-xs">
                      {q.question_no}
                    </span>
                    <p className="text-sm leading-relaxed">
                      {q.text}
                      {q.is_required && <span className="ml-1 text-destructive" aria-hidden>*</span>}
                    </p>
                  </div>
                  <div className="pl-7">
                    <QuestionField
                      question={q}
                      value={answerMap[q.question_no]}
                      onChange={(val) => updateAnswer(q.question_no, val)}
                      readOnly={q.is_prefilled}
                      boolYes={t.bool_yes}
                      boolNo={t.bool_no}
                    />
                    {q.is_prefilled && (
                      <p className="mt-1 text-muted-foreground text-xs">{t.prefilled_hint ?? "Pre-filled from registration data"}</p>
                    )}
                    {q.has_upload && (
                      <FileUploadSection
                        assessmentId={assessment.id}
                        questionNo={q.question_no}
                        uploads={uploadsForQuestion(q.question_no)}
                        uploadLabel={q.upload_label}
                        onUploadsChange={() => queryClient.invalidateQueries({ queryKey: ["fpo-tier-assessment"] })}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Submit */}
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-sm">
          {allRequiredDone ? (t.submit_ready ?? "All required questions answered. Ready to submit.") : remainingText}
        </p>
        <Button className="w-full sm:w-auto" onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending || !allRequiredDone}>
          {submitMutation.isPending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t.btn_submitting ?? "Submitting…"}</>
          ) : (
            t.btn_submit ?? "Submit Assessment"
          )}
        </Button>
      </div>

      <HistorySection items={history} currentYear={financialYear} t={t} />
    </div>
  );
}
