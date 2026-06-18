"use client";

import { useRef, useState } from "react";

import { cn } from "@/lib/utils";
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

export interface SelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<SelectOption>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  disabled,
  className,
}: SearchableSelectProps) {
  const [query, setQuery] = useState(() => options.find((o) => o.value === value)?.label ?? "");

  // @base-ui fires onInputValueChange with the item's code after selection — sometimes
  // more than once (once immediately, again when the parent re-renders with the new value
  // prop). We store the selected code and reject every callback carrying that exact code
  // until the user types something genuinely different.
  const selectedCode = useRef<string | null>(null);

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes((query ?? "").toLowerCase()),
  );

  return (
    <Combobox
      value={value || null}
      onValueChange={(v) => {
        const label = options.find((o) => o.value === v)?.label ?? "";
        selectedCode.current = v ?? null;
        setQuery(label);
        onChange(v ?? "");
      }}
      inputValue={query}
      onInputValueChange={(v) => {
        if (selectedCode.current !== null) {
          // Still receiving callbacks with the code we just selected — ignore them
          if (v === selectedCode.current || v == null) return;
          // User typed something new — lift the guard
          selectedCode.current = null;
        }
        setQuery(v ?? "");
      }}
      disabled={disabled}
    >
      <ComboboxInput
        placeholder={placeholder}
        showClear={!!value}
        className={cn("w-full", className)}
        disabled={disabled}
      />
      <ComboboxContent>
        <ComboboxList>
          {filtered.map((opt) => (
            <ComboboxItem key={opt.value} value={opt.value}>
              {opt.label}
            </ComboboxItem>
          ))}
          {filtered.length === 0 && (
            <p className="py-2 text-center text-muted-foreground text-sm">No results found</p>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
