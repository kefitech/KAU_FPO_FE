"use client";

import { useEffect, useState } from "react";

import { useParams, useRouter } from "next/navigation";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  CheckCheck,
  CheckCircle2,
  ChevronLeft,
  ExternalLink,
  FileText,
  Landmark,
  MapPin,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { cbboFposApi } from "@/app/cbbo/_api/fpos";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { translationsApi } from "@/lib/api/translations";
import { formatLakhsAsRupees } from "@/lib/utils";
import { useLocaleStore } from "@/stores/locale-store";
import type { AssignedFPO } from "@/types/cbbo";

type T = Record<string, string>;

const STATUS_BADGE_STYLES: Record<string, string> = {
  submitted: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  under_review: "border-yellow-500/40 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  approved: "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400",
  info_required: "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-400",
  suspended: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400",
};

function formatDocType(type: string) {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="font-medium text-sm break-words whitespace-pre-wrap">
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

function DocumentsSection({ fpoId, documents, t }: { fpoId: number; documents: AssignedFPO["documents"]; t: T }) {
  const queryClient = useQueryClient();

  const verifyDocMutation = useMutation({
    mutationFn: (docId: number) => cbboFposApi.verifyDocument(fpoId, docId),
    onSuccess: () => {
      toast.success(t.doc_verified ?? "Document verified");
      queryClient.invalidateQueries({ queryKey: ["cbbo-fpo", fpoId] });
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : (t.doc_verify_failed ?? "Failed to verify")),
  });

  if (!documents || documents.length === 0) {
    return <p className="py-2 text-muted-foreground text-sm">{t.doc_no_uploads ?? "No documents uploaded yet."}</p>;
  }

  return (
    <div className="flex flex-col divide-y">
      {documents.map((doc) => (
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
                  {t.doc_verified_by ?? "Verified by"} {doc.verified_by_name}
                </p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {doc.file_url && (
              <a
                href={doc.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary text-xs hover:underline"
              >
                {t.doc_view_link ?? "View"} <ExternalLink className="h-3 w-3" />
              </a>
            )}
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
      ))}
    </div>
  );
}

export default function CBBOFPODetailPage() {
  const router = useRouter();
  const params = useParams();
  const fpoId = Number(params.id);
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const [activeTab, setActiveTab] = useState<"overview" | "documents">("overview");

  useEffect(() => {
    translationsApi
      .getPublic(locale, "cbbo_verifications,fpo_my_application,common")
      .then((data) => {
        setT({ ...(data.fpo_my_application ?? {}), ...(data.common ?? {}), ...(data.cbbo_verifications ?? {}) });
      })
      .catch(() => undefined);
  }, [locale]);

  const {
    data: fpo,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["cbbo-fpo", fpoId],
    queryFn: () => cbboFposApi.getById(fpoId),
    enabled: !Number.isNaN(fpoId),
  });

  function getStatusLabel(status: string | undefined, fallback: string | undefined) {
    if (!status) return fallback ?? "Unknown";
    return t[`status_${status}`] ?? fallback ?? status;
  }

  if (isLoading) {
    return (
      <div className="flex h-60 items-center justify-center text-muted-foreground text-sm">
        {t.loading ?? "Loading..."}
      </div>
    );
  }
  if (isError || !fpo) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
          {t.error_load ?? "Couldn't load this FPO."}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <button
        type="button"
        onClick={() => router.push("/cbbo/verifications")}
        className="flex w-fit items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> {t.back_to_list ?? "Back"}
      </button>

      <div className="flex items-center gap-3">
        <h1 className="font-bold text-2xl">{fpo.name}</h1>
        <Badge
          variant="outline"
          className={`text-[11px] ${STATUS_BADGE_STYLES[fpo.status] ?? "border-muted text-muted-foreground"}`}
        >
          {getStatusLabel(fpo.status, fpo.status_display)}
        </Badge>
      </div>

      <div className="flex gap-1 border-b">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm ${activeTab === "overview" ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground"}`}
        >
          <Building2 className="h-3.5 w-3.5" /> {t.tab_overview ?? "Overview"}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("documents")}
          className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm ${activeTab === "documents" ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground"}`}
        >
          <FileText className="h-3.5 w-3.5" /> {t.tab_documents ?? "Documents"}
        </button>
        <Button
          size="sm"
          className="ml-auto self-center"
          onClick={() => router.push(`/cbbo/reports/new?fpo_id=${fpo.id}`)}
        >
          {t.action_submit_report ?? "Submit Report"}
        </Button>
      </div>

      {activeTab === "overview" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <SectionCard icon={Building2} title={t.section_basic_info ?? "Basic Information"}>
            <div className="grid grid-cols-2 gap-3">
              <InfoRow label={t.field_name_en ?? "FPO Name (English)"} value={fpo.name} />
              <InfoRow label={t.field_name_ml ?? "FPO Name (Malayalam)"} value={fpo.name_ml} />
              <InfoRow
                label={t.field_registered_under ?? "Registered Under"}
                value={fpo.legal_structure_display ?? fpo.legal_structure}
              />
              {fpo.legal_structure_detail && (
                <InfoRow label={t.field_state_csa_act ?? "State CSA Act"} value={fpo.legal_structure_detail} />
              )}
              <InfoRow label={t.field_reg_number ?? "Registration Number"} value={fpo.registration_number} />
              <InfoRow label={t.field_reg_date ?? "Date of Registration"} value={fpo.date_of_registration} />
              <InfoRow
                label={t.field_promoting_agency ?? "Promoting Agency"}
                value={fpo.promoting_agency_display ?? fpo.promoting_agency}
              />
              <InfoRow
                label={t.field_facilitating_agency ?? "Facilitating Agency"}
                value={fpo.facilitating_agency_name}
              />
            </div>
          </SectionCard>

          <SectionCard icon={MapPin} title={t.section_contact ?? "Contact & Location"}>
            <div className="grid grid-cols-2 gap-3">
              <InfoRow label={t.field_district ?? "District"} value={fpo.district_display ?? fpo.district} />
              <InfoRow label={t.field_block_taluk ?? "Block / Taluk"} value={fpo.block_taluk} />
              <InfoRow label={t.field_village_town ?? "Village / Town"} value={fpo.village_town} />
              <InfoRow label={t.field_pincode ?? "Pincode"} value={fpo.pincode} />
              <div className="col-span-2">
                <InfoRow
                  label={t.field_address ?? "Address"}
                  value={[fpo.address_line1, fpo.address_line2].filter(Boolean).join(", ")}
                />
              </div>
              <InfoRow label={t.field_office_phone ?? "Office Phone"} value={fpo.office_phone} />
              <InfoRow label={t.field_office_email ?? "Office Email"} value={fpo.office_email} />
              <InfoRow label={t.field_website ?? "Website"} value={fpo.website} />
            </div>
          </SectionCard>

          <SectionCard icon={Users} title={t.section_signatory ?? "Signatory & Members"}>
            <div className="grid grid-cols-2 gap-3">
              <InfoRow label={t.field_signatory_name ?? "Signatory Name"} value={fpo.signatory_name} />
              <InfoRow
                label={t.field_designation ?? "Designation"}
                value={fpo.signatory_designation_display ?? fpo.signatory_designation}
              />
              <InfoRow label={t.field_signatory_phone ?? "Signatory Phone"} value={fpo.signatory_phone} />
              <InfoRow label={t.field_signatory_email ?? "Signatory Email"} value={fpo.signatory_email} />
              <InfoRow label={t.field_aadhaar_last4 ?? "Aadhaar Last 4"} value={fpo.signatory_aadhaar_last4} />
            </div>
            <div className="grid grid-cols-4 gap-3 border-t pt-3">
              <InfoRow label={t.field_total_members ?? "Total Members"} value={fpo.total_members?.toString()} />
              <InfoRow label={t.field_male_members ?? "Male"} value={fpo.male_members?.toString()} />
              <InfoRow label={t.field_female_members ?? "Female"} value={fpo.female_members?.toString()} />
              <InfoRow label={t.field_sc_st_members ?? "SC / ST"} value={fpo.sc_st_members?.toString()} />
            </div>
            {fpo.total_directors != null && (
              <div className="grid grid-cols-3 gap-3 border-t pt-3">
                <InfoRow
                  label={t.field_ceo_available ?? "CEO Available"}
                  value={
                    fpo.ceo_available == null
                      ? undefined
                      : fpo.ceo_available
                        ? (t.field_yes ?? "Yes")
                        : (t.field_no ?? "No")
                  }
                />
                <InfoRow
                  label={t.field_accountant_available ?? "Accountant Available"}
                  value={
                    fpo.accountant_available == null
                      ? undefined
                      : fpo.accountant_available
                        ? (t.field_yes ?? "Yes")
                        : (t.field_no ?? "No")
                  }
                />
                <InfoRow label={t.field_total_directors ?? "Total Directors"} value={fpo.total_directors?.toString()} />
                <InfoRow label={t.field_women_directors ?? "Women Directors"} value={fpo.women_directors?.toString()} />
                <InfoRow
                  label={t.field_directors_under35 ?? "Directors Under 35"}
                  value={fpo.directors_under_35?.toString()}
                />
              </div>
            )}
          </SectionCard>

          <SectionCard icon={Landmark} title={t.section_business ?? "Business & Bank"}>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <InfoRow
                  label={t.field_primary_commodities ?? "Primary Commodities"}
                  value={(fpo.primary_commodities_display ?? fpo.primary_commodities ?? []).join(", ")}
                />
              </div>
              {(fpo.secondary_commodities ?? []).length > 0 && (
                <div className="col-span-2">
                  <InfoRow
                    label={t.field_secondary_commodities ?? "Secondary Commodities"}
                    value={(fpo.secondary_commodities_display ?? fpo.secondary_commodities ?? []).join(", ")}
                  />
                </div>
              )}
              {fpo.annual_turnover && (
                <InfoRow
                  label={t.field_annual_turnover ?? "Annual Turnover"}
                  value={formatLakhsAsRupees(fpo.annual_turnover)}
                />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 border-t pt-3">
              <InfoRow label={t.field_bank_name ?? "Bank Name"} value={fpo.bank_name_display ?? fpo.bank_name} />
              <InfoRow label={t.field_bank_branch ?? "Branch"} value={fpo.bank_branch} />
              <InfoRow label={t.field_account_number ?? "Account Number"} value={fpo.account_number} />
              <InfoRow label={t.field_ifsc ?? "IFSC Code"} value={fpo.ifsc_code} />
            </div>
          </SectionCard>
        </div>
      )}

      {activeTab === "documents" && (
        <SectionCard icon={FileText} title={t.section_documents ?? "Documents"}>
          <DocumentsSection fpoId={fpo.id} documents={fpo.documents} t={t} />
        </SectionCard>
      )}
    </div>
  );
}
