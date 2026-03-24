import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { DiagnosticState, MasteryState } from '@prisma/client';
import { getLogger, SeverityNumber } from '../telemetry/otel-logger';
import {
  activeConceptWhere,
  activeSectionWhere,
} from '@/knowledge-graph/active-course-content';

const logger = getLogger('student-model');

@Injectable()
export class StudentStateService {
  constructor(private prisma: PrismaService) {}

  async getConceptStates(userId: string, courseId: string) {
    return this.getConceptStatesForCourse(userId, courseId);
  }

  async getConceptStatesForCourse(userId: string, courseId: string) {
    const academyId = await this.getAcademyIdForCourse(courseId);
    await this.ensureConceptStatesForAcademy(userId, academyId);

    return this.prisma.studentConceptState.findMany({
      where: {
        userId,
        concept: activeConceptWhere({ courseId }),
      },
      include: { concept: true },
    });
  }

  async getConceptStatesForAcademy(userId: string, academyId: string) {
    await this.ensureConceptStatesForAcademy(userId, academyId);

    return this.prisma.studentConceptState.findMany({
      where: {
        userId,
        concept: activeConceptWhere({
          course: { academyId },
        }),
      },
      include: { concept: true },
    });
  }

  /**
   * Get concept states for a specific course, derived from academy scope.
   * This is a projection — the academy is the authoritative boundary.
   */
  async getConceptStatesForAcademyCourse(
    userId: string,
    academyId: string,
    courseId: string,
  ) {
    await this.ensureConceptStatesForAcademy(userId, academyId);
    return this.prisma.studentConceptState.findMany({
      where: {
        userId,
        concept: activeConceptWhere({ courseId, course: { academyId } }),
      },
      include: { concept: true },
    });
  }

  /**
   * Get a mastery summary per course for academy-level views.
   * Returns a Map of courseId -> { total, mastered, inProgress, unstarted }.
   */
  async getAcademyCourseMasterySummary(userId: string, academyId: string) {
    await this.ensureConceptStatesForAcademy(userId, academyId);
    const states = await this.prisma.studentConceptState.findMany({
      where: {
        userId,
        concept: activeConceptWhere({ course: { academyId } }),
      },
      select: {
        conceptId: true,
        masteryState: true,
        concept: { select: { courseId: true } },
      },
    });

    const courseMap = new Map<
      string,
      { total: number; mastered: number; inProgress: number; unstarted: number }
    >();
    for (const state of states) {
      const cid = state.concept.courseId;
      if (!courseMap.has(cid)) {
        courseMap.set(cid, { total: 0, mastered: 0, inProgress: 0, unstarted: 0 });
      }
      const entry = courseMap.get(cid)!;
      entry.total++;
      if (state.masteryState === 'mastered') entry.mastered++;
      else if (state.masteryState === 'unstarted') entry.unstarted++;
      else entry.inProgress++;
    }
    return courseMap;
  }

  /**
   * Build a Map of conceptId -> P(L) for use by diagnostic algorithms.
   * Uses BKT prior (0.5) for unstarted concepts.
   */
  async getMasteryMap(userId: string, courseId: string): Promise<Map<string, number>> {
    const academyId = await this.getAcademyIdForCourse(courseId);
    await this.ensureConceptStatesForAcademy(userId, academyId);

    const states = await this.prisma.studentConceptState.findMany({
      where: {
        userId,
        concept: activeConceptWhere({ courseId }),
      },
      select: { conceptId: true, masteryState: true, memory: true },
    });

    const map = new Map<string, number>();
    for (const state of states) {
      // memory field stores the running P(L) estimate
      // Default 1.0 from schema means "unobserved" -- map to prior 0.5
      const pL = state.memory === 1.0 && state.masteryState === 'unstarted' ? 0.5 : state.memory;
      map.set(state.conceptId, pL);
    }
    return map;
  }

