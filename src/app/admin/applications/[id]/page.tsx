"use client";

import { useEffect, useState } from "react";

import { useParams, useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  Landmark,
  MapPin,
  ShieldCheck,
  Star,
  Users,
  XCircle,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  type ApplicationStatus,
  type AssignTierPayload,
  type TierAuditLogEntry,
  adminApplicationsApi,
} from "@/app/admin/_api/applications";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { translationsApi } from "@/lib/api/translations";
import { useAuthStore } from "@/stores/auth-store";
import { useLocaleStore } from "@/stores/locale-store";

type T = Record<string, string>;

// ─── Status badge ─────────────────────────────────────────────────────────────

function formatDocType(type: string | undefined | null): string {
  if (!type) return "—";
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatStatus(status: string): string {
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function StatusBadge({ status }: { status: ApplicationStatus }) {
  const cls: Record<ApplicationStatus, string> = {
    draft: "bg-muted text-muted-foreground",
    submitted: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    under_review: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    info_required: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    suspended: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium text-xs ${cls[status]}`}>
      {formatStatus(status)}
    </span>
  );
}

// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="font-medium text-sm">
        {value || <span className="font-normal text-muted-foreground">—</span>}
      </span>
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-5">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ─── Reject dialog ────────────────────────────────────────────────────────────

const rejectSchema = z.object({
  reason: z.string().min(20, { message: "Reason must be at least 20 characters" }),
});
type RejectValues = z.infer<typeof rejectSchema>;

function RejectDialog({
  fpoId,
  t,
  tCommon,
  open,
  onOpenChange,
}: {
  fpoId: number;
  t: T;
  tCommon: T;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RejectValues>({
    resolver: zodResolver(rejectSchema),
  });

  const mutation = useMutation({
    mutationFn: (values: RejectValues) => adminApplicationsApi.reject(fpoId, values.reason),
    onSuccess: () => {
      toast.success(t.reject_dialog_title ?? "Application rejected");
      queryClient.invalidateQueries({ queryKey: ["application", fpoId] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      reset();
      onOpenChange(false);
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Failed to reject application"),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t.reject_dialog_title ?? "Reject Application"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="reason">
              {t.reject_reason_label ?? "Rejection Reason"} <span className="text-destructive">*</span>
            </FieldLabel>
            <Textarea
              id="reason"
              placeholder={
                t.reject_reason_hint ?? "Minimum 20 characters — explain why the application is being rejected"
              }
              rows={4}
              {...register("reason")}
            />
            {errors.reason && <FieldError errors={[errors.reason]} />}
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tCommon.cancel ?? "Cancel"}
            </Button>
            <Button type="submit" variant="destructive" disabled={mutation.isPending}>
              {mutation.isPending
                ? (t.reject_btn_submitting ?? "Rejecting…")
                : (t.reject_btn_submit ?? "Reject Application")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Request info dialog ──────────────────────────────────────────────────────

const requestInfoSchema = z.object({
  notes: z.string().min(10, { message: "Notes must be at least 10 characters" }),
});
type RequestInfoValues = z.infer<typeof requestInfoSchema>;

function RequestInfoDialog({
  fpoId,
  t,
  tCommon,
  open,
  onOpenChange,
}: {
  fpoId: number;
  t: T;
  tCommon: T;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RequestInfoValues>({
    resolver: zodResolver(requestInfoSchema),
  });

  const mutation = useMutation({
    mutationFn: (values: RequestInfoValues) => adminApplicationsApi.requestInfo(fpoId, values.notes),
    onSuccess: () => {
      toast.success(t.req_info_btn_submit ?? "Information requested from FPO");
      queryClient.invalidateQueries({ queryKey: ["application", fpoId] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      reset();
      onOpenChange(false);
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Failed to request information"),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t.req_info_dialog_title ?? "Request Additional Information"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="notes">
              {t.req_info_notes_label ?? "Notes for FPO"} <span className="text-destructive">*</span>
            </FieldLabel>
            <Textarea
              id="notes"
              placeholder={t.req_info_notes_hint ?? "Describe what additional information or corrections are needed"}
              rows={4}
              {...register("notes")}
            />
            {errors.notes && <FieldError errors={[errors.notes]} />}
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tCommon.cancel ?? "Cancel"}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending
                ? (t.req_info_btn_submitting ?? "Sending…")
                : (t.req_info_btn_submit ?? "Send Request")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── User limit dialog ────────────────────────────────────────────────────────

const userLimitSchema = z.object({
  max_secondary_users: z.number().int().min(1).max(500),
});
type UserLimitValues = z.infer<typeof userLimitSchema>;

function UserLimitDialog({
  fpoId,
  current,
  t,
  tCommon,
  open,
  onOpenChange,
}: {
  fpoId: number;
  current: number;
  t: T;
  tCommon: T;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserLimitValues>({
    resolver: zodResolver(userLimitSchema),
    defaultValues: { max_secondary_users: current },
  });

  const mutation = useMutation({
    mutationFn: (values: UserLimitValues) => adminApplicationsApi.setUserLimit(fpoId, values.max_secondary_users),
    onSuccess: () => {
      toast.success(t.user_limit_dialog_title ?? "User limit updated");
      queryClient.invalidateQueries({ queryKey: ["application", fpoId] });
      onOpenChange(false);
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Failed to update user limit"),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>{t.user_limit_dialog_title ?? "Set Secondary User Limit"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="max_secondary_users">{t.user_limit_field_label ?? "Max Secondary Users"}</FieldLabel>
            <Input
              id="max_secondary_users"
              type="number"
              min={1}
              max={500}
              className="w-32"
              {...register("max_secondary_users", { valueAsNumber: true })}
            />
            {errors.max_secondary_users && <FieldError errors={[errors.max_secondary_users]} />}
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tCommon.cancel ?? "Cancel"}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {tCommon.save ?? "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tier helpers ─────────────────────────────────────────────────────────────

const TIER_OPTIONS = ["A", "B", "C", "D"] as const;

function tierBadgeClass(tier: string) {
  return (
    {
      A: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300",
      B: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300",
      C: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300",
      D: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300",
    }[tier] ?? "bg-muted text-muted-foreground border"
  );
}

// ─── Assign tier dialog ───────────────────────────────────────────────────────

const assignTierSchema = z.object({
  tier: z.string().min(1, { message: "Select a tier" }),
  financial_year: z.string().min(1, { message: "Financial year is required" }),
  notes: z.string().optional(),
});
type AssignTierValues = z.infer<typeof assignTierSchema>;

function AssignTierDialog({
  fpoId,
  open,
  onOpenChange,
}: {
  fpoId: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AssignTierValues>({
    resolver: zodResolver(assignTierSchema),
    defaultValues: { tier: "", financial_year: "", notes: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: AssignTierValues) =>
      adminApplicationsApi.assignTier(fpoId, values as AssignTierPayload),
    onSuccess: () => {
      toast.success("Tier assigned successfully");
      queryClient.invalidateQueries({ queryKey: ["application", fpoId] });
      queryClient.invalidateQueries({ queryKey: ["tier-history", fpoId] });
      reset();
      onOpenChange(false);
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : "Failed to assign tier"),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Assign Tier (Manual Override)</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="tier">Tier <span className="text-destructive">*</span></FieldLabel>
            <select
              id="tier"
              {...register("tier")}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Select tier…</option>
              {TIER_OPTIONS.map((t) => (
                <option key={t} value={t}>Tier {t}</option>
              ))}
            </select>
            {errors.tier && <FieldError errors={[errors.tier]} />}
          </Field>
          <Field>
            <FieldLabel htmlFor="financial_year">Financial Year <span className="text-destructive">*</span></FieldLabel>
            <Input
              id="financial_year"
              placeholder="e.g. 2026-27"
              {...register("financial_year")}
            />
            {errors.financial_year && <FieldError errors={[errors.financial_year]} />}
          </Field>
          <Field>
            <FieldLabel htmlFor="notes">Notes (reason for override)</FieldLabel>
            <Textarea
              id="notes"
              rows={3}
              placeholder="Describe the reason for manual override…"
              {...register("notes")}
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Assigning…" : "Assign Tier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tier history section ─────────────────────────────────────────────────────

function TierHistorySection({ entries }: { entries: TierAuditLogEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-muted-foreground text-sm">No tier history recorded yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="pb-2 pr-4 font-medium">Financial Year</th>
            <th className="pb-2 pr-4 font-medium">Tier</th>
            <th className="pb-2 pr-4 font-medium">Score</th>
            <th className="pb-2 pr-4 font-medium">Type</th>
            <th className="pb-2 pr-4 font-medium">By</th>
            <th className="pb-2 font-medium">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {entries.map((log) => {
            const isManual = log.changes.manual_override === true;
            const score = log.changes.total_score ? parseFloat(log.changes.total_score) : null;
            return (
              <tr key={log.id} className="text-sm">
                <td className="py-2.5 pr-4 font-medium tabular-nums">{log.changes.financial_year}</td>
                <td className="py-2.5 pr-4">
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 font-bold text-xs ${tierBadgeClass(log.changes.tier)}`}>
                    Tier {log.changes.tier}
                  </span>
                </td>
                <td className="py-2.5 pr-4 tabular-nums text-muted-foreground">
                  {score !== null ? `${score.toFixed(1)} / 100` : "—"}
                </td>
                <td className="py-2.5 pr-4">
                  {isManual ? (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      Manual Override
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      Auto-scored
                    </Badge>
                  )}
                </td>
                <td className="py-2.5 pr-4 text-muted-foreground">{log.user_name ?? "System"}</td>
                <td className="py-2.5 text-muted-foreground text-xs">
                  {new Date(log.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const locale = useLocaleStore((s) => s.locale);
  const user = useAuthStore((s) => s.user);
  const fpoId = Number(id);
  const isSuperAdmin = user?.role === "super_admin";

  const [t, setT] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});
  const [rejectOpen, setRejectOpen] = useState(false);
  const [requestInfoOpen, setRequestInfoOpen] = useState(false);
  const [userLimitOpen, setUserLimitOpen] = useState(false);
  const [assignTierOpen, setAssignTierOpen] = useState(false);

  useEffect(() => {
    translationsApi
      .getPublic(locale, "applications_table,common")
      .then((data) => {
        setT(data.applications_table ?? {});
        setTCommon(data.common ?? {});
      })
      .catch(() => undefined);
  }, [locale]);

  const { data: app, isLoading } = useQuery({
    queryKey: ["application", fpoId],
    queryFn: () => adminApplicationsApi.getById(fpoId),
    enabled: !!fpoId,
  });

  const { data: tierHistory = [] } = useQuery({
    queryKey: ["tier-history", fpoId],
    queryFn: () => adminApplicationsApi.getTierHistory(fpoId),
    enabled: !!fpoId,
    staleTime: 30_000,
  });

  const markUnderReviewMutation = useMutation({
    mutationFn: () => adminApplicationsApi.markUnderReview(fpoId),
    onSuccess: () => {
      toast.success("Marked as Under Review");
      queryClient.invalidateQueries({ queryKey: ["application", fpoId] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Action failed"),
  });

  const approveMutation = useMutation({
    mutationFn: () => adminApplicationsApi.approve(fpoId),
    onSuccess: () => {
      toast.success(t.btn_approve ?? "Application approved");
      queryClient.invalidateQueries({ queryKey: ["application", fpoId] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Failed to approve"),
  });

  const verifyDocMutation = useMutation({
    mutationFn: (docId: number) => adminApplicationsApi.verifyDocument(fpoId, docId),
    onSuccess: () => {
      toast.success(t.doc_verified ?? "Document verified");
      queryClient.invalidateQueries({ queryKey: ["application", fpoId] });
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Failed to verify document"),
  });

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-8 py-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-5 lg:grid-cols-2">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!app) return null;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-8 py-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="mt-0.5 h-8 w-8"
            onClick={() => router.push("/admin/applications")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-bold text-xl">{app.name}</h1>
              <StatusBadge status={app.status} />
              {app.tier && <Badge variant="outline">Tier {app.tier}</Badge>}
            </div>
            {app.application_id && (
              <p className="mt-0.5 font-mono text-muted-foreground text-sm">{app.application_id}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setUserLimitOpen(true)}>
            {t.btn_user_limit ?? "User Limit"} ({app.max_secondary_users})
          </Button>

          {app.status === "submitted" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => markUnderReviewMutation.mutate()}
              disabled={markUnderReviewMutation.isPending}
            >
              <ChevronRight className="mr-1.5 h-4 w-4" />
              {t.btn_start_review ?? "Start Review"}
            </Button>
          )}

          {app.status === "under_review" && (
            <>
              <Button size="sm" variant="outline" onClick={() => setRequestInfoOpen(true)}>
                <AlertCircle className="mr-1.5 h-4 w-4" />
                {t.btn_request_info ?? "Request Info"}
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setRejectOpen(true)}>
                <XCircle className="mr-1.5 h-4 w-4" />
                {t.btn_reject ?? "Reject"}
              </Button>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending}
              >
                <CheckCheck className="mr-1.5 h-4 w-4" />
                {approveMutation.isPending ? (t.btn_approving ?? "Approving…") : (t.btn_approve ?? "Approve")}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Basic Info */}
        <SectionCard icon={Building2} title={t.section_basic_info ?? "Basic Information"}>
          <div className="grid grid-cols-2 gap-3">
            <InfoRow label={t.field_name_en ?? "FPO Name (English)"} value={app.name} />
            <InfoRow label={t.field_name_ml ?? "FPO Name (Malayalam)"} value={app.name_ml} />
            <InfoRow
              label={t.field_registered_under ?? "Registered Under"}
              value={formatDocType(app.legal_structure ?? app.registered_under)}
            />
            <InfoRow label={t.field_reg_number ?? "Registration Number"} value={app.registration_number} />
            <InfoRow label={t.field_cin ?? "CIN Number"} value={app.cin_number} />
            <InfoRow label={t.field_reg_date ?? "Date of Registration"} value={app.date_of_registration} />
            <InfoRow label={t.field_pan ?? "PAN Number"} value={app.pan_number} />
            <InfoRow label={t.field_gst ?? "GST Number"} value={app.gst_number} />
          </div>
        </SectionCard>

        {/* Contact & Location */}
        <SectionCard icon={MapPin} title={t.section_contact ?? "Contact & Location"}>
          <div className="grid grid-cols-2 gap-3">
            <InfoRow label={t.field_district ?? "District"} value={app.district_display} />
            <InfoRow label={t.field_block_taluk ?? "Block / Taluk"} value={app.block_taluk} />
            <InfoRow label={t.field_village_town ?? "Village / Town"} value={app.village_town} />
            <InfoRow label={t.field_pincode ?? "Pincode"} value={app.pincode} />
            <div className="col-span-2">
              <InfoRow
                label={t.field_address ?? "Address"}
                value={[app.address_line1, app.address_line2].filter(Boolean).join(", ")}
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-muted-foreground text-xs">{t.field_office_phone ?? "Office Phone"}</span>
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-sm">{app.office_phone}</span>
                {app.phone_verified ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-destructive" />
                )}
              </div>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-muted-foreground text-xs">{t.field_office_email ?? "Office Email"}</span>
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-sm">{app.office_email}</span>
                {app.email_verified ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-destructive" />
                )}
              </div>
            </div>
            {app.website && (
              <div className="col-span-2 flex flex-col gap-0.5">
                <span className="text-muted-foreground text-xs">{t.field_website ?? "Website"}</span>
                <a
                  href={app.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 font-medium text-primary text-sm hover:underline"
                >
                  {app.website} <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>
        </SectionCard>

        {/* Signatory & Members */}
        <SectionCard icon={Users} title={t.section_signatory ?? "Signatory & Members"}>
          <div className="grid grid-cols-2 gap-3">
            <InfoRow label={t.field_signatory_name ?? "Signatory Name"} value={app.signatory_name} />
            <InfoRow label={t.field_designation ?? "Designation"} value={app.signatory_designation} />
            <InfoRow label={t.field_signatory_phone ?? "Signatory Phone"} value={app.signatory_phone} />
            <InfoRow label={t.field_signatory_email ?? "Signatory Email"} value={app.signatory_email} />
            <InfoRow label={t.field_aadhaar_last4 ?? "Aadhaar Last 4 Digits"} value={app.signatory_aadhaar_last4} />
          </div>
          <div className="grid grid-cols-4 gap-3 border-t pt-3">
            <InfoRow label={t.field_total_members ?? "Total"} value={app.total_members?.toString()} />
            <InfoRow label={t.field_male_members ?? "Male"} value={app.male_members?.toString()} />
            <InfoRow label={t.field_female_members ?? "Female"} value={app.female_members?.toString()} />
            <InfoRow label={t.field_sc_st_members ?? "SC / ST"} value={app.sc_st_members?.toString()} />
          </div>
        </SectionCard>

        {/* Business & Bank */}
        <SectionCard icon={Landmark} title={t.section_business ?? "Business & Bank"}>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <InfoRow
                label={t.field_primary_commodities ?? "Primary Commodities"}
                value={(app.primary_commodities ?? []).join(", ")}
              />
            </div>
            {(app.secondary_commodities ?? []).length > 0 && (
              <div className="col-span-2">
                <InfoRow
                  label={t.field_secondary_commodities ?? "Secondary Commodities"}
                  value={(app.secondary_commodities ?? []).join(", ")}
                />
              </div>
            )}
            {app.annual_turnover && (
              <InfoRow
                label={t.field_annual_turnover ?? "Annual Turnover (₹)"}
                value={Number(app.annual_turnover).toLocaleString("en-IN")}
              />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 border-t pt-3">
            <InfoRow label={t.field_bank_name ?? "Bank Name"} value={app.bank_name} />
            <InfoRow label={t.field_bank_branch ?? "Branch"} value={app.bank_branch} />
            <InfoRow label={t.field_account_number ?? "Account Number"} value={app.account_number} />
            <InfoRow label={t.field_ifsc ?? "IFSC Code"} value={app.ifsc_code} />
          </div>
          {app.description && (
            <div className="border-t pt-3">
              <InfoRow label={t.field_description ?? "About FPO"} value={app.description} />
            </div>
          )}
        </SectionCard>
      </div>

      {/* Documents */}
      <SectionCard icon={FileText} title={t.section_documents ?? "Documents"}>
        <div className="flex flex-col divide-y">
          {(app.documents ?? []).length === 0 ? (
            <p className="py-2 text-muted-foreground text-sm">{t.doc_no_uploads ?? "No documents uploaded yet."}</p>
          ) : (
            (app.documents ?? []).map((doc) => (
              <div key={doc.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{formatDocType(doc.document_type)}</p>
                    <p className="text-muted-foreground text-xs">
                      {(doc.file_size / 1024).toFixed(1)} KB · {doc.mime_type}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary text-xs hover:underline"
                  >
                    {t.doc_view_link ?? "View"} <ExternalLink className="h-3 w-3" />
                  </a>
                  {doc.is_verified ? (
                    <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <ShieldCheck className="h-4 w-4" />
                      <span className="font-medium text-xs">{t.doc_verified ?? "Verified"}</span>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => verifyDocMutation.mutate(doc.id)}
                      disabled={verifyDocMutation.isPending}
                    >
                      <CheckCheck className="mr-1 h-3 w-3" />
                      {t.doc_verify_btn ?? "Verify"}
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </SectionCard>

      {/* Tier Assessment */}
      <div className="flex flex-col gap-4 rounded-lg border bg-card p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Tier Assessment</h3>
          </div>
          {isSuperAdmin && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAssignTierOpen(true)}>
              Assign Tier
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-sm">Current Tier:</span>
          {app.tier ? (
            <span className={`inline-flex items-center rounded-full border px-3 py-0.5 font-bold text-sm ${tierBadgeClass(app.tier)}`}>
              Tier {app.tier}
            </span>
          ) : (
            <span className="text-muted-foreground text-sm">Not Assessed</span>
          )}
        </div>
        <TierHistorySection entries={tierHistory} />
      </div>

      {/* Timeline */}
      <SectionCard icon={Clock} title={t.section_timeline ?? "Status Timeline"}>
        {(app.status_history ?? []).length === 0 ? (
          <p className="text-muted-foreground text-sm">{t.timeline_empty ?? "No status changes recorded yet."}</p>
        ) : (
          <div className="flex flex-col gap-0">
            {(app.status_history ?? []).map((entry, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                  {i < (app.status_history ?? []).length - 1 && <div className="mt-1 w-px flex-1 bg-border" />}
                </div>
                <div className="flex flex-col gap-0.5 pb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {entry.from_status && (
                      <>
                        <span className="text-muted-foreground text-xs capitalize">
                          {entry.from_status.replace("_", " ")}
                        </span>
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      </>
                    )}
                    <span className="font-medium text-xs capitalize">{entry.to_status.replace("_", " ")}</span>
                  </div>
                  {entry.notes && <p className="text-muted-foreground text-xs">{entry.notes}</p>}
                  <p className="text-muted-foreground text-xs">
                    {entry.changed_by_name} ·{" "}
                    {new Date(entry.created_at).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Dialogs */}
      <RejectDialog fpoId={fpoId} t={t} tCommon={tCommon} open={rejectOpen} onOpenChange={setRejectOpen} />
      <RequestInfoDialog
        fpoId={fpoId}
        t={t}
        tCommon={tCommon}
        open={requestInfoOpen}
        onOpenChange={setRequestInfoOpen}
      />
      <UserLimitDialog
        fpoId={fpoId}
        current={app.max_secondary_users}
        t={t}
        tCommon={tCommon}
        open={userLimitOpen}
        onOpenChange={setUserLimitOpen}
      />
      <AssignTierDialog fpoId={fpoId} open={assignTierOpen} onOpenChange={setAssignTierOpen} />
    </div>
  );
}
