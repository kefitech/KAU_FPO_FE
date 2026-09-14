"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";

import { cbbosApi } from "@/app/admin/_api/cbbos";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

type T = Record<string, string>;

export default function PendingCBBOApprovalsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});

  useEffect(() => {
    translationsApi
      .getPublic(locale, "cbbo_pending")
      .then((data) => setT(data.cbbo_pending ?? {}))
      .catch(() => undefined);
  }, [locale]);

  const {
    data: pending,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["cbbos", "pending"],
    queryFn: () => cbbosApi.getPending(),
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => cbbosApi.approveRegistration(id),
    onSuccess: () => {
      toast.success(t.toast_approved ?? "Registration approved");
      queryClient.invalidateQueries({ queryKey: ["cbbos", "pending"] });
      queryClient.invalidateQueries({ queryKey: ["cbbos"] });
    },
    onError: () => toast.error(t.toast_approve_failed ?? "Failed to approve"),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: number) => cbbosApi.rejectRegistration(id),
    onSuccess: () => {
      toast.success(t.toast_rejected ?? "Registration rejected");
      queryClient.invalidateQueries({ queryKey: ["cbbos", "pending"] });
    },
    onError: () => toast.error(t.toast_reject_failed ?? "Failed to reject"),
  });

  return (
    <div className="flex flex-col gap-6 py-6">
      <button
        type="button"
        onClick={() => router.push("/admin/cbbos")}
        className="flex w-fit items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> {t.back_button ?? "Back to CBBO / NGO Officers"}
      </button>

      <div>
        <h1 className="font-bold text-2xl">{t.page_title ?? "Pending Approvals"}</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">
          {t.page_description ?? "Self-registered CBBO / NGO officers awaiting review"}
        </p>
      </div>

      {isLoading && (
        <div className="flex h-40 items-center justify-center text-muted-foreground text-sm">
          {t.loading ?? "Loading..."}
        </div>
      )}
      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
          {t.error_load ?? "Couldn't load pending registrations."}
        </div>
      )}

      {!isLoading && !isError && (
        <Card>
          <CardContent className="p-0">
            {(pending?.length ?? 0) === 0 && (
              <p className="p-6 text-center text-muted-foreground text-sm">
                {t.empty_state ?? "No pending registrations."}
              </p>
            )}
            {pending?.map((officer, i) => (
              <div
                key={officer.id}
                className={`flex items-center justify-between p-4 ${i !== pending.length - 1 ? "border-b" : ""}`}
              >
                <div>
                  <p className="font-medium text-sm">
                    {officer.first_name} {officer.last_name}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {officer.email} &middot; {officer.phone}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    {officer.organisation_name && (
                      <Badge variant="outline" className="text-[10px]">
                        {officer.organisation_name}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[10px]">
                      {officer.scope === "STATE"
                        ? (t.state_wide_label ?? "State-wide")
                        : Array.isArray(officer.scope)
                          ? officer.scope.join(", ")
                          : officer.scope}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => rejectMutation.mutate(officer.id)}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                  >
                    {t.reject_button ?? "Reject"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => approveMutation.mutate(officer.id)}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                  >
                    {t.approve_button ?? "Approve"}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
