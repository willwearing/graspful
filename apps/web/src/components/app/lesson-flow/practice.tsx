import { ClipboardList } from "lucide-react";
import { ProblemRenderer } from "@/components/app/problems/problem-renderer";
import { Button } from "@/components/ui/button";
import { WorkedExampleContent } from "./worked-example";
import type { useLessonProgress } from "./use-lesson-progress";
import type { useLessonPractice } from "./use-lesson-practice";

interface PracticeProps {
  progress: ReturnType<typeof useLessonProgress>;
  practice: ReturnType<typeof useLessonPractice>;
}

export function Practice({ progress, practice }: PracticeProps) {
  const { kp, problems, currentProblem, practiceComplete, workedExampleOpen, setWorkedExampleOpen } = progress;
  const { error, submitting, feedback, attempt, submit, retry } = practice;
  return (
    <div className="rounded-lg border border-border p-6 space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-primary">
        <ClipboardList className="h-4 w-4" /> Practice
      </div>
      {kp.workedExampleText && (
        <details open={workedExampleOpen} onToggle={(event) => setWorkedExampleOpen(event.currentTarget.open)} className="rounded-lg border border-border bg-muted/20 p-4">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground">Review the worked example</summary>
          <div className="mt-3 space-y-2"><WorkedExampleContent kp={kp} /></div>
        </details>
      )}
      {error && (
        <div role="alert" className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          <p>{error}</p>
          <Button variant="outline" className="mt-3" disabled={submitting} onClick={() => void retry()}>Retry answer</Button>
        </div>
      )}
      {!practiceComplete && currentProblem ? (
        <ProblemRenderer key={`${currentProblem.id}:${attempt}`} problem={currentProblem}
          onSubmit={submit} disabled={submitting || !!feedback || !!error}
          loading={submitting && !feedback} feedback={feedback ?? undefined} />
      ) : problems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
          No practice problems are authored for this knowledge point yet.
        </div>
      ) : (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-5">
          <p className="text-sm font-medium text-green-700 dark:text-green-300">Practice complete</p>
          <p className="mt-2 text-sm text-muted-foreground">You have worked through all authored practice problems for this knowledge point.</p>
        </div>
      )}
    </div>
  );
}
