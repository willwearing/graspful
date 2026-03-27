import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CourseProgressState } from '@prisma/client';

export const VALID_COURSE_PROGRESS_TRANSITIONS: Record<
  CourseProgressState,
  CourseProgressState[]
> = {
  [CourseProgressState.locked]: [CourseProgressState.unlocked],
  [CourseProgressState.unlocked]: [CourseProgressState.active],
  [CourseProgressState.active]: [CourseProgressState.completed],
  [CourseProgressState.completed]: [],
};

export function assertCourseProgressTransitionAllowed(
  currentStatus: CourseProgressState,
  targetStatus: CourseProgressState,
): void {
  const allowed = VALID_COURSE_PROGRESS_TRANSITIONS[currentStatus];
  if (!allowed.includes(targetStatus)) {
    throw new BadRequestException(
      `Cannot transition course state from ${currentStatus} to ${targetStatus}`,
    );
  }
}

export function requireCourseProgressState<T extends { status: CourseProgressState }>(
  state: T | null | undefined,
  userId: string,
  courseId: string,
): T {
  if (!state) {
    throw new NotFoundException(
      `No course state found for user ${userId} course ${courseId}`,
    );
  }

  return state;
}
