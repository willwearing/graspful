import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RemediationService } from './remediation.service';

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
      where: { id: conceptId, courseId, orgId },
    });
    if (!concept) {
      throw new NotFoundException(`Concept ${conceptId} not found`);
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
      where: { conceptId },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        slug: true,
        instructionText: true,
        workedExampleText: true,
        instructionAudioUrl: true,
        workedExampleAudioUrl: true,
      },
    });

    return {
      conceptId,
      conceptName: concept.name,
      knowledgePoints,
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

    // Record that the lesson content was consumed.
    // Mastery promotion to 'mastered' happens via problem practice in
    // the Assessment module, not here.
    await this.prisma.studentConceptState.update({
      where: { userId_conceptId: { userId, conceptId } },
      data: {
        lastPracticedAt: new Date(),
      },
    });

    return { conceptId, status: 'lesson_complete' };
  }
}