  async getMasteryMapForAcademy(
    userId: string,
    academyId: string,
  ): Promise<Map<string, number>> {
    await this.ensureConceptStatesForAcademy(userId, academyId);

    const states = await this.prisma.studentConceptState.findMany({
      where: {
        userId,
        concept: activeConceptWhere({
          course: { academyId },
        }),
      },
      select: { conceptId: true, masteryState: true, memory: true },
    });

    const map = new Map<string, number>();
    for (const state of states) {
      const pL =
        state.memory === 1.0 && state.masteryState === 'unstarted'
          ? 0.5
          : state.memory;
      map.set(state.conceptId, pL);
    }
    return map;
  }

  async updateConceptDiagnosticState(
    userId: string,
    conceptId: string,
    diagnosticState: DiagnosticState,
    pL: number,
  ) {
    const masteryState = this.diagnosticToMasteryState(diagnosticState);

    logger.emit({
      severityNumber: SeverityNumber.INFO,
      severityText: 'INFO',
      body: `Mastery updated`,
      attributes: { 'user.id': userId, 'concept.id': conceptId, 'mastery.state': masteryState, 'mastery.pL': pL },
    });

    return this.prisma.studentConceptState.update({
      where: { userId_conceptId: { userId, conceptId } },
      data: {
        diagnosticState,
        masteryState,
        memory: pL,
      },
    });
  }

  async bulkUpdateMasteries(
    userId: string,
    updates: Map<string, number>,
  ) {
    const promises = Array.from(updates.entries()).map(([conceptId, pL]) =>
      this.prisma.studentConceptState.update({
        where: { userId_conceptId: { userId, conceptId } },
        data: { memory: pL },
      }),
    );
    return Promise.all(promises);
  }

  async updateSpeedParameters(
    userId: string,
    abilityTheta: number,
    speedRD: number,
    conceptSpeeds: Map<string, number>,
  ) {
    const promises = Array.from(conceptSpeeds.entries()).map(
      ([conceptId, speed]) =>
        this.prisma.studentConceptState.update({
          where: { userId_conceptId: { userId, conceptId } },
          data: { speed, abilityTheta, speedRD },
        }),
    );
    return Promise.all(promises);
  }

  async getProfileSummary(userId: string, courseId: string) {
    const academyId = await this.getAcademyIdForCourse(courseId);
    const [states, diagnosticCompleted] = await Promise.all([
      this.getConceptStates(userId, courseId),
      this.isDiagnosticCompleted(userId, academyId),
    ]);

    const counts = { mastered: 0, in_progress: 0, needs_review: 0, unstarted: 0 };
    for (const state of states) {
      const key = state.masteryState as keyof typeof counts;
      if (key in counts) counts[key]++;
    }

    const total = states.length;
    return {
      totalConcepts: total,
      mastered: counts.mastered,
      inProgress: counts.in_progress,
      needsReview: counts.needs_review,
      unstarted: counts.unstarted,
      completionPercent: total > 0 ? (counts.mastered / total) * 100 : 0,
      diagnosticCompleted,
    };
  }

  async isDiagnosticCompleted(userId: string, academyId: string): Promise<boolean> {
    const enrollment = await this.prisma.academyEnrollment.findUnique({
      where: { userId_academyId: { userId, academyId } },
      select: { diagnosticCompleted: true },
    });
    return enrollment?.diagnosticCompleted ?? false;
  }

  async markDiagnosticComplete(userId: string, academyId: string) {
    return this.prisma.academyEnrollment.update({
      where: { userId_academyId: { userId, academyId } },
      data: {
        diagnosticCompleted: true,
        diagnosticCompletedAt: new Date(),
      },
    });
  }

  // ── Read methods (used by other modules via service boundary) ──────

  async getConceptState(userId: string, conceptId: string) {
    return this.prisma.studentConceptState.findUnique({
      where: { userId_conceptId: { userId, conceptId } },
    });
  }

