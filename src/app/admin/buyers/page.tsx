"use client";

import { Suspense, useEffect, useMemo, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { type AdminBuyer, adminBuyersApi } from "@/app/admin/_api/buyers";
import { DataTable } from "@/components/data-table";
import { type SheetField, ViewSheet } from "@/components/ui/view-sheet";
import { inboxApi } from "@/lib/api/inbox";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

import { buyerDisplayStatus, getBuyerColumns, refreshBuyerAlerts, StatusBadge } from "./_components/columns";

type T = Record<string, string>;

export default function AdminBuyersPage() {
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const [buyerType, setBuyerType] = useState<"" | "fpo" | "external">("");
  const [buyerView, setBuyerView] = useState<{ open: boolean; row: AdminBuyer | null }>({ open: false, row: null });
  const queryClient = useQueryClient();

  // Opening a new registration counts as seeing it: mark its alert read, which drops the row's dot.
  const openBuyer = (row: AdminBuyer) => {
    setBuyerView({ open: true, row });
    if (row.unread_notification_id) {
      inboxApi
        .markRead(row.unread_notification_id)
        .then(() => refreshBuyerAlerts(queryClient))
        .catch(() => undefined);
    }
  };

  useEffect(() => {
    translationsApi.getPublic(locale, "buyers_table,common").then((data) => {
      setT(data.buyers_table ?? {});
    });
  }, [locale]);

  const STATUS_FILTERS = useMemo(
    () => [
      {
        key: "status",
        label: t.filter_status ?? "Status",
        options: [
          { label: t.status_pending ?? "Pending", value: "pending" },
          { label: t.status_verified ?? "Verified", value: "verified" },
          { label: t.status_deactivated ?? "Deactivated", value: "deactivated" },
          { label: t.status_rejected ?? "Rejected", value: "rejected" },
        ],
      },
    ],
    [t],
  );

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      <div>
        <h1 className="font-bold text-2xl">{t.page_title ?? "Buyer Directory"}</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">
          {t.page_description ?? "Review and manage buyer registrations."}
        </p>
      </div>

      {/* Sub-admins see their district's FPO and external buyers, so everyone gets the type filter */}
      <div className="flex justify-end">
        <select
          value={buyerType}
          onChange={(e) => setBuyerType(e.target.value as "" | "fpo" | "external")}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">{t.filter_all ?? "All"}</option>
          <option value="fpo">{t.filter_fpo ?? "FPO Buyers"}</option>
          <option value="external">{t.filter_external ?? "External Buyers"}</option>
        </select>
      </div>

      <Suspense>
        <DataTable
          queryKey={`admin-buyers-${buyerType}`}
          queryFn={(params) => adminBuyersApi.getAll({ ...params, buyer_type: buyerType || undefined })}
          columns={getBuyerColumns(t)}
          filters={STATUS_FILTERS}
          onRowClick={openBuyer}
        />
      </Suspense>

      <ViewSheet
        open={buyerView.open}
        onOpenChange={(open) => setBuyerView((s) => ({ ...s, open }))}
        title={t.view_title ?? "Buyer Details"}
        fields={buyerView.row ? buyerFields(buyerView.row, t) : []}
      />
    </div>
  );
}

function buyerFields(b: AdminBuyer, t: T): SheetField[] {
  const { status, label } = buyerDisplayStatus(b, t);
  const quantity =
    b.min_quantity || b.max_quantity
      ? `${[b.min_quantity, b.max_quantity].filter(Boolean).join(" – ")} ${b.unit}`.trim()
      : null;
  const loginAccount =
    b.account_active === null
      ? (t.account_none ?? "No login account")
      : b.account_active
        ? (t.account_active ?? "Active")
        : (t.status_deactivated ?? "Deactivated");

  return [
    { label: t.section_contact ?? "Contact", type: "section" },
    { label: t.col_name ?? "Name", value: b.name },
    { label: t.col_organisation ?? "Organisation", value: b.organisation },
    { label: t.col_email ?? "Email", value: b.contact_email },
    { label: t.col_phone ?? "Phone", value: b.contact_phone },
    { label: t.col_district ?? "District", value: b.district_display },
    { label: t.section_interest ?? "Buying Interest", type: "section" },
    { label: t.field_commodities ?? "Commodities", type: "tags", tags: b.commodities_display },
    { label: t.field_quantity ?? "Quantity", value: quantity },
    { label: t.section_account ?? "Account", type: "section" },
    {
      label: t.field_buyer_type ?? "Buyer Type",
      value: b.fpo_name ? `${t.type_fpo ?? "FPO buyer"} — ${b.fpo_name}` : (t.type_external ?? "External buyer"),
    },
    { label: t.col_status ?? "Status", type: "node", node: <StatusBadge status={status} label={label} /> },
    { label: t.field_login_account ?? "Login Account", value: loginAccount },
    { label: t.field_registered_on ?? "Registered On", type: "date", value: b.created_at },
  ];
}
