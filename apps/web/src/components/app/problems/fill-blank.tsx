"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Problem } from "@/lib/types";
import type { ProblemFeedback } from "./multiple-choice";

interface FillBlankProps {
  problem: Problem;
  onSubmit: (answer: string) => void;
  disabled?: boolean;
  feedback?: ProblemFeedback;
}

export function FillBlank({ problem, onSubmit, disabled, feedback }: FillBlankProps) {
  const [value, setValue] = useState("");

  function handleSubmit() {
    const trimmed = value.trim();
    if (trimmed) onSubmit(trimmed);
  }

  return (
    <div className="space-y-6">
      <p className="text-lg font-medium text-foreground">{problem.questionText}</p>

      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        placeholder="Type your answer..."
        className="w-full rounded-lg border-2 border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none disabled:opacity-50"
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim()) handleSubmit();
        }}
      />

      {feedback && (
        <div className={`rounded-lg p-4 text-sm ${feedback.wasCorrect ? "bg-green-500/10 text-green-700 dark:text-green-300" : "bg-destructive/10 text-destructive"}`}>
          {feedback.wasCorrect ? "Correct!" : "Incorrect"}
          {feedback.correctAnswer && !feedback.wasCorrect && (
            <p className="mt-1">Correct answer: {feedback.correctAnswer}</p>
          )}
          {feedback.explanation && <p className="mt-1 text-muted-foreground">{feedback.explanation}</p>}
        </div>
      )}

      {!feedback && (
        <Button onClick={handleSubmit} disabled={disabled || !value.trim()} className="w-full">
          Submit Answer
        </Button>
      )}
    </div>
  );
}
