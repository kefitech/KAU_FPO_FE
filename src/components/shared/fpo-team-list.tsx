"use client";

import { type ReactNode, useState } from "react";

import { RefreshCw, Search, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export interface FpoTeamMember {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: string;
  is_active: boolean;
}

/**
 * FPO team list with name / email / phone search and an active-status filter.
 * Shared by the admin application page and the CBBO verification page.
 * `t` carries the `team_*` labels plus `badge_active` / `badge_inactive`.
 */
export function FpoTeamList<U extends FpoTeamMember>({
  users,
  isLoading,
  isFetching,
  isError,
  onRefresh,
  t,
  renderActions,
}: {
  users: U[];
  isLoading: boolean;
  isFetching: boolean;
  isError?: boolean;
  onRefresh: () => void;
  t: Record<string, string>;
  /** Per-row slot after the status badge, e.g. admin account actions */
  renderActions?: (user: U) => ReactNode;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");

  // Match name / email as text; match phone on digits only when the query looks like a number
  const query = search.trim().toLowerCase();
  const queryDigits = /^[\d\s+()-]+$/.test(query) ? query.replace(/\D/g, "") : "";
  const filteredUsers = users.filter(
    (u) =>
      (status === "all" || u.is_active === (status === "active")) &&
      (!query ||
        `${u.first_name ?? ""} ${u.last_name ?? ""}`.toLowerCase().includes(query) ||
        (u.email ?? "").toLowerCase().includes(query) ||
        (!!queryDigits && (u.phone ?? "").replace(/\D/g, "").includes(queryDigits))),
  );
  const isFiltered = !!query || status !== "all";

  const countLabel = isFiltered
    ? (t.team_count_filtered ?? "{shown} of {total} users")
        .replace("{shown}", String(filteredUsers.length))
        .replace("{total}", String(users.length))
    : users.length === 1
      ? (t.team_count_one ?? "1 user")
      : (t.team_count ?? "{count} users").replace("{count}", String(users.length));

  if (isLoading)
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="shrink-0 text-muted-foreground text-sm">{countLabel}</p>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
            <SelectTrigger size="sm" className="min-w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.team_filter_all ?? "All statuses"}</SelectItem>
              <SelectItem value="active">{t.badge_active ?? "Active"}</SelectItem>
              <SelectItem value="inactive">{t.badge_inactive ?? "Inactive"}</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.team_search_placeholder ?? "Search name, email, phone…"}
              className="h-8 pr-8 pl-8 text-sm"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={t.team_clear_search ?? "Clear search"}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onRefresh} disabled={isFetching}>
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>
      {isError ? (
        <p className="py-4 text-center text-destructive text-sm">
          {t.team_error_load ?? "Couldn't load team members."}
        </p>
      ) : users.length === 0 ? (
        <p className="py-4 text-center text-muted-foreground text-sm">
          {t.team_empty ?? "No users found for this FPO."}
        </p>
      ) : filteredUsers.length === 0 ? (
        <p className="py-4 text-center text-muted-foreground text-sm">
          {t.team_no_match ?? "No members match your filters."}
        </p>
      ) : (
        <div className="flex flex-col">
          {filteredUsers.map((user) => (
            <div key={user.id} className="flex items-center justify-between gap-4 border-b py-3 last:border-0">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground text-xs">
                  {user.first_name?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-sm">{`${user.first_name} ${user.last_name}`.trim() || "—"}</span>
                    <Badge variant={user.role === "primary" ? "secondary" : "outline"} className="text-[10px]">
                      {user.role === "primary"
                        ? (t.team_role_primary ?? "Primary")
                        : (t.team_role_secondary ?? "Secondary")}
                    </Badge>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {user.email}
                    {user.phone && ` · ${user.phone}`}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {user.is_active ? (
                  <Badge
                    variant="outline"
                    className="border-green-500/40 bg-green-500/10 text-[11px] text-green-700 dark:text-green-400"
                  >
                    {t.badge_active ?? "Active"}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-muted text-[11px] text-muted-foreground">
                    {t.badge_inactive ?? "Inactive"}
                  </Badge>
                )}
                {renderActions?.(user)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