  async getConceptStateWithConcept(userId: string, conceptId: string) {
    return this.prisma.studentConceptState.findUnique({
      where: { userId_conceptId: { userId, conceptId } },
      include: {
        concept: {
          include: { section: true },
        },
      },
    });
  }

  async getConceptMemory(userId: string, conceptId: string): Promise<number> {
    const state = await this.prisma.studentConceptState.findUnique({
      where: { userId_conceptId: { userId, conceptId } },
      select: { memory: true },
    });
    return state?.memory ?? 1;
  }

  async getKPState(userId: string, knowledgePointId: string) {
    return this.prisma.studentKPState.findUnique({
      where: { userId_knowledgePointId: { userId, knowledgePointId } },
    });
  }

  async getKPStatesForIds(userId: string, knowledgePointIds: string[]) {
    return this.prisma.studentKPState.findMany({
      where: {
        userId,
        knowledgePointId: { in: knowledgePointIds },
      },
      select: { passed: true },
    });
  }

  async getConceptMasteryForIds(
    userId: string,
    conceptIds: string[],
  ): Promise<Map<string, MasteryState>> {
    if (conceptIds.length === 0) return new Map();
    const states = await this.prisma.studentConceptState.findMany({
      where: {
        userId,
        conceptId: { in: conceptIds },
      },
      select: { conceptId: true, masteryState: true },
    });
    return new Map(states.map((s) => [s.conceptId, s.masteryState]));
  }

  async countMasteredConcepts(
    userId: string,
    filter: { courseId?: string; academyId?: string },
  ): Promise<number> {
    const conceptWhere: Record<string, unknown> = {};
    if (filter.courseId) conceptWhere.courseId = filter.courseId;
    if (filter.academyId) conceptWhere.course = { academyId: filter.academyId };
    return this.prisma.studentConceptState.count({
      where: {
        userId,
        concept: conceptWhere,
        masteryState: 'mastered',
      },
    });
  }

  async getSectionState(userId: string, sectionId: string) {
    return this.prisma.studentSectionState.findUnique({
      where: { userId_sectionId: { userId, sectionId } },
      select: { status: true },
    });
  }

  async getSectionStatesForAcademy(userId: string, academyId: string) {
    return this.prisma.studentSectionState.findMany({
      where: {
        userId,
        course: { academyId },
        section: activeSectionWhere(),
      },
      select: {
        courseId: true,
        sectionId: true,
        status: true,
        section: {
          select: { sortOrder: true },
        },
      },
    });
  }

  async getConceptStatesForFIRe(userId: string, academyId: string) {
    return this.prisma.studentConceptState.findMany({
      where: {
        userId,
        concept: activeConceptWhere({ course: { academyId } }),
      },
      select: {
        conceptId: true,
        speed: true,
        repNum: true,
        memory: true,
      },
    });
  }

  async getConceptStatesForDecay(userId: string, academyId: string) {
    return this.prisma.studentConceptState.findMany({
      where: {
        userId,
        concept: activeConceptWhere({
          course: { academyId },
        }),
        masteryState: { not: 'unstarted' },
        lastPracticedAt: { not: null },
      },
      select: {
        userId: true,
        conceptId: true,
        memory: true,
        interval: true,
        lastPracticedAt: true,
        masteryState: true,
      },
    });
  }

  async getConceptStatesForOrg(orgId: string) {
    return this.prisma.studentConceptState.findMany({
      where: {
        concept: activeConceptWhere({ course: { orgId } }),
      },
      select: {
        userId: true,
        masteryState: true,
        concept: {
          select: { courseId: true },
        },
      },
    });
  }

  // ── Write methods (used by other modules via service boundary) ──────

