"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Problem } from "@/lib/types";
import type { ProblemFeedback } from "./multiple-choice";
import { ProblemFeedbackBanner } from "./feedback-banner";

interface MatchingProps {
  problem: Problem;
  onSubmit: (answer: Record<string, string>) => void;
  disabled?: boolean;
  loading?: boolean;
  feedback?: ProblemFeedback;
}

export function Matching({ problem, onSubmit, disabled, loading, feedback }: MatchingProps) {
  const pairs = problem.pairs ?? [];
  const leftItems = pairs.map((p) => p.left);
  const rightItems = Array.from(new Set(pairs.map((p) => p.right)));

  const [selections, setSelections] = useState<Record<string, string>>({});

  function handleSelect(left: string, right: string) {
    if (disabled) return;
    setSelections((prev) => ({ ...prev, [left]: right }));
  }

  const allMatched = leftItems.every((left) => selections[left] && selections[left] !== "");

  return (
    <div className="space-y-6">
      <p className="text-lg font-medium text-foreground">{problem.questionText}</p>

      <div className="space-y-4">
        {leftItems.map((left) => (
          <div key={left} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <span className="text-sm font-medium text-foreground sm:w-1/3">{left}</span>
            <select
              aria-label={`Match for ${left}`}
              value={selections[left] ?? ""}
              onChange={(e) => handleSelect(left, e.target.value)}
              disabled={disabled}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-50"
            >
              <option value="">Select match...</option>
              {rightItems.map((right) => (
                <option key={right} value={right}>
                  {right}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {feedback ? (
        <ProblemFeedbackBanner
          feedback={feedback}
          successLabel="All matches correct!"
          errorLabel="Some matches are incorrect"
        />
      ) : null}

      {!feedback && (
        <Button onClick={() => onSubmit(selections)} disabled={disabled || !allMatched} className="w-full">
          {loading ? <><Loader2 className="size-4 animate-spin" /> Submitting...</> : "Submit Answer"}
        </Button>
      )}
    </div>
  );
}
