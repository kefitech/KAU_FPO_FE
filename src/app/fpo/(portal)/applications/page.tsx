"use client";

import Link from "next/link";

import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  RefreshCw,
  XCircle,
} from "lucide-react";

import { fpoRegistrationApi } from "@/app/fpo/_api/fpo-registration";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FpoApplicationStatus, FpoProfile, FpoStatus } from "@/types/fpo";

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  FpoStatus,
  { label: string; bg: string; text: string; icon: React.ElementType; description: string }
> = {
  draft: {
    label: "Draft",
    bg: "bg-muted",
    text: "text-muted-foreground",
    icon: FileText,
    description: "Your application is still being filled out.",
  },
  submitted: {
    label: "Submitted",
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-300",
    icon: Clock,
    description: "Your application has been submitted and is awaiting review.",
  },
  under_review: {
    label: "Under Review",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-300",
    icon: AlertCircle,
    description: "KAU Admin is currently reviewing your application.",
  },
  approved: {
    label: "Approved",
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-700 dark:text-green-300",
    icon: CheckCircle2,
    description: "Your FPO registration has been approved.",
  },
  rejected: {
    label: "Rejected",
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-300",
    icon: XCircle,
    description: "Your application was not approved. See the timeline below for details.",
  },
  info_required: {
    label: "Info Required",
    bg: "bg-orange-100 dark:bg-orange-900/30",
    text: "text-orange-700 dark:text-orange-300",
    icon: AlertCircle,
    description: "KAU Admin has requested additional information before your application can proceed.",
  },
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

function formatDateOnly(iso: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  }).format(new Date(iso));
}

function formatStatus(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function humanize(s: string | null | undefined) {
  if (!s) return "—";
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Shared primitives ─────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="py-2.5 border-b border-border/50 last:border-0 grid grid-cols-2 gap-2 items-start">
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <p className="text-xs text-foreground text-right break-words">{value ?? "—"}</p>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 pt-5 pb-1 first:pt-0">
      {children}
    </p>
  );
}

// ─── Status Tab ────────────────────────────────────────────────────────────────

