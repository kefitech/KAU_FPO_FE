"use client";

import { useId } from "react";

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";

import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

// Rotating palette used to colour each bar. Balanced across the hue wheel and
// calibrated to look right on both light + dark backgrounds (mid-saturation,
// mid-lightness). Twelve entries, one per bar, so a full 12-month window
// prints every colour exactly once.
export const BAR_PALETTE = [
  "#2563eb", // blue-600
  "#0891b2", // cyan-600
  "#059669", // emerald-600
  "#65a30d", // lime-600
  "#ca8a04", // yellow-600
  "#ea580c", // orange-600
  "#dc2626", // red-600
  "#db2777", // pink-600
  "#c026d3", // fuchsia-600
  "#7c3aed", // violet-600
  "#4f46e5", // indigo-600
  "#0284c7", // sky-600
];

export interface GradientBar {
  label: string;
  value: number;
  /** Bar colour — defaults to the next BAR_PALETTE colour. */
  color?: string;
}

/**
 * Bar chart in the DPR "created — last 12 months" style: every bar its own colour,
 * fading from solid at the top to ~55% at the base, rounded, with its value above it.
 * The tallest bar gets an outline so the eye lands on it first.
 */
export function GradientBarChart({
  data,
  valueLabel,
  color,
  highlightPeak = true,
  className,
}: {
  data: GradientBar[];
  /** Series name in the tooltip, e.g. "Registrations". */
  valueLabel: string;
  /** One colour for every bar instead of the palette — any CSS colour, e.g. "var(--primary)". */
  color?: string;
  /** Outline the tallest bar — off where bars are categories rather than a trend. */
  highlightPeak?: boolean;
  /** Sizing — h-72 by default. */
  className?: string;
}) {
  // Gradient ids must be unique per chart: several charts can share a page
  const gradientId = useId().replace(/:/g, "");
  const max = Math.max(0, ...data.map((d) => d.value));
  const bars = data.map((d, i) => ({
    ...d,
    // On the datum, so the custom shape below and the tooltip indicator use it
    fill: d.color ?? color ?? BAR_PALETTE[i % BAR_PALETTE.length],
    isPeak: highlightPeak && max > 0 && d.value === max,
  }));
  const config: ChartConfig = { value: { label: valueLabel } };

  return (
    <ChartContainer config={config} className={cn("aspect-auto h-72 w-full", className)}>
      <BarChart data={bars} margin={{ top: 24, right: 12, left: 0, bottom: 4 }}>
        {/* One vertical gradient per bar — solid colour at the top fading to ~55%
            opacity at the base for a modern glass feel. Colours go in `style`, not SVG
            attributes: attributes can't read CSS variables like var(--primary). */}
        <defs>
          {bars.map((b, i) => (
            <linearGradient key={b.label} id={`${gradientId}-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: b.fill, stopOpacity: 0.95 }} />
              <stop offset="100%" style={{ stopColor: b.fill, stopOpacity: 0.55 }} />
            </linearGradient>
          ))}
        </defs>
        {/* Grid line and tick colours come from ChartContainer's theme styles */}
        <CartesianGrid vertical={false} strokeDasharray="4 4" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} dy={4} />
        <YAxis allowDecimals={false} width={30} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar
          dataKey="value"
          radius={[8, 8, 2, 2]}
          isAnimationActive
          animationDuration={650}
          shape={(props: unknown) => {
            const p = props as {
              x: number;
              y: number;
              width: number;
              height: number;
              index: number;
              payload: { fill: string; isPeak: boolean };
            };
            return (
              <rect
                x={p.x}
                y={p.y}
                width={p.width}
                height={p.height}
                rx={8}
                ry={8}
                fill={`url(#${gradientId}-${p.index})`}
                style={p.payload.isPeak ? { stroke: p.payload.fill, strokeWidth: 2 } : undefined}
              />
            );
          }}
        >
          <LabelList
            dataKey="value"
            position="top"
            formatter={(v: unknown) => (Number(v) > 0 ? String(v) : "")}
            style={{ fontSize: 11, fontWeight: 600, fill: "var(--foreground)" }}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
