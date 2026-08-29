"use client";

import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { FileBarChart, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type DprProject, type DprStatus, dprApi } from "@/lib/api/dpr";

// ── Status badge ────────────────────────────────────────────────────────────

const STATUS_META: Record<DprStatus, { label: string; variant: "secondary" | "default" | "outline" }> = {
  draft: { label: "Draft", variant: "secondary" },
  in_progress: { label: "In Progress", variant: "default" },
  submitted: { label: "Submitted", variant: "outline" },
  generated: { label: "PDF Generated", variant: "outline" },
};

function DprStatusBadge({ status }: { status: DprStatus }) {
  const meta = STATUS_META[status] ?? { label: status, variant: "secondary" };
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

// ── Project card ────────────────────────────────────────────────────────────

function DprProjectCard({ project }: { project: DprProject }) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-tight line-clamp-2">
            {project.title || "Untitled DPR"}
          </CardTitle>
          <DprStatusBadge status={project.status} />
        </div>
      </CardHeader>
      <CardContent className="flex-1 text-xs text-muted-foreground">
        Last updated {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
      </CardContent>
      <CardFooter className="pt-3">
        <Button asChild className="w-full" size="sm">
          <Link href={`/fpo/dpr/${project.uuid}`}>Open DPR</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

// ── New DPR dialog ──────────────────────────────────────────────────────────

function NewDprDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");

  const createMutation = useMutation({
    mutationFn: () => dprApi.createProject({ title: title.trim() }),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["dpr-projects"] });
      toast.success("DPR project created");
      setTitle("");
      onOpenChange(false);
      router.push(`/fpo/dpr/${project.uuid}`);
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message ?? "Failed to create DPR project");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New DPR Project</DialogTitle>
          <DialogDescription>
            Give your project a working title. You can change it anytime.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="dpr-title">Project title</Label>
          <Input
            id="dpr-title"
            placeholder="e.g. Rice Milling Unit — 500 kg/hr"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={createMutation.isPending}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={createMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating…" : "Create DPR"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function DprProjectsListPage() {
  const [newDialogOpen, setNewDialogOpen] = useState(false);

  const { data: projects, isLoading, error } = useQuery({
    queryKey: ["dpr-projects"],
    queryFn: dprApi.listProjects,
    staleTime: 30_000,
  });

  return (
    <div className="flex flex-col gap-6 px-3 sm:px-6 py-4 sm:py-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-bold text-2xl">DPR Projects</h1>
          <p className="mt-0.5 text-muted-foreground text-sm">
            Detailed Project Reports — create, edit, and generate reports for your FPO enterprises.
          </p>
        </div>
        <Button onClick={() => setNewDialogOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          New DPR
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 w-3/4 rounded bg-muted" />
                <div className="mt-2 h-4 w-1/3 rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="h-3 w-1/2 rounded bg-muted" />
              </CardContent>
              <CardFooter>
                <div className="h-8 w-full rounded bg-muted" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
          <p className="text-destructive text-sm">Failed to load projects.</p>
          <p className="text-muted-foreground text-xs">
            {(error as { message?: string })?.message ?? "Unknown error"}
          </p>
        </div>
      ) : !projects || projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <FileBarChart className="h-10 w-10 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">No DPR projects yet</p>
            <p className="text-muted-foreground text-xs mt-0.5">
              Create your first Detailed Project Report to get started.
            </p>
          </div>
          <Button size="sm" onClick={() => setNewDialogOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Create your first DPR
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <DprProjectCard key={project.uuid} project={project} />
          ))}
        </div>
      )}

      <NewDprDialog open={newDialogOpen} onOpenChange={setNewDialogOpen} />
    </div>
  );
}
