import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { StudentStateService } from '@/student-model/student-state.service';
import { GraphQueryService } from '@/knowledge-graph/graph-query.service';
import { CourseReadService } from '@/knowledge-graph/course-read.service';
import { MemoryDecayService } from '@/spaced-repetition/memory-decay.service';
import { XPService } from '@/gamification/xp.service';
import { RemediationService } from './remediation.service';
import { selectNextTask } from './task-selector';
import { generateStudySession } from './session-generator';
import { detectPlateau, findWeakPrerequisites } from './plateau-detector';
import { SectionExamService } from '@/assessment/section-exam.service';
import {
  ConceptSnapshot,
  SectionSnapshot,
  SimpleEdge,
  TaskRecommendation,
  StudySession,
} from './types';
import { getLogger, SeverityNumber } from '../telemetry/otel-logger';

const logger = getLogger('learning-engine');

@Injectable()
export class LearningEngineService {
  constructor(
    private prisma: PrismaService,
    private studentState: StudentStateService,
    private graphQuery: GraphQueryService,
    private courseRead: CourseReadService,
    private remediationService: RemediationService,
    private memoryDecay: MemoryDecayService,
    private sectionExamService: SectionExamService,
    private xpService: XPService,
  ) {}

  async getNextTask(
    userId: string,
    academyId: string,
  ): Promise<TaskRecommendation> {
    const enrollment = await this.prisma.academyEnrollment.findUnique({
      where: { userId_academyId: { userId, academyId } },
      select: { id: true },
    });

    if (!enrollment) {
      throw new NotFoundException('Not enrolled in this academy');
    }

    await this.memoryDecay.decayAllMemory(userId, academyId);

    const { snapshots, sections, edges, frontier } = await this.buildContext(
      userId,
      academyId,
    );

    await this.syncRemediations(userId, academyId, snapshots, edges);

    const blockedIds = await this.remediationService.getBlockedConceptIds(
      userId,
      academyId,
    );
    const availableFrontier = frontier.filter((id) => !blockedIds.has(id));

    const xpSinceLastQuiz = await this.computeXPSinceLastQuiz(userId, academyId);

    const task = selectNextTask(
      snapshots,
      sections,
      edges,
      availableFrontier,
      xpSinceLastQuiz,
      academyId,
    );

    logger.emit({
      severityNumber: SeverityNumber.INFO,
      severityText: 'INFO',
      body: `Next task selected`,
      attributes: {
        'user.id': userId,
        'academy.id': academyId,
        'course.id': task.courseId ?? '',
        'task.type': task.taskType,
        'frontier.size': availableFrontier.length,
      },
    });

    return task;
  }

  async getNextTaskForCourse(
    userId: string,
    courseId: string,
  ): Promise<TaskRecommendation> {
    const academyId = await this.studentState.getAcademyIdForCourse(courseId);
    return this.getNextTask(userId, academyId);
  }

  async getStudySession(
    userId: string,
    academyId: string,
  ): Promise<StudySession> {
    const enrollment = await this.prisma.academyEnrollment.findUnique({
      where: { userId_academyId: { userId, academyId } },
      select: { dailyXPTarget: true },
    });

    if (!enrollment) {
      throw new NotFoundException('Not enrolled in this academy');
    }

    await this.memoryDecay.decayAllMemory(userId, academyId);

    const { snapshots, sections, edges, frontier } = await this.buildContext(
      userId,
      academyId,
    );

    await this.syncRemediations(userId, academyId, snapshots, edges);

    const blockedIds = await this.remediationService.getBlockedConceptIds(
      userId,
      academyId,
    );
    const availableFrontier = frontier.filter((id) => !blockedIds.has(id));

    const xpSinceLastQuiz = await this.computeXPSinceLastQuiz(userId, academyId);

    return generateStudySession(
      snapshots,
      sections,
      edges,
      availableFrontier,
      enrollment.dailyXPTarget,
      xpSinceLastQuiz,
      academyId,
    );
  }

  async getStudySessionForCourse(
    userId: string,
    courseId: string,
  ): Promise<StudySession> {
    const academyId = await this.studentState.getAcademyIdForCourse(courseId);
    return this.getStudySession(userId, academyId);
  }

