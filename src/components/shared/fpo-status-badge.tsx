import { Badge } from "@/components/ui/badge";

// FPO application status → badge colours (CBBO + government dashboard FPO lists)
const FPO_STATUS_STYLES: Record<string, string> = {
  draft: "border-muted text-muted-foreground",
  submitted: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  under_review: "border-yellow-500/40 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  info_required: "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-400",
  approved: "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400",
  rejected: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400",
  suspended: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400",
  claimed: "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-400",
};

/** `status` is the FPO status code (e.g. "approved"); `label` is what to show. */
export function FpoStatusBadge({ status, label }: { status?: string; label: string }) {
  const style = FPO_STATUS_STYLES[status ?? ""] ?? "border-muted text-muted-foreground";
  return (
    <Badge variant="outline" className={`text-[11px] ${style}`}>
      {label}
    </Badge>
  );
}
