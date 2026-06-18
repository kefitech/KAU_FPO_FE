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
        router.push("/dashboard");
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
      router.push("/v1/login");
    },
    onError: () => {
      storeLogout();
      queryClient.clear();
      router.push("/v1/login");
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
