"use client";

import { Suspense, useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Pencil, Plus } from "lucide-react";

import { govtSchemesApi } from "@/app/government/_api/schemes";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ViewSheet } from "@/components/ui/view-sheet";
import { authApi } from "@/lib/api/auth";
import { useLocaleStore } from "@/stores/locale-store";
import type { GovtScheme } from "@/types/government";

import { getSchemeColumns } from "./_components/columns";

const FILTERS = [
  {
    key: "category",
    label: "Category",
    options: [
      { label: "Credit & Finance", value: "credit" },
      { label: "Insurance", value: "insurance" },
      { label: "Marketing & Trade", value: "marketing" },
      { label: "Infrastructure", value: "infrastructure" },
      { label: "Capacity Building", value: "capacity_building" },
    ],
  },
];

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  credit: "bg-blue-100 text-blue-700",
  insurance: "bg-purple-100 text-purple-700",
  marketing: "bg-green-100 text-green-700",
  infrastructure: "bg-orange-100 text-orange-700",
  capacity_building: "bg-yellow-100 text-yellow-700",
};

export default function GovernmentSchemesPage() {
  const router = useRouter();
  const locale = useLocaleStore((s) => s.locale);
  const [sheet, setSheet] = useState<{ open: boolean; scheme: GovtScheme | null }>({
    open: false,
    scheme: null,
  });

  const { data: me } = useQuery({
    queryKey: ["auth-me"],
    queryFn: authApi.me,
    staleTime: 5 * 60 * 1000,
  });
  const currentUserId = me?.user?.id ?? null;

  const filters = useMemo(() => FILTERS, []);
  const s = sheet.scheme;
  const isOwner = s ? s.created_by !== null && s.created_by === currentUserId : false;

  return (
    <div className="flex flex-col gap-6 px-6 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl">Schemes &amp; Subsidies</h1>
          <p className="mt-0.5 text-muted-foreground text-sm">Manage scheme catalog entries</p>
        </div>
        <Button size="sm" className="self-start sm:self-auto" onClick={() => router.push("/government/schemes/new")}>
          <Plus className="mr-1.5 h-4 w-4" />
          New Scheme
        </Button>
      </div>

      <Suspense>
        <DataTable
          queryKey="government-schemes"
          queryFn={govtSchemesApi.getAll}
          columns={getSchemeColumns(currentUserId, {}, {}, locale)}
          filters={filters}
          onRowClick={(row) => setSheet({ open: true, scheme: row })}
          searchPlaceholder="Search schemes..."
        />
      </Suspense>

      {s && (
        <ViewSheet
          open={sheet.open}
          onOpenChange={(open) => setSheet((prev) => ({ ...prev, open }))}
          title={s.name_en}
          actions={[
            ...(isOwner
              ? [
                  {
                    label: "Edit",
                    icon: Pencil,
                    onClick: () => router.push(`/government/schemes/${s.id}/edit`),
                  },
                ]
              : []),
            ...(s.official_link
              ? [
                  {
                    label: "Official Link",
                    icon: ExternalLink,
                    onClick: () => window.open(s.official_link, "_blank"),
                  },
                ]
              : []),
          ]}
          fields={[
            { type: "section", label: "Overview" },
            {
              label: "Category",
              type: "node",
              node: (
                <Badge
                  className={`text-xs font-medium ${CATEGORY_BADGE_COLORS[s.category] ?? "bg-muted text-muted-foreground"}`}
                  variant="secondary"
                >
                  {s.category_display}
                </Badge>
              ),
            },
            { label: "Administering Body", value: s.administering_body },
            {
              label: "Created By",
              type: "node",
              node: (
                <Badge
                  variant="outline"
                  className={
                    isOwner
                      ? "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400"
                      : "text-muted-foreground"
                  }
                >
                  {isOwner ? "You" : (s.created_by_name ?? "Unknown")}
                </Badge>
              ),
            },
            {
              label: "Status",
              type: "status",
              active: s.is_active,
              activeLabel: "Active",
              inactiveLabel: "Inactive",
            },
            { label: "Last Updated", type: "date", value: s.updated_at },
            ...(s.objective ? [{ label: "Objective", value: s.objective }] : []),
            { type: "section" as const, label: "Details" },
            { label: "Eligibility", value: s.eligibility },
            { label: "Benefit Details", value: s.benefit_details },
            { label: "Application Process", value: s.application_process },
          ]}
        />
      )}
    </div>
  );
}
