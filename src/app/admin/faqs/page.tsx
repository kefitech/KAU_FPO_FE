"use client";

import { useRouter } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { useConfirmStore } from "@/stores/confirm-store";
import { adminFaqsApi, type AdminFaq } from "@/app/admin/_api/faqs";
import { getFaqColumns } from "./_components/columns";

export default function FaqsPage() {
  const router = useRouter();
  const confirm = useConfirmStore((s) => s.confirm);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminFaqsApi.delete(id),
    onSuccess: () => {
      toast.success("FAQ deleted");
      queryClient.invalidateQueries({ queryKey: ["faqs"] });
    },
    onError: () => toast.error("Failed to delete"),
  });

  const columns = getFaqColumns({
    onEdit: (item: AdminFaq) => router.push(`/admin/faqs/${item.id}/edit`),
    onDelete: (item: AdminFaq) =>
      confirm({
        title: "Delete FAQ",
        description: `Are you sure you want to delete this FAQ?`,
        onConfirm: () => deleteMutation.mutateAsync(item.id),
      }),
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl">FAQs</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage frequently asked questions shown on the landing page.</p>
        </div>
        <Button className="bg-green-600 hover:bg-green-700" onClick={() => router.push("/admin/faqs/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Add FAQ
        </Button>
      </div>

      <DataTable
        queryKey="faqs"
        queryFn={adminFaqsApi.getAll}
        columns={columns}
        filters={[
          {
            key: "category",
            label: "Category",
            options: [
              { label: "FPO General", value: "fpo_general" },
              { label: "Schemes & Support", value: "schemes" },
              { label: "Platform Usage", value: "platform_usage" },
            ],
          },
        ]}
      />
    </div>
  );
}
