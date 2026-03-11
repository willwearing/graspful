"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle } from "lucide-react";

interface NextTask {
  taskType: "lesson" | "review" | "quiz" | "remediation";
  conceptId?: string;
  reason: string;
}

interface StudyRouterProps {
  courseId: string;
  task: NextTask | null;
}

export function StudyRouter({ courseId, task }: StudyRouterProps) {
  const router = useRouter();

  useEffect(() => {
    if (!task) return;

    switch (task.taskType) {
      case "lesson":
      case "remediation":
        if (task.conceptId) router.push(`/study/${courseId}/lesson/${task.conceptId}`);
        break;
      case "review":
        if (task.conceptId) router.push(`/study/${courseId}/review/${task.conceptId}`);
        break;
      case "quiz":
        router.push(`/study/${courseId}/quiz`);
        break;
    }
  }, [task, courseId, router]);

  if (!task) {
    return (
      <div className="mx-auto max-w-md text-center space-y-6 py-12">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
        <h2 className="text-2xl font-bold text-foreground">Session Complete</h2>
        <p className="text-muted-foreground">
          Great work! You have completed all recommended tasks for now. Check back later for more.
        </p>
        <Button render={<Link href="/dashboard" />}>Back to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12">
      <p className="text-muted-foreground">Loading next activity...</p>
    </div>
  );
}
