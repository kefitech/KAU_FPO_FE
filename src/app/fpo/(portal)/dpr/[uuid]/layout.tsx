"use client";

import { useEffect, useMemo, useState } from "react";

import { keepPreviousData, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, CheckCircle2, Circle, Download, FileStack, Loader2, PanelLeft, PanelLeftOpen, RefreshCw, Sparkles, XCircle } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  DPR_SECTIONS,
  type DprReadiness,
  type DprSectionInfo,
  type DprSectionKey,
  dprApi,
} from "@/lib/api/dpr";
import { selectHasAnySaving, useDprWizardStore } from "@/stores/dpr-store";

const STATUS_TOGGLE_STORAGE_KEY = "dpr-wizard-status-dots";
const SIDEBAR_COLLAPSED_STORAGE_KEY = "dpr-wizard-sidebar-collapsed";

type ReadinessState = "complete" | "warning" | "error" | "empty" | "unknown";

// ── Sidebar section entry ───────────────────────────────────────────────────

function SectionNavItem({
  uuid,
  section,
  stepNumber,
  active,
  dirty,
  showStatus,
  readiness,
  mandatory,
}: {
  uuid: string;
  section: DprSectionInfo;
  stepNumber: number;
  active: boolean;
  dirty: boolean;
  /** When true, show a colored completion dot instead of the step number. */
  showStatus: boolean;
  /** Precomputed readiness state — 'unknown' while loading. */
  readiness: ReadinessState;
  /** True when the rule engine flags this section as Mandatory. */
  mandatory?: boolean;
}) {
  return (
    <Link
      href={`/fpo/dpr/${uuid}/sections/${section.key}`}
      className={cn(
        "group relative flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors",
        active
          ? "bg-primary/10 text-foreground font-medium"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-primary" />
      )}
      {showStatus ? (
        <StatusDot state={readiness} active={active} />
      ) : (
        <span
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-medium tabular-nums transition-colors",
            active
              ? "bg-primary text-primary-foreground"
              : "bg-muted-foreground/10 text-muted-foreground group-hover:bg-muted-foreground/20",
          )}
        >
          {stepNumber}
        </span>
      )}
      <span className="flex-1 truncate">{section.title}</span>
      {mandatory && (
        <span
          className="rounded bg-red-100 px-1 py-0.5 text-[9px] font-semibold text-red-700 dark:bg-red-950 dark:text-red-300"
          title="Required for submission"
        >
          M
        </span>
      )}
      {dirty && (
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500"
          title="Unsaved changes"
        />
      )}
    </Link>
  );
}

// ── Status dot (replaces number when the toggle is ON) ──────────────────────

function StatusDot({ state, active }: { state: ReadinessState; active: boolean }) {
  const cfg = {
    complete: { Icon: CheckCircle2, className: "text-emerald-500", title: "Complete" },
    warning:  { Icon: AlertTriangle, className: "text-amber-500",   title: "Has warnings" },
    error:    { Icon: XCircle,       className: "text-destructive", title: "Has errors" },
    empty:    { Icon: Circle,        className: "text-muted-foreground/40", title: "Not started" },
    unknown:  { Icon: Loader2,       className: "text-muted-foreground/60 animate-spin", title: "Loading…" },
  }[state];
  const { Icon, className, title } = cfg;
  return (
    <span
      className={cn(
        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors",
        active && "bg-primary/15",
      )}
      title={title}
    >
      <Icon className={cn("h-4 w-4", className)} />
    </span>
  );
}

// ── Aggregate all-sections readiness (only fetched when toggle is ON) ───────

