"use client";

import { type FormEvent, useState } from "react";

import { Tag } from "lucide-react";

import type { BuyerPriceRange } from "@/app/buyer/_api/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { formatCurrency } from "@/lib/utils";

/** Applied price filter — an undefined end means "no limit" on that side. */
export interface PriceFilterValue {
  min?: number;
  max?: number;
}

type T = Record<string, string>;

const rupees = (amount: number) =>
  formatCurrency(amount, { currency: "INR", locale: "en-IN", minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** "" → undefined (no limit); anything that isn't a non-negative number → NaN. */
function parsePrice(raw: string): number | undefined {
  if (raw.trim() === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : Number.NaN;
}

/** Trigger text for the applied filter, Amazon-style: "Price", "₹100 – ₹500", "₹100 & above", "Up to ₹500". */
function priceLabel(value: PriceFilterValue, t: T): string {
  const { min, max } = value;
  if (min !== undefined && max !== undefined) return `${rupees(min)} – ${rupees(max)}`;
  if (min !== undefined) return (t.price_and_above ?? "{amount} & above").replace("{amount}", rupees(min));
  if (max !== undefined) return (t.price_up_to ?? "Up to {amount}").replace("{amount}", rupees(max));
  return t.filter_price ?? "Price";
}

interface PriceRangeFilterProps {
  value: PriceFilterValue;
  /** Cheapest/dearest listing under the other filters; drives the slider ends. */
  bounds: BuyerPriceRange | undefined;
  onApply: (value: PriceFilterValue) => void;
  t: T;
}

/**
 * Price per unit filter for Explore Products: a dual-handle slider spanning
 * the catalogue's real price range, Min/Max boxes for exact amounts, and Go.
 * Dragging a handle to its end clears that side, so "₹100 – ₹4,500+" means
 * ₹100 and above. Nothing is applied until Go (or Enter) is pressed.
 */
export function PriceRangeFilter({ value, bounds, onApply, t }: PriceRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const [draftMin, setDraftMin] = useState("");
  const [draftMax, setDraftMax] = useState("");

  // Whole-rupee slider ends; a catalogue where every listing has the same price gets no slider.
  const lo = bounds?.min_price != null ? Math.floor(bounds.min_price) : null;
  const hi = bounds?.max_price != null ? Math.ceil(bounds.max_price) : null;
  const range = lo !== null && hi !== null && hi > lo ? { lo, hi } : null;

  const min = parsePrice(draftMin);
  const max = parsePrice(draftMax);
  const invalid = Number.isNaN(min) || Number.isNaN(max) || (min !== undefined && max !== undefined && min > max);

  const handleOpenChange = (next: boolean) => {
    // Start each visit from what's applied, not from a half-edited draft.
    if (next) {
      setDraftMin(value.min?.toString() ?? "");
      setDraftMax(value.max?.toString() ?? "");
    }
    setOpen(next);
  };

  const apply = (next: PriceFilterValue) => {
    onApply(next);
    setOpen(false);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (invalid) return;
    apply({ min, max });
  };

  const isActive = value.min !== undefined || value.max !== undefined;
  const clamp = (n: number, r: { lo: number; hi: number }) => Math.min(Math.max(n, r.lo), r.hi);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start font-normal sm:w-[180px]">
          <Tag className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">{priceLabel(value, t)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="flex w-80 flex-col gap-4" align="start">
        <div className="flex flex-col gap-1">
          <p className="font-medium text-sm">{t.price_per_unit ?? "Price per unit"}</p>
          {range && !invalid && (
            <p className="text-muted-foreground text-xs">
              {rupees(min ?? range.lo)} – {rupees(max ?? range.hi)}
              {max === undefined ? "+" : ""}
            </p>
          )}
        </div>

        {range && (
          <Slider
            min={range.lo}
            max={range.hi}
            step={1}
            value={[
              clamp(min === undefined || Number.isNaN(min) ? range.lo : min, range),
              clamp(max === undefined || Number.isNaN(max) ? range.hi : max, range),
            ]}
            onValueChange={([a, b]) => {
              // A handle parked at its end means no limit on that side.
              setDraftMin(a <= range.lo ? "" : String(a));
              setDraftMax(b >= range.hi ? "" : String(b));
            }}
            aria-label={t.price_per_unit ?? "Price per unit"}
          />
        )}

        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              placeholder={t.price_min_placeholder ?? "Min"}
              value={draftMin}
              onChange={(e) => setDraftMin(e.target.value)}
              aria-label={t.price_min_placeholder ?? "Min"}
              aria-invalid={invalid || undefined}
              className="pl-6"
            />
          </div>
          <span className="text-muted-foreground text-sm">–</span>
          <div className="relative flex-1">
            <span className="absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              placeholder={t.price_max_placeholder ?? "Max"}
              value={draftMax}
              onChange={(e) => setDraftMax(e.target.value)}
              aria-label={t.price_max_placeholder ?? "Max"}
              aria-invalid={invalid || undefined}
              className="pl-6"
            />
          </div>
          <Button type="submit" size="sm" disabled={invalid}>
            {t.btn_price_go ?? "Go"}
          </Button>
        </form>

        {invalid && <p className="text-destructive text-xs">{t.price_error ?? "Enter a valid price range."}</p>}

        {isActive && (
          <div className="flex justify-end border-t pt-2">
            <Button variant="ghost" size="sm" onClick={() => apply({})}>
              {t.price_filter_clear ?? "Clear"}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
