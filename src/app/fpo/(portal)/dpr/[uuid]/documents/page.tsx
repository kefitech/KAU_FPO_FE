"use client";

/**
 * FPO — Generated DPR PDFs (versioned document list).
 *
 * Per KAU pre-UAT reply §7.1 + §7.2 (2026-09-08): each Generate action creates
 * a new DPRDocument row with a fresh monotonic version_number (never resets),
 * and the download list must show both the version and the timestamp per row.
 * Retention rule (default 10) keeps the counter monotonic — older versions are
 * soft-archived, never deleted, so a final approved DPR is never inadvertently
 * lost.
 *
 * Backend: apps/fpo/api/dpr/calculation.py (DPRDocumentGenerateView,
 * DPRDocumentListView, DPRDocumentDownloadView).
 *
 * Author: Athul Gopan (Kefi Tech Solutions)
 */

import { use, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, FileSpreadsheet, FileText, Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { dprApi, type DprDocument, type DprDocumentStatus } from "@/lib/api/dpr";

function fmtBytes(n: number): string {
  if (!n || n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// Status pill — colour matches the semantic weight of the state so the FPO can
// distinguish successive drafts vs the finalised submission at a glance.
const STATUS_PILL: Record<
  DprDocumentStatus,
  { label: string; classes: string }
> = {
  draft: {
    label: "Draft",
    classes:
      "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300",
  },
  user_edited: {
    label: "User-edited",
    classes:
      "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  final: {
    label: "Final",
    classes:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  },
};

function StatusPill({ status }: { status: DprDocumentStatus }) {
  const cfg = STATUS_PILL[status] ?? STATUS_PILL.draft;
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cfg.classes}`}>
      {cfg.label}
    </span>
  );
}

export default function FpoDprDocumentsPage({
  params,
}: {
  params: Promise<{ uuid: string }>;
}) {
  const { uuid } = use(params);
  const qc = useQueryClient();

  const [downloadingVersion, setDownloadingVersion] = useState<number | null>(null);
  const [downloadingExcel, setDownloadingExcel] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["dpr-documents", uuid],
    queryFn: () => dprApi.listDocuments(uuid),
    enabled: !!uuid,
  });

  const generateMutation = useMutation({
    mutationFn: () => dprApi.generateDocument(uuid),
    onSuccess: (doc) => {
      qc.invalidateQueries({ queryKey: ["dpr-documents", uuid] });
      // Also invalidate the calc — a generation may trigger cached recompute.
      qc.invalidateQueries({ queryKey: ["dpr-calculation", uuid] });
      toast.success(`DPR v${doc.version_number} generated.`);
    },
    onError: () => {
      toast.error(
        "Failed to generate DPR. Please save all sections and try again.",
      );
    },
  });

  async function handleExcelDownload() {
    if (downloadingExcel) return;
    setDownloadingExcel(true);
    try {
      const blob = await dprApi.downloadFinancialsExcel(uuid);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Backend chooses the filename via Content-Disposition when downloaded
      // directly, but for a blob-triggered save we set a sensible default.
      a.download = `DPR_Financials_${uuid.slice(0, 8)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast.success("Financials workbook downloaded.");
    } catch {
      toast.error("Failed to generate financials workbook.");
    } finally {
      setDownloadingExcel(false);
    }
  }

  async function handleDownload(doc: DprDocument) {
    if (downloadingVersion !== null) return;
    setDownloadingVersion(doc.version_number);
    try {
      const blob = await dprApi.downloadDocument(uuid, doc.version_number);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast.success(`${doc.filename} downloaded.`);
    } catch {
      toast.error(`Failed to download v${doc.version_number}.`);
    } finally {
      setDownloadingVersion(null);
    }
  }

  const documents = data ?? [];
  const hasAny = documents.length > 0;
  const generating = generateMutation.isPending;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/fpo/dpr/${uuid}/sections/identification`}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to wizard
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Generated DPR versions</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Every Generate action creates a new PDF version. Versions never
            reset — older PDFs are archived automatically once the retention
            limit is reached (default 10 live copies per project) so that a
            final, approved DPR is never lost. Timestamps below use your
            local timezone.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExcelDownload}
            disabled={downloadingExcel}
            title="Download the projected financials (P&L, Cash Flow, Balance Sheet, Ratios) as Excel"
          >
            {downloadingExcel ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="mr-1 h-4 w-4" />
            )}
            {downloadingExcel ? "Preparing…" : "Financials (Excel)"}
          </Button>
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generating}
          >
            {generating ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-1 h-4 w-4" />
            )}
            {generating ? "Generating…" : "Generate new DPR"}
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading versions…
        </div>
      )}

      {isError && (
        <Card>
          <CardContent className="p-5 text-sm text-destructive">
            Failed to load DPR versions. Please refresh and try again.
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && !hasAny && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <FileText className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">
              No DPR versions yet.
            </p>
            <p className="max-w-md text-xs text-muted-foreground">
              Click <strong>Generate new DPR</strong> above to produce your
              first versioned PDF. The FPO name and district appear on the
              cover; each version bears a monotonic <code>v1</code>,
              <code>v2</code>… identifier.
            </p>
          </CardContent>
        </Card>
      )}

      {hasAny && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-20 text-center">Version</TableHead>
                  <TableHead>Filename</TableHead>
                  <TableHead>Generated</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Size</TableHead>
                  <TableHead className="w-32 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="text-center font-medium tabular-nums">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        v{d.version_number}
                      </span>
                    </TableCell>
                    <TableCell
                      className="max-w-xs truncate font-mono text-xs"
                      title={d.filename}
                    >
                      {d.filename}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {fmtDate(d.generated_at)}
                    </TableCell>
                    <TableCell>
                      <StatusPill status={d.status} />
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums text-muted-foreground">
                      {fmtBytes(d.file_size)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={downloadingVersion === d.version_number}
                        onClick={() => handleDownload(d)}
                        title={`Download DPR v${d.version_number}`}
                      >
                        {downloadingVersion === d.version_number ? (
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="mr-1 h-3.5 w-3.5" />
                        )}
                        Download
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
