"use client";

import { useState } from "react";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

export interface DonutSlice {
  name: string;
  value: number;
  color: string;
}

/**
 * Donut chart + legend with a hover effect: the hovered section gets a thick
 * same-colour outline (looks raised) while the rest fade, and the centre shows
 * that section's count and name — or the total when nothing is hovered.
 * Hovering (or tabbing to) a legend item highlights its section too.
 *
 * No tooltip: it would sit over the centre label, which already shows the same.
 */
export function DonutChart({
  data,
  totalLabel,
  height = 180,
}: {
  data: DonutSlice[];
  /** Centre caption under the total, e.g. "Total FPOs". */
  totalLabel: string;
  height?: number;
}) {
  // Keyed by name (not index): zero-value slices may not get a sector of their own.
  const [active, setActive] = useState<string | null>(null);
  const activeSlice = data.find((d) => d.name === active);
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const isDimmed = (name: string) => active !== null && active !== name;

  return (
    <>
      <div className="relative w-full">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              dataKey="value"
              nameKey="name"
              paddingAngle={2}
              onMouseEnter={(slice) => setActive(slice.name ?? null)}
              onMouseLeave={() => setActive(null)}
            >
              {data.map((slice) => {
                const isActive = active === slice.name;
                return (
                  <Cell
                    key={slice.name}
                    fill={slice.color}
                    fillOpacity={isDimmed(slice.name) ? 0.3 : 1}
                    stroke={isActive ? slice.color : "#fff"}
                    strokeWidth={isActive ? 6 : 1}
                    style={{
                      cursor: "pointer",
                      outline: "none",
                      transition: "fill-opacity 150ms ease, stroke-width 150ms ease",
                    }}
                  />
                );
              })}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-bold text-foreground text-xl tabular-nums">
            {activeSlice ? activeSlice.value : total}
          </span>
          <span className="max-w-[90px] truncate text-center text-[11px] text-muted-foreground">
            {activeSlice ? activeSlice.name : totalLabel}
          </span>
        </div>
      </div>

      <div className="flex w-full flex-wrap justify-center gap-x-4 gap-y-1.5">
        {data.map((slice) => (
          <button
            type="button"
            key={slice.name}
            onMouseEnter={() => setActive(slice.name)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(slice.name)}
            onBlur={() => setActive(null)}
            className={`flex cursor-default items-center gap-1.5 rounded transition-opacity duration-150 ${
              isDimmed(slice.name) ? "opacity-40" : "opacity-100"
            }`}
          >
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full transition-transform duration-150 ${
                active === slice.name ? "scale-125" : ""
              }`}
              style={{ background: slice.color }}
            />
            <span
              className={`text-xs ${active === slice.name ? "font-medium text-foreground" : "text-muted-foreground"}`}
            >
              {slice.name} ({slice.value})
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
