"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { translationApi } from "@/app/admin/_api/translation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Language, TranslationCategory } from "@/types/admin";

type T = Record<string, string>;

type JobResult = {
  created: number;
  skipped: number;
  failed: number;
  failed_keys: string[];
};

type Stage = "setup" | "queued" | "running" | "done" | "error";

interface Props {
  open: boolean;
  onClose: () => void;
  languages: Language[];
  categories: TranslationCategory[];
  tCommon: T;
}

const POLL_INTERVAL_MS = 2500;
const MAX_POLL_ATTEMPTS = 120; // ~5 minutes ceiling

export function TranslationAutoTranslateDialog({ open, onClose, languages, categories, tCommon }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [stage, setStage] = useState<Stage>("setup");
  const [languageCode, setLanguageCode] = useState<string>("");
  const [categoryCode, setCategoryCode] = useState<string>("");
  const [result, setResult] = useState<JobResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollAttempts = useRef(0);
  const isSubmitting = useRef(false);

  const targetLanguages = useMemo(() => languages.filter((l) => l.code !== "en" && l.is_active), [languages]);
  const selectedLanguage = useMemo(
    () => targetLanguages.find((l) => l.code === languageCode),
    [targetLanguages, languageCode],
  );

  useEffect(() => {
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, []);

  function stopPolling() {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current);
      pollTimer.current = null;
    }
  }

  async function pollStatus(taskId: string) {
    pollAttempts.current += 1;

    if (pollAttempts.current > MAX_POLL_ATTEMPTS) {
      setErrorMsg("This is taking longer than expected. Check back in a few minutes — the job may still be running.");
      setStage("error");
      return;
    }

    try {
      // @ts-expect-error TODO(aleena): expose autoTranslateStatus() on translationApi; backend endpoint exists (US-155), FE client not yet wired
      const status = await translationApi.autoTranslateStatus(taskId);

      if (status.state === "SUCCESS") {
        setResult(status.result as JobResult);
        setStage("done");
        queryClient.invalidateQueries({ queryKey: ["translations"] });
        return;
      }

      if (status.state === "FAILURE") {
        setErrorMsg(status.error || "The translation job failed. Try again.");
        setStage("error");
        return;
      }

      // PENDING / STARTED / RETRY — keep polling
      pollTimer.current = setTimeout(() => pollStatus(taskId), POLL_INTERVAL_MS);
    } catch {
      setErrorMsg("Lost connection while checking job status. Try again.");
      setStage("error");
    }
  }

  async function handleRun() {
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    setStage("queued");
    setErrorMsg("");
    pollAttempts.current = 0;

    try {
      // @ts-expect-error TODO(aleena): expose autoTranslate() on translationApi; backend endpoint exists (US-150), FE client not yet wired
      const res = await translationApi.autoTranslate({
        language_code: languageCode,
        ...(categoryCode ? { category_code: categoryCode } : {}),
      });
      setStage("running");
      pollStatus(res.task_id);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: { message?: string } } })?.response;
      let message = status?.data?.message ?? "Auto-translate failed. Try again.";
      if (status?.status === 409) {
        message = `A job for ${selectedLanguage?.name ?? "this language"} is already running. Wait for it to finish before starting another.`;
      }
      setErrorMsg(message);
      setStage("error");
    } finally {
      isSubmitting.current = false;
    }
  }

  function handleClose() {
    stopPolling();
    onClose();
    setTimeout(() => {
      setStage("setup");
      setLanguageCode("");
      setCategoryCode("");
      setResult(null);
      setErrorMsg("");
    }, 200);
  }

  function handleReviewClick() {
    handleClose();
    router.push(`/admin/languages?tab=translations&is_verified=false&language=${selectedLanguage?.id ?? ""}`);
  }

  const isBusy = stage === "queued" || stage === "running";

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !isBusy && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {tCommon.auto_translate_title ?? "Auto-translate"}
          </DialogTitle>
          {stage === "setup" && (
            <DialogDescription>
              Claude will translate missing English strings into the language you pick. Results are saved unverified —
              review them before they go live.
            </DialogDescription>
          )}
        </DialogHeader>

        {stage === "setup" && (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Language</Label>
              <Select value={languageCode} onValueChange={setLanguageCode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a language" />
                </SelectTrigger>
                <SelectContent>
                  {targetLanguages.map((l) => (
                    <SelectItem key={l.code} value={l.code}>
                      {l.name} ({l.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={categoryCode} onValueChange={setCategoryCode}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedLanguage && (
              <div className="rounded-md bg-amber-50 px-3 py-2 text-amber-800 text-xs dark:bg-amber-950/30 dark:text-amber-400">
                This only fills in strings missing for {selectedLanguage.name}. Existing translations are left
                untouched.
              </div>
            )}
          </div>
        )}

        {(stage === "queued" || stage === "running") && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
            <p className="font-medium text-sm">
              {stage === "queued" ? "Starting job…" : `Translating into ${selectedLanguage?.name}…`}
            </p>
            <p className="text-muted-foreground text-xs">
              This runs in the background and can take a minute or more for larger categories. You can leave this open —
              don't close and re-run for the same language while this is in progress.
            </p>
          </div>
        )}

        {stage === "done" && result && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-2">
              <StatBlock label="Created" value={result.created} tone="success" />
              <StatBlock label="Skipped" value={result.skipped} tone="neutral" />
              <StatBlock label="Failed" value={result.failed} tone="danger" />
            </div>

            {result.failed > 0 && (
              <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-3">
                <div className="mb-1.5 flex items-center gap-1.5 font-medium text-destructive text-xs">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Failed keys
                </div>
                <ul className="space-y-1 font-mono text-destructive text-xs">
                  {result.failed_keys.map((k) => (
                    <li key={k}>{k}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-muted-foreground text-xs">
              New strings are saved unverified. Review and verify them before they reach users.
            </p>
          </div>
        )}

        {stage === "error" && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <p className="font-medium text-sm">Auto-translate failed</p>
            <p className="text-muted-foreground text-xs">{errorMsg}</p>
          </div>
        )}

        <DialogFooter>
          {stage === "setup" && (
            <>
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleRun} disabled={!languageCode}>
                <Sparkles className="mr-1.5 h-4 w-4" />
                Run auto-translate
              </Button>
            </>
          )}
          {isBusy && (
            <Button disabled>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              {stage === "queued" ? "Starting…" : "Translating…"}
            </Button>
          )}
          {stage === "done" && (
            <>
              <Button variant="ghost" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={handleReviewClick}>
                Review translations
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </>
          )}
          {stage === "error" && (
            <>
              <Button variant="ghost" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={() => setStage("setup")}>Try again</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatBlock({ label, value, tone }: { label: string; value: number; tone: "success" | "neutral" | "danger" }) {
  const toneClasses = {
    success: "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400",
    neutral: "bg-muted text-muted-foreground",
    danger: value > 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground",
  }[tone];

  return (
    <div className={`rounded-md px-3 py-3 text-center ${toneClasses}`}>
      <div className="font-semibold text-lg">{value}</div>
      <div className="font-medium text-[11px] uppercase tracking-wide opacity-70">{label}</div>
    </div>
  );
}
