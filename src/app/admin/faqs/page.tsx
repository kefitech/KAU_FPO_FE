"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { translationsApi } from "@/lib/api/translations";
import { useConfirmStore } from "@/stores/confirm-store";
import { useLocaleStore } from "@/stores/locale-store";
import { adminFaqsApi, type AdminFaq } from "@/app/admin/_api/faqs";
import { getFaqColumns } from "./_components/columns";

type T = Record<string, string>;

export default function FaqsPage() {
  const router = useRouter();
  const confirm = useConfirmStore((s) => s.confirm);
  const queryClient = useQueryClient();
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});

  useEffect(() => {
    translationsApi
      .getPublic(locale, "admin_faqs,common")
      .then((data) => {
        setT(data.admin_faqs ?? {});
        setTCommon(data.common ?? {});
      })
      .catch(() => undefined);
  }, [locale]);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminFaqsApi.delete(id),
    onSuccess: () => {
      toast.success(t.toast_deleted ?? "FAQ deleted");
      queryClient.invalidateQueries({ queryKey: ["faqs"] });
    },
    onError: () => toast.error(tCommon.delete_failed ?? "Failed to delete"),
  });

  const columns = getFaqColumns({
    t,
    tCommon,
    onEdit: (item: AdminFaq) => router.push(`/admin/faqs/${item.id}/edit`),
    onDelete: (item: AdminFaq) =>
      confirm({
        title: t.delete_title ?? "Delete FAQ",
        description: t.delete_description ?? "Are you sure you want to delete this FAQ?",
        onConfirm: () => deleteMutation.mutateAsync(item.id),
      }),
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl">{t.page_title ?? "FAQs"}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {t.page_description ?? "Manage frequently asked questions shown on the landing page."}
          </p>
        </div>
        <Button className="bg-green-600 hover:bg-green-700" onClick={() => router.push("/admin/faqs/new")}>
          <Plus className="mr-2 h-4 w-4" />
          {t.btn_add ?? "Add FAQ"}
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
