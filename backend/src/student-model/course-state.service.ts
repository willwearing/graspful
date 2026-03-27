import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CourseProgressState, SectionMasteryState, StudentCourseState } from '@prisma/client';
import { activeSectionWhere } from '@/knowledge-graph/active-course-content';
import {
  assertCourseProgressTransitionAllowed,
  requireCourseProgressState,
} from './domain/course-progress-state.rules';

@Injectable()
export class CourseStateService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all course states for a user within a specific academy.
   * Uses the academyEnrollmentId link when available, falls back to
   * joining through the course's academyId.
   */
  async getCourseStatesForAcademy(
    userId: string,
    academyId: string,
  ): Promise<StudentCourseState[]> {
    return this.prisma.studentCourseState.findMany({
      where: {
        userId,
        course: { academyId },
      },
      orderBy: { course: { sortOrder: 'asc' } },
    });
  }

  /**
   * Transition a course from one status to another.
   * Validates that the transition is legal per the state machine.
   */
  async transitionCourseState(
    userId: string,
    courseId: string,
    targetStatus: CourseProgressState,
  ): Promise<StudentCourseState> {
    const state = requireCourseProgressState(
      await this.prisma.studentCourseState.findUnique({
        where: { userId_courseId: { userId, courseId } },
      }),
      userId,
      courseId,
    );

    assertCourseProgressTransitionAllowed(state.status, targetStatus);

    return this.prisma.studentCourseState.update({
      where: { userId_courseId: { userId, courseId } },
      data: { status: targetStatus },
    });
  }

  /**
   * Check if a course can be activated. A course can be activated when:
   * - It is currently unlocked (not locked or completed)
   * - All prerequisite courses (earlier in sort order) are completed,
   *   OR the course is the first in the academy
   *
   * The academy uses sort order as the prerequisite chain: a course
   * can only activate when all courses with lower sort order are completed.
   */
  async canActivateCourse(
    userId: string,
    courseId: string,
    academyId: string,
  ): Promise<boolean> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { sortOrder: true },
    });

    if (!course) return false;

    const state = await this.prisma.studentCourseState.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });

    if (!state || state.status !== CourseProgressState.unlocked) {
      return false;
    }

    if (course.sortOrder === 0) return true;

    const incompletePriorCourses = await this.prisma.studentCourseState.count({
      where: {
        userId,
        course: {
          academyId,
          sortOrder: { lt: course.sortOrder },
        },
        status: { not: CourseProgressState.completed },
      },
    });

    return incompletePriorCourses === 0;
  }

  /**
   * After a course completes, activate the next unlocked course in the academy.
   * Finds the first course in sort order that is still unlocked and activates it.
   */
  async activateNextCourse(
    userId: string,
    academyId: string,
  ): Promise<void> {
    const nextUnlocked = await this.prisma.studentCourseState.findFirst({
      where: {
        userId,
        course: { academyId },
        status: CourseProgressState.unlocked,
      },
      orderBy: { course: { sortOrder: 'asc' } },
    });

    if (!nextUnlocked) return;

    await this.prisma.studentCourseState.update({
      where: { id: nextUnlocked.id },
      data: { status: CourseProgressState.active },
    });
  }

  /**
   * Check if all active (non-archived) sections of a course are certified.
   * If so, mark the course as completed.
   * Returns true if the course was completed, false otherwise.
   */
  async checkAndCompleteCourse(
    userId: string,
    courseId: string,
  ): Promise<boolean> {
    const courseState = await this.prisma.studentCourseState.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });

    if (!courseState || courseState.status !== CourseProgressState.active) {
      return false;
    }

    const totalSections = await this.prisma.courseSection.count({
      where: activeSectionWhere({ courseId }),
    });

    if (totalSections === 0) return false;

    const certifiedSections = await this.prisma.studentSectionState.count({
      where: {
        userId,
        courseId,
        status: SectionMasteryState.certified,
        section: activeSectionWhere(),
      },
    });

    if (certifiedSections < totalSections) return false;

    await this.prisma.studentCourseState.update({
      where: { userId_courseId: { userId, courseId } },
      data: { status: CourseProgressState.completed },
    });

    return true;
  }
}
