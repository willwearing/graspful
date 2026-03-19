"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Problem } from "@/lib/types";
import type { ProblemFeedback } from "./multiple-choice";
import { ProblemFeedbackBanner } from "./feedback-banner";

interface FillBlankProps {
  problem: Problem;
  onSubmit: (answer: string) => void;
  disabled?: boolean;
  loading?: boolean;
  feedback?: ProblemFeedback;
}

export function FillBlank({ problem, onSubmit, disabled, loading, feedback }: FillBlankProps) {
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

      {feedback ? (
        <ProblemFeedbackBanner
          feedback={feedback}
          successLabel="Correct!"
          errorLabel="Incorrect"
          correctAnswer={feedback.correctAnswer}
        />
      ) : null}

      {!feedback && (
        <Button onClick={handleSubmit} disabled={disabled || !value.trim()} className="w-full">
          {loading ? <><Loader2 className="size-4 animate-spin" /> Submitting...</> : "Submit Answer"}
        </Button>
      )}
    </div>
  );
}