  /**
   * Build the context needed by pure functions: snapshots, edges, frontier.
   */
  private async buildContext(userId: string, academyId: string) {
    const courseIds = await this.courseRead.getCourseIdsForAcademy(academyId);

    await Promise.all(
      courseIds.map((courseId) =>
        this.sectionExamService.syncSectionStates(userId, courseId),
      ),
    );

    const [conceptStates, concepts, prereqEdges, sectionStates] = await Promise.all([
      this.studentState.getConceptStatesForAcademy(userId, academyId),
      this.courseRead.getConceptsForAcademy(academyId),
      this.courseRead.getPrereqEdgesForAcademy(academyId),
      this.studentState.getSectionStatesForAcademy(userId, academyId),
    ]);

    const snapshots: ConceptSnapshot[] = conceptStates.map((s) => ({
      conceptId: s.conceptId,
      courseId: s.concept.courseId,
      sectionId: s.concept.sectionId,
      difficulty: s.concept.difficulty,
      lastPracticedAt: s.lastPracticedAt,
      masteryState: s.masteryState as ConceptSnapshot['masteryState'],
      memory: s.memory,
      failCount: s.failCount,
    }));

    const edges: SimpleEdge[] = prereqEdges.map((e) => ({
      source: e.sourceConceptId,
      target: e.targetConceptId,
    }));

    const sections: SectionSnapshot[] = sectionStates.map((state) => ({
      courseId: state.courseId,
      sectionId: state.sectionId,
      sortOrder: state.section.sortOrder,
      status: state.status as SectionSnapshot['status'],
    }));

    const conceptIds = concepts.map((c) => c.id);
    const conceptById = new Map(concepts.map((concept) => [concept.id, concept]));
    const sectionById = new Map(
      sections.map((section) => [section.sectionId, section]),
    );
    const masteredIds = new Set(
      snapshots
        .filter((s) => s.masteryState === 'mastered')
        .map((s) => s.conceptId),
    );

    const frontier = this.graphQuery.knowledgeFrontier(
      conceptIds,
      edges,
      masteredIds,
    ).filter((conceptId) => {
      const sectionId = conceptById.get(conceptId)?.sectionId;
      if (!sectionId) {
        return true;
      }
      const section = sectionById.get(sectionId);
      return section?.status === 'lesson_in_progress';
    });

    return { snapshots, sections, edges, frontier };
  }

  /**
   * Compute XP earned since the student's last quiz submission.
   * Delegates to XPService (Gamification module owns XP data).
   */
  private async computeXPSinceLastQuiz(
    userId: string,
    academyId: string,
  ): Promise<number> {
    return this.xpService.getXPSinceLastQuiz(userId, academyId);
  }

  /**
   * Detect plateaued concepts and create remediation records
   * for any weak prerequisites found.
   */
  private async syncRemediations(
    userId: string,
    academyId: string,
    snapshots: ConceptSnapshot[],
    edges: SimpleEdge[],
  ) {
    const remediationsToCreate: Array<{
      blockedConceptId: string;
      prereqId: string;
    }> = [];

    for (const snap of snapshots) {
      if (detectPlateau(snap)) {
        const weakPrereqs = findWeakPrerequisites(
          snap.conceptId,
          edges,
          snapshots,
        );
        for (const prereqId of weakPrereqs) {
          remediationsToCreate.push({
            blockedConceptId: snap.conceptId,
            prereqId,
          });
        }
      }
    }

    // Create all remediations (upserts are idempotent)
    await Promise.all(
      remediationsToCreate.map(({ blockedConceptId, prereqId }) =>
        {
          const blockedSnapshot = snapshots.find(
            (snapshot) => snapshot.conceptId === blockedConceptId,
          );

          if (!blockedSnapshot) {
            return Promise.resolve(null);
          }

          if (!blockedSnapshot.courseId) {
            return Promise.resolve(null);
          }

          return this.remediationService.createRemediation(
            userId,
            academyId,
            blockedConceptId,
            prereqId,
            blockedSnapshot.courseId,
          );
        },
      ),
    );
  }
}
