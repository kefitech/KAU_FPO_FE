"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import {
  apiErrorMessage,
  type CbboTrainingSession,
  type CbboTrainingSessionDetail,
  cbboTrainingApi,
} from "@/app/cbbo/_api/training";
import { DataTable } from "@/components/data-table";
import { OpenSessionFromUrl } from "@/components/shared/open-session-from-url";
import { TrainingCommentList } from "@/components/shared/training-comment-list";
import { CancelSessionDialog } from "@/components/training/cancel-session-dialog";
import { Button } from "@/components/ui/button";
import { ViewSheet } from "@/components/ui/view-sheet";
import { translationsApi } from "@/lib/api/translations";
import { escapeHtml } from "@/lib/escape-html";
import { useLocaleStore } from "@/stores/locale-store";

import { getTrainingColumns } from "./_components/columns";

type T = Record<string, string>;

// The labels are shared with the government training page, so the Malayalam
// already seeded for it applies here too.
const TRANSLATION_NS = "government_training";

const DISTRICT_CODES = [
  "TVM",
  "KLM",
  "PTA",
  "ALP",
  "KTM",
  "IDK",
  "EKM",
  "TSR",
  "PKD",
  "MLP",
  "KZD",
  "WYD",
  "KNR",
  "KSD",
];

export default function CbboTrainingPage() {
  const router = useRouter();
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});
  const [translationsLoading, setTranslationsLoading] = useState(true);
  const queryClient = useQueryClient();
  const [sheet, setSheet] = useState<{
    open: boolean;
    session: CbboTrainingSession | CbboTrainingSessionDetail | null;
  }>({
    open: false,
    session: null,
  });
  const [cancelOpen, setCancelOpen] = useState(false);

  // Cancel from the view sheet: soft-deletes the session and tells the FPO's members why.
  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => cbboTrainingApi.cancel(id, reason),
    onSuccess: () => {
      toast.success(t.toast_cancelled ?? "Training session cancelled. The FPO has been notified.");
      setCancelOpen(false);
      setSheet({ open: false, session: null });
      queryClient.invalidateQueries({ queryKey: ["cbbo-training-sessions"] });
    },
    onError: (error: unknown) => {
      toast.error(apiErrorMessage(error, t.cancel_failed ?? "Failed to cancel session"));
    },
  });

  useEffect(() => {
    setTranslationsLoading(true);
    translationsApi
      .getPublic(locale, `${TRANSLATION_NS},districts,common`)
      .then((data) => {
        setT({ ...(data.districts ?? {}), ...(data[TRANSLATION_NS] ?? {}) });
        setTCommon(data.common ?? {});
      })
      .catch(() => undefined)
      .finally(() => setTranslationsLoading(false));
  }, [locale]);

  const filters = useMemo(
    () => [
      {
        key: "district",
        label: t.filter_all_district ?? "All District",
        options: DISTRICT_CODES.map((code) => ({
          value: code,
          label: t[`district_${code}`] ?? code,
        })),
      },
    ],
    [t],
  );

  // Opening a session clears its unread KAU-comment marker for this user.
  function openSession(row: CbboTrainingSession) {
    setSheet({ open: true, session: row });
    if (row.has_unread_comments) {
      cbboTrainingApi
        .markCommentsRead(row.id)
        .then(() => queryClient.invalidateQueries({ queryKey: ["cbbo-training-sessions"] }))
        .catch(() => undefined); // marker just stays until the next open
    }
  }

  // A notification link (?session=<id>) opens that session — fetched by id, since
  // it may not be on the table's current page. Opening it clears the unread marker.
  const openSessionById = useCallback(
    (id: number) => {
      cbboTrainingApi
        .getById(id)
        .then((session) => {
          setSheet({ open: true, session });
          return cbboTrainingApi.markCommentsRead(id);
        })
        .then(() => queryClient.invalidateQueries({ queryKey: ["cbbo-training-sessions"] }))
        .catch(() => undefined); // no longer visible to this officer — the list still shows
    },
    [queryClient],
  );

  const s = sheet.session;

  if (translationsLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex flex-col gap-2">
          <div className="h-7 w-56 animate-pulse rounded bg-muted" />
          <div className="h-4 w-80 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-9 w-full animate-pulse rounded-lg bg-muted" />
        <div className="h-64 w-full animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl">{t.page_title ?? "Training Sessions"}</h1>
          <p className="mt-0.5 text-muted-foreground text-sm">
            {t.page_description ?? "Sessions conducted for FPOs in your jurisdiction"}
          </p>
        </div>
        <Button size="sm" onClick={() => router.push("/cbbo/training/new")}>
          <Plus className="mr-1.5 h-4 w-4" />
          {t.btn_new_session ?? "New Session"}
        </Button>
      </div>

      <Suspense>
        <OpenSessionFromUrl onOpen={openSessionById} />
        <DataTable
          queryKey="cbbo-training-sessions"
          queryFn={cbboTrainingApi.getAll}
          columns={getTrainingColumns(t, tCommon, openSession)}
          filters={filters}
          onRowClick={openSession}
          columnsLabel={tCommon.col_header ?? "Columns"}
          toggleColumnsLabel={tCommon.col_toggle_columns ?? "Toggle columns"}
          searchPlaceholder={t.search_placeholder ?? "Search by topic or FPO..."}
          clearLabel={tCommon.cancel ?? "Clear"}
        />
      </Suspense>

      {s && (
        <>
          <ViewSheet
            open={sheet.open}
            onOpenChange={(open) => setSheet((prev) => ({ ...prev, open }))}
            title={escapeHtml(s.topic)}
            actions={
              s.can_edit
                ? [
                    {
                      label: t.btn_edit_session ?? "Edit Session",
                      onClick: () => router.push(`/cbbo/training/${s.id}`),
                    },
                    {
                      label: t.action_cancel ?? "Cancel session",
                      onClick: () => setCancelOpen(true),
                      variant: "destructive" as const,
                      disabled: cancelMutation.isPending,
                    },
                  ]
                : []
            }
            fields={[
              { type: "section", label: t.section_session ?? "Session" },
              { label: t.field_fpo ?? "FPO", value: s.fpo_name },
              { label: t.field_trainer_name ?? "Trainer", value: s.trainer_name || "—" },
              { label: t.field_district ?? "District", value: t[`district_${s.district}`] ?? s.district },
              { label: t.field_date ?? "Date", type: "date", value: s.date },
              { label: t.field_duration ?? "Duration", value: `${s.duration_hours}h` },
              { label: t.field_venue ?? "Venue", value: s.venue || "—" },
              { label: t.field_participants ?? "Participants", value: String(s.participants_count) },
              { type: "section", label: t.section_created ?? "Created By" },
              { label: t.field_created_by ?? "Official", value: s.created_by_name },
              { type: "section", label: t.section_comments ?? "KAU Comments" },
              {
                label: t.col_comments ?? "Comments",
                type: "node",
                node: (
                  <TrainingCommentList
                    comments={s.comments ?? []}
                    commentByLabel={t.comment_by ?? "Comment by"}
                    editedLabel={t.comment_edited ?? "edited"}
                    emptyLabel={t.comments_empty ?? "No comments from KAU yet."}
                  />
                ),
              },
            ]}
          />
          <CancelSessionDialog
            open={cancelOpen}
            onOpenChange={setCancelOpen}
            topic={s.topic}
            fpoName={s.fpo_name}
            isPending={cancelMutation.isPending}
            onConfirm={(reason) => cancelMutation.mutate({ id: s.id, reason })}
            t={t}
          />
        </>
      )}
    </div>
  );
}
