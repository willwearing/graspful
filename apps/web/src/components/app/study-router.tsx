"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AlertCircle, CheckCircle } from "lucide-react";
import type { NextTask } from "@/lib/types";
import { trackStudyTaskDispatched } from "@/lib/posthog/events";
import { getCourseTaskHref } from "@/lib/academy-routes";

interface StudyRouterProps {
  academyId?: string;
  courseId?: string;
  task: NextTask | null;
  taskHref?: string | null;
  loadFailed?: boolean;
  emptyStateHref?: string;
  emptyStateLabel?: string;
}

export function StudyRouter({
  academyId,
  courseId,
  task,
  taskHref,
  loadFailed = false,
  emptyStateHref,
  emptyStateLabel,
}: StudyRouterProps) {
  const router = useRouter();
  const [retrying, startRetry] = useTransition();
  const resolvedCourseId = task?.courseId ?? courseId;
  const href = taskHref !== undefined
    ? taskHref
    : task && resolvedCourseId ? getCourseTaskHref(resolvedCourseId, task) : null;
  const hasError = loadFailed || (!!task && !href);

  useEffect(() => {
    if (task && resolvedCourseId && href && !hasError) {
      trackStudyTaskDispatched(resolvedCourseId, task.taskType);
      router.push(href);
    }
  }, [task, resolvedCourseId, href, hasError, router]);

  const fallbackHref = emptyStateHref ?? (academyId ? `/academy/${academyId}` : "/dashboard");
  const fallbackLabel = emptyStateLabel ?? (academyId ? "Back to Academy" : "Back to Dashboard");

  if (hasError) {
    return (
      <div className="mx-auto max-w-md text-center space-y-6 py-12" role="alert">
        <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
        <h2 className="text-2xl font-bold text-foreground">Could not load your next activity</h2>
        <p className="text-muted-foreground">Try again to check your study progress.</p>
        <div className="flex justify-center gap-3">
          <Button onClick={() => startRetry(() => router.refresh())} disabled={retrying}>
            {retrying ? "Retrying..." : "Retry"}
          </Button>
          <Button variant="outline" render={<Link href={fallbackHref} />}>
            {fallbackLabel}
          </Button>
        </div>
      </div>
    );
  }

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
