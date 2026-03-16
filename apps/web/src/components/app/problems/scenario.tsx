"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Problem } from "@/lib/types";
import type { ProblemFeedback } from "./multiple-choice";

interface ScenarioProps {
  problem: Problem;
  onSubmit: (answer: string) => void;
  disabled?: boolean;
  loading?: boolean;
  feedback?: ProblemFeedback;
}

export function Scenario({ problem, onSubmit, disabled, loading, feedback }: ScenarioProps) {
  const [selected, setSelected] = useState<string | null>(null);

  function handleSubmit() {
    if (selected) onSubmit(selected);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-muted/30 p-5">
        <p className="text-sm font-medium text-muted-foreground mb-2">Scenario</p>
        <p className="text-foreground leading-relaxed">{problem.questionText}</p>
      </div>

      <div className="space-y-3">
        {problem.options?.map((option) => {
          let borderClass = "border-border";
          if (feedback && selected === option.id) {
            borderClass = feedback.wasCorrect
              ? "border-green-500 bg-green-500/10"
              : "border-destructive bg-destructive/10";
          }
          if (feedback && feedback.correctAnswer === option.id && !feedback.wasCorrect) {
            borderClass = "border-green-500 bg-green-500/10";
          }
          if (!feedback && selected === option.id) {
            borderClass = "border-primary bg-primary/5";
          }

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => !disabled && setSelected(option.id)}
              disabled={disabled}
              className={`w-full rounded-lg border-2 p-4 text-left text-sm transition-colors ${borderClass} ${
                disabled ? "cursor-default" : "cursor-pointer hover:border-primary/50"
              }`}
            >
              {option.text}
            </button>
          );
        })}
      </div>

      {feedback && (
        <div className={`rounded-lg p-4 text-sm ${feedback.skipped ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : feedback.wasCorrect ? "bg-green-500/10 text-green-700 dark:text-green-300" : "bg-destructive/10 text-destructive"}`}>
          {feedback.skipped ? "We'll teach you this one" : feedback.wasCorrect ? "Correct!" : "Incorrect"}
          {feedback.explanation && <p className="mt-1 text-muted-foreground">{feedback.explanation}</p>}
        </div>
      )}

      {!feedback && (
        <Button onClick={handleSubmit} disabled={disabled || !selected} className="w-full">
          {loading ? <><Loader2 className="size-4 animate-spin" /> Submitting...</> : "Submit Answer"}
        </Button>
      )}
    </div>
  );
}
