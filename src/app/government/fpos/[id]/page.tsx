"use client";
import { use } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, MapPin } from "lucide-react";
import { govtFposApi } from "@/app/government/_api/fpos";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
  const { data: fpo, isLoading, isError } = useQuery({
    queryKey: ["government", "fpo", id],
    queryFn: () => govtFposApi.getById(Number(id)),
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      <Button variant="outline" className="w-fit" onClick={() => router.push("/government/fpos")}>
        <ChevronLeft className="mr-1 h-4 w-4" /> Back to Directory
      </Button>

      {isLoading && (
        <div className="flex h-40 items-center justify-center text-muted-foreground text-sm">
          Loading...
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
          FPO not found, or outside your jurisdiction.
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
                <Badge variant="outline">{fpo.status_display}</Badge>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <InfoRow label="Application ID" value={fpo.application_id} />
              <InfoRow label="Tier" value={fpo.tier} />
              <InfoRow label="Total Members" value={fpo.total_members} />
              <InfoRow
                label="Last Updated"
                value={fpo.updated_at ? new Date(fpo.updated_at).toLocaleDateString() : null}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Registration Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <InfoRow label="Registration Number" value={fpo.registration_number} />
              <InfoRow
                label="Date of Registration"
                value={fpo.date_of_registration ? new Date(fpo.date_of_registration).toLocaleDateString() : null}
              />
              <InfoRow label="Legal Structure" value={fpo.legal_structure_display} />
              <InfoRow label="Promoting Agency" value={fpo.promoting_agency_display} />
              <InfoRow label="Facilitating Agency" value={fpo.facilitating_agency_name} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Address &amp; Contact</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <InfoRow label="Block/Taluk" value={fpo.block_taluk} />
              <InfoRow label="Village/Town" value={fpo.village_town} />
              <InfoRow label="Pincode" value={fpo.pincode} />
              <InfoRow label="Address" value={[fpo.address_line1, fpo.address_line2].filter(Boolean).join(", ")} />
              <InfoRow label="Office Phone" value={fpo.office_phone} />
              <InfoRow label="Office Email" value={fpo.office_email} />
              <InfoRow label="Website" value={fpo.website} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Membership Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <InfoRow label="Male Members" value={fpo.male_members} />
              <InfoRow label="Female Members" value={fpo.female_members} />
              <InfoRow label="SC/ST Members" value={fpo.sc_st_members} />
              <InfoRow label="Total Directors" value={fpo.total_directors} />
              <InfoRow label="Women Directors" value={fpo.women_directors} />
              <InfoRow label="Directors Under 35" value={fpo.directors_under_35} />
              <InfoRow label="CEO Available" value={fpo.ceo_available ? "Yes" : "No"} />
              <InfoRow label="Accountant Available" value={fpo.accountant_available ? "Yes" : "No"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Commodities</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div>
                <p className="mb-1.5 text-muted-foreground text-xs">Primary</p>
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
                <p className="mb-1.5 text-muted-foreground text-xs">Secondary</p>
                <div className="flex flex-wrap gap-1.5">
                  {fpo.secondary_commodities_display.length === 0 && <span className="text-muted-foreground text-sm">-</span>}
                  {fpo.secondary_commodities_display.map((c) => (
                    <Badge key={c} variant="outline" className="text-[11px]">
                      {c}
                    </Badge>
                  ))}
                </div>
              </div>
              <InfoRow label="Annual Turnover" value={fpo.annual_turnover} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Signatory / Promoter</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <InfoRow label="Signatory Name" value={fpo.signatory_name} />
              <InfoRow label="Designation" value={fpo.signatory_designation_display} />
              <InfoRow label="Signatory Phone" value={fpo.signatory_phone} />
              <InfoRow label="Signatory Email" value={fpo.signatory_email} />
              <InfoRow label="Aadhaar Last 4 Digits" value={fpo.signatory_aadhaar_last4} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Business &amp; Finance</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <InfoRow label="Bank Name" value={fpo.bank_name_display} />
              <InfoRow label="Branch" value={fpo.bank_branch} />
              <InfoRow label="Account Number" value={fpo.account_number} />
              <InfoRow label="IFSC Code" value={fpo.ifsc_code} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
