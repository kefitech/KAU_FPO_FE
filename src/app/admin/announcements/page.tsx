"use client";

import { useEffect, useState,useMemo } from "react";

import { useRouter } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import DOMPurify from "isomorphic-dompurify";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { type AdminAnnouncement, adminAnnouncementsApi } from "@/app/admin/_api/announcements";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ViewSheet } from "@/components/ui/view-sheet";
import { translationsApi } from "@/lib/api/translations";
import { useConfirmStore } from "@/stores/confirm-store";
import { useLocaleStore } from "@/stores/locale-store";

import { getAnnouncementColumns } from "./_components/columns";

type T = Record<string, string>;

export default function AnnouncementsPage() {
  const router = useRouter();
  const confirm = useConfirmStore((s) => s.confirm);
  const queryClient = useQueryClient();
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});
  const [sheet, setSheet] = useState<{ open: boolean; item: AdminAnnouncement | null }>({ open: false, item: null });
  const [translationsLoading, setTranslationsLoading] = useState(true);

  useEffect(() => {
    setTranslationsLoading(true);
    translationsApi
      .getPublic(locale, "admin_announcements,common")
      .then((data) => {
        setT(data.admin_announcements ?? {});
        setTCommon(data.common ?? {});
      })
      .catch(() => undefined)
      .finally(() => setTranslationsLoading(false));
  }, [locale]);
  const filters = useMemo(
    () => [
      {
        key: "category",
        label: t.filter_category ?? "Category",
        options: [
          { label: t.cat_announcement ?? "Announcement", value: "announcement" },
          { label: t.cat_news ?? "News", value: "news" },
        ],
      },
    ],
    [t]
  );

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminAnnouncementsApi.delete(id),
    onSuccess: () => {
      toast.success(t.toast_deleted ?? "Announcement deleted");
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: () => toast.error(tCommon.delete_failed ?? "Failed to delete"),
  });

  function stripHtml(html?: string) {
    if (!html) return "";
    return DOMPurify.sanitize(html, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  }

  const toggleStatusMutation = useMutation({
    mutationFn: (item: AdminAnnouncement) => adminAnnouncementsApi.update(item.id, { is_active: !item.is_active }),
    onSuccess: () => {
      toast.success(t.toast_status_updated ?? "Status updated");
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: () => toast.error(tCommon.update_failed ?? "Failed to update status"),
  });

  const columns = getAnnouncementColumns({
    t,
    tCommon,
    locale,
    onEdit: (item: AdminAnnouncement) => router.push(`/admin/announcements/${item.id}/edit`),
    onDelete: (item: AdminAnnouncement) => {
      const name =
        typeof item.title === "object"
          ? (item.title[locale] || item.title.en || Object.values(item.title)[0] || "")
          : item.title;
      confirm({
        title: t.delete_title ?? "Delete Announcement",
        description: (t.delete_description ?? 'Are you sure you want to delete "{name}"?').replace("{name}", name),
        onConfirm: () => deleteMutation.mutateAsync(item.id),
      });
    },
    onToggleStatus: (item: AdminAnnouncement) => {
      toggleStatusMutation.mutate(item);
    },
  });
  if (translationsLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <div className="h-7 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-72 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-9 w-40 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-64 w-full animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl">{t.page_title ?? "Announcements"}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {t.page_description ?? "Manage news and announcements shown on the landing page."}
          </p>
        </div>
        <Button className="bg-blue-700 hover:bg-blue-600" onClick={() => router.push("/admin/announcements/new")}>
          <Plus className="mr-2 h-4 w-4" />
          {t.btn_add ?? "Add Announcement"}
        </Button>
      </div>

      
      <DataTable
        queryKey="announcements"
        queryFn={adminAnnouncementsApi.getAll}
        columns={columns}
        filters={filters}
        onRowClick={(row) => setSheet({ open: true, item: row })}
        columnsLabel={tCommon.col_header ?? "Columns"}
        toggleColumnsLabel={tCommon.col_toggle_columns ?? "Toggle columns"}
        searchPlaceholder={tCommon.search_placeholder ?? "Search..."}
        clearLabel={tCommon.cancel ?? "Clear"}
      />

      {sheet.item && (
        <ViewSheet
          open={sheet.open}
          onOpenChange={(open) => setSheet((prev) => ({ ...prev, open }))}
          title={sheet.item.title?.en ?? Object.values(sheet.item.title ?? {})[0] ?? "Announcement"}
          actions={[
            {
              label: t.btn_edit ?? "Edit",
              icon: Pencil,
              onClick: () => {
                setSheet((prev) => ({ ...prev, open: false }));
                router.push(`/admin/announcements/${sheet.item!.id}/edit`);
              },
            },
          ]}
          fields={[
            { type: "section", label: t.section_details ?? "Details" },
            {
              label: t.filter_category ?? "Category",
              type: "node",
              node: (
                <Badge variant="secondary" className="text-xs font-medium">
                  {t[`cat_${sheet.item.category}`] ?? sheet.item.category}
                </Badge>
              ),
            },
            {
              label: t.field_status ?? "Status",
              type: "status",
              active: sheet.item.is_active,
              activeLabel: tCommon.badge_active ?? "Active",
              inactiveLabel: tCommon.badge_inactive ?? "Inactive",
            },
            { label: t.field_published_date ?? "Published Date", type: "date", value: sheet.item.published_date },
            { label: t.field_created ?? "Created", type: "date", value: sheet.item.created_at },
            { type: "section", label: t.section_content_en ?? "Content (English)" },
            { label: t.field_title_en ?? "Title (EN)", value: sheet.item.title?.en ?? Object.values(sheet.item.title ?? {})[0] },
            { label: t.field_body_en ?? "Body (EN)", value: stripHtml(sheet.item.body?.en ?? Object.values(sheet.item.body ?? {})[0]) },
            ...(sheet.item.title?.ml
              ? [
                 { type: "section" as const, label: t.section_content_ml ?? "Content (Malayalam)" },
                 { label: t.field_title_ml ?? "Title (ML)", value: sheet.item.title.ml },
                 { label: t.field_body_ml ?? "Body (ML)", value: sheet.item.body?.ml },
                ]
              : []),
          ]}
        />
      )}
    </div>
  );
}
