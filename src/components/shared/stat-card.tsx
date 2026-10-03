import { Skeleton } from "@/components/ui/skeleton";

/**
 * Gradient KPI tile used across the portal dashboards (same look as the admin
 * dashboard's cards). `value` undefined renders a skeleton; numbers are
 * locale-formatted, strings (e.g. "85%") are shown as-is.
 */
export type StatCardVariant = "blue" | "purple" | "green" | "amber" | "red" | "gray";

const CARD_VARIANTS: Record<StatCardVariant, string> = {
  blue: "from-blue-500 to-indigo-600",
  purple: "from-violet-500 to-purple-600",
  green: "from-emerald-500 to-green-600",
  amber: "from-amber-400 to-orange-500",
  red: "from-red-500 to-rose-600",
  gray: "from-slate-400 to-slate-500",
};

export function StatCard({
  title,
  value,
  icon: Icon,
  variant = "gray",
  description,
}: {
  title: string;
  value: number | string | undefined;
  icon: React.ElementType;
  variant?: StatCardVariant;
  description?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${CARD_VARIANTS[variant]} p-5 text-white shadow-sm`}
    >
      <div className="pointer-events-none absolute -top-5 -right-5 h-24 w-24 rounded-full bg-white/10" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-sm text-white/80">{title}</p>
          {value === undefined ? (
            <Skeleton className="mt-2 h-9 w-20 bg-white/20" />
          ) : (
            <p className="mt-1 font-bold text-3xl tabular-nums">
              {typeof value === "number" ? value.toLocaleString() : value}
            </p>
          )}
          {description && <p className="mt-1 text-white/70 text-xs">{description}</p>}
        </div>
        <div className="mt-0.5 shrink-0 rounded-xl bg-white/20 p-2.5 backdrop-blur-sm">
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  );
}
