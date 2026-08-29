"use client";

/**
 * Admin — DPR Projects list.
 * Read-only oversight of every DPR project across all FPOs.
 * Filters: status, district, search (FPO name / DPR title).
 *
 * Author: Athul Gopan (Kefi Tech Solutions)
 */

import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Search } from "lucide-react";
import Link from "next/link";

import {
  adminDprProjectsApi,
  DPR_STATUS_COLORS,
  DPR_STATUS_LABELS,
  type DPRProjectStatus,
} from "@/app/admin/_api/dpr-projects";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const KERALA_DISTRICTS: Array<[string, string]> = [
  ["TVM", "Thiruvananthapuram"], ["KLM", "Kollam"], ["PTA", "Pathanamthitta"],
  ["ALP", "Alappuzha"], ["KTM", "Kottayam"], ["IDK", "Idukki"],
  ["EKM", "Ernakulam"], ["TRS", "Thrissur"], ["PKD", "Palakkad"],
  ["MPM", "Malappuram"], ["KKD", "Kozhikode"], ["WYD", "Wayanad"],
  ["KNR", "Kannur"], ["KSD", "Kasaragod"],
];

const ALL = "__all__";

export default function AdminDprProjectsPage() {
  const [status, setStatus] = useState<DPRProjectStatus | "">("");
  const [district, setDistrict] = useState<string>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ["admin-dpr-projects", status, district, search, page],
    queryFn: () => adminDprProjectsApi.list({ status, district, search, page }),
    staleTime: 30_000,
  });

  const data = query.data;

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/dpr">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold">DPR Projects</h1>
          <p className="text-sm text-muted-foreground">
            Read-only oversight of every DPR project across all FPOs.
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-4">
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Search FPO name / DPR title</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="e.g. Kerala Farmers Producer Co."
                className="pl-8"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <Select
              value={status || ALL}
              onValueChange={(v) => {
                setStatus(v === ALL ? "" : (v as DPRProjectStatus));
                setPage(1);
              }}
            >
              <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                {(Object.keys(DPR_STATUS_LABELS) as DPRProjectStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{DPR_STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">District</Label>
            <Select
              value={district || ALL}
              onValueChange={(v) => {
                setDistrict(v === ALL ? "" : v);
                setPage(1);
              }}
            >
              <SelectTrigger><SelectValue placeholder="All districts" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All districts</SelectItem>
                {KERALA_DISTRICTS.map(([code, name]) => (
                  <SelectItem key={code} value={code}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardContent className="p-0">
          {query.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : query.isError ? (
            <div className="p-6 text-center text-sm text-destructive">
              Failed to load projects. Please try again.
            </div>
          ) : !data || data.count === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No DPR projects match these filters.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[240px]">FPO</TableHead>
                  <TableHead>DPR Title</TableHead>
                  <TableHead className="w-24">District</TableHead>
                  <TableHead className="w-16">Tier</TableHead>
                  <TableHead className="w-32">Status</TableHead>
                  <TableHead className="w-40">Updated</TableHead>
                  <TableHead className="w-24 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.results.map((p) => (
                  <TableRow key={p.uuid}>
                    <TableCell className="font-medium">{p.fpo?.name ?? "—"}</TableCell>
                    <TableCell className="text-sm">{p.title || <span className="text-muted-foreground">Untitled</span>}</TableCell>
                    <TableCell className="text-sm">{p.fpo?.district ?? "—"}</TableCell>
                    <TableCell className="text-sm">{p.fpo?.tier ?? "—"}</TableCell>
                    <TableCell>
                      <span className={`rounded-md px-2 py-1 text-xs ${DPR_STATUS_COLORS[p.status]}`}>
                        {DPR_STATUS_LABELS[p.status]}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(p.updated_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/dpr/projects/${p.uuid}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.count > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {data.count} project{data.count === 1 ? "" : "s"} total
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={!data.previous || query.isFetching} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Previous
            </Button>
            <span>Page {page}</span>
            <Button variant="outline" size="sm" disabled={!data.next || query.isFetching} onClick={() => setPage((p) => p + 1)}>
              {query.isFetching ? <Loader2 className="h-3 w-3 animate-spin" /> : "Next"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
