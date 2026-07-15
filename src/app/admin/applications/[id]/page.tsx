"use client";

import { Suspense, useEffect, useState } from "react";

import { useParams, useRouter, useSearchParams } from "next/navigation";

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
  Pencil,
  RefreshCw,
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
  adminApplicationsApi,
  type TierAuditLogEntry,
} from "@/app/admin/_api/applications";
import { auditLogsApi } from "@/app/admin/_api/audit-logs";
import { fpoUsersApi } from "@/app/admin/_api/fpo-users";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { RowActions } from "@/components/data-table/row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { translationsApi } from "@/lib/api/translations";
import { useAuthStore } from "@/stores/auth-store";
import { useConfirmStore } from "@/stores/confirm-store";
import { useLocaleStore } from "@/stores/locale-store";
import { type AuditLog, type FpoUser, getObjectInfoDisplay, getPerformedByName } from "@/types/admin";

type T = Record<string, string>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
    claimed: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium text-xs ${cls[status]}`}>
      {formatStatus(status)}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="font-medium text-sm text-sm break-words whitespace-pre-wrap">
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

// ─── Dialogs ──────────────────────────────────────────────────────────────────

const editFPOSchema = z.object({
  name:                z.string().optional(),
  name_ml:             z.string().optional(),
  office_phone:        z.string().optional(),
  office_email:        z.string().optional().refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), { message: "Invalid email" }),
  district:            z.string().optional(),
  address_line1:       z.string().optional(),
  address_line2:       z.string().optional(),
  pincode:             z.string().optional(),
  pan_number:          z.string().optional(),
  gst_number:          z.string().optional(),
  cin_number:          z.string().optional(),
  registration_number: z.string().optional(),
  website:             z.string().optional(),
  description:         z.string().optional(),
});
type EditFPOValues = z.infer<typeof editFPOSchema>;

function EditFPODialog({
  fpoId,
  defaultValues,
  open,
  onOpenChange,
}: {
  fpoId: number;
  defaultValues: Partial<EditFPOValues>;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<EditFPOValues>({
    resolver: zodResolver(editFPOSchema),
    defaultValues,
  });

  const mutation = useMutation({
    mutationFn: (values: EditFPOValues) => {
      const payload: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(values)) {
        if (v !== undefined && v !== "") payload[k] = v;
      }
      return adminApplicationsApi.adminEdit(fpoId, payload);
    },
    onSuccess: (res) => {
      toast.success(`Updated: ${res.updated_fields.join(", ") || "no changes"}`);
      queryClient.invalidateQueries({ queryKey: ["application", fpoId] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Failed to update FPO details");
    },
  });

  function handleOpen(v: boolean) {
    if (!v) reset(defaultValues);
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit FPO Details</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel>FPO Name (English)</FieldLabel>
              <Input {...register("name")} placeholder="FPO Name" />
              <FieldError>{errors.name?.message}</FieldError>
            </Field>
            <Field>
              <FieldLabel>FPO Name (Malayalam)</FieldLabel>
              <Input {...register("name_ml")} placeholder="FPO Name ML" />
              <FieldError>{errors.name_ml?.message}</FieldError>
            </Field>
            <Field>
              <FieldLabel>Office Phone</FieldLabel>
              <Input {...register("office_phone")} placeholder="+91 XXXXX XXXXX" />
              <FieldError>{errors.office_phone?.message}</FieldError>
            </Field>
            <Field>
              <FieldLabel>Office Email</FieldLabel>
              <Input {...register("office_email")} placeholder="office@fpo.com" type="email" />
              <FieldError>{errors.office_email?.message}</FieldError>
            </Field>
            <Field>
              <FieldLabel>District</FieldLabel>
              <Input {...register("district")} placeholder="e.g. TSR" />
              <FieldError>{errors.district?.message}</FieldError>
            </Field>
            <Field>
              <FieldLabel>Pincode</FieldLabel>
              <Input {...register("pincode")} placeholder="6XXXXX" />
              <FieldError>{errors.pincode?.message}</FieldError>
            </Field>
            <Field>
              <FieldLabel>PAN Number</FieldLabel>
              <Input {...register("pan_number")} placeholder="ABCDE1234F" className="uppercase" />
              <FieldError>{errors.pan_number?.message}</FieldError>
            </Field>
            <Field>
              <FieldLabel>GST Number</FieldLabel>
              <Input {...register("gst_number")} placeholder="GST Number" className="uppercase" />
              <FieldError>{errors.gst_number?.message}</FieldError>
            </Field>
            <Field>
              <FieldLabel>CIN Number</FieldLabel>
              <Input {...register("cin_number")} placeholder="CIN Number" className="uppercase" />
              <FieldError>{errors.cin_number?.message}</FieldError>
            </Field>
            <Field>
              <FieldLabel>Registration Number</FieldLabel>
              <Input {...register("registration_number")} placeholder="Reg. Number" />
              <FieldError>{errors.registration_number?.message}</FieldError>
            </Field>
            <Field>
              <FieldLabel>Website</FieldLabel>
              <Input {...register("website")} placeholder="https://..." />
              <FieldError>{errors.website?.message}</FieldError>
            </Field>
          </div>
          <Field>
            <FieldLabel>Address Line 1</FieldLabel>
            <Input {...register("address_line1")} placeholder="Address Line 1" />
            <FieldError>{errors.address_line1?.message}</FieldError>
          </Field>
          <Field>
            <FieldLabel>Address Line 2</FieldLabel>
            <Input {...register("address_line2")} placeholder="Address Line 2" />
            <FieldError>{errors.address_line2?.message}</FieldError>
          </Field>
          <Field>
            <FieldLabel>Description</FieldLabel>
            <Textarea {...register("description")} placeholder="About this FPO..." rows={3} />
            <FieldError>{errors.description?.message}</FieldError>
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const rejectSchema = z.object({ reason: z.string().min(20, { message: "Reason must be at least 20 characters" }) });
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
  } = useForm<RejectValues>({ resolver: zodResolver(rejectSchema) });
  const mutation = useMutation({
    mutationFn: (values: RejectValues) => adminApplicationsApi.reject(fpoId, values.reason),
    onSuccess: () => {
      toast.success(t.reject_dialog_title ?? "Application rejected");
      queryClient.invalidateQueries({ queryKey: ["application", fpoId] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      reset();
      onOpenChange(false);
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Failed to reject"),
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
              placeholder={t.reject_reason_hint ?? "Minimum 20 characters"}
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
              {mutation.isPending ? "Rejecting…" : (t.btn_reject ?? "Reject Application")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const requestInfoSchema = z.object({ notes: z.string().min(10, { message: "Notes must be at least 10 characters" }) });
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
  } = useForm<RequestInfoValues>({ resolver: zodResolver(requestInfoSchema) });
  const mutation = useMutation({
    mutationFn: (values: RequestInfoValues) => adminApplicationsApi.requestInfo(fpoId, values.notes),
    onSuccess: () => {
      toast.success(t.req_info_btn_submit ?? "Information requested");
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
              placeholder={t.req_info_notes_hint ?? "Describe what is needed"}
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
              {mutation.isPending ? "Sending…" : (t.req_info_btn_submit ?? "Send Request")}
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

const assignTierSchema = z.object({
  tier: z.string().min(1),
  financial_year: z
    .string()
    .min(1, "Financial year is required")
    .regex(/^\d{4}-\d{2}$/, "Financial year must be in YYYY-YY format")
    .refine((val) => {
      const [startStr, endSuffix] = val.split("-");
      const startYear = parseInt(startStr, 10);
      const endYear = parseInt(startStr.slice(0, 2) + endSuffix, 10);
      return endYear > startYear;
    }, "End year must be greater than start year")
    .refine((val) => {
      const [startStr, endSuffix] = val.split("-");
      const startYear = parseInt(startStr, 10);
      const endYear = parseInt(startStr.slice(0, 2) + endSuffix, 10);
      return startYear <= new Date().getFullYear() && endYear <= new Date().getFullYear() + 1;
    }, "Financial year cannot be in the future"),
  notes: z.string().min(1, "Notes are required"),
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
    mode: "onBlur",
    reValidateMode: "onChange",
  });
  const mutation = useMutation({
    mutationFn: (values: AssignTierValues) => adminApplicationsApi.assignTier(fpoId, values as AssignTierPayload),
    onSuccess: () => {
      toast.success("Tier assigned");
      queryClient.invalidateQueries({ queryKey: ["application", fpoId] });
      queryClient.invalidateQueries({ queryKey: ["tier-history", fpoId] });
      reset();
      onOpenChange(false);
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Failed to assign tier"),
  });
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Assign Tier (Manual Override)</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="tier">
              Tier <span className="text-destructive">*</span>
            </FieldLabel>
            <select
              id="tier"
              {...register("tier")}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Select tier…</option>
              {TIER_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  Tier {t}
                </option>
              ))}
            </select>
            {errors.tier && <FieldError errors={[errors.tier]} />}
          </Field>
          <Field>
            <FieldLabel htmlFor="financial_year">
              Financial Year <span className="text-destructive">*</span>
            </FieldLabel>
            <Input id="financial_year" placeholder="e.g. 2026-27" maxLength={7} {...register("financial_year")} />
            {errors.financial_year && <FieldError errors={[errors.financial_year]} />}
          </Field>
          <Field>
            <FieldLabel htmlFor="notes">
              Notes<span className="text-destructive">*</span>
            </FieldLabel>
            <Textarea
              id="notes"
              rows={3}
              placeholder="Reason for manual override…"
              className="break-all whitespace-pre-wrap resize-none"
              {...register("notes")}
            />
            {errors.notes && <FieldError errors={[errors.notes]} />}
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Assigning…" : "Assign Tier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TierHistorySection({ entries }: { entries: TierAuditLogEntry[] }) {
  if (entries.length === 0) return <p className="text-muted-foreground text-sm">No tier history recorded yet.</p>;
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
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 font-bold text-xs ${tierBadgeClass(log.changes.tier)}`}
                  >
                    Tier {log.changes.tier}
                  </span>
                </td>
                <td className="py-2.5 pr-4 tabular-nums text-muted-foreground">
                  {score !== null ? `${score.toFixed(1)} / 100` : "—"}
                </td>
                <td className="py-2.5 pr-4">
                  {isManual ? (
                    <Badge
                      variant="secondary"
                      className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    >
                      Manual
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    >
                      Auto
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

// ─── Team tab ─────────────────────────────────────────────────────────────────

function TeamUserRow({ user }: { user: FpoUser }) {
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);

  const activateMutation = useMutation({
    mutationFn: () => fpoUsersApi.activate(user.id),
    onSuccess: () => {
      toast.success("User activated");
      queryClient.invalidateQueries({ queryKey: ["fpo-team", user.fpo_id] });
    },
    onError: () => toast.error("Failed to activate"),
  });

  const deactivateMutation = useMutation({
    mutationFn: () => fpoUsersApi.deactivate(user.id),
    onSuccess: () => {
      toast.success("User deactivated");
      queryClient.invalidateQueries({ queryKey: ["fpo-team", user.fpo_id] });
    },
    onError: () => toast.error("Failed to deactivate"),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: () => fpoUsersApi.resetPassword(user.id),
    onSuccess: () => toast.success("Temporary password sent"),
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Failed to reset password");
    },
  });

  function handleResetPassword() {
    const name = `${user.first_name} ${user.last_name}`.trim() || user.email;
    confirm({
      title: "Reset Password",
      description: `A temporary password will be sent to "${name}" via email and SMS.`,
      confirmLabel: "Reset Password",
      confirmingLabel: "Sending...",
      variant: "default",
      onConfirm: () => resetPasswordMutation.mutateAsync(),
    });
  }

  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-8 w-8 shrink-0 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
          {user.first_name?.[0]?.toUpperCase() ?? "?"}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{`${user.first_name} ${user.last_name}`.trim() || "—"}</span>
            <Badge variant={user.role === "primary" ? "secondary" : "outline"} className="text-[10px]">
              {user.role === "primary" ? "Primary" : "Secondary"}
            </Badge>
          </div>
          <span className="text-muted-foreground text-xs">{user.email}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {user.is_active ? (
          <Badge
            variant="outline"
            className="border-green-500/40 bg-green-500/10 text-[11px] text-green-700 dark:text-green-400"
          >
            Active
          </Badge>
        ) : (
          <Badge variant="outline" className="border-muted text-[11px] text-muted-foreground">
            Inactive
          </Badge>
        )}
        <RowActions
          actions={[
            {
              label: user.is_active ? "Deactivate" : "Activate",
              onClick: () => (user.is_active ? deactivateMutation.mutate() : activateMutation.mutate()),
              disabled: activateMutation.isPending || deactivateMutation.isPending,
            },
            {
              label: "Reset Password",
              onClick: handleResetPassword,
              disabled: resetPasswordMutation.isPending,
              separator: true,
            },
          ]}
        />
      </div>
    </div>
  );
}