function useAllSectionsReadiness(uuid: string, enabled: boolean): Record<DprSectionKey, ReadinessState> {
  const queries = useQueries({
    queries: DPR_SECTIONS.map((s) => ({
      queryKey: ["dpr-readiness", uuid, s.key],
      queryFn: (): Promise<DprReadiness> =>
        s.key === "identification"
          ? dprApi.getIdentificationReadiness(uuid)
          : dprApi.getReadiness(uuid, s.key),
      enabled: !!uuid && enabled,
      staleTime: 30_000,
      // Keep the previous fetch result visible during any refetch — prevents
      // the sidebar dots flickering to a loading spinner whenever the user
      // navigates between sections (Save-on-Next triggers a refetch on the
      // section they just left; without this the dot briefly flips to
      // "unknown" until the new response lands).
      placeholderData: keepPreviousData,
    })),
  });

  const result = {} as Record<DprSectionKey, ReadinessState>;
  DPR_SECTIONS.forEach((s, i) => {
    const q = queries[i];
    if (!enabled || q.isLoading) {
      result[s.key] = enabled ? "unknown" : "empty";
      return;
    }
    if (q.isError || !q.data) {
      result[s.key] = "empty";
      return;
    }
    const { errors, warnings, is_complete } = q.data;
    if (errors && errors.length > 0) result[s.key] = "error";
    else if (warnings && warnings.length > 0) result[s.key] = "warning";
    else if (is_complete) result[s.key] = "complete";
    else result[s.key] = "empty";
  });
  return result;
}

// ── Save indicator (aggregated across all sections) ─────────────────────────

function SaveIndicator() {
  const anySaving = useDprWizardStore(selectHasAnySaving);
  if (!anySaving) return null;
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Loader2 className="h-3 w-3 animate-spin" />
      Saving…
    </span>
  );
}

// ── Refresh button ──────────────────────────────────────────────────────────
// Global "reload data from server" for the whole wizard. Sits in the shell
// header so every section benefits without wiring it in each one. Invalidates
// every React Query cache under this project so DPR + section GETs +
// readiness + master data all refetch. No full page reload — form state
// survives.

