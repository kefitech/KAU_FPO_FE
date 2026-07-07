"use client";

import { useEffect, useRef, useState } from "react";

import type { Table } from "@tanstack/react-table";
import { RefreshCw, Search, Settings2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  type?: "select" | "date";
  options?: FilterOption[];
}

interface DataTableToolbarProps<TData> {
  search: string;
  onSearch: (value: string) => void;
  filters?: FilterConfig[];
  onFilter?: (key: string, value: string) => void;
  onClearFilters?: () => void;
  activeFilters?: Record<string, string>;
  extra?: React.ReactNode;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  table: Table<TData>;
}

export function DataTableToolbar<TData>({
  search,
  onSearch,
  filters = [],
  onFilter,
  onClearFilters,
  activeFilters = {},
  extra,
  onRefresh,
  isRefreshing,
  table,
}: DataTableToolbarProps<TData>) {
  const [localSearch, setLocalSearch] = useState(search);

  const onSearchRef = useRef(onSearch);
  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== search) onSearchRef.current(localSearch);
    }, 400);
    return () => clearTimeout(timer);
  }, [localSearch, search]);

  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  const hasActiveFilters = Object.values(activeFilters).some(Boolean);
  const hidableColumns = table.getAllColumns().filter((col) => col.getCanHide());

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative">
        <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="h-9 w-64 pr-8 pl-8"
        />
        {localSearch && (
          <button
            type="button"
            onClick={() => {
              setLocalSearch("");
              onSearch("");
            }}
            className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Dynamic filters */}
      {filters.map((filter) =>
        filter.type === "date" ? (
          <div
            key={filter.key}
            className="flex h-9 min-w-[210px] items-center gap-2 rounded-md border bg-background px-3 text-sm shadow-xs focus-within:ring-1 focus-within:ring-ring"
          >
            <span className="whitespace-nowrap text-muted-foreground text-sm">{filter.label}</span>
            <input
              type="date"
              value={activeFilters[filter.key] ?? ""}
              onChange={(e) => onFilter?.(filter.key, e.target.value)}
              className="h-full flex-1 bg-transparent text-foreground text-sm outline-none"
            />
          </div>
        ) : (
          <select
            key={filter.key}
            value={activeFilters[filter.key] ?? ""}
            onChange={(e) => onFilter?.(filter.key, e.target.value)}
            className="h-9 min-w-[140px] rounded-md border bg-background px-3 text-foreground text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">{filter.label}</option>
            {(filter.options ?? []).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ),
      )}

      {/* Clear all filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={() => onClearFilters?.()} className="h-9 text-muted-foreground">
          <X className="mr-1 h-3.5 w-3.5" />
          Clear
        </Button>
      )}

      {/* Right side */}
      <div className="ml-auto flex items-center gap-2">
        {/* Column visibility */}
        {hidableColumns.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <Settings2 className="mr-1.5 h-4 w-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {hidableColumns.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  className="capitalize"
                >
                  {typeof column.columnDef.header === "string" ? column.columnDef.header : column.id}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Refresh */}
        {onRefresh && (
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={onRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        )}

        {extra}
      </div>
    </div>
  );
}
