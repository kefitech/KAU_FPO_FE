"use client";

import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { persistPreference } from "@/lib/preferences/preferences-storage";
import type { ThemeMode } from "@/lib/preferences/theme";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

export function ThemeToggle() {
  const resolvedThemeMode = usePreferencesStore((s) => s.resolvedThemeMode);
  const setThemeMode = usePreferencesStore((s) => s.setThemeMode);

  const toggle = () => {
    const next: ThemeMode = resolvedThemeMode === "dark" ? "light" : "dark";
    setThemeMode(next);
    persistPreference("theme_mode", next);
  };

  return (
    <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" onClick={toggle}>
      {resolvedThemeMode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
