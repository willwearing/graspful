"use client";

import type { ProblemFeedback } from "./multiple-choice";

interface ProblemFeedbackBannerProps {
  feedback: ProblemFeedback;
  successLabel: string;
  errorLabel: string;
  correctAnswer?: string;
}

function normalizeFeedbackCopy(value: string): string {
  return value.trim().replace(/[.!?]+$/g, "").replace(/\s+/g, " ").toLowerCase();
}

export function ProblemFeedbackBanner({
  feedback,
  successLabel,
  errorLabel,
  correctAnswer,
}: ProblemFeedbackBannerProps) {
  const heading = feedback.skipped
    ? "We'll teach you this one"
    : feedback.wasCorrect
      ? successLabel
      : errorLabel;
  const explanation = feedback.explanation?.trim();
  const showExplanation =
    !!explanation &&
    normalizeFeedbackCopy(explanation) !== normalizeFeedbackCopy(heading);

  return (
    <div
      className={`rounded-lg p-4 text-sm ${
        feedback.skipped
          ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
          : feedback.wasCorrect
            ? "bg-green-500/10 text-green-700 dark:text-green-300"
            : "bg-destructive/10 text-destructive"
      }`}
    >
      {heading}
      {correctAnswer && !feedback.wasCorrect ? (
        <p className="mt-1">Correct answer: {correctAnswer}</p>
      ) : null}
      {showExplanation ? (
        <p className="mt-1 text-muted-foreground">{explanation}</p>
      ) : null}
    </div>
  );
}
