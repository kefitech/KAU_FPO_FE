"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  type RowSelectionState,
  type SortingState,
  type Updater,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2 } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

import { DataTablePagination } from "./data-table-pagination";
import type { FilterConfig } from "./data-table-toolbar";
import { DataTableToolbar } from "./data-table-toolbar";
import { useDataTable } from "./use-data-table";

interface DataTableProps<TData> {
  queryKey: string;
  queryFn: (params: DataTableParams) => Promise<PaginatedResponse<TData>>;
  columns: ColumnDef<TData>[];
  filters?: FilterConfig[];
  defaultPageSize?: number;
  extra?: React.ReactNode;
  onSelectionChange?: (rows: TData[]) => void;
  onRowClick?: (row: TData) => void;
}

export function DataTable<TData>({
  queryKey,
  queryFn,
  columns,
  filters = [],
  defaultPageSize = 10,
  extra,
  onSelectionChange,
  onRowClick,
}: DataTableProps<TData>) {
  const { params, setPage, setPageSize, setSearch, setFilter, clearFilters, setOrdering, searchParams } = useDataTable({
    defaultPageSize,
  });

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    if (typeof window === "undefined" || window.innerWidth >= 640) return {};
    const hidden: VisibilityState = {};
    for (const col of columns) {
      if (!col.meta?.hideOnMobile) continue;
      const id = "accessorKey" in col ? String(col.accessorKey) : col.id;
      if (id) hidden[id] = false;
    }
    return hidden;
  });
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const tableRef = useRef<HTMLDivElement>(null);

  // useEffect(() => {
  //   tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  // }, []);

  const extraParams = useMemo(() => {
    const p: Record<string, string> = {};
    filters.forEach((f) => {
      const val = searchParams.get(f.key);
      if (val) p[f.key] = val;
    });
    return p;
  }, [searchParams, filters]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: [queryKey, params, extraParams],
    queryFn: () => queryFn({ ...params, ...extraParams }),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });

  const total = data?.meta?.pagination?.total_count ?? 0;
  const rows = data?.data ?? [];

  // When query data changes (page/filter/refetch), stale row indices become invalid — reset selection.
  useEffect(() => {
    if (data === undefined) return;
    setRowSelection({});
    startTransition(() => onSelectionChange?.([]));
  }, [data, onSelectionChange]);

  const slNoColumn: ColumnDef<TData> = {
    id: "_slno",
    header: "SL No",
    meta: { width: "56px" },
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">{(params.page - 1) * params.page_size + row.index + 1}</span>
    ),
  };

  const selectColumn: ColumnDef<TData> = {
    id: "_select",
    meta: { width: "44px" },
    enableSorting: false,
    enableHiding: false,
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(checked) => {
          table.toggleAllPageRowsSelected(!!checked);
          startTransition(() => onSelectionChange?.(checked ? rows : []));
        }}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(checked) => row.toggleSelected(!!checked)}
        aria-label="Select row"
      />
    ),
  };

  const allColumns: ColumnDef<TData>[] = [...(onSelectionChange ? [selectColumn] : []), slNoColumn, ...columns];

  const handleSortingChange = (updater: Updater<SortingState>) => {
    const newSorting = typeof updater === "function" ? updater(sorting) : updater;
    setSorting(newSorting);
    if (newSorting.length === 0) {
      setOrdering("");
    } else {
      const { id, desc } = newSorting[0];
      setOrdering(desc ? `-${id}` : id);
    }
  };

  const handleRowSelectionChange = (updater: Updater<RowSelectionState>) => {
    const newSelection = typeof updater === "function" ? updater(rowSelection) : updater;
    setRowSelection(newSelection);
    if (onSelectionChange) {
      const selected = Object.keys(newSelection)
        .filter((key) => newSelection[key])
        .map((key) => rows[Number(key)])
        .filter(Boolean);
      startTransition(() => onSelectionChange(selected));
    }
  };

  const table = useReactTable({
    data: rows,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    rowCount: total,
    enableRowSelection: !!onSelectionChange,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
    },
    onSortingChange: handleSortingChange,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: handleRowSelectionChange,
  });

  const activeFilters: Record<string, string> = {};
  filters.forEach((f) => {
    activeFilters[f.key] = searchParams.get(f.key) ?? "";
  });

  const colSpan = table.getVisibleLeafColumns().length;

  return (
    <div ref={tableRef} className="flex flex-col gap-4">
      <DataTableToolbar
        search={params.search}
        onSearch={setSearch}
        filters={filters}
        onFilter={setFilter}
        onClearFilters={() => clearFilters(filters.map((f) => f.key))}
        activeFilters={activeFilters}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
        extra={extra}
        table={table}
      />

      <div className="relative overflow-x-auto border border-border shadow-sm">
        {isFetching && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        <Table className="min-w-full">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-b border-slate-700 bg-slate-800 hover:bg-slate-800 dark:bg-slate-900 dark:border-slate-700">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  const width = header.column.columnDef.meta?.width;
                  const isSlNo = header.id === "_slno";
                  return (
                    <TableHead
                      key={header.id}
                      style={width ? { width } : undefined}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      className={[
                        "text-xs font-semibold uppercase tracking-wider text-slate-300",
                        canSort ? "cursor-pointer select-none hover:text-white" : "",
                        isSlNo ? "text-center" : "",
                      ].join(" ")}
                    >
                      {header.isPlaceholder ? null : (
                        <div className={`flex items-center gap-1.5 ${isSlNo ? "justify-center" : ""}`}>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort && (
                            <span>
                              {sorted === "asc" ? (
                                <ArrowUp className="h-3 w-3 text-violet-400" />
                              ) : sorted === "desc" ? (
                                <ArrowDown className="h-3 w-3 text-violet-400" />
                              ) : (
                                <ArrowUpDown className="h-3 w-3 opacity-30" />
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: params.page_size }).map((_, i) => (
                <TableRow key={i} className={i % 2 === 1 ? "bg-slate-50 dark:bg-slate-900/40" : "bg-white dark:bg-background"}>
                  {Array.from({ length: colSpan }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row, i) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  onClick={(e) => {
                    if (!onRowClick) return;
                    const target = e.target as HTMLElement;
                    if (target.closest("button, a, input, [role='menuitem'], [role='checkbox']")) return;
                    onRowClick(row.original);
                  }}
                  className={[
                    "border-b border-border/50 transition-colors",
                    i % 2 === 1 ? "bg-slate-50 dark:bg-slate-900/40" : "bg-white dark:bg-background",
                    onRowClick
                      ? "cursor-pointer hover:bg-violet-50 hover:border-l-2 hover:border-l-violet-400 dark:hover:bg-violet-950/20"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800/40",
                  ].join(" ")}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={[
                        "overflow-hidden",
                        cell.column.id === "_slno"
                          ? "text-center text-xs font-medium text-muted-foreground/60 bg-slate-50 dark:bg-slate-900/20"
                          : "",
                      ].join(" ")}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={colSpan} className="h-32 text-center text-muted-foreground">
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination
        page={params.page}
        pageSize={params.page_size}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        isLoading={isLoading}
      />
    </div>
  );
}
