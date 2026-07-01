"use client";

import { Construction } from "lucide-react";

interface Props {
  title?: string;
  description?: string;
}

export function ComingSoon({
  title = "Feature Coming Soon",
  description = "This section is currently under implementation. Check back soon.",
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 text-center px-4">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted">
        <Construction className="w-8 h-8 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-1.5 max-w-sm">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted px-4 py-2 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        Under Implementation
      </div>
    </div>
  );
}
