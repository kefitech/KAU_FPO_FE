"use client";

import { ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** The ghost "‹ Back" control the admin layout shows above every page except the dashboard. */
export function BackButton({
  onClick,
  label = "Back",
  className,
}: {
  onClick: () => void;
  label?: string;
  className?: string;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("-ml-2 gap-1 text-muted-foreground hover:text-foreground", className)}
      onClick={onClick}
    >
      <ChevronLeft className="h-4 w-4" />
      {label}
    </Button>
  );
}
