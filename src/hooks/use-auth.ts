"use client";

import { useRouter } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/stores/auth-store";
import type { LoginCredentials } from "@/types";

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, setUser, logout: storeLogout } = useAuthStore();

  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
    onSuccess: (data) => {
      if ("user" in data) {
        setUser(data.user);
        toast.success("Login successful");
        const stage = data.redirect?.stage;
        if (stage === "wizard_step" || stage === "verify_email" || stage === "verify_phone" || stage === "upload_documents" || stage === "submit") {
          router.push("/fpo/register");
        } else if (stage === "status") {
          router.push("/fpo/status");
        } else if (stage === "dashboard") {
          router.push("/fpo/dashboard");
        } else {
          router.push("/dashboard");
        }
      }
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Login failed");
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      storeLogout();
      queryClient.clear();
      // Hard navigation, NOT router.push — Next.js keeps route segments in
      // its client cache. If we soft-navigate, pressing Back after logging
      // in as a different role can render the previous user's pages from
      // that cache with no auth re-check. window.location wipes it all.
      window.location.href = "/v1/login";
    },
    onError: () => {
      storeLogout();
      queryClient.clear();
      window.location.href = "/v1/login";
    },
  });

  return {
    user,
    isAuthenticated,
    isLoading: loginMutation.isPending,
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
  };
}
