"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import type { Problem } from "@/lib/types";
import type { ProblemFeedback } from "./multiple-choice";
import { ProblemFeedbackBanner } from "./feedback-banner";

interface OrderingProps {
  problem: Problem;
  onSubmit: (answer: string[]) => void;
  disabled?: boolean;
  loading?: boolean;
  feedback?: ProblemFeedback;
}

interface OrderingItem {
  id: string;
  text: string;
}

function buildOrderingItems(problem: Problem): OrderingItem[] {
  const values =
    problem.items ??
    problem.options?.map((option) =>
      typeof option === "string" ? option : option.text,
    ) ??
    [];

  return values.map((text, index) => ({
    id: `${problem.id}-${index}-${text}`,
    text,
  }));
}

export function Ordering({ problem, onSubmit, disabled, loading, feedback }: OrderingProps) {
  const [items, setItems] = useState<OrderingItem[]>(() => buildOrderingItems(problem));

  useEffect(() => {
    setItems(buildOrderingItems(problem));
  }, [problem]);

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
            key={item.id}
            className="flex items-center gap-2 rounded-lg border border-border bg-card p-3"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
              {index + 1}
            </span>
            <span className="flex-1 text-sm text-foreground">{item.text}</span>
            <div className="flex gap-1">
              <button
                type="button"
                aria-label="Move up"
                onClick={() => moveItem(index, -1)}
                disabled={disabled || index === 0}
                className="rounded p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Move down"
                onClick={() => moveItem(index, 1)}
                disabled={disabled || index === items.length - 1}
                className="rounded p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {feedback ? (
        <ProblemFeedbackBanner
          feedback={feedback}
          successLabel="Correct order!"
          errorLabel="Incorrect order"
        />
      ) : null}

      {!feedback && (
        <Button
          onClick={() => onSubmit(items.map((item) => item.text))}
          disabled={disabled}
          className="w-full"
        >
          {loading ? <><Loader2 className="size-4 animate-spin" /> Submitting...</> : "Submit Answer"}
        </Button>
      )}
    </div>
  );
}
