"use client";

import { useMemo } from "react";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { DPR_SECTIONS, type DprSectionInfo, dprApi } from "@/lib/api/dpr";
import { selectHasAnySaving, useDprWizardStore } from "@/stores/dpr-store";

// ── Sidebar section entry ───────────────────────────────────────────────────

function SectionNavItem({
  uuid,
  section,
  stepNumber,
  active,
  dirty,
}: {
  uuid: string;
  section: DprSectionInfo;
  stepNumber: number;
  active: boolean;
  dirty: boolean;
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
      <span className="flex-1 truncate">{section.title}</span>
      {dirty && (
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500"
          title="Unsaved changes"
        />
      )}
    </Link>
  );
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

  // Split sections by KAU stream group for the sidebar
  const groupedSections = useMemo(() => {
    const groups: Record<string, DprSectionInfo[]> = {};
    for (const section of DPR_SECTIONS) {
      (groups[section.group] ??= []).push(section);
    }
    return groups;
  }, []);

  // Active section = last `/sections/<key>` segment in the URL
  const activeSectionKey = useMemo(() => {
    const match = pathname?.match(/\/sections\/([^/]+)/);
    return match?.[1] ?? null;
  }, [pathname]);

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
        <SaveIndicator />
      </div>

      {/* Body: sidebar + content */}
      <div className="flex flex-1 min-h-0">
        <aside className="w-64 shrink-0 overflow-y-auto border-r bg-background p-4">
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
                    />
                  );
                })}
              </nav>
            </div>
          ))}
        </aside>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