  async upsertKPState(
    userId: string,
    knowledgePointId: string,
    correct: boolean,
    currentState?: { consecutiveCorrect: number; passed: boolean },
  ) {
    const currentConsecutive = currentState?.consecutiveCorrect ?? 0;
    const newConsecutive = correct ? currentConsecutive + 1 : 0;
    const passed = (currentState?.passed ?? false) || newConsecutive >= 2;

    return this.prisma.studentKPState.upsert({
      where: { userId_knowledgePointId: { userId, knowledgePointId } },
      create: {
        userId,
        knowledgePointId,
        attempts: 1,
        consecutiveCorrect: correct ? 1 : 0,
        passed: correct ? false : false, // need 2 consecutive
        lastAttemptAt: new Date(),
      },
      update: {
        attempts: { increment: 1 },
        consecutiveCorrect: newConsecutive,
        passed,
        lastAttemptAt: new Date(),
      },
    });
  }

  async updateConceptAfterPractice(
    userId: string,
    conceptId: string,
    data: {
      masteryState?: MasteryState;
      speed?: number;
      abilityTheta?: number;
      speedRD?: number;
      observationCount?: number;
      failCount?: number;
      lastPracticedAt?: Date;
    },
  ) {
    return this.prisma.studentConceptState.update({
      where: { userId_conceptId: { userId, conceptId } },
      data,
    });
  }

  async markConceptsNeedsReview(userId: string, conceptIds: string[]) {
    if (conceptIds.length === 0) return;
    return this.prisma.studentConceptState.updateMany({
      where: {
        userId,
        conceptId: { in: conceptIds },
      },
      data: {
        masteryState: 'needs_review',
      },
    });
  }

  async updateConceptFIRe(
    userId: string,
    conceptId: string,
    data: {
      repNum: number;
      memory: number;
      interval: number;
      lastPracticedAt?: Date;
    },
  ) {
    return this.prisma.studentConceptState.update({
      where: { userId_conceptId: { userId, conceptId } },
      data,
    });
  }

  async batchDecayMemory(
    updates: Array<{ userId: string; conceptId: string; memory: number }>,
  ) {
    if (updates.length === 0) return;
    return this.prisma.$transaction(
      updates.map((update) =>
        this.prisma.studentConceptState.update({
          where: {
            userId_conceptId: {
              userId: update.userId,
              conceptId: update.conceptId,
            },
          },
          data: { memory: update.memory },
        }),
      ),
    );
  }

  private diagnosticToMasteryState(ds: DiagnosticState): MasteryState {
    switch (ds) {
      case 'mastered':
        return 'mastered';
      case 'conditionally_mastered':
      case 'partially_known':
        return 'in_progress';
      case 'unknown':
      default:
        return 'unstarted';
    }
  }

  /**
   * Academy content can change after a learner enrolls.
   * Keep concept-state rows in sync so diagnostics and graph coloring
   * always operate on the full current academy graph.
   */
  private async ensureConceptStatesForAcademy(userId: string, academyId: string) {
    const [concepts, existingStates] = await Promise.all([
      this.prisma.concept.findMany({
        where: activeConceptWhere({
          course: { academyId },
        }),
        select: { id: true },
      }),
      this.prisma.studentConceptState.findMany({
        where: {
          userId,
          concept: activeConceptWhere({
            course: { academyId },
          }),
        },
        select: { conceptId: true },
      }),
    ]);

    const existingConceptIds = new Set(existingStates.map((state) => state.conceptId));
    const missingConceptIds = concepts
      .map((concept) => concept.id)
      .filter((conceptId) => !existingConceptIds.has(conceptId));

    if (missingConceptIds.length === 0) {
      return;
    }

    await this.prisma.studentConceptState.createMany({
      data: missingConceptIds.map((conceptId) => ({
        userId,
        conceptId,
      })),
      skipDuplicates: true,
    });
  }

  async getAcademyIdForCourse(courseId: string): Promise<string> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { academyId: true },
    });

    if (!course?.academyId) {
      throw new NotFoundException('Course academy not found');
    }

    return course.academyId;
  }
}
