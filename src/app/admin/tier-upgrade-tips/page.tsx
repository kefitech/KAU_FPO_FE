"use client";

import { useEffect, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { adminTierUpgradeTipsApi, type AdminTierUpgradeTip } from "@/app/admin/_api/tier-upgrade-tips";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { translationsApi } from "@/lib/api/translations";
import { useConfirmStore } from "@/stores/confirm-store";
import { useLocaleStore } from "@/stores/locale-store";

import { TipDialog } from "./_components/tip-dialog";

type T = Record<string, string>;

const TIER_COLOR: Record<string, string> = {
  A: "bg-green-100 text-green-800 border-green-200",
  B: "bg-blue-100 text-blue-800 border-blue-200",
  C: "bg-amber-100 text-amber-800 border-amber-200",
  D: "bg-rose-100 text-rose-800 border-rose-200",
};

export default function TierUpgradeTipsPage() {
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});
  const [dialog, setDialog] = useState<{ open: boolean; item: AdminTierUpgradeTip | null }>({ open: false, item: null });
  const [targetTierFilter, setTargetTierFilter] = useState<string>("");

  useEffect(() => {
    translationsApi
      .getPublic(locale, "admin_tier_upgrade_tips,common")
      .then((data) => {
        setT(data.admin_tier_upgrade_tips ?? {});
        setTCommon(data.common ?? {});
      })
      .catch(() => undefined);
  }, [locale]);

  const { data, isLoading } = useQuery({
    queryKey: ["tier-upgrade-tips", targetTierFilter],
    queryFn: () =>
      adminTierUpgradeTipsApi.getAll({
        ...(targetTierFilter ? { target_tier: targetTierFilter } : {}),
        page_size: 200,
      } as never),
  });

  const rows: AdminTierUpgradeTip[] = data?.data ?? [];

  const toggleMutation = useMutation({
    mutationFn: (item: AdminTierUpgradeTip) =>
      item.is_active ? adminTierUpgradeTipsApi.deactivate(item.id) : adminTierUpgradeTipsApi.activate(item.id),
    onSuccess: () => {
      toast.success(t.toast_status_updated ?? "Status updated");
      queryClient.invalidateQueries({ queryKey: ["tier-upgrade-tips"] });
    },
    onError: () => toast.error(tCommon.update_failed ?? "Failed to update status"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminTierUpgradeTipsApi.delete(id),
    onSuccess: () => {
      toast.success(t.toast_deleted ?? "Tip deleted");
      queryClient.invalidateQueries({ queryKey: ["tier-upgrade-tips"] });
    },
    onError: () => toast.error(tCommon.delete_failed ?? "Failed to delete"),
  });

  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl">{t.page_title ?? "Tier Upgrade Tips"}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {t.page_description ??
              "Rule-based tips shown to FPOs after they submit a tier assessment. Edit wording anytime — changes are live immediately."}
          </p>
        </div>
        <Button
          className="self-start sm:self-auto bg-blue-700 hover:bg-blue-600"
          onClick={() => setDialog({ open: true, item: null })}
        >
          <Plus className="mr-2 h-4 w-4" />
          {t.btn_add ?? "Add Tip"}
        </Button>
      </div>

      {/* Target tier filter */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-sm">{t.filter_target_tier ?? "Target tier:"}</span>
        {["", "A", "B", "C", "D"].map((tier) => (
          <button
            key={tier || "all"}
            type="button"
            onClick={() => setTargetTierFilter(tier)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              targetTierFilter === tier
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            {tier ? `Tier ${tier}` : t.filter_all ?? "All"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="h-64 w-full animate-pulse rounded-lg bg-muted" />
      ) : rows.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground text-sm">
          {t.empty_message ?? "No tips yet. Click \"Add Tip\" to create the first one."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground text-xs uppercase">
              <tr>
                <th className="px-3 py-2 font-medium">{t.col_question ?? "Question"}</th>
                <th className="px-3 py-2 font-medium">{t.col_trigger ?? "Trigger"}</th>
                <th className="px-3 py-2 font-medium">{t.col_target_tier ?? "Target"}</th>
                <th className="px-3 py-2 font-medium">{t.col_priority ?? "Pri"}</th>
                <th className="px-3 py-2 font-medium">{t.col_tip_en ?? "Tip (EN)"}</th>
                <th className="px-3 py-2 font-medium">{t.col_active ?? "Active"}</th>
                <th className="px-3 py-2 font-medium text-right">{t.col_actions ?? "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2 font-mono text-xs">
                    {row.question_no !== null ? `Q${row.question_no}` : row.criterion_code ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <code className="rounded bg-muted px-1.5 py-0.5">{row.trigger_type}</code>
                  </td>
                  <td className="px-3 py-2">
                    <Badge className={`border ${TIER_COLOR[row.target_tier] ?? ""}`} variant="outline">
                      {row.target_tier}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 tabular-nums">{row.priority}</td>
                  <td className="px-3 py-2 max-w-md">
                    <p className="line-clamp-2">{row.tip_en}</p>
                  </td>
                  <td className="px-3 py-2">
                    <Switch
                      checked={row.is_active}
                      onCheckedChange={() => toggleMutation.mutate(row)}
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDialog({ open: true, item: row })}
                        aria-label={t.action_edit ?? "Edit"}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          confirm({
                            title: t.delete_title ?? "Delete tip",
                            description: t.delete_description ?? "Are you sure? This can't be undone.",
                            onConfirm: () => deleteMutation.mutateAsync(row.id),
                          })
                        }
                        aria-label={t.action_delete ?? "Delete"}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TipDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((prev) => ({ ...prev, open }))}
        editing={dialog.item}
        t={t}
        tCommon={tCommon}
      />
    </div>
  );
}
