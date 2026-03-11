"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Problem } from "@/lib/types";
import type { ProblemFeedback } from "./multiple-choice";

interface MatchingProps {
  problem: Problem;
  onSubmit: (answer: Record<string, string>) => void;
  disabled?: boolean;
  feedback?: ProblemFeedback;
}

export function Matching({ problem, onSubmit, disabled, feedback }: MatchingProps) {
  const pairs = problem.pairs ?? [];
  const leftItems = pairs.map((p) => p.left);
  const rightItems = pairs.map((p) => p.right);

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

      {feedback && (
        <div className={`rounded-lg p-4 text-sm ${feedback.wasCorrect ? "bg-green-500/10 text-green-700 dark:text-green-300" : "bg-destructive/10 text-destructive"}`}>
          {feedback.wasCorrect ? "All matches correct!" : "Some matches are incorrect"}
          {feedback.explanation && <p className="mt-1 text-muted-foreground">{feedback.explanation}</p>}
        </div>
      )}

      {!feedback && (
        <Button onClick={() => onSubmit(selections)} disabled={disabled || !allMatched} className="w-full">
          Submit Answer
        </Button>
      )}
    </div>
  );
}
