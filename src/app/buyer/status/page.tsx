"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { Clock, LogOut, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/stores/auth-store";

export default function BuyerStatusPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const buyerRedirect = useAuthStore((s) => s.buyerRedirect);
  const setBuyerRedirect = useAuthStore((s) => s.setBuyerRedirect);
  const logoutStore = useAuthStore((s) => s.logout);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !isAuthenticated) return;
    // Refresh on every visit so an admin approval in another tab updates
    // the message without a full page reload.
    authApi.me().then((res) => setBuyerRedirect(res.buyer_redirect ?? null));
  }, [mounted, isAuthenticated, setBuyerRedirect]);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated) {
      router.replace("/v1/login");
      return;
    }
    if (buyerRedirect?.status === "verified") {
      router.replace("/buyer/dashboard");
    }
  }, [mounted, isAuthenticated, buyerRedirect, router]);

  if (!mounted || !isAuthenticated) {
    return null;
  }

  const status = buyerRedirect?.status ?? "pending";
  const isRejected = status === "rejected";

  const handleLogout = async () => {
    await authApi.logout().catch(() => null);
    logoutStore();
    router.replace("/v1/login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-lg">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          {isRejected ? (
            <XCircle className="h-14 w-14 text-red-500" />
          ) : (
            <Clock className="h-14 w-14 text-amber-500" />
          )}

          <h1 className="text-2xl font-semibold">
            {isRejected ? "Application Denied" : "Application Under Review"}
          </h1>

          <p className="text-muted-foreground">
            {isRejected
              ? "Your buyer account application has been denied by KAU. Please contact KAU support if you believe this was a mistake."
              : "Thank you for registering. Your buyer account is currently being reviewed by KAU. You will receive an email once your account is verified — this typically takes 1–2 business days."}
          </p>

          <Button variant="outline" onClick={handleLogout} className="mt-4 gap-2">
            <LogOut className="h-4 w-4" />
            Log out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
