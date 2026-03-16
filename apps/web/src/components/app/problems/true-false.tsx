"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { Problem } from "@/lib/types";
import type { ProblemFeedback } from "./multiple-choice";

interface TrueFalseProps {
  problem: Problem;
  onSubmit: (answer: boolean) => void;
  disabled?: boolean;
  loading?: boolean;
  feedback?: ProblemFeedback;
}

export function TrueFalse({ problem, onSubmit, disabled, loading, feedback }: TrueFalseProps) {
  const [selected, setSelected] = useState<boolean | null>(null);

  function handleClick(value: boolean) {
    if (disabled) return;
    setSelected(value);
    onSubmit(value);
  }

  return (
    <div className="space-y-6">
      <p className="text-lg font-medium text-foreground">{problem.questionText}</p>

      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => handleClick(true)}
          disabled={disabled}
          className={`h-16 rounded-lg border-2 text-lg font-medium transition-colors ${
            selected === true
              ? "border-green-500 bg-green-500/10 text-green-700 dark:text-green-300"
              : "border-border bg-background hover:border-green-500/50 hover:bg-green-500/5"
          } ${disabled ? "cursor-default opacity-50" : "cursor-pointer"}`}
        >
          {loading && selected === true ? <Loader2 className="mx-auto size-5 animate-spin" /> : "True"}
        </button>
        <button
          type="button"
          onClick={() => handleClick(false)}
          disabled={disabled}
          className={`h-16 rounded-lg border-2 text-lg font-medium transition-colors ${
            selected === false
              ? "border-red-500 bg-red-500/10 text-red-700 dark:text-red-300"
              : "border-border bg-background hover:border-red-500/50 hover:bg-red-500/5"
          } ${disabled ? "cursor-default opacity-50" : "cursor-pointer"}`}
        >
          {loading && selected === false ? <Loader2 className="mx-auto size-5 animate-spin" /> : "False"}
        </button>
      </div>

      {feedback && (
        <div className={`rounded-lg p-4 text-sm ${feedback.skipped ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : feedback.wasCorrect ? "bg-green-500/10 text-green-700 dark:text-green-300" : "bg-destructive/10 text-destructive"}`}>
          {feedback.skipped ? "We'll teach you this one" : feedback.wasCorrect ? "Correct!" : "Incorrect"}
          {feedback.explanation && <p className="mt-1 text-muted-foreground">{feedback.explanation}</p>}
        </div>
      )}
    </div>
  );
}
