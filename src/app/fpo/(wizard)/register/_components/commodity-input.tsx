"use client";

import { useEffect, useRef, useState } from "react";

import { ChevronDown, Search, X } from "lucide-react";

interface CommodityOption {
  code: string;
  name: string;
}

interface CommodityInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  options?: CommodityOption[];
}

export function CommodityInput({
  value,
  onChange,
  placeholder = "Select commodities…",
  disabled,
  options,
}: CommodityInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggle(code: string) {
    if (value.includes(code)) {
      onChange(value.filter((v) => v !== code));
    } else {
      onChange([...value, code]);
    }
  }

  function removeTag(code: string) {
    onChange(value.filter((v) => v !== code));
  }

  function getLabel(code: string) {
    return options?.find((o) => o.code === code)?.name ?? code;
  }

  if (options) {
    const filtered = options.filter((o) => o.name.toLowerCase().includes(search.toLowerCase()));

    return (
      <div className="flex flex-col gap-2" ref={containerRef}>
        {/* Trigger button */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => { if (!disabled) setOpen((v) => !v); }}
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className={value.length === 0 ? "text-muted-foreground" : ""}>
            {value.length === 0 ? placeholder : `${value.length} selected`}
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          />
        </button>

        {/* Dropdown */}
        {open && (
          <div className="relative z-50 rounded-md border bg-background shadow-md">
            {/* Search */}
            <div className="flex items-center gap-2 border-b px-3 py-2">
              <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search commodities…"
                autoFocus
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              {search && (
                <button type="button" onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Options list */}
            <div className="max-h-52 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <p className="py-3 text-center text-muted-foreground text-sm">No results found</p>
              ) : (
                filtered.map((o) => (
                  <label
                    key={o.code}
                    className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      checked={value.includes(o.code)}
                      onChange={() => toggle(o.code)}
                      className="h-4 w-4 shrink-0 accent-foreground"
                    />
                    <span>{o.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        )}

        {/* Selected chips */}
        {value.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {value.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 font-medium text-xs"
              >
                {getLabel(tag)}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={`Remove ${tag}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Fallback free-text tag input (when no options list is provided)
  return <FreeTextCommodityInput value={value} onChange={onChange} placeholder={placeholder} disabled={disabled} />;
}

function FreeTextCommodityInput({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [inputValue, setInputValue] = useState("");

  function addTag(raw: string) {
    const trimmed = raw.trim().toLowerCase();
    if (trimmed && !value.includes(trimmed)) onChange([...value, trimmed]);
    setInputValue("");
  }

  function removeTag(tag: string) {
    onChange(value.filter((v) => v !== tag));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputValue);
    }
    if (e.key === "Backspace" && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  }

  return (
    <div
      className={`flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm transition-shadow focus-within:ring-1 focus-within:ring-ring ${
        disabled ? "cursor-not-allowed opacity-50" : ""
      }`}
    >
      {value.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 font-medium text-xs">
          {tag}
          {!disabled && (
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label={`Remove ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </span>
      ))}
      {!disabled && (
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { if (inputValue.trim()) addTag(inputValue); }}
          placeholder={value.length === 0 ? placeholder : ""}
          className="min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      )}
    </div>
  );
}
