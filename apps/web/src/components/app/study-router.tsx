"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle } from "lucide-react";
import type { NextTask } from "@/lib/types";
import { trackStudyTaskDispatched } from "@/lib/posthog/events";
import { getCourseTaskHref } from "@/lib/academy-routes";

interface StudyRouterProps {
  academyId?: string;
  courseId?: string;
  task: NextTask | null;
  resolveTaskHref?: (courseId: string, task: NextTask) => string | null;
  emptyStateHref?: string;
  emptyStateLabel?: string;
}

export function StudyRouter({
  academyId,
  courseId,
  task,
  resolveTaskHref = getCourseTaskHref,
  emptyStateHref,
  emptyStateLabel,
}: StudyRouterProps) {
  const router = useRouter();

  useEffect(() => {
    if (!task) return;
    const resolvedCourseId = task.courseId ?? courseId;
    if (!resolvedCourseId) return;

    const href = resolveTaskHref(resolvedCourseId, task);
    if (href) {
      trackStudyTaskDispatched(resolvedCourseId, task.taskType);
      router.push(href);
    }
  }, [task, courseId, resolveTaskHref, router]);

  const fallbackHref = emptyStateHref ?? (academyId ? `/academy/${academyId}` : "/dashboard");
  const fallbackLabel = emptyStateLabel ?? (academyId ? "Back to Academy" : "Back to Dashboard");

  if (!task) {
    return (
      <div className="mx-auto max-w-md text-center space-y-6 py-12">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
        <h2 className="text-2xl font-bold text-foreground">Session Complete</h2>
      <p className="text-muted-foreground">
          Great work! You have completed all recommended tasks for now. Check back later for more.
        </p>
        <Button render={<Link href={fallbackHref} />}>
          {fallbackLabel}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12">
      <p className="text-muted-foreground">Loading next activity...</p>
    </div>
  );
}
