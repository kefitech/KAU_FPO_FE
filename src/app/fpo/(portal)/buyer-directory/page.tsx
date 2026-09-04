"use client";

import { useEffect, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

import { buyerDirectoryApi } from "@/app/fpo/_api/buyer-directory";
import { Button } from "@/components/ui/button";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

type T = Record<string, string>;

export default function BuyerDirectoryPage() {
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const queryClient = useQueryClient();

  useEffect(() => {
    translationsApi.getPublic(locale, "fpo_buyer_directory,common").then((data) => {
      setT(data.fpo_buyer_directory ?? {});
    });
  }, [locale]);

  const {
    data: buyerStatus,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["buyer-directory-my-status"],
    queryFn: () => buyerDirectoryApi.getMyStatus(),
  });

  const registerMutation = useMutation({
    mutationFn: () => buyerDirectoryApi.register(),
    onSuccess: () => {
      toast.success(t.toast_registered ?? "Registration request sent successfully.");
      queryClient.invalidateQueries({ queryKey: ["buyer-directory-my-status"] });
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { message?: string } } } | undefined;
      toast.error(
        axiosErr?.response?.data?.message ?? t.toast_register_failed ?? "Failed to register. Please try again.",
      );
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-6 px-3 sm:px-6 py-4 sm:py-6 animate-pulse">
        <div className="w-full max-w-xl h-40 rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-6 px-3 sm:px-6 py-4 sm:py-6 min-h-[80vh]">
      <div className="w-full max-w-xl rounded-xl border bg-card p-6 shadow-sm">
        {!buyerStatus?.registered && (
          <div className="flex flex-col items-center text-center gap-4 py-8">
            <ShoppingCart className="h-10 w-10 text-muted-foreground" />
            <div>
              <h2 className="font-semibold text-lg">{t.not_registered_title ?? "Register as a Buyer"}</h2>
              <p className="mt-1 text-muted-foreground text-sm">
                {t.not_registered_desc ??
                  "Register your FPO as a buyer to purchase products listed by other FPOs on the marketplace."}
              </p>
            </div>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => registerMutation.mutate()}
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending
                ? (t.btn_registering ?? "Registering…")
                : (t.btn_register ?? "Register as a Buyer")}
            </Button>
          </div>
        )}

        {buyerStatus?.registered && buyerStatus.status === "pending" && (
          <div className="flex flex-col items-center text-center gap-4 py-8">
            <Clock className="h-10 w-10 text-amber-500" />
            <div>
              <h2 className="font-semibold text-lg">{t.pending_title ?? "Request Pending"}</h2>
              <p className="mt-1 text-muted-foreground text-sm">
                {t.pending_desc ?? "Your request is pending approval. KAU Admin will review it shortly."}
              </p>
            </div>
          </div>
        )}

        {buyerStatus?.registered && buyerStatus.status === "verified" && (
          <div className="flex flex-col items-center text-center gap-4 py-8">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
            <div>
              <h2 className="font-semibold text-lg">{t.verified_title ?? "Approved!"}</h2>
              <p className="mt-1 text-muted-foreground text-sm">
                {t.verified_desc ?? "Your FPO is approved as a buyer. You can now browse products from other FPOs."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
