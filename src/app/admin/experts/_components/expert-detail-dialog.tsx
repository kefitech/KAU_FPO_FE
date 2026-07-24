"use client";

import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { Mail, MapPin, Phone } from "lucide-react";

import { adminExpertsApi } from "@/app/admin/_api/experts";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminExpert } from "@/types/admin";
import { DISTRICT_OPTIONS } from "@/types/fpo";

interface ExpertDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expert: AdminExpert | null;
  t: Record<string, string>;
  tCommon: Record<string, string>;
}

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  scientist: "bg-indigo-100 text-indigo-700 border-indigo-200",
  trainer: "bg-green-100 text-green-700 border-green-200",
  banker: "bg-blue-100 text-blue-700 border-blue-200",
  facilitator: "bg-teal-100 text-teal-700 border-teal-200",
};

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

function DetailsTab({ expert, t }: { expert: AdminExpert; t: Record<string, string> }) {
  const districtLabel = t[`district_${expert.district}`] ?? expert.district;
  const badgeClass = CATEGORY_BADGE_COLORS[expert.category] ?? "bg-muted text-muted-foreground";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-lg font-semibold">
          {expert.name_en.charAt(0)}
        </div>
        <div>
          <p className="font-semibold">{expert.name_en}</p>
          {expert.name_ml && <p className="text-sm text-muted-foreground">{expert.name_ml}</p>}
          <Badge className={`mt-1 w-fit text-xs font-medium border ${badgeClass}`} variant="outline">
            {t[`cat_${expert.category}`] ?? expert.category_display}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <InfoRow label={t.field_designation ?? "Designation"} value={expert.designation} />
        <InfoRow label={t.field_organisation ?? "Organisation"} value={expert.organisation} />
        <InfoRow label={t.field_primary_expertise ?? "Primary Expertise"} value={expert.primary_expertise} />
        <InfoRow label={t.field_secondary_expertise ?? "Secondary Expertise"} value={expert.secondary_expertise} />
        {districtLabel && <InfoRow label={t.field_district ?? "District"} value={districtLabel} />}
      </div>

      <div className="flex flex-col gap-2">
        {expert.email && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <a href={`mailto:${expert.email}`} className="hover:text-foreground">
              {expert.email}
            </a>
          </div>
        )}
        {expert.phone && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            {expert.phone}
          </div>
        )}
        {districtLabel && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {districtLabel}, Kerala
          </div>
        )}
      </div>
    </div>
  );
}

function EnquiriesTab({ expertId, t }: { expertId: number; t: Record<string, string> }) {
  const { data: enquiries, isLoading } = useQuery({
    queryKey: ["expert-enquiries", expertId],
    queryFn: () => adminExpertsApi.getEnquiries(expertId),
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton list
          <div key={i} className="rounded-lg border p-3 flex flex-col gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (!enquiries || enquiries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
        <p className="text-muted-foreground text-sm">{t.empty_enquiries ?? "No enquiries received yet."}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {enquiries.map((enq) => (
        <div key={enq.id} className="rounded-lg border p-3 flex flex-col gap-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              {enq.fpo_name && <span className="font-medium text-sm">{enq.fpo_name}</span>}
              {enq.user_name && (
                <span className="text-xs text-muted-foreground">
                  {enq.user_name}
                  {enq.user_email && ` · ${enq.user_email}`}
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground shrink-0">
              {new Date(enq.submitted_at).toLocaleString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{enq.message}</p>
        </div>
      ))}
    </div>
  );
}

export function ExpertDetailDialog({ open, onOpenChange, expert, t, tCommon }: ExpertDetailDialogProps) {
  const [activeTab, setActiveTab] = useState<"details" | "enquiries">("details");

  if (!expert) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.view_title ?? "Expert Details"}</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b gap-0">
          {(["details", "enquiries"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
                activeTab === tab
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "details" ? (t.tab_details ?? "Details") : (t.tab_enquiries ?? "Enquiries")}
            </button>
          ))}
        </div>

        <div className="mt-2 max-h-[50vh] overflow-y-auto">
          {activeTab === "details" ? <DetailsTab expert={expert} t={t} /> : <EnquiriesTab expertId={expert.id} t={t} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
