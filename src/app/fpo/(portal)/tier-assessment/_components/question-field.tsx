"use client";

import { Input } from "@/components/ui/input";
import type { TierQuestion } from "@/types/fpo";

interface QuestionFieldProps {
  question: TierQuestion;
  value: string | number | string[] | undefined;
  onChange: (value: string | number | string[]) => void;
  readOnly?: boolean;
}

export function QuestionField({ question, value, onChange, readOnly }: QuestionFieldProps) {
  const { input_type, answer_config, question_no } = question;

  if (input_type === "computed") return null;

  if (input_type === "number") {
    return (
      <Input
        type="number"
        min={answer_config.min}
        max={answer_config.max}
        value={value as number ?? ""}
        onChange={(e) => {
          const n = e.target.value === "" ? 0 : Number(e.target.value);
          onChange(n);
        }}
        disabled={readOnly}
        className="max-w-xs"
      />
    );
  }

  if (input_type === "boolean") {
    return (
      <div className="flex gap-6">
        {(["yes", "no"] as const).map((opt) => (
          <label key={opt} className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name={`q${question_no}`}
              value={opt}
              checked={value === opt}
              onChange={() => onChange(opt)}
              disabled={readOnly}
              className="accent-primary"
            />
            <span className="text-sm">{opt === "yes" ? "Yes" : "No"}</span>
          </label>
        ))}
      </div>
    );
  }

  if (input_type === "single_select") {
    const options = answer_config.options ?? [];
    return (
      <div className="flex flex-col gap-2.5">
        {options.map((opt) => (
          <label key={opt.value} className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name={`q${question_no}`}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              disabled={readOnly}
              className="accent-primary"
            />
            <span className="text-sm">{opt.label}</span>
          </label>
        ))}
      </div>
    );
  }

  if (input_type === "multi_select") {
    const options = answer_config.options ?? [];
    const selected = Array.isArray(value) ? value : [];
    return (
      <div className="flex flex-col gap-2.5">
        {options.map((opt) => (
          <label key={opt.value} className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              value={opt.value}
              checked={selected.includes(opt.value)}
              onChange={(e) => {
                const next = e.target.checked
                  ? [...selected, opt.value]
                  : selected.filter((v) => v !== opt.value);
                onChange(next);
              }}
              disabled={readOnly}
              className="accent-primary"
            />
            <span className="text-sm">{opt.label}</span>
          </label>
        ))}
      </div>
    );
  }

  return null;
}
