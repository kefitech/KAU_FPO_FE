"use client";

import { useEffect, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { subAdminConfigApi } from "@/app/admin/_api/sub-admins";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KERALA_DISTRICTS } from "@/lib/kerala-districts";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";
import type { SubAdminConfigPayload } from "@/types/admin";

type T = Record<string, string>;

export default function SubAdminSettingsPage() {
  const queryClient = useQueryClient();
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});

  const [globalCap,      setGlobalCap]     = useState<string>("30");
  const [schemeDays,     setSchemeDays]    = useState<string>("5");
  const [trainingDays,   setTrainingDays]  = useState<string>("5");
  const [overrides,      setOverrides]     = useState<Record<string, string>>({});
  const [newOverrideCode, setNewOverrideCode] = useState<string>("");
  const [newOverrideValue, setNewOverrideValue] = useState<string>("");

  useEffect(() => {
    translationsApi
      .getPublic(locale, "admin_sub_admin_settings,common")
      .then((data) => {
        setT(data.admin_sub_admin_settings ?? {});
        setTCommon(data.common ?? {});
      })
      .catch(() => undefined);
  }, [locale]);

  const { data, isLoading } = useQuery({
    queryKey: ["sub-admin-config"],
    queryFn: subAdminConfigApi.get,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!data) return;
    setGlobalCap(String(data.global_cap));
    setSchemeDays(String(data.scheme_expiry_days));
    setTrainingDays(String(data.training_expiry_days));
    setOverrides(
      Object.fromEntries(Object.entries(data.district_caps).map(([code, val]) => [code, String(val)])),
    );
  }, [data]);

  const patchMutation = useMutation({
    mutationFn: (payload: SubAdminConfigPayload) => subAdminConfigApi.patch(payload),
    onSuccess: () => {
      toast.success(t.toast_saved ?? "Settings saved.");
      queryClient.invalidateQueries({ queryKey: ["sub-admin-config"] });
      queryClient.invalidateQueries({ queryKey: ["sub-admin-district-cap-status"] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? tCommon.save_failed ?? "Save failed.");
    },
  });

  function handleSaveAll() {
    const payload: SubAdminConfigPayload = {
      global_cap:            Number(globalCap) || 30,
      scheme_expiry_days:    Number(schemeDays) || 0,
      training_expiry_days:  Number(trainingDays) || 0,
      district_caps: Object.fromEntries(
        Object.entries(overrides).map(([code, val]) => [code, val ? Number(val) : 0]),
      ),
    };
    patchMutation.mutate(payload);
  }

  function handleAddOverride() {
    if (!newOverrideCode || !newOverrideValue) return;
    setOverrides((s) => ({ ...s, [newOverrideCode]: newOverrideValue }));
    setNewOverrideCode("");
    setNewOverrideValue("");
  }

  function handleRemoveOverride(code: string) {
    setOverrides((s) => {
      const next = { ...s };
      delete next[code];
      return next;
    });
    // Nullify server-side immediately so the change persists even without Save-All.
    patchMutation.mutate({ district_caps: { [code]: null } });
  }

  const availableCodes = KERALA_DISTRICTS.filter((d) => !(d.code in overrides));

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-6">
      <div>
        <h1 className="font-bold text-2xl">{t.page_title ?? "Sub-Admin Settings"}</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">
          {t.page_description ??
            "Configure the sub-admin cap per district and how many days after deadline schemes/trainings auto-expire."}
        </p>
      </div>

      {isLoading ? (
        <div className="h-40 w-full animate-pulse rounded-lg bg-muted" />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.section_caps ?? "Sub-Admin Caps"}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="global-cap">{t.global_cap ?? "Global default cap"}</Label>
                  <Input
                    id="global-cap"
                    type="number"
                    min={1}
                    value={globalCap}
                    onChange={(e) => setGlobalCap(e.target.value)}
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {t.global_cap_hint ?? "Applies to any district without a specific override."}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label>{t.overrides ?? "Per-district overrides"}</Label>
                {Object.keys(overrides).length === 0 ? (
                  <p className="text-muted-foreground text-xs">
                    {t.overrides_empty ?? "No overrides. All districts use the global cap."}
                  </p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {Object.entries(overrides)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([code, val]) => {
                        const name = KERALA_DISTRICTS.find((d) => d.code === code)?.name ?? code;
                        return (
                          <li key={code} className="flex items-center gap-2 rounded-md border px-3 py-1.5">
                            <span className="font-mono text-xs">{code}</span>
                            <span className="text-muted-foreground text-xs">{name}</span>
                            <Input
                              type="number"
                              min={0}
                              value={val}
                              onChange={(e) =>
                                setOverrides((s) => ({ ...s, [code]: e.target.value }))
                              }
                              className="ml-auto h-8 w-24"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleRemoveOverride(code)}
                              aria-label={t.remove_override ?? "Remove override"}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </li>
                        );
                      })}
                  </ul>
                )}

                <div className="flex flex-wrap items-end gap-2 rounded-md border border-dashed p-2">
                  <div>
                    <Label className="text-[11px]">{t.add_district ?? "Add district"}</Label>
                    <select
                      value={newOverrideCode}
                      onChange={(e) => setNewOverrideCode(e.target.value)}
                      className="h-8 rounded-md border bg-background px-2 text-sm"
                    >
                      <option value="">{t.select_district ?? "Select…"}</option>
                      {availableCodes.map((d) => (
                        <option key={d.code} value={d.code}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-[11px]">{t.cap ?? "Cap"}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={newOverrideValue}
                      onChange={(e) => setNewOverrideValue(e.target.value)}
                      className="h-8 w-24"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={handleAddOverride}
                    disabled={!newOverrideCode || !newOverrideValue}
                  >
                    {t.add ?? "Add"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.section_expiry ?? "Auto-Expiry Windows"}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="scheme-days">{t.scheme_expiry_days ?? "Scheme expiry (days after deadline)"}</Label>
                <Input
                  id="scheme-days"
                  type="number"
                  min={0}
                  value={schemeDays}
                  onChange={(e) => setSchemeDays(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="training-days">{t.training_expiry_days ?? "Training expiry (days after date)"}</Label>
                <Input
                  id="training-days"
                  type="number"
                  min={0}
                  value={trainingDays}
                  onChange={(e) => setTrainingDays(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveAll} disabled={patchMutation.isPending}>
              {patchMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {t.save_btn ?? "Save Settings"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
