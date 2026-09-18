"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Star } from "lucide-react";

import type { RecommendationFeedbackItem } from "@/app/admin/_api/ml-models";

export function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-3.5 w-3.5 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
        />
      ))}
    </div>
  );
}

export function getFeedbackColumns(): ColumnDef<RecommendationFeedbackItem>[] {
  return [
    {
      accessorKey: "fpo_name",
      header: "FPO",
      cell: ({ row }) => <span className="font-medium">{row.original.fpo_name}</span>,
    },
    {
      accessorKey: "feedback_rating",
      header: "Rating",
      cell: ({ row }) => <StarDisplay rating={row.original.feedback_rating} />,
    },
    {
      accessorKey: "feedback_comment",
      header: "Comment",
      meta: { hideOnMobile: true },
      cell: ({ row }) =>
        row.original.feedback_comment ? (
          <span className="block max-w-xs truncate text-muted-foreground" title={row.original.feedback_comment}>
            {row.original.feedback_comment}
          </span>
        ) : (
          <span className="text-muted-foreground italic">No comment</span>
        ),
    },
    {
      accessorKey: "crops",
      header: "Crops recommended",
      meta: { hideOnMobile: true },
      cell: ({ row }) => {
        const crops = row.original.crops;
        const shown = crops.slice(0, 3).join(", ");
        const remaining = crops.length - 3;
        return (
          <span className="block max-w-xs truncate text-muted-foreground" title={crops.join(", ")}>
            {shown}
            {remaining > 0 ? ` +${remaining} more` : ""}
          </span>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: "Date",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{new Date(row.original.created_at).toLocaleDateString()}</span>
      ),
    },
  ];
}