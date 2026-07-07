"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { type AdminFaq, adminFaqsApi } from "@/app/admin/_api/faqs";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ViewSheet } from "@/components/ui/view-sheet";
import { translationsApi } from "@/lib/api/translations";
import { useConfirmStore } from "@/stores/confirm-store";
import { useLocaleStore } from "@/stores/locale-store";

import { getFaqColumns } from "./_components/columns";

type T = Record<string, string>;

export default function FaqsPage() {
  const router = useRouter();
  const confirm = useConfirmStore((s) => s.confirm);
  const queryClient = useQueryClient();
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});
  const [sheet, setSheet] = useState<{ open: boolean; item: AdminFaq | null }>({ open: false, item: null });

  function stripHtml(html?: string) {
    if (!html) return "";
    return DOMPurify.sanitize(html, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  }
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

  const toggleStatusMutation = useMutation({
    mutationFn: (item: AdminFaq) => adminFaqsApi.update(item.id, { is_active: !item.is_active }),
    onSuccess: () => {
      toast.success(t.toast_status_updated ?? "Status updated");
      queryClient.invalidateQueries({ queryKey: ["faqs"] });
    },
    onError: () => toast.error(tCommon.update_failed ?? "Failed to update status"),
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
    onToggleStatus: (item: AdminFaq) => {
      toggleStatusMutation.mutate(item);
    },
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
        onRowClick={(row) => setSheet({ open: true, item: row })}
      />

      {sheet.item && (
        <ViewSheet
          open={sheet.open}
          onOpenChange={(open) => setSheet((prev) => ({ ...prev, open }))}
          title={sheet.item.question?.en ?? Object.values(sheet.item.question ?? {})[0] ?? "FAQ"}
          actions={[
            {
              label: t.btn_edit ?? "Edit",
              icon: Pencil,
              onClick: () => {
                setSheet((prev) => ({ ...prev, open: false }));
                router.push(`/admin/faqs/${sheet.item!.id}/edit`);
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
            { label: "Order", value: String(sheet.item.order) },
            { label: "Created", type: "date", value: sheet.item.created_at },
            { type: "section", label: "Content (English)" },
            { label: "Question (EN)", value: sheet.item.question?.en ?? Object.values(sheet.item.question ?? {})[0] },
            {
              label: "Answer (EN)",
              value: stripHtml(sheet.item.answer?.en ?? Object.values(sheet.item.answer ?? {})[0]),
            },
            ...(sheet.item.question?.ml
              ? [
                  { type: "section" as const, label: "Content (Malayalam)" },
                  { label: "Question (ML)", value: sheet.item.question.ml },
                  { label: "Answer (ML)", value: stripHtml(sheet.item.answer?.ml) },
                ]
              : []),
          ]}
        />
      )}
    </div>
  );
}
