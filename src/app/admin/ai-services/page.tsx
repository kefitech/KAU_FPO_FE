"use client";

/**
 * AI Services admin — per-feature provider config, budget cap, monthly usage.
 *
 * Per KAU RCD B.5 (2026-09-03). Grid of compact summary cards — click any
 * card to open the full-detail editor dialog (provider, model, key, cap,
 * alert threshold, USD→INR rate).
 *
 * Switching provider (Claude / OpenAI / Gemini / Mock) is a config change
 * here — no code deploy. The `llm_gateway.py` backend dispatches to the
 * right SDK by reading `AIServiceConfig.provider` on every call.
 *
 * Author: Athul Gopan (Kefi Tech Solutions)
 */

import { useMemo, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowLeft,
  Ban,
  Bot,
  KeyRound,
  Loader2,
  RefreshCw,
  Save,
  Settings2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import {
  aiServicesApi,
  type AIProvider,
  type AIProviderInfo,
  type AIServiceConfigInput,
  type AIServiceConfigRow,
} from "@/app/admin/_api/ai-services";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useConfirmStore } from "@/stores/confirm-store";

// ── Page ───────────────────────────────────────────────────────────────────

type DialogState =
  | { mode: "closed" }
  | { mode: "edit"; row: AIServiceConfigRow };

export default function AdminAIServicesPage() {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<DialogState>({ mode: "closed" });

  const { data: services, isLoading } = useQuery({
    queryKey: ["admin-ai-services"],
    queryFn: () => aiServicesApi.list(),
  });
  const { data: providerInfo } = useQuery({
    queryKey: ["admin-ai-services-providers"],
    queryFn: () => aiServicesApi.providers(),
    staleTime: 5 * 60 * 1000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-ai-services"] });

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/dashboard">
            <ArrowLeft className="mr-1 h-4 w-4" /> Dashboard
          </Link>
        </Button>
      </div>

      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-bold text-2xl">AI Services</h1>
          <p className="mt-0.5 max-w-3xl text-sm text-muted-foreground">
            Per-feature provider config, budget cap, and monthly usage. Switching provider
            (Claude / OpenAI / Gemini) is done here — no code deploy needed. All API keys are
            encrypted at rest.
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading services…
        </div>
      )}

      {services && providerInfo && (
        <div className="grid gap-4 md:grid-cols-2">
          {services.map((svc) => (
            <ServiceSummaryCard
              key={svc.id}
              row={svc}
              providerInfo={providerInfo}
              onClick={() => setDialog({ mode: "edit", row: svc })}
            />
          ))}
        </div>
      )}

      {providerInfo && (
        <ServiceEditDialog
          state={dialog}
          providerInfo={providerInfo}
          onClose={() => setDialog({ mode: "closed" })}
          onSaved={invalidate}
        />
      )}
    </div>
  );
}

// ── Summary card ───────────────────────────────────────────────────────────
// Compact — service label, provider chip, status, this-month cost. Click
// anywhere to open the full editor dialog. Deliberately dense so all 4
// services fit above the fold on a laptop.

function ServiceSummaryCard({
  row,
  providerInfo,
  onClick,
}: {
  row: AIServiceConfigRow;
  providerInfo: AIProviderInfo;
  onClick: () => void;
}) {
  const providerLabel =
    providerInfo.providers.find((p) => p.value === row.provider)?.label ?? row.provider;
  const modelDisplay = row.model_name || "(provider default)";

  const budgetPct = row.budget_usage_pct;
  const isOverCap = budgetPct !== null && budgetPct >= 100;
  const isNearCap = budgetPct !== null && budgetPct >= row.alert_at_pct;

  const iconFor = (svc: string) => {
    if (svc === "dpr_narratives") return <Sparkles className="h-5 w-5" />;
    if (svc === "chatbot") return <Bot className="h-5 w-5" />;
    return <Settings2 className="h-5 w-5" />;
  };

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="cursor-pointer transition hover:border-primary/50 hover:shadow-sm"
    >
      <CardContent className="space-y-4 p-5">
        {/* Top row: icon + title + status pills */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              {iconFor(row.service)}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold">{row.service_display}</h3>
              <p className="text-[10px] text-muted-foreground">
                <code>{row.service}</code>
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {row.is_enabled ? (
              <Badge variant="secondary" className="text-[10px]">Enabled</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                Disabled
              </Badge>
            )}
            {row.auto_disabled_at && (
              <Badge variant="destructive" className="text-[10px]">
                Budget cap hit
              </Badge>
            )}
          </div>
        </div>

        {/* Provider + model — the most-important config */}
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">Provider</span>
            <Badge
              variant={row.provider === "mock" ? "outline" : "secondary"}
              className="text-[10px]"
            >
              {providerLabel}
            </Badge>
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">Model</span>
            <code className="max-w-[60%] truncate text-right text-[11px]">
              {modelDisplay}
            </code>
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">API key</span>
            <span className={cn("text-[11px]", !row.api_key_masked && "text-amber-700 dark:text-amber-400")}>
              {row.api_key_masked
                ? "•••••••• set"
                : row.provider === "mock"
                  ? "not needed (mock)"
                  : "not set"}
            </span>
          </div>
        </div>

        {/* Usage strip */}
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Activity className="h-3 w-3" />
            <span>This month</span>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "font-medium tabular-nums",
                isOverCap
                  ? "text-destructive"
                  : isNearCap
                    ? "text-amber-700 dark:text-amber-400"
                    : "",
              )}
            >
              ₹ {Number(row.current_month_cost_inr).toLocaleString("en-IN")}
              {budgetPct !== null && (
                <span className="ml-1 text-[10px] text-muted-foreground">
                  ({budgetPct}%)
                </span>
              )}
            </span>
            <span className="text-muted-foreground">
              {row.current_month_calls} calls
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end">
          <span className="text-[11px] text-primary">
            Click to configure →
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Editor dialog ──────────────────────────────────────────────────────────

