"use client";

import { type ReactNode, useState } from "react";

import { BarChart3, Table2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type T = Record<string, string>;

export interface ChartColumn {
  key: string;
  label: string;
  align?: "left" | "right";
}

/**
 * A chart card with a chart / table toggle, so every plotted value is also
 * readable as text without hovering.
 */
export function ChartCard({
  title,
  subtitle,
  t,
  columns,
  rows,
  children,
}: {
  title: string;
  subtitle?: string;
  t: T;
  columns: ChartColumn[];
  rows: object[];
  children: ReactNode;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const empty = rows.length === 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0">
          <CardTitle className="text-base">{title}</CardTitle>
          {subtitle && <CardDescription>{subtitle}</CardDescription>}
        </div>
        <div className="flex shrink-0 rounded-md border p-0.5">
          <Button
            type="button"
            size="icon"
            variant={view === "chart" ? "secondary" : "ghost"}
            className="h-7 w-7"
            aria-label={t.view_chart ?? "Chart view"}
            aria-pressed={view === "chart"}
            onClick={() => setView("chart")}
          >
            <BarChart3 className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant={view === "table" ? "secondary" : "ghost"}
            className="h-7 w-7"
            aria-label={t.view_table ?? "Table view"}
            aria-pressed={view === "table"}
            onClick={() => setView("table")}
          >
            <Table2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {empty ? (
          <p className="py-10 text-center text-muted-foreground text-sm">{t.empty_no_data ?? "No data yet."}</p>
        ) : view === "chart" ? (
          children
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-xs">
                  {columns.map((c) => (
                    <th key={c.key} className={`py-2 font-medium ${c.align === "right" ? "text-right" : "text-left"}`}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={String((row as Record<string, unknown>)[columns[0].key])} className="border-b last:border-0">
                    {columns.map((c) => (
                      <td key={c.key} className={`py-1.5 ${c.align === "right" ? "text-right tabular-nums" : ""}`}>
                        {String((row as Record<string, unknown>)[c.key] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