function TeamTab({ fpoId }: { fpoId: number }) {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["fpo-team", fpoId],
    queryFn: () => fpoUsersApi.getAll({ page: 1, page_size: 100, fpo_id: fpoId }),
    enabled: !!fpoId,
    staleTime: 30_000,
  });

  const users = Array.from(new Map((data?.data ?? []).map((u) => [u.id, u])).values());

  if (isLoading)
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {users.length} user{users.length !== 1 ? "s" : ""}
        </p>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>
      {users.length === 0 ? (
        <p className="text-muted-foreground text-sm py-4 text-center">No users found for this FPO.</p>
      ) : (
        <div className="flex flex-col">
          {users.map((user) => (
            <TeamUserRow key={user.id} user={user} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Audit Log tab ────────────────────────────────────────────────────────────

function AuditLogTab({ fpoId }: { fpoId: number }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["fpo-audit-logs", fpoId, page, pageSize],
    queryFn: () => auditLogsApi.getAll({ page, page_size: pageSize, fpo_id: fpoId }),
    enabled: !!fpoId,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const logs = data?.data ?? [];
  const pagination = data?.meta?.pagination;
  const totalCount = pagination?.total_count ?? 0;

  function handlePageSizeChange(size: number) {
    setPageSize(size);
    setPage(1);
  }
  const noop = () => undefined;
  if (isLoading)
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: pageSize }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
        <DataTablePagination
          page={1}
          pageSize={pageSize}
          total={0}
          onPageChange={() => {
            noop;
          }}
          onPageSizeChange={() => {
            noop;
          }}
          isLoading
        />
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {logs.length === 0 ? (
        <p className="text-muted-foreground text-sm py-4 text-center">No audit events found for this FPO.</p>
      ) : (
        <div className={`flex flex-col divide-y transition-opacity ${isFetching ? "opacity-50" : ""}`}>
          {logs.map((log: AuditLog) => (
            <div key={log.id} className="flex items-start gap-4 py-3">
              <span className="text-muted-foreground text-xs whitespace-nowrap pt-0.5 w-36 shrink-0">
                {new Date(log.created_at).toLocaleString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <Badge variant="secondary" className="text-[11px] shrink-0">
                {log.action_display || log.action}
              </Badge>
              <div className="min-w-0 flex flex-col gap-0.5">
                <span className="text-sm font-medium">{getPerformedByName(log.performed_by)}</span>
                {log.object_info != null && (
                  <span className="text-muted-foreground text-xs truncate">
                    {getObjectInfoDisplay(log.object_info)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <DataTablePagination
        page={page}
        pageSize={pageSize}
        total={totalCount}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
        pageSizeOptions={[10, 20, 50]}
      />
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { key: "overview", label: "Overview", icon: Building2 },
  { key: "documents", label: "Documents", icon: FileText },
  { key: "team", label: "Team", icon: Users },
  { key: "audit-log", label: "Audit Log", icon: Clock },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// ─── Page ─────────────────────────────────────────────────────────────────────

function ApplicationDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const locale = useLocaleStore((s) => s.locale);
  const user = useAuthStore((s) => s.user);
  const fpoId = Number(id);
  const isSuperAdmin = user?.role === "super_admin";
  const activeTab = (searchParams.get("tab") ?? "overview") as TabKey;

  const confirm = useConfirmStore((s) => s.confirm);
  const [t, setT] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});
  const action = searchParams.get("action");
  const [rejectOpen, setRejectOpen] = useState(action === "reject");
  const [requestInfoOpen, setRequestInfoOpen] = useState(action === "request-info");
  const [assignTierOpen, setAssignTierOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

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

  const verifyDocMutation = useMutation({
    mutationFn: (docId: number) => adminApplicationsApi.verifyDocument(fpoId, docId),
    onSuccess: () => {
      toast.success(t.doc_verified ?? "Document verified");
      queryClient.invalidateQueries({ queryKey: ["application", fpoId] });
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Failed to verify"),
  });

  const activateMutation = useMutation({
    mutationFn: () => adminApplicationsApi.activate(fpoId),
    onSuccess: () => {
      toast.success("FPO activated successfully");
      queryClient.invalidateQueries({ queryKey: ["application", fpoId] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Failed to activate"),
  });

  const deactivateMutation = useMutation({
    mutationFn: () => adminApplicationsApi.deactivate(fpoId),
    onSuccess: () => {
      toast.success("FPO deactivated (suspended)");
      queryClient.invalidateQueries({ queryKey: ["application", fpoId] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Failed to deactivate"),
  });

  function setTab(key: TabKey) {
    router.replace(`/admin/applications/${fpoId}?tab=${key}`);
  }

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-8 py-6">
        <Skeleton className="h-8 w-64" />
        <div className="flex gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-9 w-24" />
          ))}
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
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
              <h1 className="font-bold text-xl max-w-[800px] break-words whitespace-normal">{app.name}</h1>
              <StatusBadge status={app.status} />
              {app.tier && <Badge variant="outline">Tier {app.tier}</Badge>}
            </div>
            {app.application_id && (
              <p className="mt-0.5 font-mono text-muted-foreground text-sm">{app.application_id}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {/* <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-1.5 h-4 w-4" />
            Edit Details
          </Button> */}
          {/* {(app.status === "approved" || app.status === "info_required") && (
            <Button size="sm" variant="outline" onClick={() => setRequestInfoOpen(true)}>
              <AlertCircle className="mr-1.5 h-4 w-4" />
              {t.btn_request_info ?? "Request Info"}
            </Button>
          )} */}
          {app.status === "approved" && (
            <Button size="sm" variant="destructive" onClick={() => setRejectOpen(true)}>
              <XCircle className="mr-1.5 h-4 w-4" />
              {t.btn_reject ?? "Reject"}
            </Button>
          )}
          {app.status === "approved" && (
            <Button
              size="sm"
              variant="outline"
              className="text-orange-600 border-orange-200 hover:bg-orange-50"
              onClick={() =>
                confirm({
                  title: "Suspend FPO",
                  description: "This will suspend the FPO account. They will lose access to the platform until reactivated.",
                  confirmLabel: "Suspend",
                  confirmingLabel: "Suspending…",
                  variant: "destructive",
                  onConfirm: () => deactivateMutation.mutateAsync(),
                })
              }
              disabled={deactivateMutation.isPending}
            >
              <XCircle className="mr-1.5 h-4 w-4" />
              {deactivateMutation.isPending ? "Suspending…" : "Suspend"}
            </Button>
          )}
          {(app.status === "suspended" || app.status === "rejected") && (
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700"
              onClick={() =>
                confirm({
                  title: "Reactivate FPO",
                  description: "This will restore the FPO's access to the platform.",
                  confirmLabel: "Reactivate",
                  confirmingLabel: "Activating…",
                  variant: "default",
                  onConfirm: () => activateMutation.mutateAsync(),
                })
              }
              disabled={activateMutation.isPending}
            >
              <CheckCheck className="mr-1.5 h-4 w-4" />
              {activateMutation.isPending ? "Activating…" : "Activate"}
            </Button>
          )}
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex border-b gap-0">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === "overview" && (
        <div className="flex flex-col gap-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <SectionCard icon={Building2} title={t.section_basic_info ?? "Basic Information"}>
              <div className="grid grid-cols-2 gap-3 ">
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
                {app.claim_origin && (
                  <div className="col-span-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-muted-foreground text-xs">Claimed From</span>
                      <span className="font-medium text-sm text-purple-700">
                        {app.claim_origin.original_fpo_name} (FPO #{app.claim_origin.original_fpo_id})
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>

            <SectionCard icon={MapPin} title={t.section_contact ?? "Contact & Location"}>
              <div className="grid grid-cols-2 gap-3">
                <InfoRow label={t.field_district ?? "District"} value={app.district} />
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
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-muted-foreground text-xs">{t.field_office_email ?? "Office Email"}</span>
                  <div className="flex items-start gap-1.5 min-w-0">
                    <span className="font-medium text-sm break-all">{app.office_email}</span>
                    {app.email_verified ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-green-600" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-destructive" />
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

            <SectionCard icon={Users} title={t.section_signatory ?? "Signatory & Members"}>
              <div className="grid grid-cols-2 gap-3">
                <InfoRow label={t.field_signatory_name ?? "Signatory Name"} value={app.signatory_name} />
                <InfoRow label={t.field_designation ?? "Designation"} value={app.signatory_designation} />
                <InfoRow label={t.field_signatory_phone ?? "Signatory Phone"} value={app.signatory_phone} />
                <InfoRow label={t.field_signatory_email ?? "Signatory Email"} value={app.signatory_email} />
                <InfoRow label={t.field_aadhaar_last4 ?? "Aadhaar Last 4"} value={app.signatory_aadhaar_last4} />
              </div>
              <div className="grid grid-cols-4 gap-3 border-t pt-3">
                <InfoRow label={t.field_total_members ?? "Total"} value={app.total_members?.toString()} />
                <InfoRow label={t.field_male_members ?? "Male"} value={app.male_members?.toString()} />
                <InfoRow label={t.field_female_members ?? "Female"} value={app.female_members?.toString()} />
                <InfoRow label={t.field_sc_st_members ?? "SC / ST"} value={app.sc_st_members?.toString()} />
              </div>
              {app.total_directors != null && (
                <div className="grid grid-cols-3 gap-3 border-t pt-3">
                  <InfoRow label="Total Directors" value={app.total_directors?.toString()} />
                  <InfoRow label="Women Directors" value={app.women_directors?.toString()} />
                  <InfoRow label="Directors < 35" value={app.directors_under_35?.toString()} />
                </div>
              )}
            </SectionCard>

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

          {/* Tier Assessment */}
          <div className="flex flex-col gap-4 rounded-lg border bg-card p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm">Tier Assessment</h3>
              </div>
              {isSuperAdmin && app.status !== "draft" && (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAssignTierOpen(true)}>
                  Assign Tier
                </Button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground text-sm">Current Tier:</span>
              {app.tier ? (
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-0.5 font-bold text-sm ${tierBadgeClass(app.tier)}`}
                >
                  Tier {app.tier}
                </span>
              ) : (
                <span className="text-muted-foreground text-sm">Not Assessed</span>
              )}
            </div>
            <TierHistorySection entries={tierHistory} />
          </div>

          {/* Status Timeline */}
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
                        {entry.changed_by_name ?? "System"} ·{" "}
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
        </div>
      )}

      {/* Documents */}
      {activeTab === "documents" && (
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
                      {doc.verified_by_name && (
                        <p className="text-muted-foreground text-xs">
                          Verified by {doc.verified_by_name}
                          {doc.verified_at && (
                            <>
                              {" "}
                              .{" "}
                              {new Date(doc.verified_at).toLocaleString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                              })}
                            </>
                          )}
                        </p>
                      )}
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
      )}

      {/* Team */}
      {activeTab === "team" && (
        <SectionCard icon={Users} title="Team">
          <TeamTab fpoId={fpoId} />
        </SectionCard>
      )}

      {/* Audit Log */}
      {activeTab === "audit-log" && (
        <SectionCard icon={Clock} title="Audit Log">
          <AuditLogTab fpoId={fpoId} />
        </SectionCard>
      )}

      {/* Dialogs */}
      <RejectDialog fpoId={fpoId} t={t} tCommon={tCommon} open={rejectOpen} onOpenChange={setRejectOpen} />
      <RequestInfoDialog
        fpoId={fpoId}
        t={t}
        tCommon={tCommon}
        open={requestInfoOpen}
        onOpenChange={setRequestInfoOpen}
      />
      <AssignTierDialog fpoId={fpoId} open={assignTierOpen} onOpenChange={setAssignTierOpen} />
      <EditFPODialog
        fpoId={fpoId}
        open={editOpen}
        onOpenChange={setEditOpen}
        defaultValues={{
          name:                app.name ?? "",
          name_ml:             app.name_ml ?? "",
          office_phone:        app.office_phone ?? "",
          office_email:        app.office_email ?? "",
          district:            app.district ?? "",
          address_line1:       app.address_line1 ?? "",
          address_line2:       app.address_line2 ?? "",
          pincode:             app.pincode ?? "",
          pan_number:          app.pan_number ?? "",
          gst_number:          app.gst_number ?? "",
          cin_number:          app.cin_number ?? "",
          registration_number: app.registration_number ?? "",
          website:             app.website ?? "",
          description:         app.description ?? "",
        }}
      />
    </div>
  );
}

export default function ApplicationDetailPage() {
  return (
    <Suspense>
      <ApplicationDetailContent />
    </Suspense>
  );
}
