"use client";

import { useRouter } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { type AdminAnnouncement, adminAnnouncementsApi } from "@/app/admin/_api/announcements";
import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { useConfirmStore } from "@/stores/confirm-store";

import { getAnnouncementColumns } from "./_components/columns";

export default function AnnouncementsPage() {
  const router = useRouter();
  const confirm = useConfirmStore((s) => s.confirm);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminAnnouncementsApi.delete(id),
    onSuccess: () => {
      toast.success("Announcement deleted");
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: () => toast.error("Failed to delete"),
  });

  const columns = getAnnouncementColumns({
    onEdit: (item: AdminAnnouncement) => router.push(`/admin/announcements/${item.id}/edit`),
    onDelete: (item: AdminAnnouncement) =>
      confirm({
        title: "Delete Announcement",
        description: `Are you sure you want to delete "${item.title.en}"?`,
        onConfirm: () => deleteMutation.mutateAsync(item.id),
      }),
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl">Announcements</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Manage news and announcements shown on the landing page.
          </p>
        </div>
        <Button className="bg-green-600 hover:bg-green-700" onClick={() => router.push("/admin/announcements/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Add Announcement
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
