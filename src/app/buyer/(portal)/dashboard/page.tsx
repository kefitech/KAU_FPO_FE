"use client";

import { useEffect, useMemo, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, CheckCircle2, Mail, MapPin, Phone, X } from "lucide-react";
import { toast } from "sonner";

import { buyerDashboardApi } from "@/app/buyer/_api/dashboard";
import { buyerProfileApi } from "@/app/buyer/_api/profile";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { masterDataApi } from "@/lib/api/master-data";
import { KERALA_DISTRICTS } from "@/lib/kerala-districts";
import { translationsApi } from "@/lib/api/translations";
import { useAuthStore } from "@/stores/auth-store";
import { useLocaleStore } from "@/stores/locale-store";

type T = Record<string, string>;

export default function BuyerDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const [translationsLoading, setTranslationsLoading] = useState(true);

  useEffect(() => {
    setTranslationsLoading(true);
    translationsApi
      .getPublic(locale, "buyer_dashboard,common")
      .then((data) => setT({ ...(data.buyer_dashboard ?? {}), ...(data.common ?? {}) }))
      .finally(() => setTranslationsLoading(false));
  }, [locale]);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["buyer-dashboard", locale],
    queryFn: buyerDashboardApi.get,
    staleTime: 60_000,
  });

  const profileIncomplete = useMemo(
    () => !!data && (!data.location || data.commodities_interested.length === 0),
    [data],
  );

  // Districts are a fixed, small list — reuse the same hardcoded source that
  // FPO registration + admin filters use (src/lib/kerala-districts.ts) rather
  // than hitting master-data. The MasterLookup table doesn't currently seed
  // districts, and duplicating them here matches the rest of the codebase.
  const districts = KERALA_DISTRICTS;

  const [locationDraft, setLocationDraft] = useState("");
  const [commoditiesDraft, setCommoditiesDraft] = useState<string[]>([]);
  const [organisationDraft, setOrganisationDraft] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);

  const { data: commodities } = useQuery({
    queryKey: ["master-data", "commodity", locale],
    queryFn: () => masterDataApi.get("commodity", undefined, locale),
    staleTime: 60 * 60 * 1000,
    enabled: profileIncomplete || editingProfile,
  });

  useEffect(() => {
    if (data) {
      setLocationDraft(data.location || "");
      setCommoditiesDraft(data.commodities_interested || []);
      setOrganisationDraft(data.organisation || "");
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      buyerProfileApi.update({
        location: locationDraft,
        commodities_interested: commoditiesDraft,
        organisation: organisationDraft,
      }),
    onSuccess: () => {
      toast.success(t.profile_saved ?? "Profile updated");
      queryClient.invalidateQueries({ queryKey: ["buyer-dashboard"] });
      setEditingProfile(false);
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { message?: string } } } | undefined;
      toast.error(axiosErr?.response?.data?.message ?? t.profile_save_failed ?? "Failed to save profile");
    },
  });
  if (translationsLoading || isLoading || !data) {
    return (
      <div className="flex flex-col gap-6 px-3 py-4 sm:px-6 sm:py-6">
        <Skeleton className="h-7 w-72" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  const hasProfileChanges = () => {
    const currentCommodities = [...(data.commodities_interested || [])].sort();
    const draftCommodities = [...commoditiesDraft].sort();
    return (
      organisationDraft !== (data.organisation || "") ||
      locationDraft !== (data.location || "") ||
      JSON.stringify(draftCommodities) !== JSON.stringify(currentCommodities)
    );
  };

  const handleSaveProfile = () => {
    if (!hasProfileChanges()) {
      toast.info(t.no_changes ?? "No changes to save.");
      setEditingProfile(false);
      return;
    }
    saveMutation.mutate();
  };

  const fullName = user ? `${user.first_name} ${user.last_name}`.trim() : data.name;
  const initials = user
    ? `${user.first_name[0] ?? ""}${user.last_name[0] ?? ""}`.toUpperCase()
    : data.name.slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col gap-6 px-3 py-4 sm:px-6 sm:py-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-green-100 font-semibold text-green-700">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-bold text-xl leading-tight sm:text-2xl">
              {(t.welcome_msg ?? "Welcome, {name}").replace("{name}", fullName)}
            </h1>
            <p className="text-muted-foreground text-sm">
              {data.buyer_type === "fpo"
                ? (t.buyer_type_fpo ?? "FPO Buyer")
                : (t.buyer_type_external ?? "External Buyer")}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 font-semibold text-green-700 text-xs dark:bg-green-900/40 dark:text-green-300">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {t.badge_verified ?? "Verified"}
        </span>
      </div>

      {/* ── Complete your profile ── (shows when incomplete, OR when the buyer clicked Edit) */}
      {(profileIncomplete || editingProfile) && (
        <Card className="border-amber-300 bg-amber-50/40 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="text-base">
              {profileIncomplete
                ? (t.complete_profile_title ?? "Complete your buyer profile")
                : (t.edit_profile_title ?? "Edit your buyer profile")}
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              {t.complete_profile_subtitle ??
                "Add your location and commodity interests so FPOs can match you with relevant products."}
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* Organisation (optional) */}
            <div className="flex flex-col gap-1.5">
              <label className="font-medium text-sm">
                {t.label_organisation ?? "Organisation"}{" "}
                <span className="font-normal text-muted-foreground">
                  ({t.optional ?? "optional"})
                </span>
              </label>
              <Input
                value={organisationDraft}
                onChange={(e) => setOrganisationDraft(e.target.value)}
                placeholder={t.organisation_placeholder ?? "Your organisation name"}
                className="w-full sm:w-72"
              />
            </div>

            {/* Location */}
            <div className="flex flex-col gap-1.5">
              <label className="font-medium text-sm">
                {t.label_location ?? "Location (District)"}
              </label>
              <Select value={locationDraft} onValueChange={setLocationDraft}>
                <SelectTrigger className="w-full sm:w-72">
                  <SelectValue placeholder={t.location_placeholder ?? "Select a district"} />
                </SelectTrigger>
                <SelectContent>
                  {(districts ?? []).map((d) => (
                    <SelectItem key={d.code} value={d.code}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Commodities */}
            <div className="flex flex-col gap-1.5">
              <label className="font-medium text-sm">
                {t.label_commodities ?? "Commodities Interested"}
              </label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" className="w-full justify-start sm:w-72">
                    {commoditiesDraft.length > 0
                      ? `${commoditiesDraft.length} selected`
                      : (t.commodity_placeholder ?? "Select commodities")}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-h-72 overflow-y-auto">
                  {(commodities ?? []).map((c) => (
                    <DropdownMenuCheckboxItem
                      key={c.code}
                      checked={commoditiesDraft.includes(c.code)}
                      onSelect={(e) => e.preventDefault()}
                      onCheckedChange={(checked) => {
                        setCommoditiesDraft((prev) =>
                          checked ? [...prev, c.code] : prev.filter((v) => v !== c.code),
                        );
                      }}
                    >
                      {c.name}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {commoditiesDraft.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {commoditiesDraft.map((c) => {
                    const label = commodities?.find((m) => m.code === c)?.name ?? c;
                    return (
                      <Badge key={c} variant="secondary" className="gap-1 font-normal">
                        {label}
                        <button
                          type="button"
                          onClick={() =>
                            setCommoditiesDraft(commoditiesDraft.filter((v) => v !== c))
                          }
                          className="ml-1 rounded-full hover:bg-muted-foreground/20"
                          aria-label="Remove"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              {!profileIncomplete && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setLocationDraft(data.location || "");
                    setCommoditiesDraft(data.commodities_interested || []);
                    setOrganisationDraft(data.organisation || "");
                    setEditingProfile(false);
                  }}
                >
                  {t.cancel ?? "Cancel"}
                </Button>
              )}
              <Button
                onClick={handleSaveProfile}
                disabled={saveMutation.isPending || !locationDraft || commoditiesDraft.length === 0}
              >
                {saveMutation.isPending
                  ? (t.saving ?? "Saving...")
                  : (t.save_profile ?? "Save profile")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Profile summary (Buyer Profile + Commodities Interested, merged) ── */}
      {!editingProfile && (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">{t.card_profile_title ?? "Buyer Profile"}</CardTitle>
          {!profileIncomplete && (
            <Button size="sm" variant="outline" onClick={() => setEditingProfile(true)}>
              {t.edit_btn ?? "Edit"}
            </Button>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-muted-foreground text-xs">{t.label_organisation ?? "Organisation"}</span>
              <span className="flex items-center gap-1.5 font-medium text-sm">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                {data.organisation || "—"}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-muted-foreground text-xs">{t.label_email ?? "Email"}</span>
              <span className="flex items-center gap-1.5 font-medium text-sm">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                {data.contact_email}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-muted-foreground text-xs">{t.label_phone ?? "Phone"}</span>
              <span className="flex items-center gap-1.5 font-medium text-sm">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                {data.contact_phone || "—"}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-muted-foreground text-xs">{t.label_location ?? "Location"}</span>
              <span className="flex items-center gap-1.5 font-medium text-sm">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                {data.location || "—"}
              </span>
            </div>
          </div>

          {!profileIncomplete && (
            <div className="flex flex-col gap-1.5 border-t pt-4">
              <span className="text-muted-foreground text-xs">{t.label_commodities ?? "Commodities Interested"}</span>
              <div className="flex flex-wrap gap-2">
                {data.commodities_interested.length > 0 ? (
                  data.commodities_interested.map((c) => (
                    <Badge key={c} variant="secondary" className="font-normal">
                      {c}
                    </Badge>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">{t.no_commodities ?? "None specified yet."}</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      )}
    </div>
  );
}