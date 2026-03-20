import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { RemediationService } from './remediation.service';
import {
  activeConceptWhere,
  activeKnowledgePointWhere,
} from '@/knowledge-graph/active-course-content';
import { serializeProblemForClient } from '@/shared/utils/problem-presentation';

@Injectable()
export class LessonService {
  constructor(
    private prisma: PrismaService,
    private remediationService: RemediationService,
  ) {}

  async startLesson(
    userId: string,
    orgId: string,
    courseId: string,
    conceptId: string,
  ) {
    // Verify concept exists and belongs to org/course
    const concept = await this.prisma.concept.findFirst({
      where: activeConceptWhere({ id: conceptId, courseId, orgId }),
    });
    if (!concept) {
      throw new NotFoundException(`Concept ${conceptId} not found`);
    }

    if (concept.sectionId) {
      const sectionState = await this.prisma.studentSectionState.findUnique({
        where: { userId_sectionId: { userId, sectionId: concept.sectionId } },
        select: { status: true },
      });

      if (sectionState?.status === 'locked') {
        throw new BadRequestException(
          `Section for concept ${conceptId} is still locked. Pass the previous section exam first.`,
        );
      }
    }

    // Check if concept is blocked by an active remediation
    const blockedIds = await this.remediationService.getBlockedConceptIds(
      userId,
      courseId,
    );
    if (blockedIds.has(conceptId)) {
      throw new BadRequestException(
        `Concept ${conceptId} is blocked by an active remediation. Complete prerequisite reviews first.`,
      );
    }

    // Check student's concept state
    const conceptState = await this.prisma.studentConceptState.findUnique({
      where: { userId_conceptId: { userId, conceptId } },
    });
    if (!conceptState) {
      throw new NotFoundException(
        `No enrollment state for concept ${conceptId}`,
      );
    }
    if (conceptState.masteryState === 'mastered') {
      throw new BadRequestException(
        `Concept ${conceptId} is already mastered. Use review instead.`,
      );
    }

    // Mark as in_progress
    await this.prisma.studentConceptState.update({
      where: { userId_conceptId: { userId, conceptId } },
      data: { masteryState: 'in_progress' },
    });

    // Fetch knowledge points with instruction content
    const knowledgePoints = await this.prisma.knowledgePoint.findMany({
      where: activeKnowledgePointWhere({ conceptId }),
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        slug: true,
        instructionText: true,
        instructionContent: true,
        workedExampleText: true,
        workedExampleContent: true,
        instructionAudioUrl: true,
        workedExampleAudioUrl: true,
        problems: {
          where: { isReviewVariant: false },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            questionText: true,
            type: true,
            options: true,
            difficulty: true,
          },
        },
      },
    });

    return {
      conceptId,
      conceptName: concept.name,
      knowledgePoints: knowledgePoints.map((kp) => ({
        ...kp,
        instructionContent: this.normalizeContentBlocks(kp.instructionContent),
        workedExampleContent: this.normalizeContentBlocks(kp.workedExampleContent),
        problems: kp.problems.map((problem) => this.sanitizeProblem(problem)),
      })),
    };
  }

  async completeLesson(userId: string, courseId: string, conceptId: string) {
    const conceptState = await this.prisma.studentConceptState.findUnique({
      where: { userId_conceptId: { userId, conceptId } },
    });
    if (!conceptState) {
      throw new NotFoundException(
        `No enrollment state for concept ${conceptId}`,
      );
    }
    if (
      conceptState.masteryState !== 'in_progress' &&
      conceptState.masteryState !== 'mastered'
    ) {
      throw new BadRequestException(
        `Concept ${conceptId} is not in_progress (current: ${conceptState.masteryState}). Start the lesson first.`,
      );
    }

    // Record that the lesson content was consumed.
    // Mastery promotion to 'mastered' happens via problem practice in
    // the Assessment module, so completion must also accept a concept
    // that was mastered during the lesson session.
    await this.prisma.studentConceptState.update({
      where: { userId_conceptId: { userId, conceptId } },
      data: {
        lastPracticedAt: new Date(),
      },
    });

    return { conceptId, status: 'lesson_complete' };
  }

  private normalizeContentBlocks(value: Prisma.JsonValue | null): Array<Record<string, unknown>> {
    return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [];
  }

  private sanitizeProblem(problem: {
    id: string;
    questionText: string;
    type: string;
    options: Prisma.JsonValue;
    difficulty: number;
  }) {
    return serializeProblemForClient(problem);
  }
}
