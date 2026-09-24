import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { useLessonProgress } from "./use-lesson-progress";

interface NavigationProps {
  progress: ReturnType<typeof useLessonProgress>;
  blocked: boolean;
  completing: boolean;
  completionError: string | null;
  onPrevious: () => void;
  onContinue: () => void;
  onComplete: () => void;
}

export function LessonNavigation({ progress, blocked, completing, completionError, onPrevious, onContinue, onComplete }: NavigationProps) {
  const { canGoBack, phase, practiceComplete, isLast } = progress;
  return (
    <div className="flex gap-3">
      {canGoBack && <Button variant="outline" onClick={onPrevious} disabled={blocked || completing}>Previous</Button>}
      <div className="flex-1" />
      {phase === "practice" && !practiceComplete ? (
        <p className="self-center text-sm text-muted-foreground">Finish the practice problems to continue</p>
      ) : phase === "practice" && isLast ? (
        <Button onClick={onComplete} disabled={completing}>
          <CheckCircle2 className="h-4 w-4 mr-2" />
          {completing ? "Completing..." : completionError ? "Retry completion" : "Complete Lesson"}
        </Button>
      ) : (
        <Button onClick={onContinue}>
          {phase === "practice" && <CheckCircle2 className="h-4 w-4 mr-2" />}Continue
        </Button>
      )}
    </div>
  );
}
