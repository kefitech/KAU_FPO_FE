"use client";
import { useEffect, useState } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, MapPin } from "lucide-react";
import { govtFposApi } from "@/app/government/_api/fpos";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

type T = Record<string, string>;
const STATUS_BADGE_STYLES: Record<string, string> = {
  draft: "border-muted text-muted-foreground",
  submitted: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  under_review: "border-yellow-500/40 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  info_required: "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-400",
  approved: "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400",
  rejected: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400",
  suspended: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400",
  claimed: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400",
};

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-0.5 font-medium text-sm">{value ?? "-"}</p>
    </div>
  );
}

export default function GovernmentFPODetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const [tApp, setTApp] = useState<T>({});

  const [tStatus, setTStatus] = useState<T>({});

  useEffect(() => {
    translationsApi
      .getPublic(locale, "government_fpo_detail,fpo_my_application,government_dashboard")
      .then((data) => {
        setT(data.government_fpo_detail ?? {});
        setTApp(data.fpo_my_application ?? {});
        setTStatus(data.government_dashboard ?? {});
      })
      .catch(() => undefined);
  }, [locale]);

  function getStatusLabel(status: string | undefined, fallback: string | undefined) {
    if (!status) return fallback ?? "";
    const key = String(status).toLowerCase().replace(/ /g, "_");
    return tStatus[`status_${key}`] ?? fallback ?? status;
  }

  const { data: fpo, isLoading, isError } = useQuery({
    queryKey: ["government", "fpo", id],
    queryFn: () => govtFposApi.getById(Number(id)),
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      <Button variant="outline" className="w-fit" onClick={() => router.push("/government/fpos")}>
        <ChevronLeft className="mr-1 h-4 w-4" /> {t.btn_back ?? "Back to Directory"}
      </Button>

      {isLoading && (
        <div className="flex h-40 items-center justify-center text-muted-foreground text-sm">
          {t.loading ?? "Loading..."}
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
          {t.error_not_found ?? "FPO not found, or outside your jurisdiction."}
        </div>
      )}

      {fpo && (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">{fpo.name}</CardTitle>
                  {fpo.name_ml && <p className="mt-0.5 text-muted-foreground text-sm">{fpo.name_ml}</p>}
                  <p className="mt-1 flex items-center gap-1 text-muted-foreground text-xs">
                    <MapPin className="h-3 w-3" /> {fpo.district_display ?? fpo.district}
                  </p>
                </div>
                <Badge variant="outline" className={STATUS_BADGE_STYLES[fpo.status] ?? "border-muted text-muted-foreground"}>
                  {getStatusLabel(fpo.status, fpo.status_display)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <InfoRow label={t.field_application_id ?? "Application ID"} value={fpo.application_id} />
              <InfoRow label={t.field_tier ?? "Tier"} value={fpo.tier} />
              <InfoRow label={tApp.field_total_members ?? "Total Members"} value={fpo.total_members} />
              <InfoRow
                label={t.field_last_updated ?? "Last Updated"}
                value={fpo.updated_at ? new Date(fpo.updated_at).toLocaleDateString() : null}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.section_registration ?? "Registration Details"}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <InfoRow label={tApp.field_reg_number ?? "Registration Number"} value={fpo.registration_number} />
              <InfoRow
                label={tApp.field_date_of_reg ?? "Date of Registration"}
                value={fpo.date_of_registration ? new Date(fpo.date_of_registration).toLocaleDateString() : null}
              />
              <InfoRow label={tApp.field_legal_structure ?? "Legal Structure"} value={fpo.legal_structure_display} />
              <InfoRow label={tApp.field_promoting_agency ?? "Promoting Agency"} value={fpo.promoting_agency_display} />
              <InfoRow label={tApp.field_facilitating_agency ?? "Facilitating Agency"} value={fpo.facilitating_agency_name} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.section_address ?? "Address & Contact"}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <InfoRow label={tApp.field_block_taluk ?? "Block/Taluk"} value={fpo.block_taluk} />
              <InfoRow label={tApp.field_village_town ?? "Village/Town"} value={fpo.village_town} />
              <InfoRow label={tApp.field_pincode ?? "Pincode"} value={fpo.pincode} />
              <InfoRow label={tApp.field_address ?? "Address"} value={[fpo.address_line1, fpo.address_line2].filter(Boolean).join(", ")} />
              <InfoRow label={tApp.field_office_phone ?? "Office Phone"} value={fpo.office_phone} />
              <InfoRow label={tApp.field_office_email ?? "Office Email"} value={fpo.office_email} />
              <InfoRow label={tApp.field_website ?? "Website"} value={fpo.website} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.section_membership ?? "Membership Breakdown"}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <InfoRow label={tApp.field_male_members ?? "Male Members"} value={fpo.male_members} />
              <InfoRow label={tApp.field_female_members ?? "Female Members"} value={fpo.female_members} />
              <InfoRow label={tApp.field_sc_st_members ?? "SC/ST Members"} value={fpo.sc_st_members} />
              <InfoRow label={tApp.field_total_directors ?? "Total Directors"} value={fpo.total_directors} />
              <InfoRow label={tApp.field_women_directors ?? "Women Directors"} value={fpo.women_directors} />
              <InfoRow label={tApp.field_directors_under35 ?? "Directors Under 35"} value={fpo.directors_under_35} />
              <InfoRow label={tApp.field_ceo_available ?? "CEO Available"} value={fpo.ceo_available ? (tApp.field_yes ?? "Yes") : (tApp.field_no ?? "No")} />
              <InfoRow label={tApp.field_accountant_available ?? "Accountant Available"} value={fpo.accountant_available ? (tApp.field_yes ?? "Yes") : (tApp.field_no ?? "No")} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.section_commodities ?? "Commodities"}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div>
                <p className="mb-1.5 text-muted-foreground text-xs">{t.label_primary ?? "Primary"}</p>
                <div className="flex flex-wrap gap-1.5">
                  {fpo.primary_commodities_display.length === 0 && <span className="text-muted-foreground text-sm">-</span>}
                  {fpo.primary_commodities_display.map((c) => (
                    <Badge key={c} variant="secondary" className="text-[11px]">
                      {c}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-muted-foreground text-xs">{t.label_secondary ?? "Secondary"}</p>
                <div className="flex flex-wrap gap-1.5">
                  {fpo.secondary_commodities_display.length === 0 && <span className="text-muted-foreground text-sm">-</span>}
                  {fpo.secondary_commodities_display.map((c) => (
                    <Badge key={c} variant="outline" className="text-[11px]">
                      {c}
                    </Badge>
                  ))}
                </div>
              </div>
              <InfoRow label={tApp.field_annual_turnover ?? "Annual Turnover"} value={fpo.annual_turnover} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{tApp.section_signatory ?? "Signatory / Promoter"}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <InfoRow label={tApp.field_signatory_name ?? "Signatory Name"} value={fpo.signatory_name} />
              <InfoRow label={tApp.field_designation ?? "Designation"} value={fpo.signatory_designation_display} />
              <InfoRow label={tApp.field_signatory_phone ?? "Signatory Phone"} value={fpo.signatory_phone} />
              <InfoRow label={tApp.field_signatory_email ?? "Signatory Email"} value={fpo.signatory_email} />
              <InfoRow label={tApp.field_aadhaar_last4 ?? "Aadhaar Last 4 Digits"} value={fpo.signatory_aadhaar_last4} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{tApp.section_business ?? "Business & Finance"}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <InfoRow label={tApp.field_bank_name ?? "Bank Name"} value={fpo.bank_name_display} />
              <InfoRow label={tApp.field_bank_branch ?? "Branch"} value={fpo.bank_branch} />
              <InfoRow label={tApp.field_account_number ?? "Account Number"} value={fpo.account_number} />
              <InfoRow label={tApp.field_ifsc_code ?? "IFSC Code"} value={fpo.ifsc_code} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
