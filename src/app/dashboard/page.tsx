"use client";

import { useQuery } from "@tanstack/react-query";

import { authApi } from "@/lib/api/auth";

export default function DashboardPage() {
  const { data } = useQuery({
    queryKey: ["auth-me"],
    queryFn: authApi.me,
    staleTime: 5 * 60 * 1000,
  });

  const user = data?.user;

  return (
    <div className="flex h-svh items-center justify-center">
      <div className="text-center">
        <h1 className="font-bold text-2xl">Welcome{user?.first_name ? `, ${user.first_name}` : ""}</h1>
        <p className="mt-1 text-muted-foreground text-sm">KAU-FPO Platform</p>
      </div>
    </div>
  );
}
