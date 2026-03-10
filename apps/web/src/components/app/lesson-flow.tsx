"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClientFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Volume2 } from "lucide-react";

interface KnowledgePoint {
  id: string;
  slug: string;
  instructionText: string;
  workedExampleText: string;
}

interface LessonData {
  conceptId: string;
  conceptName: string;
  knowledgePoints: KnowledgePoint[];
}

interface LessonFlowProps {
  orgId: string;
  courseId: string;
  token: string;
  lesson: LessonData;
}

export function LessonFlow({ orgId, courseId, token, lesson }: LessonFlowProps) {
  const router = useRouter();
  const [currentKP, setCurrentKP] = useState(0);
  const [completing, setCompleting] = useState(false);

  const kp = lesson.knowledgePoints[currentKP];
  const isLast = currentKP === lesson.knowledgePoints.length - 1;
  const progressPercent = ((currentKP + 1) / lesson.knowledgePoints.length) * 100;

  async function handleComplete() {
    setCompleting(true);
    try {
      await apiClientFetch(
        `/orgs/${orgId}/courses/${courseId}/lessons/${lesson.conceptId}/complete`,
        token,
        { method: "POST" }
      );
      router.push(`/study/${courseId}`);
    } catch {
      setCompleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">{lesson.conceptName}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Knowledge Point {currentKP + 1} of {lesson.knowledgePoints.length}
        </p>
      </div>

      <Progress value={progressPercent} className="h-2" />

      {/* Instruction */}
      <div className="rounded-lg border border-border p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <BookOpen className="h-4 w-4" />
          Instruction
        </div>
        <p className="text-foreground leading-relaxed">{kp.instructionText}</p>

        {/* Audio placeholder */}
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
          <Volume2 className="h-4 w-4" />
          Audio coming soon
        </div>
      </div>

      {/* Worked example */}
      {kp.workedExampleText && (
        <div className="rounded-lg border border-border bg-muted/20 p-6 space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Worked Example</p>
          <p className="text-foreground leading-relaxed">{kp.workedExampleText}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        {currentKP > 0 && (
          <Button variant="outline" onClick={() => setCurrentKP((prev) => prev - 1)}>
            Previous
          </Button>
        )}
        <div className="flex-1" />
        {isLast ? (
          <Button onClick={handleComplete} disabled={completing}>
            {completing ? "Completing..." : "Complete Lesson"}
          </Button>
        ) : (
          <Button onClick={() => setCurrentKP((prev) => prev + 1)}>
            Continue
          </Button>
        )}
      </div>
    </div>
  );
}
