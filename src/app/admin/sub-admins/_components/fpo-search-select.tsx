"use client";

import { useEffect, useRef, useState } from "react";

import { useQuery } from "@tanstack/react-query";

import { adminApplicationsApi, type ApplicationListItem } from "@/app/admin/_api/applications";
import { Combobox, ComboboxContent, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox";

type T = Record<string, string>;

function fpoLabel(fpo: Pick<ApplicationListItem, "name" | "application_id">) {
  return fpo.application_id ? `${fpo.name} (${fpo.application_id})` : fpo.name;
}

/**
 * FPO picker that searches on the server (name or application ID), so it works
 * past the API's 100-row page limit. Same input behaviour as SearchableSelect.
 */
export function FpoSearchSelect({
  value,
  onChange,
  excludeIds,
  currentSubAdminId,
  disabled,
  t = {},
}: {
  value: ApplicationListItem | null;
  onChange: (fpo: ApplicationListItem | null) => void;
  /** FPOs to leave out of the results (e.g. already assigned to this sub-admin) */
  excludeIds?: ReadonlySet<number>;
  /** hides the "currently assigned to" hint for this sub-admin */
  currentSubAdminId?: number;
  disabled?: boolean;
  t?: T;
}) {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  // see SearchableSelect: base-ui echoes the picked item's value back through
  // onInputValueChange; ignore it until the user types something new
  const selectedCode = useRef<string | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => setSearch(query.trim()), 300);
    return () => clearTimeout(handle);
  }, [query]);

  const { data, isFetching } = useQuery({
    queryKey: ["fpo-search-select", search],
    queryFn: () =>
      adminApplicationsApi.getAll({ search: search || undefined, page: 1, page_size: 20, ordering: "name" }),
    staleTime: 30_000,
  });
  const options = (data?.data ?? []).filter((f) => !excludeIds?.has(f.id));

  return (
    <Combobox
      value={value ? String(value.id) : null}
      onValueChange={(v) => {
        const fpo = options.find((f) => String(f.id) === v) ?? null;
        selectedCode.current = v ?? null;
        setQuery(fpo ? fpoLabel(fpo) : "");
        onChange(fpo);
      }}
      inputValue={query}
      onInputValueChange={(v) => {
        if (selectedCode.current !== null) {
          if (v === selectedCode.current || v == null) return;
          selectedCode.current = null;
        }
        setQuery(v ?? "");
      }}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setQuery("");
        } else if (selectedCode.current === null) {
          setQuery(value ? fpoLabel(value) : "");
        }
      }}
      disabled={disabled}
    >
      <ComboboxInput
        placeholder={t.fpo_search_placeholder ?? "Search FPO by name or application ID…"}
        showClear={!!value}
        className="w-full"
        disabled={disabled}
      />
      <ComboboxContent>
        <ComboboxList>
          {options.map((fpo) => (
            <ComboboxItem key={fpo.id} value={String(fpo.id)}>
              <div className="flex min-w-0 flex-col">
                <span className="break-words">{fpo.name}</span>
                {fpo.application_id && (
                  <span className="break-all font-mono text-muted-foreground text-xs">{fpo.application_id}</span>
                )}
                <span className="text-muted-foreground text-xs">
                  {fpo.district_display || fpo.district}
                  {fpo.assigned_subadmin_name && fpo.assigned_subadmin_id !== currentSubAdminId
                    ? ` · ${t.fpo_currently_assigned ?? "Currently assigned to"} ${fpo.assigned_subadmin_name}`
                    : ""}
                </span>
              </div>
            </ComboboxItem>
          ))}
          {options.length === 0 && (
            <p className="py-2 text-center text-muted-foreground text-sm">
              {isFetching ? (t.searching ?? "Searching…") : (t.no_results ?? "No FPOs found")}
            </p>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