function StatusTab({ data, refetch, isFetching }: { data: FpoApplicationStatus; refetch: () => void; isFetching: boolean }) {
  const cfg = STATUS_CONFIG[data.status];
  const Icon = cfg.icon;

  const infoNote = data.status === "info_required"
    ? data.timeline.findLast((e) => e.to_status === "info_required")?.notes ?? null
    : null;

  const rejectionNote = data.status === "rejected"
    ? data.timeline.findLast((e) => e.to_status === "rejected")?.notes ?? null
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-base">Application Status</h2>
          <p className="text-muted-foreground text-sm">Track your FPO registration</p>
        </div>
        <Button variant="outline" size="sm" onClick={refetch} disabled={isFetching} className="gap-1.5">
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Status card */}
      <div className="flex items-start gap-3 rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
        <div className={`rounded-full p-3 ${cfg.bg}`}>
          <Icon className={`h-5 w-5 ${cfg.text}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold text-lg">{cfg.label}</p>
            <Badge variant="outline" className={`${cfg.bg} ${cfg.text} border-0`}>
              {data.status_display}
            </Badge>
            {data.current_tier && <Badge variant="outline">Tier {data.current_tier}</Badge>}
          </div>
          <p className="mt-1 text-muted-foreground text-sm">{cfg.description}</p>
          {data.application_id && (
            <p className="mt-2 font-mono text-muted-foreground text-xs">
              Application ID: <span className="font-semibold text-foreground">{data.application_id}</span>
            </p>
          )}
        </div>
      </div>

      {infoNote && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-5 dark:border-orange-800 dark:bg-orange-900/20">
          <p className="font-semibold text-orange-800 dark:text-orange-300">What KAU Admin needs:</p>
          <p className="mt-1 text-orange-700 text-sm dark:text-orange-400">{infoNote}</p>
          <Link href="/fpo/register">
            <Button size="sm" className="mt-3 gap-1.5 bg-orange-600 hover:bg-orange-700">
              Update My Application <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      )}

      {rejectionNote && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-800 dark:bg-red-900/20">
          <p className="font-semibold text-red-800 dark:text-red-300">Reason for rejection:</p>
          <p className="mt-1 text-red-700 text-sm dark:text-red-400">{rejectionNote}</p>
        </div>
      )}

      {data.timeline.length > 0 && (
        <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
          <p className="mb-5 font-semibold">Activity Timeline</p>
          <ol className="relative ml-2 flex flex-col border-muted border-l">
            {[...data.timeline].reverse().map((entry) => (
              <li key={entry.id} className="mb-6 ml-5 last:mb-0">
                <span className="absolute -left-[7px] flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-primary bg-background" />
                <div className="flex flex-col gap-0.5">
                  <p className="font-medium text-sm">
                    {entry.from_status
                      ? `${formatStatus(entry.from_status)} → ${formatStatus(entry.to_status)}`
                      : formatStatus(entry.to_status)}
                  </p>
                  {entry.notes && <p className="text-muted-foreground text-xs">{entry.notes}</p>}
                  <p className="text-muted-foreground text-xs">
                    {formatDate(entry.created_at)}
                    {entry.changed_by_name && ` · ${entry.changed_by_name}`}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

// ─── Application Details Tab ───────────────────────────────────────────────────

function ApplicationTab({ profile }: { profile: FpoProfile }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-semibold text-base">Submitted Application</h2>
        <p className="text-muted-foreground text-sm">Read-only view of your submitted details</p>
      </div>

      <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
        <SectionTitle>Basic Information</SectionTitle>
        <InfoRow label="FPO Name" value={profile.name} />
        {profile.name_ml && <InfoRow label="FPO Name (Malayalam)" value={profile.name_ml} />}
        <InfoRow label="Legal Structure" value={humanize(profile.legal_structure)} />
        {profile.legal_structure_detail && <InfoRow label="Legal Structure Detail" value={profile.legal_structure_detail} />}
        <InfoRow label="Registration Number" value={profile.registration_number} />
        {profile.cin_number && <InfoRow label="CIN Number" value={profile.cin_number} />}
        <InfoRow label="Date of Registration" value={profile.date_of_registration ? formatDateOnly(profile.date_of_registration) : null} />
        {profile.pan_number && <InfoRow label="PAN Number" value={profile.pan_number} />}
        {profile.gst_number && <InfoRow label="GST Number" value={profile.gst_number} />}

        <SectionTitle>Location & Contact</SectionTitle>
        <InfoRow label="District" value={profile.district_display || profile.district} />
        <InfoRow label="Block / Taluk" value={profile.block_taluk} />
        {profile.village_town && <InfoRow label="Village / Town" value={profile.village_town} />}
        <InfoRow label="Address" value={[profile.address_line1, profile.address_line2].filter(Boolean).join(", ")} />
        <InfoRow label="Pincode" value={profile.pincode} />
        <InfoRow label="Office Phone" value={profile.office_phone} />
        <InfoRow label="Office Email" value={profile.office_email} />
        {profile.website && <InfoRow label="Website" value={profile.website} />}
        {profile.latitude && <InfoRow label="GPS Coordinates" value={`${profile.latitude}, ${profile.longitude}`} />}

        <SectionTitle>Signatory & Members</SectionTitle>
        <InfoRow label="Signatory Name" value={profile.signatory_name} />
        <InfoRow label="Designation" value={humanize(profile.signatory_designation)} />
        <InfoRow label="Signatory Phone" value={profile.signatory_phone} />
        {profile.signatory_email && <InfoRow label="Signatory Email" value={profile.signatory_email} />}
        {profile.signatory_aadhaar_last4 && <InfoRow label="Aadhaar (last 4)" value={profile.signatory_aadhaar_last4} />}
        <InfoRow label="Total Members" value={profile.total_members} />
        <InfoRow label="Male Members" value={profile.male_members} />
        <InfoRow label="Female Members" value={profile.female_members} />
        {profile.sc_st_members != null && <InfoRow label="SC/ST Members" value={profile.sc_st_members} />}
        <InfoRow label="Total Directors" value={profile.total_directors} />
        <InfoRow label="Women Directors" value={profile.women_directors} />
        <InfoRow label="Directors Under 35" value={profile.directors_under_35} />
        <InfoRow label="CEO Available" value={profile.ceo_available ? "Yes" : "No"} />
        <InfoRow label="Accountant Available" value={profile.accountant_available ? "Yes" : "No"} />
        {profile.promoting_agency && <InfoRow label="Promoting Agency" value={humanize(profile.promoting_agency)} />}
        {profile.facilitating_agency_name && <InfoRow label="Facilitating Agency" value={profile.facilitating_agency_name} />}

        <SectionTitle>Business & Banking</SectionTitle>
        {profile.primary_commodities?.length > 0 && (
          <div className="py-2.5 border-b border-border/50 grid grid-cols-2 gap-2 items-start">
            <p className="text-xs text-muted-foreground font-medium">Primary Commodities</p>
            <div className="flex flex-wrap gap-1 justify-end">
              {profile.primary_commodities.map((c) => (
                <Badge key={c} variant="secondary" className="text-[10px]">{c.replace(/_/g, " ")}</Badge>
              ))}
            </div>
          </div>
        )}
        {profile.secondary_commodities?.length > 0 && (
          <div className="py-2.5 border-b border-border/50 grid grid-cols-2 gap-2 items-start">
            <p className="text-xs text-muted-foreground font-medium">Secondary Commodities</p>
            <div className="flex flex-wrap gap-1 justify-end">
              {profile.secondary_commodities.map((c) => (
                <Badge key={c} variant="secondary" className="text-[10px]">{c.replace(/_/g, " ")}</Badge>
              ))}
            </div>
          </div>
        )}
        {profile.annual_turnover && (
          <InfoRow label="Annual Turnover" value={`₹ ${Number(profile.annual_turnover).toLocaleString("en-IN")}`} />
        )}
        <InfoRow label="Bank Name" value={humanize(profile.bank_name)} />
        <InfoRow label="Bank Branch" value={profile.bank_branch} />
        <InfoRow label="Account Number" value={profile.account_number} />
        <InfoRow label="IFSC Code" value={profile.ifsc_code} />
        {profile.description && <InfoRow label="Description" value={profile.description} />}
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function FpoApplicationsPage() {
  const { data: statusData, isLoading: statusLoading, refetch, isFetching } = useQuery({
    queryKey: ["fpo-status"],
    queryFn: fpoRegistrationApi.getStatus,
    staleTime: 30_000,
    refetchInterval: (query) =>
      query.state.data?.status === "info_required" ? 60_000 : false,
  });

  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ["fpo-profile"],
    queryFn: fpoRegistrationApi.getProfile,
    staleTime: 5 * 60_000,
  });

  if (statusLoading || profileLoading) {
    return (
      <div className="flex flex-col gap-6 px-3 sm:px-6 py-4 sm:py-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-72 rounded-lg" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!statusData) return null;

  return (
    <div className="flex flex-col gap-6 px-3 sm:px-6 py-4 sm:py-6">
      <div>
        <h1 className="font-bold text-2xl">My Application</h1>
        <p className="text-muted-foreground text-sm">Track status and review your submitted details</p>
      </div>

      <Tabs defaultValue="status">
        <TabsList>
          <TabsTrigger value="status">Status & Timeline</TabsTrigger>
          <TabsTrigger value="details" disabled={!profileData}>Application Details</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="mt-6">
          <StatusTab data={statusData} refetch={refetch} isFetching={isFetching} />
        </TabsContent>

        <TabsContent value="details" className="mt-6">
          {profileData && <ApplicationTab profile={profileData} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
