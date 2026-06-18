"use client";

import { useCallback } from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { DataTableParams } from "@/types/pagination";

interface UseDataTableOptions {
  defaultPageSize?: number;
}

export function useDataTable({ defaultPageSize = 10 }: UseDataTableOptions = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = Number(searchParams.get("page") ?? 1);
  const page_size = Number(searchParams.get("page_size") ?? defaultPageSize);
  const search = searchParams.get("search") ?? "";
  const ordering = searchParams.get("ordering") ?? "";

  const updateParams = useCallback(
    (updates: Partial<DataTableParams>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === "" || value === undefined || value === null) {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      });

      // Reset to page 1 on search/filter/ordering change
      if ("search" in updates || "ordering" in updates) {
        params.set("page", "1");
      }

      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const setPage = (p: number) => updateParams({ page: p });
  const setPageSize = (s: number) => updateParams({ page_size: s, page: 1 });
  const setSearch = (s: string) => updateParams({ search: s });
  const setOrdering = (o: string) => updateParams({ ordering: o });
  const setFilter = (key: string, value: string) => updateParams({ [key]: value, page: 1 });

  return {
    params: { page, page_size, search, ordering },
    setPage,
    setPageSize,
    setSearch,
    setOrdering,
    setFilter,
    searchParams,
  };
}
