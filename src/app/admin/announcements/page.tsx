"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { type AdminAnnouncement, adminAnnouncementsApi } from "@/app/admin/_api/announcements";
import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
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
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl">{t.page_title ?? "Announcements"}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {t.page_description ?? "Manage news and announcements shown on the landing page."}
          </p>
        </div>
        <Button className="bg-green-600 hover:bg-green-700" onClick={() => router.push("/admin/announcements/new")}>
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
      />
    </div>
  );
}
