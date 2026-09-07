"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { govtTrainingApi } from "@/app/government/_api/training";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function GovernmentTrainingPage() {
  const router = useRouter();
  const [topic, setTopic] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["government", "training-sessions", topic],
    queryFn: () => govtTrainingApi.getAll({ page: 1, page_size: 50, topic: topic || undefined }),
  });

  const sessions = data?.data ?? [];

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl">Training Sessions</h1>
          <p className="mt-0.5 text-muted-foreground text-sm">
            Sessions you&apos;ve conducted for FPOs in your jurisdiction
          </p>
        </div>
        <Button size="sm" onClick={() => router.push("/government/training/new")}>
          <Plus className="mr-1.5 h-4 w-4" />
          New Session
        </Button>
      </div>

      <input
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="Filter by topic..."
        className="h-9 max-w-sm rounded-md border bg-background px-3 text-sm"
      />

      {isLoading && (
        <div className="flex h-40 items-center justify-center text-muted-foreground text-sm">Loading...</div>
      )}
      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
          Couldn&apos;t load training sessions.
        </div>
      )}

      {!isLoading && !isError && (
        <Card>
          <CardContent className="p-0">
            {sessions.length === 0 && (
              <p className="p-6 text-center text-muted-foreground text-sm">No training sessions yet.</p>
            )}
            {sessions.map((s, i) => (
              <div
                key={s.id}
                className={`flex items-center justify-between p-4 ${i !== sessions.length - 1 ? "border-b" : ""}`}
              >
                <div>
                  <p className="font-medium text-sm">{s.topic}</p>
                  <p className="text-muted-foreground text-xs">
                    {s.fpo_name} &middot; {s.district} &middot; {s.date} &middot; {s.duration_hours}h
                  </p>
                </div>
                <Badge variant="outline">{s.attendance_count}/{s.participants_count} attended</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
