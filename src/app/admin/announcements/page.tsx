"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";
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

  useEffect(() => {
    translationsApi
      .getPublic(locale, "admin_announcements,common")
      .then((data) => {
        setT(data.admin_announcements ?? {});
        setTCommon(data.common ?? {});
      })
      .catch(() => undefined);
  }, [locale]);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminAnnouncementsApi.delete(id),
    onSuccess: () => {
      toast.success(t.toast_deleted ?? "Announcement deleted");
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: () => toast.error(tCommon.delete_failed ?? "Failed to delete"),
  });

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
    onEdit: (item: AdminAnnouncement) => router.push(`/admin/announcements/${item.id}/edit`),
    onDelete: (item: AdminAnnouncement) => {
      const name = typeof item.title === "object" ? (Object.values(item.title)[0] ?? "") : item.title;
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

  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl">{t.page_title ?? "Announcements"}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {t.page_description ?? "Manage news and announcements shown on the landing page."}
          </p>
        </div>
        <Button className="self-start sm:self-auto bg-green-600 hover:bg-green-700" onClick={() => router.push("/admin/announcements/new")}>
          <Plus className="mr-2 h-4 w-4" />
          {t.btn_add ?? "Add Announcement"}
        </Button>
      </div>

      <DataTable
        queryKey="announcements"
        queryFn={adminAnnouncementsApi.getAll}
        columns={columns}
        filters={[
          {
            key: "category",
            label: "Category",
            options: [
              { label: "Announcement", value: "announcement" },
              { label: "News", value: "news" },
            ],
          },
        ]}
        onRowClick={(row) => setSheet({ open: true, item: row })}
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
            { type: "section", label: "Details" },
            {
              label: "Category",
              type: "node",
              node: (
                <Badge variant="secondary" className="text-xs font-medium">
                  {sheet.item.category_display}
                </Badge>
              ),
            },
            {
              label: "Status",
              type: "status",
              active: sheet.item.is_active,
              activeLabel: tCommon.badge_active ?? "Active",
              inactiveLabel: tCommon.badge_inactive ?? "Inactive",
            },
            { label: "Published Date", type: "date", value: sheet.item.published_date },
            { label: "Created", type: "date", value: sheet.item.created_at },
            { type: "section", label: "Content (English)" },
            { label: "Title (EN)", value: sheet.item.title?.en ?? Object.values(sheet.item.title ?? {})[0] },
            { label: "Body (EN)", value: sheet.item.body?.en ?? Object.values(sheet.item.body ?? {})[0] },
            ...(sheet.item.title?.ml
              ? [
                  { type: "section" as const, label: "Content (Malayalam)" },
                  { label: "Title (ML)", value: sheet.item.title.ml },
                  { label: "Body (ML)", value: sheet.item.body?.ml },
                ]
              : []),
          ]}
        />
      )}
    </div>
  );
}
