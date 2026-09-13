"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

import { Loader2, RefreshCw, Sparkles, Star, ThumbsUp, TrendingUp } from "lucide-react";

import { getMyRecommendation, requestFreshRecommendation, submitRecommendationFeedback } from "@/lib/api/recommendation";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";
import type { MyRecommendation } from "@/types/recommendation";

type T = Record<string, string>;

const RecommendationLocationMap = dynamic(
  () => import("./recommendation-location-map").then((m) => ({ default: m.RecommendationLocationMap })),
  { ssr: false },
);

const POLL_INTERVAL_MS = 4000;

function StarRating({ value, onChange, t }: { value: number; onChange: (v: number) => void; t: T }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="transition-transform hover:scale-110"
          aria-label={(t.rate_star_aria ?? "Rate {n} star(s)").replace("{n}", String(n))}
        >
          <Star
            className={`h-5 w-5 ${n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
          />
        </button>
      ))}
    </div>
  );
}

export function CropRecommendationDisplay() {
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});

  useEffect(() => {
    translationsApi
      .getPublic(locale, "fpo_recommendations")
      .then((data) => setT(data.fpo_recommendations ?? {}))
      .catch(() => undefined);
  }, [locale]);

  const SEASON_OPTIONS: { value: string; label: string }[] = [
    { value: "", label: t.season_auto ?? "Auto-detect" },
    { value: "southwest_monsoon", label: t.season_sw_monsoon ?? "South-West Monsoon" },
    { value: "northeast_monsoon", label: t.season_ne_monsoon ?? "North-East Monsoon" },
    { value: "dry_season", label: t.season_dry ?? "Dry Season" },
  ];

  const SEASON_LABELS: Record<string, string> = {
    southwest_monsoon: t.season_sw_monsoon ?? "South-West Monsoon",
    northeast_monsoon: t.season_ne_monsoon ?? "North-East Monsoon",
    dry_season: t.season_dry ?? "Dry Season",
  };

  const [recommendation, setRecommendation] = useState<MyRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState("");

  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }

  // Polls GET /me/ while status is pending/processing — the backend
  // computes the real result in the background (Celery), so this is
  // the only way the UI finds out when it's actually ready without
  // waiting for the user to manually refresh.
  function startPolling() {
    stopPolling();
    pollTimer.current = setInterval(async () => {
      try {
        const result = await getMyRecommendation();
        if (result) {
          setRecommendation(result);
          if (result.status === "completed" || result.status === "failed") {
            stopPolling();
          }
        }
      } catch {
        // Transient poll failure — keep trying, don't surface an error
        // for a background refresh.
      }
    }, POLL_INTERVAL_MS);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await getMyRecommendation();
        if (!cancelled) {
          setRecommendation(result);
          if (result?.feedback_rating) {
            setFeedbackRating(result.feedback_rating);
            setFeedbackSubmitted(true);
          }
          // If a request was already in flight from an earlier visit,
          // resume polling instead of leaving it stuck.
          if (result && (result.status === "pending" || result.status === "processing")) {
            startPolling();
          }
        }
      } catch {
        if (!cancelled) setError(t.error_load ?? "Could not load your recommendation.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRequest() {
    setRequesting(true);
    setError(null);
    try {
      const result = await requestFreshRecommendation(selectedSeason || undefined);
      setRecommendation(result);
      setFeedbackRating(result.feedback_rating ?? 0);
      setFeedbackSubmitted(!!result.feedback_rating);
      if (result.status === "pending" || result.status === "processing") {
        startPolling();
      }
    } catch (err) {
      const msg = (err as { message?: string })?.message;
      // Backend returns this specific (currently untranslated backend-side)
      // key when the FPO's location is outside Kerala's supported zones —
      // rejected synchronously before any DB write or Celery dispatch
      // happens, so there's no polling/async result to wait for here.
      if (msg === "recommendations.outside_kerala") {
        setError(
          t.error_outside_kerala ??
            "Crop recommendations are only available for locations within Kerala. Check your cultivation area boundary above.",
        );
      } else {
        setError(msg ?? t.error_generic ?? "Could not get a recommendation right now. Please try again.");
      }
    } finally {
      setRequesting(false);
    }
  }

  async function handleSubmitFeedback() {
    if (feedbackRating < 1) return;
    setSubmittingFeedback(true);
    try {
      const result = await submitRecommendationFeedback(feedbackRating, feedbackComment);
      setRecommendation(result);
      setFeedbackSubmitted(true);
    } catch {
      // keep the form open so the user can retry
    } finally {
      setSubmittingFeedback(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border bg-muted/30">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isWorking = recommendation?.status === "pending" || recommendation?.status === "processing";
  const isFailed = recommendation?.status === "failed";
  const isReady = recommendation?.status === "completed" && recommendation.recommendations.length > 0;
  // Backend skips the ML call entirely (rather than returning a fake
  // recommendation) when the farm's location doesn't fall inside any
  // Kerala agro-climatic zone — input_snapshot.agro_zone is null in
  // exactly that case, distinguishing it from a generic service failure.
  const isOutsideKerala = isFailed && !recommendation?.input_snapshot?.agro_zone;
  // A failed refresh doesn't clear the previously-shown recommendation
  // (still valid, still useful) — this just marks it as not the result of
  // the just-failed request, so it's not confused for a fresh answer.
  const showStaleNotice = !!error && !!recommendation;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-1.5 font-medium text-sm">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            {t.title ?? "AI Crop Recommendations"}
          </h2>
          {recommendation && (
            <p className="text-muted-foreground text-xs">
              {(t.for_financial_year ?? "For financial year {fy}").replace("{fy}", recommendation.financial_year)}
              {recommendation.input_snapshot?.season && (
                <>
                  {" "}
                  {(t.generated_for_season ?? "— generated for {season}").replace(
                    "{season}",
                    SEASON_LABELS[recommendation.input_snapshot.season] ?? recommendation.input_snapshot.season,
                  )}
                </>
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <NativeSelect
            size="sm"
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(e.target.value)}
            disabled={requesting || isWorking}
            aria-label={t.season_aria_label ?? "Season"}
          >
            {SEASON_OPTIONS.map((opt) => (
              <NativeSelectOption key={opt.value} value={opt.value}>
                {opt.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <button
            type="button"
            onClick={handleRequest}
            disabled={requesting || isWorking}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground text-xs disabled:cursor-not-allowed disabled:opacity-50"
          >
            {requesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {recommendation ? (t.btn_refresh ?? "Refresh recommendations") : (t.btn_get ?? "Get recommendations")}
          </button>
        </div>
      </div>

      {recommendation?.input_snapshot?.location_snapshot &&
        (recommendation.input_snapshot.location_snapshot.lat != null ||
          recommendation.input_snapshot.location_snapshot.area_polygon) && (
          <div className="flex flex-col gap-1">
            <p className="text-muted-foreground text-xs">
              {t.location_map_label ?? "Farm location at time of this recommendation"}
            </p>
            <RecommendationLocationMap
              lat={recommendation.input_snapshot.location_snapshot.lat}
              lng={recommendation.input_snapshot.location_snapshot.lng}
              areaPolygon={recommendation.input_snapshot.location_snapshot.area_polygon}
            />
          </div>
        )}

      {error && <p className="text-destructive text-xs">{error}</p>}

      {showStaleNotice && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-amber-800 text-xs dark:bg-amber-950/30 dark:text-amber-400">
          {t.stale_notice ?? "Showing your previous recommendation below — the request above failed, so this hasn't changed."}
        </p>
      )}

      {recommendation?.warning && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-amber-800 text-xs dark:bg-amber-950/30 dark:text-amber-400">
          {recommendation.warning === "recommendations.service_unavailable"
            ? (t.warning_service_unavailable ?? "Showing your last saved recommendation — the AI service is temporarily unavailable.")
            : recommendation.warning}
        </p>
      )}

      {!recommendation && !error && (
        <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-lg border bg-muted/30 text-center">
          <p className="text-muted-foreground text-sm">{t.empty_title ?? "No recommendations yet."}</p>
          <p className="text-muted-foreground text-xs">
            {t.empty_description ??
              'Click "Get recommendations" above — accuracy improves if you\'ve drawn your cultivation area above.'}
          </p>
        </div>
      )}

      {isWorking && (
        <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-lg border bg-muted/30 text-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground text-sm">{t.working_title ?? "Generating your recommendation…"}</p>
          <p className="text-muted-foreground text-xs">
            {t.working_description ?? "This runs in the background — you'll also get a notification when it's ready."}
          </p>
        </div>
      )}

      {isFailed && isOutsideKerala && (
        <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-lg border bg-muted/30 text-center">
          <p className="text-muted-foreground text-sm">
            {t.outside_kerala_title ?? "Crop recommendations are only available for locations within Kerala."}
          </p>
          <p className="text-muted-foreground text-xs">
            {t.outside_kerala_description ??
              "Check your cultivation area boundary above — it looks like it falls outside Kerala's supported zones."}
          </p>
        </div>
      )}

      {isFailed && !isOutsideKerala && (
        <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-lg border bg-muted/30 text-center">
          <p className="text-muted-foreground text-sm">{t.failed_title ?? "Couldn't generate a recommendation this time."}</p>
          <p className="text-muted-foreground text-xs">{t.failed_description ?? "Try again using the button above."}</p>
        </div>
      )}

      {isReady && (
        <div className="flex flex-col gap-3">
          {recommendation.recommendations.map((item, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium capitalize">{item.crop}</h3>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary text-xs">
                  {(t.confidence_match ?? "{pct}% match").replace("{pct}", String(Math.round(item.confidence * 100)))}
                </span>
              </div>
              <p className="text-muted-foreground text-sm">{item.reasoning}</p>
              <div className="flex items-center gap-1.5 text-xs">
                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                <span>
                  {t.estimated_yield_label ?? "Estimated yield:"}{" "}
                  <span className="font-medium text-foreground">{item.estimated_yield}</span>
                </span>
              </div>
              <div className="flex items-start gap-1.5 border-t pt-2 text-xs">
                <ThumbsUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">{item.business_guidance}</span>
              </div>
            </div>
          ))}
          <div className="flex flex-col gap-2 rounded-lg border p-3">
            <h3 className="font-medium text-sm">
              {feedbackSubmitted ? (t.feedback_title_submitted ?? "Your feedback") : (t.feedback_title_new ?? "Was this helpful?")}
            </h3>
            <StarRating
              value={feedbackRating}
              onChange={(v) => {
                setFeedbackRating(v);
                setFeedbackSubmitted(false);
              }}
              t={t}
            />
            {!feedbackSubmitted && feedbackRating > 0 && (
              <>
                <textarea
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder={t.feedback_comment_placeholder ?? "Any comments? (optional)"}
                  rows={2}
                  className="w-full resize-none rounded-md border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={handleSubmitFeedback}
                  disabled={submittingFeedback}
                  className="self-end rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground text-xs disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submittingFeedback ? (t.feedback_submitting ?? "Submitting…") : (t.feedback_submit ?? "Submit feedback")}
                </button>
              </>
            )}
            {feedbackSubmitted && <p className="text-muted-foreground text-xs">{t.feedback_thanks ?? "Thanks for your feedback!"}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
