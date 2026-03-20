import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { DiagnosticState, MasteryState } from '@prisma/client';
import { getLogger, SeverityNumber } from '../telemetry/otel-logger';
import { activeConceptWhere } from '@/knowledge-graph/active-course-content';

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
