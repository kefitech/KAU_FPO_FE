"use client";

/**
 * Admin — DPR Project Detail (read-only oversight).
 * Sidebar of 21 sections with completion dots + main pane rendering the
 * selected section's data + backend readiness (errors / warnings).
 *
 * Author: Athul Gopan (Kefi Tech Solutions)
 */

import { use, useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, CheckCircle2, Circle, XCircle } from "lucide-react";
import Link from "next/link";

import {
  adminDprProjectsApi,
  DPR_STATUS_COLORS,
  DPR_STATUS_LABELS,
} from "@/app/admin/_api/dpr-projects";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DPR_SECTIONS } from "@/lib/api/dpr";

import { SectionViewer } from "./_components/section-viewer";

export default function AdminDprProjectDetailPage({
  params,
}: {
  params: Promise<{ uuid: string }>;
}) {
  const { uuid } = use(params);
  const [activeKey, setActiveKey] = useState<string>(DPR_SECTIONS[0].key);

  const query = useQuery({
    queryKey: ["admin-dpr-project-detail", uuid],
    queryFn: () => adminDprProjectsApi.detail(uuid),
    staleTime: 30_000,
  });

  const activeSection = query.data?.sections?.[activeKey];
  const activeInfo = useMemo(
    () => DPR_SECTIONS.find((s) => s.key === activeKey),
    [activeKey]
  );

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/dpr/projects">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to projects
          </Link>
        </Button>
      </div>

      {query.isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : query.isError || !query.data ? (
        <Card><CardContent className="p-6 text-center text-sm text-destructive">
          Failed to load DPR project.
        </CardContent></Card>
      ) : (
        <>
          {/* Project + FPO summary */}
          <Card>
            <CardContent className="grid gap-4 p-5 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">DPR Title</p>
                <h1 className="mt-1 text-lg font-semibold">
                  {query.data.project.title || <span className="italic text-muted-foreground">Untitled</span>}
                </h1>
                <span className={`mt-2 inline-block rounded-md px-2 py-1 text-xs ${DPR_STATUS_COLORS[query.data.project.status]}`}>
                  {DPR_STATUS_LABELS[query.data.project.status]}
                </span>
              </div>
              {query.data.fpo && (
                <>
                  <div>
                    <p className="text-xs text-muted-foreground">FPO</p>
                    <p className="mt-1 font-medium">{query.data.fpo.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {query.data.fpo.application_id ?? "—"} · {query.data.fpo.district} · Tier {query.data.fpo.tier ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Contact</p>
                    <p className="mt-1 text-sm">{query.data.fpo.office_email || "—"}</p>
                    <p className="text-xs text-muted-foreground">{query.data.fpo.office_phone || "—"}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Sidebar + section pane */}
          <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
            {/* Sidebar */}
            <Card>
              <CardContent className="p-0">
                <ul className="divide-y">
                  {DPR_SECTIONS.map((s, i) => {
                    const sec = query.data.sections[s.key];
                    const isActive = activeKey === s.key;
                    const hasErrors = (sec?.readiness?.errors?.length ?? 0) > 0;
                    const hasWarnings = (sec?.readiness?.warnings?.length ?? 0) > 0;
                    const isEmpty = sec?.data === null;
                    const isComplete = sec?.readiness?.is_complete;

                    let Icon = Circle;
                    let iconClass = "text-muted-foreground";
                    if (isEmpty) {
                      Icon = Circle;
                      iconClass = "text-muted-foreground/50";
                    } else if (hasErrors) {
                      Icon = XCircle;
                      iconClass = "text-destructive";
                    } else if (hasWarnings) {
                      Icon = AlertTriangle;
                      iconClass = "text-amber-500";
                    } else if (isComplete) {
                      Icon = CheckCircle2;
                      iconClass = "text-emerald-500";
                    }

                    return (
                      <li key={s.key}>
                        <button
                          type="button"
                          onClick={() => setActiveKey(s.key)}
                          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                            isActive ? "bg-muted font-medium" : "hover:bg-muted/50"
                          }`}
                        >
                          <span className="w-5 shrink-0 text-xs text-muted-foreground">{i + 1}.</span>
                          <Icon className={`h-3.5 w-3.5 shrink-0 ${iconClass}`} />
                          <span className="flex-1 truncate">{s.title}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>

            {/* Section pane */}
            <div className="space-y-4">
              <Card>
                <CardContent className="p-5">
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-semibold">{activeInfo?.title}</h2>
                      <p className="text-xs text-muted-foreground">{activeInfo?.specRef} · {activeInfo?.group}</p>
                    </div>
                  </div>

                  {/* Readiness summary */}
                  {activeSection?.readiness && (
                    <div className="mb-4 space-y-2">
                      {activeSection.readiness.errors.length > 0 && (
                        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
                          <p className="mb-1 text-xs font-medium text-destructive">
                            {activeSection.readiness.errors.length} error{activeSection.readiness.errors.length === 1 ? "" : "s"}
                          </p>
                          <ul className="ml-4 list-disc space-y-1 text-xs text-destructive">
                            {activeSection.readiness.errors.map((e, i) => (
                              <li key={i}><span className="font-mono">{e.field}</span> — {e.message}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {activeSection.readiness.warnings.length > 0 && (
                        <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
                          <p className="mb-1 text-xs font-medium text-amber-700 dark:text-amber-500">
                            {activeSection.readiness.warnings.length} warning{activeSection.readiness.warnings.length === 1 ? "" : "s"}
                          </p>
                          <ul className="ml-4 list-disc space-y-1 text-xs text-amber-700 dark:text-amber-500">
                            {activeSection.readiness.warnings.map((w, i) => (
                              <li key={i}><span className="font-mono">{w.field}</span> — {w.message}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {activeSection.readiness.is_complete
                        && activeSection.readiness.errors.length === 0
                        && activeSection.readiness.warnings.length === 0 && (
                        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3 text-xs text-emerald-700 dark:text-emerald-500">
                          ✓ Section complete — no errors, no warnings.
                        </div>
                      )}
                    </div>
                  )}

                  <SectionViewer data={activeSection?.data ?? null} />
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
