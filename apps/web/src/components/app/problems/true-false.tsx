"use client";

import { Button } from "@/components/ui/button";
import type { Problem } from "@/lib/types";
import type { ProblemFeedback } from "./multiple-choice";

interface TrueFalseProps {
  problem: Problem;
  onSubmit: (answer: boolean) => void;
  disabled?: boolean;
  feedback?: ProblemFeedback;
}

export function TrueFalse({ problem, onSubmit, disabled, feedback }: TrueFalseProps) {
  return (
    <div className="space-y-6">
      <p className="text-lg font-medium text-foreground">{problem.questionText}</p>

      <div className="grid grid-cols-2 gap-4">
        <Button
          variant="outline"
          size="lg"
          onClick={() => onSubmit(true)}
          disabled={disabled}
          className="h-16 text-lg"
        >
          True
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={() => onSubmit(false)}
          disabled={disabled}
          className="h-16 text-lg"
        >
          False
        </Button>
      </div>

      {feedback && (
        <div className={`rounded-lg p-4 text-sm ${feedback.wasCorrect ? "bg-green-500/10 text-green-700 dark:text-green-300" : "bg-destructive/10 text-destructive"}`}>
          {feedback.wasCorrect ? "Correct!" : "Incorrect"}
          {feedback.explanation && <p className="mt-1 text-muted-foreground">{feedback.explanation}</p>}
        </div>
      )}
    </div>
  );
}
