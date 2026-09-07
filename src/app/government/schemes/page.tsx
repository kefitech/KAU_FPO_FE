"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { govtSchemesApi } from "@/app/government/_api/schemes";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function GovernmentSchemesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["government", "schemes", search],
    queryFn: () => govtSchemesApi.getAll({ page: 1, page_size: 50, search: search || undefined }),
  });

  const schemes = data?.data ?? [];

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl">Schemes &amp; Subsidies</h1>
          <p className="mt-0.5 text-muted-foreground text-sm">Manage scheme catalog entries</p>
        </div>
        <Button size="sm" onClick={() => router.push("/government/schemes/new")}>
          <Plus className="mr-1.5 h-4 w-4" />
          New Scheme
        </Button>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search schemes..."
        className="h-9 max-w-sm rounded-md border bg-background px-3 text-sm"
      />

      {isLoading && (
        <div className="flex h-40 items-center justify-center text-muted-foreground text-sm">Loading...</div>
      )}
      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
          Couldn&apos;t load schemes.
        </div>
      )}

      {!isLoading && !isError && (
        <Card>
          <CardContent className="p-0">
            {schemes.length === 0 && (
              <p className="p-6 text-center text-muted-foreground text-sm">No schemes found.</p>
            )}
            {schemes.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => router.push(`/government/schemes/${s.id}/edit`)}
                className={`flex w-full items-center justify-between p-4 text-left hover:bg-muted/50 ${
                  i !== schemes.length - 1 ? "border-b" : ""
                }`}
              >
                <div>
                  <p className="font-medium text-sm">{s.name_en}</p>
                  <p className="text-muted-foreground text-xs">{s.administering_body}</p>
                </div>
                <Badge variant="outline">{s.category_display}</Badge>
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
