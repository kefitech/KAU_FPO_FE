"use client";

import { Check } from "lucide-react";

import { WIZARD_STEPS } from "@/types/fpo";

interface StepIndicatorProps {
  current: number;
}

export function StepIndicator({ current }: StepIndicatorProps) {
  return (
    <div className="flex w-full items-center">
      {WIZARD_STEPS.map((step, idx) => {
        const done = step.number < current;
        const active = step.number === current;
        return (
          <div key={step.number} className="flex flex-1 items-center last:flex-none">
            {/* Circle */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 font-semibold text-xs transition-colors ${
                  done
                    ? "border-primary bg-primary text-primary-foreground"
                    : active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground"
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : step.number}
              </div>
              <span
                className={`hidden whitespace-nowrap font-medium text-[10px] sm:block ${
                  active ? "text-foreground" : done ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {idx < WIZARD_STEPS.length - 1 && (
              <div
                className={`mx-2 mt-[-14px] h-0.5 flex-1 transition-colors sm:mt-[-26px] ${
                  done ? "bg-primary" : "bg-border"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
