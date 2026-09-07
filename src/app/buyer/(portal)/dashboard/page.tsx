"use client";

import { useEffect, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { Building2, CheckCircle2, Mail, MapPin, Phone } from "lucide-react";

import { buyerDashboardApi } from "@/app/buyer/_api/dashboard";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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

  const { data, isLoading } = useQuery({
    queryKey: ["buyer-dashboard", locale],
    queryFn: buyerDashboardApi.get,
    staleTime: 60_000,
  });

  if (translationsLoading || isLoading || !data) {
    return (
      <div className="flex flex-col gap-6 px-3 py-4 sm:px-6 sm:py-6">
        <Skeleton className="h-7 w-72" />
        <Skeleton className="h-48" />
      </div>
    );
  }

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

      {/* ── Profile summary ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.card_profile_title ?? "Buyer Profile"}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
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
        </CardContent>
      </Card>

      {/* ── Commodities interested ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.label_commodities ?? "Commodities Interested"}</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}
