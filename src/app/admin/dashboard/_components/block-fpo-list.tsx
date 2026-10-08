"use client";

import Link from "next/link";

import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";

import { adminApplicationsApi } from "@/app/admin/_api/applications";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import type { BlockEntry } from "./kerala-district-map";

type T = Record<string, string>;
type Config = Record<string, { label: string; color: string }>;

// The list API caps a page at 100 — far above what one block holds today
const PAGE_SIZE = 100;

interface Props {
  district: string;
  districtName: string;
  block: BlockEntry;
  locale: string;
  t: T;
  statusConfig: Config;
  tierConfig: Config;
  onClose: () => void;
}

/** FPOs registered in one block — opened by clicking a block on the dashboard map (super admins). */
export function BlockFpoList({ district, districtName, block, locale, t, statusConfig, tierConfig, onClose }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard-block-fpos", district, block.code, locale],
    queryFn: () => adminApplicationsApi.getAll({ district, block: block.code, page_size: PAGE_SIZE, ordering: "name" }),
  });

  const fpos = data?.data ?? [];
  const total = data?.meta.pagination.total_count ?? 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
        <div className="min-w-0">
          <CardTitle className="text-base">
            {(t.block_fpos_title ?? "FPOs in {block} block").replace("{block}", block.name)}
          </CardTitle>
          <p className="text-muted-foreground text-xs">
            {(t.block_fpos_subtitle ?? "{district} district — click an FPO to open its application").replace(
              "{district}",
              districtName,
            )}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={onClose}
          aria-label={t.block_fpos_close ?? "Close"}
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : fpos.length === 0 ? (
          <p className="py-6 text-center text-muted-foreground text-sm">
            {t.block_fpos_empty ?? "No FPOs registered in this block"}
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.block_fpos_col_fpo ?? "FPO"}</TableHead>
                  <TableHead>{t.block_fpos_col_status ?? "Status"}</TableHead>
                  <TableHead>{t.block_fpos_col_tier ?? "Tier"}</TableHead>
                  <TableHead className="text-right">{t.block_fpos_col_members ?? "Members"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fpos.map((fpo) => {
                  const status = statusConfig[fpo.status];
                  const tier = fpo.tier ? tierConfig[fpo.tier] : null;
                  return (
                    <TableRow key={fpo.id}>
                      <TableCell>
                        <Link href={`/admin/applications/${fpo.id}`} className="font-medium hover:underline">
                          {(locale === "ml" && fpo.name_ml) || fpo.name || fpo.application_id}
                        </Link>
                        <p className="text-muted-foreground text-xs">{fpo.application_id}</p>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ background: status?.color ?? "#94a3b8" }}
                          />
                          {status?.label ?? fpo.status_display}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">{tier?.label ?? "—"}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{fpo.total_members ?? "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {total > fpos.length && (
              <p className="mt-3 text-muted-foreground text-xs">
                {(t.block_fpos_showing_first ?? "Showing the first {shown} of {total}")
                  .replace("{shown}", String(fpos.length))
                  .replace("{total}", String(total))}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
