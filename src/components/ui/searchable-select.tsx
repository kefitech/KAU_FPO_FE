"use client";

/**
 * SearchableSelect — searchable single-select dropdown.
 *
 * Uses shadcn's Popover (Radix Popover under the hood) + a plain <input>
 * + a plain scrollable <div>. NOT @base-ui Combobox — the previous
 * implementation broke scroll when rendered inside a Dialog (Products
 * modal etc.) because Dialog's scroll-lock treated the base-ui portal
 * as "outside the modal" and disabled pointer events on it.
 *
 * Radix Popover + Radix Dialog know how to co-exist, so pointer events
 * (wheel scroll, drag) flow to the popup correctly.
 *
 * Public API is unchanged — same props (value / onChange / options /
 * placeholder / disabled / className). No changes needed at call sites.
 */

import { useEffect, useMemo, useRef, useState } from "react";

import { Check, ChevronsUpDown, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label;

  const filtered = useMemo(
    () =>
      options.filter((o) =>
        o.label.toLowerCase().includes(query.toLowerCase()),
      ),
    [options, query],
  );

  // Focus the search input when the popover opens; clear the query when it closes
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    } else {
      setQuery("");
    }
  }, [open]);

  return (
    <div className="space-y-2">
      {/* `modal` = true is critical when this dropdown is used inside a Dialog.
          Without it, the parent Dialog's wheel-event capture intercepts scroll
          on the (portalled) popover, so wheel doesn't work — only dragging the
          scrollbar does. `modal` makes Popover own the interactive layer. */}
      <Popover open={open} onOpenChange={disabled ? undefined : setOpen} modal>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors hover:bg-muted/30 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
              className,
            )}
          >
            <span className={cn(!selectedLabel && "text-muted-foreground")}>
              {selectedLabel ?? placeholder}
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-70" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="p-0"
          align="start"
          sideOffset={4}
          // Match the trigger's width so the popup lines up under the field.
          style={{ width: "var(--radix-popover-trigger-width)" }}
        >
          {/* Search input */}
          <div className="border-b p-2">
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to search…"
              className="h-8"
            />
          </div>
          {/* Scrollable list — plain <div> with explicit max-h + overflow-y-auto.
              Works reliably inside Dialogs because Radix Popover portals
              cooperate with Radix Dialog's scroll lock. */}
          <div
            className="max-h-[240px] overflow-y-auto p-1"
            style={{ overscrollBehavior: "contain" }}
          >
            {filtered.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                No results found
              </p>
            ) : (
              filtered.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted",
                      isSelected && "bg-primary/10 font-medium",
                    )}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Selection chip — always visible under the trigger so the user can see
          + remove the current selection at a glance without opening the dropdown. */}
      {value && selectedLabel && (
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full border bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-foreground">
            {selectedLabel}
            <button
              type="button"
              onClick={() => onChange("")}
              className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              aria-label={`Remove ${selectedLabel}`}
              disabled={disabled}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        </div>
      )}
    </div>
  );
}
