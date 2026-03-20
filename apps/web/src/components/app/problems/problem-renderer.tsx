"use client";

import type { Problem, ProblemAnswer } from "@/lib/types";
import { normalizeProblem } from "@/lib/problem-normalization";
import { MultipleChoice, type ProblemFeedback } from "./multiple-choice";
import { TrueFalse } from "./true-false";
import { FillBlank } from "./fill-blank";
import { Ordering } from "./ordering";
import { Matching } from "./matching";
import { Scenario } from "./scenario";

interface ProblemRendererProps {
  problem: Problem;
  onSubmit: (answer: ProblemAnswer) => void;
  disabled?: boolean;
  loading?: boolean;
  feedback?: ProblemFeedback;
}

export function ProblemRenderer({ problem, onSubmit, disabled, loading, feedback }: ProblemRendererProps) {
  const normalizedProblem = normalizeProblem(problem);

  switch (normalizedProblem.type) {
    case "multiple_choice":
      return <MultipleChoice problem={normalizedProblem} onSubmit={onSubmit as (answer: string) => void} disabled={disabled} loading={loading} feedback={feedback} />;
    case "true_false":
      return <TrueFalse problem={normalizedProblem} onSubmit={onSubmit as (answer: boolean) => void} disabled={disabled} loading={loading} feedback={feedback} />;
    case "fill_blank":
      return <FillBlank problem={normalizedProblem} onSubmit={onSubmit as (answer: string) => void} disabled={disabled} loading={loading} feedback={feedback} />;
    case "ordering":
      return <Ordering problem={normalizedProblem} onSubmit={onSubmit as (answer: string[]) => void} disabled={disabled} loading={loading} feedback={feedback} />;
    case "matching":
      return <Matching problem={normalizedProblem} onSubmit={onSubmit as (answer: Record<string, string>) => void} disabled={disabled} loading={loading} feedback={feedback} />;
    case "scenario":
      return <Scenario problem={normalizedProblem} onSubmit={onSubmit as (answer: string) => void} disabled={disabled} loading={loading} feedback={feedback} />;
    default:
      return <p className="text-muted-foreground">Unsupported problem type: {normalizedProblem.type}</p>;
  }
}

export type { ProblemFeedback };
