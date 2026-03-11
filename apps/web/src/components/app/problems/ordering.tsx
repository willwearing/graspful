"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown } from "lucide-react";
import type { Problem } from "@/lib/types";
import type { ProblemFeedback } from "./multiple-choice";

interface OrderingProps {
  problem: Problem;
  onSubmit: (answer: string[]) => void;
  disabled?: boolean;
  feedback?: ProblemFeedback;
}

export function Ordering({ problem, onSubmit, disabled, feedback }: OrderingProps) {
  const [items, setItems] = useState<string[]>(problem.items ?? []);

  function moveItem(index: number, direction: -1 | 1) {
    if (disabled) return;
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= items.length) return;
    const updated = [...items];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setItems(updated);
  }

  return (
    <div className="space-y-6">
      <p className="text-lg font-medium text-foreground">{problem.questionText}</p>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={`${item}-${index}`}
            className="flex items-center gap-2 rounded-lg border border-border bg-card p-3"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
              {index + 1}
            </span>
            <span className="flex-1 text-sm text-foreground">{item}</span>
            <div className="flex gap-1">
              <button
                type="button"
                aria-label="Move up"
                onClick={() => moveItem(index, -1)}
                disabled={disabled || index === 0}
                className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Move down"
                onClick={() => moveItem(index, 1)}
                disabled={disabled || index === items.length - 1}
                className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {feedback && (
        <div className={`rounded-lg p-4 text-sm ${feedback.wasCorrect ? "bg-green-500/10 text-green-700 dark:text-green-300" : "bg-destructive/10 text-destructive"}`}>
          {feedback.wasCorrect ? "Correct order!" : "Incorrect order"}
          {feedback.explanation && <p className="mt-1 text-muted-foreground">{feedback.explanation}</p>}
        </div>
      )}

      {!feedback && (
        <Button onClick={() => onSubmit(items)} disabled={disabled} className="w-full">
          Submit Answer
        </Button>
      )}
    </div>
  );
}
