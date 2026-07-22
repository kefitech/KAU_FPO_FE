"use client";

import { useEffect, useState } from "react";

const SIZES = [14, 16, 18, 20] as const;
type FontSize = (typeof SIZES)[number];
const DEFAULT_SIZE: FontSize = 16;
const LS_KEY = "admin-font-size";

export function FontSizeControl() {
  const [size, setSize] = useState<FontSize>(DEFAULT_SIZE);

  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) {
      const parsed = Number(stored) as FontSize;
      if ((SIZES as readonly number[]).includes(parsed)) {
        setSize(parsed);
        document.documentElement.style.fontSize = `${parsed}px`;
      }
    }
  }, []);

  function apply(newSize: FontSize) {
    document.documentElement.style.fontSize = `${newSize}px`;
    localStorage.setItem(LS_KEY, String(newSize));
    setSize(newSize);
  }

  const currentIdx = SIZES.indexOf(size);

  return (
    <div className="hidden lg:flex items-center gap-0.5 rounded-md border border-border bg-muted/40 px-1 py-0.5">
      <button
        type="button"
        title="Decrease font size"
        disabled={currentIdx === 0}
        onClick={() => apply(SIZES[currentIdx - 1])}
        className="flex h-6 w-6 items-center justify-center rounded text-[11px] font-bold text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
      >
        A-
      </button>
      <div className="flex items-center gap-0.5 px-0.5">
        {SIZES.map((s, i) => (
          <button
            key={s}
            type="button"
            title={`Font size ${s}px`}
            onClick={() => apply(s)}
            className={`h-1.5 w-1.5 rounded-full transition-colors ${
              i === currentIdx ? "bg-slate-700 dark:bg-slate-300" : "bg-border hover:bg-muted-foreground"
            }`}
          />
        ))}
      </div>
      <button
        type="button"
        title="Increase font size"
        disabled={currentIdx === SIZES.length - 1}
        onClick={() => apply(SIZES[currentIdx + 1])}
        className="flex h-6 w-6 items-center justify-center rounded text-[13px] font-bold text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
      >
        A+
      </button>
    </div>
  );
}
