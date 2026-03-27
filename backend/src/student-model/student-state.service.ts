import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { DiagnosticState, MasteryState } from '@prisma/client';
import { getLogger, SeverityNumber } from '../telemetry/otel-logger';
import { ensureConceptStatesForAcademy, getAcademyIdForCourse } from './application/student-state.lifecycle';
import {
  countMasteredConcepts as countMasteredConceptsQuery,
  loadAcademyCourseMasterySummary,
  loadConceptMasteryForIds,
  loadConceptMemory,
  loadConceptState,
  loadConceptStateWithConcept,
  loadConceptStatesForAcademy,
  loadConceptStatesForAcademyCourse,
  loadConceptStatesForCourse,
  loadConceptStatesForDecay,
  loadConceptStatesForFIRe,
  loadConceptStatesForOrg,
  loadKPState,
  loadKPStatesForIds,
  loadMasteryMapForAcademy,
  loadMasteryMapForCourse,
  loadSectionState,
  loadSectionStatesForAcademy,
} from './queries/student-state.queries';

const logger = getLogger('student-model');

@Injectable()
export class StudentStateService {
  constructor(private prisma: PrismaService) {}

  async getConceptStates(userId: string, courseId: string) {
    return this.getConceptStatesForCourse(userId, courseId);
  }

  async getConceptStatesForCourse(userId: string, courseId: string) {
    const academyId = await getAcademyIdForCourse(this.prisma, courseId);
    await ensureConceptStatesForAcademy(this.prisma, userId, academyId);
    return loadConceptStatesForCourse(this.prisma, userId, courseId);
  }

  async getConceptStatesForAcademy(userId: string, academyId: string) {
    await ensureConceptStatesForAcademy(this.prisma, userId, academyId);
    return loadConceptStatesForAcademy(this.prisma, userId, academyId);
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
    await ensureConceptStatesForAcademy(this.prisma, userId, academyId);
    return loadConceptStatesForAcademyCourse(this.prisma, userId, academyId, courseId);
  }

  /**
   * Get a mastery summary per course for academy-level views.
   * Returns a Map of courseId -> { total, mastered, inProgress, unstarted }.
   */
  async getAcademyCourseMasterySummary(userId: string, academyId: string) {
    await ensureConceptStatesForAcademy(this.prisma, userId, academyId);
    return loadAcademyCourseMasterySummary(this.prisma, userId, academyId);
  }

  /**
   * Build a Map of conceptId -> P(L) for use by diagnostic algorithms.
   * Uses BKT prior (0.5) for unstarted concepts.
   */
  async getMasteryMap(userId: string, courseId: string): Promise<Map<string, number>> {
    const academyId = await getAcademyIdForCourse(this.prisma, courseId);
    await ensureConceptStatesForAcademy(this.prisma, userId, academyId);
    return loadMasteryMapForCourse(this.prisma, userId, courseId);
  }

  async getMasteryMapForAcademy(
    userId: string,
    academyId: string,
  ): Promise<Map<string, number>> {
    await ensureConceptStatesForAcademy(this.prisma, userId, academyId);
    return loadMasteryMapForAcademy(this.prisma, userId, academyId);
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

  async bulkUpdateMasteries(userId: string, updates: Map<string, number>) {
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
    const academyId = await getAcademyIdForCourse(this.prisma, courseId);
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

  async getAcademyIdForCourse(courseId: string): Promise<string> {
    return getAcademyIdForCourse(this.prisma, courseId);
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
    return loadConceptState(this.prisma, userId, conceptId);
  }

  async getConceptStateWithConcept(userId: string, conceptId: string) {
    return loadConceptStateWithConcept(this.prisma, userId, conceptId);
  }

  async getConceptMemory(userId: string, conceptId: string): Promise<number> {
    return loadConceptMemory(this.prisma, userId, conceptId);
  }

  async getKPState(userId: string, knowledgePointId: string) {
    return loadKPState(this.prisma, userId, knowledgePointId);
  }

  async getKPStatesForIds(userId: string, knowledgePointIds: string[]) {
    return loadKPStatesForIds(this.prisma, userId, knowledgePointIds);
  }

  async getConceptMasteryForIds(
    userId: string,
    conceptIds: string[],
  ): Promise<Map<string, MasteryState>> {
    return loadConceptMasteryForIds(this.prisma, userId, conceptIds);
  }

  async countMasteredConcepts(
    userId: string,
    filter: { courseId?: string; academyId?: string },
  ): Promise<number> {
    return countMasteredConceptsQuery(this.prisma, userId, filter);
  }

  async getSectionState(userId: string, sectionId: string) {
    return loadSectionState(this.prisma, userId, sectionId);
  }

  async getSectionStatesForAcademy(userId: string, academyId: string) {
    return loadSectionStatesForAcademy(this.prisma, userId, academyId);
  }

  async getConceptStatesForFIRe(userId: string, academyId: string) {
    return loadConceptStatesForFIRe(this.prisma, userId, academyId);
  }

  async getConceptStatesForDecay(userId: string, academyId: string) {
    return loadConceptStatesForDecay(this.prisma, userId, academyId);
  }

  async getConceptStatesForOrg(orgId: string) {
    return loadConceptStatesForOrg(this.prisma, orgId);
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
        passed: correct ? false : false,
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
}
