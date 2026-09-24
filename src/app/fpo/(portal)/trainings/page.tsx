"use client";

import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin, User, Users } from "lucide-react";

import { fpoTrainingApi } from "@/app/fpo/_api/training";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const PAGE_SIZE = 9;

export default function FpoTrainingSessionsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["fpo-training-sessions", search, page],
    queryFn: () => fpoTrainingApi.getAll({ page, page_size: PAGE_SIZE, search: search || undefined }),
  });

  const sessions = data?.data ?? [];
  const totalCount = data?.meta?.pagination?.total_count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-bold text-2xl">Training Sessions</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">Training sessions scheduled for your FPO</p>
      </div>

      <Input
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
        placeholder="Search by topic..."
        className="max-w-sm"
      />

      {isLoading && (
        <div className="flex h-40 items-center justify-center text-muted-foreground text-sm">Loading...</div>
      )}

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
          Couldn't load training sessions.
        </div>
      )}

      {!isLoading && !isError && sessions.length === 0 && (
        <div className="rounded-lg border p-8 text-center text-muted-foreground text-sm">
          No training sessions scheduled yet.
        </div>
      )}

      {!isLoading && !isError && sessions.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sessions.map((s) => (
              <Card key={s.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug">{s.topic}</CardTitle>
                    <Badge variant="outline" className="shrink-0 text-[11px]">
                      {new Date(s.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-2.5 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarDays className="h-4 w-4 shrink-0" />
                    <span>
                      {new Date(s.date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                      {s.time ? ` · ${s.time}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4 shrink-0" />
                    <span>{s.duration_hours}h duration</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span>{s.venue || "Venue TBD"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4 shrink-0" />
                    <span>{s.trainer_name || "Trainer TBD"}</span>
                  </div>
                  <div className="mt-auto flex items-center justify-between border-t pt-3">
                    <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                      <Users className="h-3.5 w-3.5" />
                      {s.participants_count} participants
                    </div>
                    <span className="text-muted-foreground text-xs">by {s.conducted_by_name}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center justify-between border-t pt-4">
            <p className="text-muted-foreground text-sm">
              Page {page} of {totalPages} · {totalCount} total
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
