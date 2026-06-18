"use client";

import { useEffect } from "react";

import dynamic from "next/dynamic";
import Link from "next/link";

import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  Building2,
  CalendarDays,
  ChevronRight,
  FileCheck,
  FileText,
  MapPin,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { fpoDashboardApi } from "@/app/fpo/_api/dashboard";

const LocationMap = dynamic(
  () => import("./_components/location-map").then((m) => ({ default: m.LocationMap })),
  {
    ssr: false,
    loading: () => <div className="h-52 w-full animate-pulse rounded-lg bg-muted" />,
  },
);
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/stores/auth-store";
import type { FpoStatus } from "@/types/fpo";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRole(role: string) {
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCommodity(code: string) {
  return code.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(dateStr: string) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const STATUS_CONFIG: Record<FpoStatus, { label: string; className: string }> = {
  draft:         { label: "Draft",          className: "bg-muted text-muted-foreground" },
  submitted:     { label: "Submitted",      className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  under_review:  { label: "Under Review",   className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  approved:      { label: "Approved",       className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  rejected:      { label: "Rejected",       className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  info_required: { label: "Info Required",  className: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" },
};

const DISTRICT_LABELS: Record<string, string> = {
  TVM: "Thiruvananthapuram", KLM: "Kollam", PTA: "Pathanamthitta",
  ALP: "Alappuzha", KTM: "Kottayam", IDK: "Idukki", EKM: "Ernakulam",
  TSR: "Thrissur", PKD: "Palakkad", MLP: "Malappuram", KZD: "Kozhikode",
  WYD: "Wayanad", KNR: "Kannur", KSD: "Kasaragod",
};

// ─── Skeletons ────────────────────────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-4 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="mb-1 h-8 w-16" />
        <Skeleton className="h-3 w-24" />
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FpoDashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { data, isLoading } = useQuery({
    queryKey: ["fpo-dashboard"],
    queryFn: fpoDashboardApi.get,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (sessionStorage.getItem("show_welcome") === "1") {
      sessionStorage.removeItem("show_welcome");
      const fullName = user ? `${user.first_name} ${user.last_name}`.trim() : "there";
      const role = user?.role ? formatRole(user.role) : null;
      const initials = user
        ? `${user.first_name[0] ?? ""}${user.last_name[0] ?? ""}`.toUpperCase()
        : "U";
      toast.custom(
        () => (
          <div className="flex w-80 items-center gap-3 rounded-xl border bg-background px-4 py-3 shadow-lg">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarFallback className="bg-green-100 font-semibold text-green-700 text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <p className="font-semibold text-foreground text-sm">Welcome back, {fullName}!</p>
              {role && <p className="text-muted-foreground text-xs">{role}</p>}
            </div>
          </div>
        ),
        { duration: 4000 },
      );
    }
  }, [user]);

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-72" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-48 lg:col-span-2" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  const { profile, tier, location, team, documents, notifications, quick_links } = data;
  const statusCfg = STATUS_CONFIG[profile.status] ?? { label: profile.status, className: "bg-muted text-muted-foreground" };
  const districtLabel = DISTRICT_LABELS[location.district] ?? location.district;

  return (
    <div className="flex flex-col gap-6 p-6">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-bold text-2xl leading-tight">{profile.name}</h1>
          <p className="mt-0.5 font-mono text-muted-foreground text-sm">{profile.application_id}</p>
        </div>
        <span className={`inline-flex items-center rounded-full px-3 py-1 font-semibold text-xs ${statusCfg.className}`}>
          {statusCfg.label}
        </span>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{profile.total_members}</div>
            <p className="text-muted-foreground text-xs">
              {team.active} active · {team.total - team.active} inactive
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{documents.uploaded}</div>
            <p className="text-muted-foreground text-xs">{documents.verified} verified</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">Tier</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{tier.tier ?? "—"}</div>
            <p className="text-muted-foreground text-xs">
              {tier.financial_year ?? "Not assigned yet"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">Notifications</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{notifications.unread_count}</div>
            <p className="text-muted-foreground text-xs">unread</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Main grid ── */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Left: profile details + commodities */}
        <div className="flex flex-col gap-6 lg:col-span-2">

          {/* FPO Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">FPO Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-muted-foreground text-xs">Registration Date</span>
                <span className="flex items-center gap-1.5 font-medium text-sm">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                  {formatDate(profile.date_of_registration)}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-muted-foreground text-xs">PAN Number</span>
                <span className="font-mono font-medium text-sm">{profile.pan_number}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-muted-foreground text-xs">Documents Status</span>
                <span className="flex items-center gap-1.5 font-medium text-sm">
                  <FileCheck className="h-3.5 w-3.5 text-muted-foreground" />
                  {documents.ready_to_submit ? (
                    <span className="text-green-600">Ready to submit</span>
                  ) : (
                    <span className="text-amber-600">
                      {documents.required_missing.length} required missing
                    </span>
                  )}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-muted-foreground text-xs">Location</span>
                <span className="flex items-center gap-1.5 font-medium text-sm">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  {districtLabel}, {location.pincode}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Primary Commodities */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Primary Commodities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {profile.primary_commodities.map((c) => (
                  <Badge key={c} variant="secondary" className="font-normal">
                    {formatCommodity(c)}
                  </Badge>
                ))}
                {profile.primary_commodities.length === 0 && (
                  <p className="text-muted-foreground text-sm">No commodities added yet.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Office Location</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {location.latitude != null && location.longitude != null ? (
                <LocationMap lat={location.latitude} lng={location.longitude} />
              ) : (
                <div className="flex h-52 items-center justify-center rounded-lg bg-muted">
                  <p className="text-muted-foreground text-sm">No location set</p>
                </div>
              )}
              <div className="flex flex-col gap-0.5 text-sm">
                <p className="font-medium">{location.address_line1}</p>
                {location.address_line2 && (
                  <p className="text-muted-foreground">{location.address_line2}</p>
                )}
                <p className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {location.block_taluk
                    ? `${location.block_taluk.replace(/\b\w/g, (c) => c.toUpperCase())}, `
                    : ""}
                  {districtLabel} — {location.pincode}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: quick links + notifications */}
        <div className="flex flex-col gap-6">

          {/* Quick Links */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 p-0 pb-2">
              {quick_links.map((link, i) => (
                <Link
                  key={`${i}-${link.path}`}
                  href={link.path}
                  className="flex items-center justify-between px-6 py-2.5 text-sm transition-colors hover:bg-muted"
                >
                  <span>{link.label}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* Recent Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              {notifications.recent.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <Bell className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-muted-foreground text-sm">No notifications yet</p>
                  <p className="text-muted-foreground text-xs">
                    Updates on your application will appear here
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {notifications.recent.map((n) => (
                    <div
                      key={n.id}
                      className={`rounded-lg border p-3 ${!n.is_read ? "border-primary/20 bg-primary/5" : ""}`}
                    >
                      <p className="font-medium text-sm">{n.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-muted-foreground text-xs">{n.body}</p>
                      <p className="mt-1 text-muted-foreground text-xs">{timeAgo(n.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
