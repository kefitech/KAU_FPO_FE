"use client";

import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCheck, Clock, Eye, Mail, MessageSquare, MoreHorizontal, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { feedbackApi } from "@/app/admin/_api/feedback";
import type { AdminFeedback } from "@/types/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  AdminFeedback["status"],
  { label: string; className: string; icon: React.ElementType }
> = {
  unread: {
    label: "Unread",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    icon: Clock,
  },
  read: {
    label: "Read",
    className: "bg-muted text-muted-foreground",
    icon: Eye,
  },
  resolved: {
    label: "Resolved",
    className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    icon: CheckCheck,
  },
};

function StatusBadge({ status }: { status: AdminFeedback["status"] }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.unread;
  return (
    <Badge variant="secondary" className={`text-xs gap-1 ${config.className}`}>
      <config.icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

// ─── Detail Dialog ────────────────────────────────────────────────────────────

function FeedbackDetailDialog({
  feedback,
  onClose,
  onStatusChange,
}: {
  feedback: AdminFeedback | null;
  onClose: () => void;
  onStatusChange: (id: number, status: AdminFeedback["status"]) => void;
}) {
  if (!feedback) return null;

  return (
    <Dialog open={!!feedback} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            Feedback from {feedback.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-1">
          {/* Meta */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              {feedback.email}
            </span>
            {feedback.phone && (
              <span>{feedback.phone}</span>
            )}
            <span className="ml-auto text-xs">
              {new Date(feedback.created_at).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>

          {/* Message */}
          <div className="rounded-md border bg-muted/30 px-4 py-3">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{feedback.message}</p>
          </div>

          {/* Status + actions */}
          <div className="flex items-center justify-between border-t pt-3">
            <StatusBadge status={feedback.status} />
            <div className="flex items-center gap-2">
              {feedback.status !== "read" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onStatusChange(feedback.id, "read")}
                >
                  <Eye className="mr-1.5 h-3.5 w-3.5" />
                  Mark as Read
                </Button>
              )}
              {feedback.status !== "resolved" && (
                <Button
                  size="sm"
                  onClick={() => onStatusChange(feedback.id, "resolved")}
                >
                  <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
                  Resolve
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Feedback Tab ─────────────────────────────────────────────────────────────

export function FeedbackTab() {
  const queryClient = useQueryClient();
  const [viewing, setViewing] = useState<AdminFeedback | null>(null);

  const { data: feedbacks = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin-feedback"],
    queryFn: feedbackApi.getAll,
    staleTime: 30_000,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: AdminFeedback["status"] }) =>
      feedbackApi.updateStatus(id, status),
    onSuccess: (updated) => {
      toast.success(`Marked as ${STATUS_CONFIG[updated.status]?.label ?? updated.status}.`);
      queryClient.invalidateQueries({ queryKey: ["admin-feedback"] });
      // Update the viewing dialog if it's the same item
      setViewing((prev) => (prev?.id === updated.id ? updated : prev));
    },
    onError: () => toast.error("Failed to update status."),
  });

  const unreadCount = feedbacks.filter((f) => f.status === "unread").length;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">Feedback</h2>
          {unreadCount > 0 && (
            <Badge className="bg-blue-600 text-white text-xs">{unreadCount} unread</Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Table */}
      <div className={`rounded-lg border transition-opacity ${isFetching && !isLoading ? "opacity-60" : ""}`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : feedbacks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground text-sm">
                  No feedback submitted yet.
                </TableCell>
              </TableRow>
            ) : (
              feedbacks.map((fb) => (
                <TableRow
                  key={fb.id}
                  className={`cursor-pointer hover:bg-muted/50 ${fb.status === "unread" ? "font-medium" : ""}`}
                  onClick={() => setViewing(fb)}
                >
                  <TableCell className="text-sm">{fb.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{fb.email}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs">
                    <span className="line-clamp-1">{fb.message}</span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={fb.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(fb.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewing(fb)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        {fb.status !== "read" && (
                          <DropdownMenuItem
                            onClick={() => statusMutation.mutate({ id: fb.id, status: "read" })}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Mark as Read
                          </DropdownMenuItem>
                        )}
                        {fb.status !== "resolved" && (
                          <DropdownMenuItem
                            onClick={() => statusMutation.mutate({ id: fb.id, status: "resolved" })}
                          >
                            <CheckCheck className="mr-2 h-4 w-4" />
                            Resolve
                          </DropdownMenuItem>
                        )}
                        {fb.status !== "unread" && (
                          <DropdownMenuItem
                            onClick={() => statusMutation.mutate({ id: fb.id, status: "unread" })}
                          >
                            <Clock className="mr-2 h-4 w-4" />
                            Mark as Unread
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <FeedbackDetailDialog
        feedback={viewing}
        onClose={() => setViewing(null)}
        onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
      />
    </div>
  );
}