function ServiceEditDialog({
  state,
  providerInfo,
  onClose,
  onSaved,
}: {
  state: DialogState;
  providerInfo: AIProviderInfo;
  onClose: () => void;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const open = state.mode !== "closed";
  const row = state.mode === "edit" ? state.row : null;

  const [form, setForm] = useState<AIServiceConfigInput>(() => defaultForm());
  const [keyTouched, setKeyTouched] = useState(false);

  // Reset the form buffer whenever the dialog opens on a new row.
  const rowKey = row ? `${row.id}:${row.updated_at}` : "";
  const resetRef = useMemo(() => ({ key: "" }), []);
  if (open && row && resetRef.key !== rowKey) {
    resetRef.key = rowKey;
    const seeded = rowToForm(row);
    // Backfill empty model_name with provider default so <Select> has a
    // real value to highlight.
    if (!seeded.model_name) {
      const providerDefault = providerInfo.providers.find(
        (p) => p.value === seeded.provider,
      )?.default_model;
      if (providerDefault) seeded.model_name = providerDefault;
    }
    setForm(seeded);
    setKeyTouched(false);
  }
  if (!open && resetRef.key !== "") {
    resetRef.key = "";
  }

  const updateMutation = useMutation({
    mutationFn: (patch: AIServiceConfigInput) => {
      if (!row) return Promise.reject(new Error("no row"));
      return aiServicesApi.update(row.id, patch);
    },
    onSuccess: (envelope) => {
      onSaved();
      // Use the backend-supplied message so wording lives in one place
      // (StandardResponse.success at the API layer).
      toast.success(envelope.message || "Saved.");
      onClose();
    },
    onError: (err) => {
      console.warn("[AI service save]", err);
      toast.error("Failed to save. Check the values and try again.");
    },
  });

  const resetUsageMutation = useMutation({
    mutationFn: () => {
      if (!row) return Promise.reject(new Error("no row"));
      return aiServicesApi.resetUsage(row.id);
    },
    onSuccess: (envelope) => {
      onSaved();
      qc.invalidateQueries({ queryKey: ["admin-ai-services"] });
      toast.success(envelope.message || "Monthly usage reset.");
    },
    onError: () => toast.error("Reset failed."),
  });

  if (!row) {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent />
      </Dialog>
    );
  }

  const modelsForProvider =
    providerInfo.models_by_provider[form.provider ?? row.provider] ?? [];

  function handleSave() {
    const patch: AIServiceConfigInput = { ...form };
    if (!keyTouched) delete patch.api_key;
    updateMutation.mutate(patch);
  }

  const budgetPct = row.budget_usage_pct;
  const isOverCap = budgetPct !== null && budgetPct >= 100;
  const isNearCap = budgetPct !== null && budgetPct >= row.alert_at_pct;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !updateMutation.isPending) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure — {row.service_display}</DialogTitle>
          <DialogDescription>
            Switch provider, set the model, paste the API key, and cap the monthly spend.
            Changes take effect on the next AI call.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Enabled toggle */}
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Feature enabled</p>
              <p className="text-[11px] text-muted-foreground">
                When off, callers get a fallback / placeholder response.
              </p>
            </div>
            <Switch
              checked={form.is_enabled ?? row.is_enabled}
              onCheckedChange={(v) => setForm((f) => ({ ...f, is_enabled: v }))}
            />
          </div>

          {/* Provider + Model */}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="min-w-0 space-y-1.5">
              <Label className="text-xs">Provider</Label>
              <Select
                value={form.provider ?? row.provider}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    provider: v as AIProvider,
                    model_name:
                      providerInfo.providers.find((p) => p.value === v)?.default_model ??
                      "",
                  }))
                }
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Pick a provider" />
                </SelectTrigger>
                <SelectContent>
                  {providerInfo.providers.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label className="text-xs">Model</Label>
              {modelsForProvider.length > 0 ? (
                <Select
                  value={form.model_name ?? row.model_name ?? ""}
                  onValueChange={(v) => setForm((f) => ({ ...f, model_name: v }))}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="(provider default)" />
                  </SelectTrigger>
                  <SelectContent>
                    {modelsForProvider.map((m) => (
                      <SelectItem key={m.model} value={m.model}>
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-xs">{m.model}</span>
                          <span className="text-[10px] text-muted-foreground">
                            ${m.input_usd_per_mtoken}/${m.output_usd_per_mtoken} per Mtok
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="No known models — enter free-form"
                  value={form.model_name ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, model_name: e.target.value }))}
                />
              )}
            </div>
          </div>

          {/* API key */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1 text-xs">
              <KeyRound className="h-3 w-3" /> API key
            </Label>
            <Input
              type="password"
              placeholder={
                row.api_key_masked
                  ? "•••••••• (key set — leave blank to keep)"
                  : "Paste API key"
              }
              value={form.api_key ?? ""}
              onChange={(e) => {
                setForm((f) => ({ ...f, api_key: e.target.value }));
                setKeyTouched(true);
              }}
              autoComplete="off"
            />
            <p className="text-[10px] text-muted-foreground">
              {row.api_key_masked
                ? "Leave blank to keep the existing key. Type a new key to replace it."
                : "Required for real providers (Anthropic / OpenAI / Google). Not needed for mock."}
            </p>
          </div>

          {/* Budget row */}
          <div className="grid gap-3 md:grid-cols-3">
            <div className="min-w-0 space-y-1.5">
              <Label className="text-xs">Monthly cap (₹)</Label>
              <Input
                type="number"
                min="0"
                placeholder="0 = no cap"
                value={form.monthly_cap_inr ?? row.monthly_cap_inr}
                onChange={(e) => setForm((f) => ({ ...f, monthly_cap_inr: e.target.value }))}
              />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label className="text-xs">Alert at % of cap</Label>
              <Input
                type="number"
                min="1"
                max="100"
                value={form.alert_at_pct ?? row.alert_at_pct}
                onChange={(e) =>
                  setForm((f) => ({ ...f, alert_at_pct: Number(e.target.value) }))
                }
              />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label className="text-xs">USD → INR rate</Label>
              <Input
                type="number"
                step="0.01"
                value={form.usd_to_inr_rate ?? row.usd_to_inr_rate}
                onChange={(e) => setForm((f) => ({ ...f, usd_to_inr_rate: e.target.value }))}
              />
            </div>
          </div>

          {/* Usage summary */}
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <span className="text-muted-foreground">This month cost: </span>
                  <span
                    className={cn(
                      "font-semibold",
                      isOverCap
                        ? "text-destructive"
                        : isNearCap
                          ? "text-amber-700 dark:text-amber-400"
                          : "",
                    )}
                  >
                    ₹ {Number(row.current_month_cost_inr).toLocaleString("en-IN")}
                  </span>
                  {budgetPct !== null && (
                    <span className="ml-1 text-muted-foreground">({budgetPct}%)</span>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground">Tokens: </span>
                  <span className="font-mono">
                    {row.current_month_tokens.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Calls: </span>
                  <span className="font-mono">{row.current_month_calls}</span>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                disabled={resetUsageMutation.isPending}
                onClick={() => {
                  useConfirmStore.getState().confirm({
                    title: "Reset monthly usage?",
                    description:
                      "This clears current-month totals for cost, tokens, and calls. " +
                      "If the service was auto-disabled because it hit its budget cap, " +
                      "it will be re-enabled.",
                    confirmLabel: "Reset usage",
                    confirmingLabel: "Resetting…",
                    variant: "default",
                    onConfirm: () => resetUsageMutation.mutateAsync(),
                  });
                }}
              >
                <RefreshCw className="mr-1 h-3 w-3" /> Reset usage
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setForm(rowToForm(row));
              setKeyTouched(false);
            }}
            disabled={updateMutation.isPending}
          >
            <Ban className="mr-1 h-3.5 w-3.5" /> Revert
          </Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1 h-4 w-4" />
            )}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function rowToForm(row: AIServiceConfigRow): AIServiceConfigInput {
  return {
    is_enabled: row.is_enabled,
    provider: row.provider,
    model_name: row.model_name,
    monthly_cap_inr: row.monthly_cap_inr,
    alert_at_pct: row.alert_at_pct,
    usd_to_inr_rate: row.usd_to_inr_rate,
  };
}

function defaultForm(): AIServiceConfigInput {
  return {
    is_enabled: true,
    provider: "mock",
    model_name: "",
    monthly_cap_inr: "0",
    alert_at_pct: 80,
    usd_to_inr_rate: "84",
  };
}
