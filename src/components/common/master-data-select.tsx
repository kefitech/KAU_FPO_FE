"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useQuery } from "@tanstack/react-query";

import { Skeleton } from "@/components/ui/skeleton";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { masterDataApi } from "@/lib/api/master-data";

interface MasterDataSelectProps {
  /** MasterLookup category, e.g. "crop_name" or "crop_group" */
  category: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Dropdown fed by a master data table. Options are the English names, because the records
 * that use them (crop_name, crop_group) store the English name string. A value that is not in
 * the list (an older record) is still shown, so editing it never blanks the field.
 */
export function MasterDataSelect({ category, value, onChange, placeholder, disabled }: MasterDataSelectProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["master-data-select", category],
    queryFn: () => masterDataApi.get(category, undefined, "en"),
    staleTime: 5 * 60_000,
  });

  const options = useMemo(() => {
    const list = (data ?? []).map((item) => ({ value: item.name, label: item.name }));
    if (value && !list.some((o) => o.value.toLowerCase() === value.toLowerCase())) {
      list.unshift({ value, label: value });
    }
    return list;
  }, [data, value]);

  // SearchableSelect reads its label from `value` only when it mounts. Remount it when the value is
  // set from outside (form reset after loading a record), but not when the user picks an option.
  const [syncKey, setSyncKey] = useState(0);
  const lastEmitted = useRef(value);
  useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      setSyncKey((k) => k + 1);
    }
  }, [value]);

  if (isLoading) return <Skeleton className="h-9 w-full" />;

  return (
    <SearchableSelect
      key={`${syncKey}-${options.length}`}
      value={value}
      onChange={(v) => {
        lastEmitted.current = v;
        onChange(v);
      }}
      options={options}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}