function WizardRefreshButton() {
  const queryClient = useQueryClient();
  const [spinning, setSpinning] = useState(false);

  async function handleClick() {
    setSpinning(true);
    try {
      await queryClient.invalidateQueries();
      toast.success("Data refreshed");
    } finally {
      // Keep the spin visible briefly so the click feels acknowledged
      setTimeout(() => setSpinning(false), 400);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={spinning}
      title="Refresh data from server (Ctrl+R equivalent, keeps unsaved edits)"
    >
      <RefreshCw className={cn("h-4 w-4", spinning && "animate-spin")} />
    </Button>
  );
}

// ── PDF download button ────────────────────────────────────────────────────
// Fetches /api/fpo/dpr/projects/<uuid>/pdf/, triggers a browser download
// without navigating away. Disabled while the PDF is being generated so the
// user can see the click was received.

function DownloadPdfButton({ uuid }: { uuid: string }) {
  const [downloading, setDownloading] = useState(false);

  async function handleClick() {
    if (downloading) return;
    setDownloading(true);
    try {
      const blob = await dprApi.downloadPdf(uuid);
      // Trigger browser download via anchor click — no navigation, no popup blocker.
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dpr_${uuid.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Revoke after a short delay so the download completes on slow devices.
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast.success("DPR PDF downloaded");
    } catch (err) {
      // Backend errors surface as a JSON body inside the blob when responseType='blob'
      // was used. Best-effort parse; fall back to a generic message.
      toast.error("Failed to generate PDF. Please save all sections and try again.");
      console.warn("[DPR PDF] download error", err);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={downloading}
      title="Download the DPR as a PDF (uses live financial calculation)"
    >
      {downloading ? (
        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-1 h-4 w-4" />
      )}
      {downloading ? "Generating…" : "Download PDF"}
    </Button>
  );
}

// ── Wizard shell layout ─────────────────────────────────────────────────────

export default function DprWizardLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ uuid: string }>();
  const uuid = params.uuid;
  const pathname = usePathname();
  const dirty = useDprWizardStore((s) => s.dirty);

  const {
    data: project,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["dpr-project", uuid],
    queryFn: () => dprApi.getProject(uuid),
    enabled: !!uuid,
    staleTime: 30_000,
  });

  // Applicability — Phase 6d (KAU RCD A.1). Rule engine tells us which
  // sections to show / hide based on the project's selected components.
  // When the backend feature flag is off, `engine_enabled=false` and every
  // section returns 'O' → we show all 22 (rollback state).
  // 15-second staleTime because the engine result changes when the user
  // edits the Components section — short enough that switching components
  // and clicking through the sidebar within 15s gives fresh filtering.
  const { data: applicability } = useQuery({
    queryKey: ["dpr-applicability", uuid],
    queryFn: () => dprApi.getApplicability(uuid),
    enabled: !!uuid,
    staleTime: 15_000,
  });

  // Section applicability lookup — falls back to 'O' when data not loaded
  // yet OR when the engine flag is off. Result: default behaviour is
  // "show everything" until we know otherwise.
  function sectionApplicability(key: string): "M" | "O" | "H" {
    if (!applicability) return "O";
    return applicability.applicability[key] ?? "O";
  }

  // Split sections by KAU stream group for the sidebar — hides H sections
  // when the engine is enabled and returns hidden decisions. Sections stay
  // in canonical DPR_SECTIONS order within their group.
  const groupedSections = useMemo(() => {
    const groups: Record<string, DprSectionInfo[]> = {};
    for (const section of DPR_SECTIONS) {
      if (sectionApplicability(section.key) === "H") continue;
      (groups[section.group] ??= []).push(section);
    }
    return groups;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicability]);

  // Full list of visible section keys for the collapsed rail (which
  // iterates DPR_SECTIONS directly). Sync with groupedSections.
  const visibleSectionKeys = useMemo(() => {
    return DPR_SECTIONS.filter(
      (s) => sectionApplicability(s.key) !== "H",
    ).map((s) => s.key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicability]);

  // Active section = last `/sections/<key>` segment in the URL
  const activeSectionKey = useMemo(() => {
    const match = pathname?.match(/\/sections\/([^/]+)/);
    return match?.[1] ?? null;
  }, [pathname]);

  // Sidebar toggle — "numbers" (default, no API calls) vs "status dots"
  // (fetches readiness for all 22 sections in parallel, colored dots).
  // Preference persisted per-browser in localStorage so it sticks across sessions.
  const [showStatus, setShowStatus] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem(STATUS_TOGGLE_STORAGE_KEY);
    if (stored === "1") setShowStatus(true);
  }, []);
  useEffect(() => {
    localStorage.setItem(STATUS_TOGGLE_STORAGE_KEY, showStatus ? "1" : "0");
  }, [showStatus]);

  const readinessMap = useAllSectionsReadiness(uuid, showStatus);

  // Sidebar collapse toggle — hide the 22-step nav to give the section
  // form the full viewport width. Preference persisted in localStorage.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
    if (stored === "1") setSidebarCollapsed(true);
  }, []);
  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, sidebarCollapsed ? "1" : "0");
  }, [sidebarCollapsed]);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <p className="text-sm font-medium text-destructive">DPR project not found</p>
        <p className="text-muted-foreground text-xs">
          This project may have been deleted or you don't have access.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/fpo/dpr">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to DPR Projects
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button asChild variant="ghost" size="sm">
            <Link href="/fpo/dpr">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          {/* Sidebar collapse toggle — hides the 22-step nav to give the form
              the full viewport width. Icon reflects current state. */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarCollapsed((v) => !v)}
            title={sidebarCollapsed ? "Show section list" : "Hide section list"}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
          </Button>
          <div className="min-w-0">
            {isLoading ? (
              <Skeleton className="h-5 w-48" />
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="truncate text-sm font-semibold">
                  {project?.title || "Untitled DPR"}
                </h1>
                {project && (
                  <Badge variant="secondary" className="text-[10px]">
                    {project.status.replace("_", " ")}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* AI narrative shortcut — KAU RCD B.5 Phase 5. Placed next to the
              PDF button so users see it right when they're about to export. */}
          <Button asChild variant="outline" size="sm">
            <Link href={`/fpo/dpr/${uuid}/ai-content`}>
              <Sparkles className="mr-1 h-4 w-4" />
              AI Narrative
            </Link>
          </Button>
          {/* Versioned DPR PDF workflow (KAU §7.1/§7.2). "Manage DPRs" opens
              a versioned list; each Generate action creates a new row. The
              legacy one-shot "Download PDF" stays alongside as an unversioned
              live preview for reviewers who just want the latest snapshot
              without bumping the version counter. */}
          <Button asChild variant="outline" size="sm">
            <Link href={`/fpo/dpr/${uuid}/documents`}>
              <FileStack className="mr-1 h-4 w-4" />
              Manage DPRs
            </Link>
          </Button>
          <DownloadPdfButton uuid={uuid} />
          <WizardRefreshButton />
          <SaveIndicator />
        </div>
      </div>

      {/* Body: sidebar + content */}
      <div className="flex flex-1 min-h-0">
        {/* Expanded sidebar — full width with titles + group headings + toggle */}
        {!sidebarCollapsed && (
          <aside className="w-64 shrink-0 overflow-y-auto border-r bg-background p-4">
            {/* Numbers ↔ colored status dots toggle. Persists in localStorage. */}
            <label className="mb-4 flex cursor-pointer items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-xs">
              <span className="font-medium">Show completion status</span>
              <Switch checked={showStatus} onCheckedChange={setShowStatus} aria-label="Toggle status dots" />
            </label>

            {Object.entries(groupedSections).map(([group, sections], groupIdx) => (
              <div key={group} className={groupIdx === 0 ? "mb-6" : ""}>
                <div className="mb-2 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {group}
                </div>
                <nav className="space-y-0.5">
                  {sections.map((section) => {
                    const globalIdx = DPR_SECTIONS.findIndex((s) => s.key === section.key);
                    return (
                      <SectionNavItem
                        key={section.key}
                        uuid={uuid}
                        section={section}
                        stepNumber={globalIdx + 1}
                        active={activeSectionKey === section.key}
                        dirty={!!dirty[section.key]}
                        showStatus={showStatus}
                        readiness={readinessMap[section.key as DprSectionKey] ?? "empty"}
                        mandatory={sectionApplicability(section.key) === "M"}
                      />
                    );
                  })}
                </nav>
              </div>
            ))}
          </aside>
        )}

        {/* Collapsed rail — narrow strip with just number circles / status dots.
            Clickable so the user can still jump to any section. Section titles
            appear on hover via the `title` attribute. */}
        {sidebarCollapsed && (
          <aside className="w-14 shrink-0 overflow-y-auto border-r bg-background py-3">
            <nav className="flex flex-col items-center space-y-1">
              {DPR_SECTIONS.filter((s) => visibleSectionKeys.includes(s.key)).map((section, i) => {
                const active = activeSectionKey === section.key;
                const readiness = readinessMap[section.key] ?? "empty";
                return (
                  <Link
                    key={section.key}
                    href={`/fpo/dpr/${uuid}/sections/${section.key}`}
                    title={`${i + 1}. ${section.title}`}
                    className={cn(
                      "group relative flex h-9 w-9 items-center justify-center rounded-md transition-colors",
                      active ? "bg-primary/10" : "hover:bg-muted",
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-primary" />
                    )}
                    {showStatus ? (
                      <StatusDot state={readiness} active={active} />
                    ) : (
                      <span
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-medium tabular-nums",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted-foreground/10 text-muted-foreground group-hover:bg-muted-foreground/20",
                        )}
                      >
                        {i + 1}
                      </span>
                    )}
                    {dirty[section.key] && (
                      <span
                        className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-orange-500"
                        title="Unsaved changes"
                      />
                    )}
                  </Link>
                );
              })}
            </nav>
          </aside>
        )}

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
