"use client";

import type { Problem, ProblemAnswer } from "@/lib/types";
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
  feedback?: ProblemFeedback;
}

export function ProblemRenderer({ problem, onSubmit, disabled, feedback }: ProblemRendererProps) {
  switch (problem.type) {
    case "multiple_choice":
      return <MultipleChoice problem={problem} onSubmit={onSubmit as (answer: string) => void} disabled={disabled} feedback={feedback} />;
    case "true_false":
      return <TrueFalse problem={problem} onSubmit={onSubmit as (answer: boolean) => void} disabled={disabled} feedback={feedback} />;
    case "fill_blank":
      return <FillBlank problem={problem} onSubmit={onSubmit as (answer: string) => void} disabled={disabled} feedback={feedback} />;
    case "ordering":
      return <Ordering problem={problem} onSubmit={onSubmit as (answer: string[]) => void} disabled={disabled} feedback={feedback} />;
    case "matching":
      return <Matching problem={problem} onSubmit={onSubmit as (answer: Record<string, string>) => void} disabled={disabled} feedback={feedback} />;
    case "scenario":
      return <Scenario problem={problem} onSubmit={onSubmit as (answer: string) => void} disabled={disabled} feedback={feedback} />;
    default:
      return <p className="text-muted-foreground">Unsupported problem type: {problem.type}</p>;
  }
}

export type { ProblemFeedback };
