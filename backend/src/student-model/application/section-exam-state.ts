import { PrismaService } from '@/prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { Prisma, SectionMasteryState } from '@prisma/client';
import { activeConceptWhere, activeSectionWhere } from '@/knowledge-graph/active-course-content';
import { loadConceptMasteryForIds } from '../queries/student-state.queries';

export type SectionExamResult = {
  userId: string;
  courseId: string;
  sectionId: string;
  sectionSortOrder: number;
  passed: boolean;
  failedConcepts: string[];
};

/** Keep the session result and learner state in the caller's transaction. */
export async function applySectionExamResult(tx: Prisma.TransactionClient, result: SectionExamResult) {
  const { userId, courseId, sectionId, sectionSortOrder, passed, failedConcepts } = result;
  if (passed) {
    await tx.studentSectionState.update({
      where: { userId_sectionId: { userId, sectionId } },
      data: { status: SectionMasteryState.certified, examPassedAt: new Date() },
    });
    const nextSection = await tx.courseSection.findFirst({
      where: activeSectionWhere({ courseId, sortOrder: { gt: sectionSortOrder } }),
      orderBy: { sortOrder: 'asc' },
      select: { id: true },
    });
    if (nextSection) {
      await tx.studentSectionState.updateMany({
        where: { userId, sectionId: nextSection.id, status: SectionMasteryState.locked },
        data: { status: SectionMasteryState.lesson_in_progress },
      });
    }
  } else {
    await tx.studentSectionState.update({
      where: { userId_sectionId: { userId, sectionId } },
      data: { status: SectionMasteryState.needs_review },
    });
    if (failedConcepts.length > 0) {
      await tx.studentConceptState.updateMany({
        where: { userId, conceptId: { in: failedConcepts } },
        data: { masteryState: 'needs_review' },
      });
    }
  }
}

export async function lockSectionForExam(tx: Prisma.TransactionClient, userId: string, sectionId: string) {
  // The row write serializes concurrent starts before checking availability.
  const state = await tx.studentSectionState.update({
    where: { userId_sectionId: { userId, sectionId } },
    data: { updatedAt: new Date() },
  });
  if (state.status !== SectionMasteryState.exam_ready) {
    throw new BadRequestException('Section exam is no longer available');
  }
  return state;
}

export async function recordSectionExamAttempt(tx: Prisma.TransactionClient, userId: string, sectionId: string) {
  return tx.studentSectionState.update({
    where: { userId_sectionId: { userId, sectionId } },
    data: { attempts: { increment: 1 }, lastExamAttemptAt: new Date() },
  });
}

export async function syncSectionStates(tx: PrismaService, userId: string, courseId: string) {
  const sections = await tx.courseSection.findMany({
    where: activeSectionWhere({ courseId }),
    include: {
      concepts: {
        where: activeConceptWhere(),
        select: { id: true },
      },
    },
    orderBy: { sortOrder: 'asc' },
  });

  const conceptIds = sections.flatMap((section) =>
    section.concepts.map((concept) => concept.id),
  );
  const [conceptStateMap, sectionStates] = await Promise.all([
    conceptIds.length === 0
      ? Promise.resolve(new Map<string, string>())
      : loadConceptMasteryForIds(tx, userId, conceptIds),
    tx.studentSectionState.findMany({
      where: { userId, courseId },
    }),
  ]);

  const sectionStateMap = new Map(
    sectionStates.map((state) => [state.sectionId, state]),
  );

  let previousCertified = true;
  for (const section of sections) {
    const current = sectionStateMap.get(section.id);
    if (!current) {
      continue;
    }

    const config = ((section.sectionExamConfig ?? {}) as { enabled?: boolean });
    const sectionConceptStates = section.concepts.map(
      (concept) => conceptStateMap.get(concept.id) ?? 'unstarted',
    );
    const allMastered =
      sectionConceptStates.length > 0 &&
      sectionConceptStates.every((state) => state === 'mastered');
    const hasNeedsReview = sectionConceptStates.some(
      (state) => state === 'needs_review',
    );

    let nextStatus: SectionMasteryState;
    if (!previousCertified && current.status !== SectionMasteryState.certified) {
      nextStatus = SectionMasteryState.locked;
    } else if (!config.enabled) {
      if (allMastered) {
        nextStatus = SectionMasteryState.certified;
      } else if (hasNeedsReview) {
        nextStatus = SectionMasteryState.needs_review;
      } else {
        nextStatus = SectionMasteryState.lesson_in_progress;
      }
    } else if (current.status === SectionMasteryState.certified) {
      nextStatus = SectionMasteryState.certified;
    } else if (allMastered && !hasNeedsReview) {
      nextStatus = SectionMasteryState.exam_ready;
    } else if (hasNeedsReview) {
      nextStatus = SectionMasteryState.needs_review;
    } else {
      nextStatus = SectionMasteryState.lesson_in_progress;
    }

    if (nextStatus !== current.status) {
      await tx.studentSectionState.update({
        where: { id: current.id },
        data: { status: nextStatus },
      });
      current.status = nextStatus;
    }

    previousCertified = current.status === SectionMasteryState.certified;
  }

  return tx.studentSectionState.findMany({
    where: { userId, courseId, section: activeSectionWhere() },
    include: {
      section: {
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          sortOrder: true,
          sectionExamConfig: true,
        },
      },
    },
    orderBy: { section: { sortOrder: 'asc' } },
  });
}
