"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Problem } from "@/lib/types";

export interface ProblemFeedback {
  wasCorrect: boolean;
  correctAnswer?: string;
  explanation?: string;
}

interface MultipleChoiceProps {
  problem: Problem;
  onSubmit: (answer: string) => void;
  disabled?: boolean;
  feedback?: ProblemFeedback;
}

export function MultipleChoice({ problem, onSubmit, disabled, feedback }: MultipleChoiceProps) {
  const [selected, setSelected] = useState<string | null>(null);

  function handleSelect(optionId: string) {
    if (disabled) return;
    setSelected(optionId);
  }

  function handleSubmit() {
    if (selected) onSubmit(selected);
  }

  return (
    <div className="space-y-6">
      <p className="text-lg font-medium text-foreground">{problem.questionText}</p>

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
              onClick={() => handleSelect(option.id)}
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
        <div className={`rounded-lg p-4 text-sm ${feedback.wasCorrect ? "bg-green-500/10 text-green-700 dark:text-green-300" : "bg-destructive/10 text-destructive"}`}>
          {feedback.wasCorrect ? "Correct!" : "Incorrect"}
          {feedback.explanation && <p className="mt-1 text-muted-foreground">{feedback.explanation}</p>}
        </div>
      )}

      {!feedback && (
        <Button onClick={handleSubmit} disabled={disabled || !selected} className="w-full">
          Submit Answer
        </Button>
      )}
    </div>
  );
}
